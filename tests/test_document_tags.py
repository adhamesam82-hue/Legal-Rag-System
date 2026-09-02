"""T-025: document tags and the closed document-type list.

Against a real Postgres, in the style of tests/test_practice_api.py. Documents
are created through the practice layer without bytes -- the tagging and
filtering under test do not depend on a file existing on disk.
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.practice import document_tags as tags
from legalrag.practice import documents as docs

OWNER = "user_owner"
OTHER_OWNER = "user_other_owner"


@pytest.fixture
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    with connection.cursor() as cur:
        cur.execute("SELECT coalesce(max(id), 0) FROM organizations")
        mark = cur.fetchone()[0]
    yield connection
    drop_organizations_after(connection, mark)
    connection.close()


@pytest.fixture
def client(conn):
    app.dependency_overrides[get_current_user_id] = lambda: OWNER
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user_id, None)


@pytest.fixture
def org(client):
    return client.post("/api/orgs", json={"name": "Tagging Firm"}).json()["id"]


def make_document(conn, org, name="memo.pdf", **kw):
    return docs.create_document(conn, org, name=name, uploaded_by=OWNER, **kw)


def tag_ids_by_name(client, org):
    return {t["name"]: t["id"] for t in client.get(f"/api/orgs/{org}/document-tags").json()}


class TestSeed:
    def test_a_new_firm_starts_with_the_eight_suggestions(self, client, org):
        names = sorted(tag_ids_by_name(client, org))
        assert names == sorted(name for name, _ in tags.DEFAULT_TAGS)
        assert len(names) == 8

    def test_deleted_suggestions_do_not_come_back(self, client, org):
        ids = tag_ids_by_name(client, org)
        assert client.delete(f"/api/orgs/{org}/document-tags/{ids['عاجل']}").status_code == 204
        assert "عاجل" not in tag_ids_by_name(client, org)
        # Nothing on the read path re-plants the seed.
        assert len(client.get(f"/api/orgs/{org}/document-tags").json()) == 7


class TestTagsCrud:
    def test_create_rename_recolor(self, client, org):
        created = client.post(
            f"/api/orgs/{org}/document-tags", json={"name": "سرّي", "color": "red"}
        )
        assert created.status_code == 201, created.text
        tag_id = created.json()["id"]
        patched = client.patch(
            f"/api/orgs/{org}/document-tags/{tag_id}", json={"name": "سرّي جدًا", "color": "purple"}
        )
        assert patched.json()["name"] == "سرّي جدًا"
        assert patched.json()["color"] == "purple"

    def test_duplicate_name_in_the_same_firm_is_409_but_fine_elsewhere(self, client, org):
        assert client.post(f"/api/orgs/{org}/document-tags", json={"name": "عاجل"}).status_code == 409
        # Renaming onto an existing name is the same collision.
        ids = tag_ids_by_name(client, org)
        response = client.patch(
            f"/api/orgs/{org}/document-tags/{ids['أصل']}", json={"name": "صورة"}
        )
        assert response.status_code == 409

        other = client.post("/api/orgs", json={"name": "Second Firm"}).json()["id"]
        assert client.post(f"/api/orgs/{other}/document-tags", json={"name": "عاجل"}).status_code == 409
        # ...because the seed already gave the second firm a عاجل; a name the
        # seed does not use is free in each firm independently.
        assert client.post(f"/api/orgs/{org}/document-tags", json={"name": "خاص"}).status_code == 201
        assert client.post(f"/api/orgs/{other}/document-tags", json={"name": "خاص"}).status_code == 201

    def test_color_outside_the_palette_is_422(self, client, org):
        response = client.post(
            f"/api/orgs/{org}/document-tags", json={"name": "x", "color": "#ff0000"}
        )
        assert response.status_code == 422

    def test_blank_name_is_422(self, client, org):
        assert client.post(f"/api/orgs/{org}/document-tags", json={"name": "   "}).status_code == 422


class TestIsolation:
    def test_another_firms_tag_is_a_404_not_a_read(self, client, org):
        other = client.post("/api/orgs", json={"name": "Second Firm"}).json()["id"]
        foreign = tag_ids_by_name(client, other)["عاجل"]
        assert client.patch(f"/api/orgs/{org}/document-tags/{foreign}", json={"name": "x"}).status_code == 404
        assert client.delete(f"/api/orgs/{org}/document-tags/{foreign}").status_code == 404
        # Still there for its owner.
        assert "عاجل" in tag_ids_by_name(client, other)

    def test_a_foreign_tag_cannot_be_attached_and_nothing_changes(self, conn, client, org):
        other = client.post("/api/orgs", json={"name": "Second Firm"}).json()["id"]
        foreign = tag_ids_by_name(client, other)["عاجل"]
        mine = tag_ids_by_name(client, org)["أصل"]
        document = make_document(conn, org)
        assert client.put(
            f"/api/orgs/{org}/documents/{document.id}/tags", json={"tag_ids": [mine]}
        ).status_code == 200
        response = client.put(
            f"/api/orgs/{org}/documents/{document.id}/tags", json={"tag_ids": [mine, foreign]}
        )
        assert response.status_code == 404
        # The earlier, valid set is intact: a rejected PUT is not a partial PUT.
        listed = client.get(f"/api/orgs/{org}/documents?tag_ids={mine}").json()
        assert [d["id"] for d in listed] == [document.id]


class TestLinksAndFilters:
    def test_two_tags_filter_means_both(self, conn, client, org):
        ids = tag_ids_by_name(client, org)
        both = make_document(conn, org, name="both.pdf")
        one = make_document(conn, org, name="one.pdf")
        client.put(f"/api/orgs/{org}/documents/{both.id}/tags", json={"tag_ids": [ids["عاجل"], ids["للمراجعة"]]})
        client.put(f"/api/orgs/{org}/documents/{one.id}/tags", json={"tag_ids": [ids["عاجل"]]})

        by_one = client.get(f"/api/orgs/{org}/documents?tag_ids={ids['عاجل']}").json()
        assert {d["id"] for d in by_one} == {both.id, one.id}

        by_both = client.get(
            f"/api/orgs/{org}/documents?tag_ids={ids['عاجل']}&tag_ids={ids['للمراجعة']}"
        ).json()
        assert [d["id"] for d in by_both] == [both.id]
        assert sorted(by_both[0]["tag_ids"]) == sorted([ids["عاجل"], ids["للمراجعة"]])

    def test_put_replaces_rather_than_adds(self, conn, client, org):
        ids = tag_ids_by_name(client, org)
        document = make_document(conn, org)
        client.put(f"/api/orgs/{org}/documents/{document.id}/tags", json={"tag_ids": [ids["عاجل"]]})
        client.put(f"/api/orgs/{org}/documents/{document.id}/tags", json={"tag_ids": [ids["أصل"]]})
        fetched = client.get(f"/api/orgs/{org}/documents/{document.id}").json()
        assert fetched["tag_ids"] == [ids["أصل"]]

    def test_deleting_a_tag_keeps_the_document(self, conn, client, org):
        ids = tag_ids_by_name(client, org)
        document = make_document(conn, org)
        client.put(f"/api/orgs/{org}/documents/{document.id}/tags", json={"tag_ids": [ids["عاجل"], ids["أصل"]]})
        assert client.delete(f"/api/orgs/{org}/document-tags/{ids['عاجل']}").status_code == 204
        fetched = client.get(f"/api/orgs/{org}/documents/{document.id}")
        assert fetched.status_code == 200
        assert fetched.json()["tag_ids"] == [ids["أصل"]]

    def test_deleting_a_document_keeps_the_tag(self, conn, client, org):
        ids = tag_ids_by_name(client, org)
        document = make_document(conn, org)
        client.put(f"/api/orgs/{org}/documents/{document.id}/tags", json={"tag_ids": [ids["عاجل"]]})
        docs.delete_document(conn, org, document.id)
        assert "عاجل" in tag_ids_by_name(client, org)
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM document_tag_links WHERE document_id = %s", (document.id,))
            assert cur.fetchone()[0] == 0


class TestDocumentType:
    def test_every_listed_type_is_accepted_and_filterable(self, conn, client, org):
        for doc_type in docs.DOC_TYPES:
            make_document(conn, org, name=f"{doc_type}.pdf", doc_type=doc_type)
        for doc_type in docs.DOC_TYPES:
            listed = client.get(f"/api/orgs/{org}/documents?doc_type={doc_type}").json()
            assert [d["doc_type"] for d in listed] == [doc_type]

    def test_a_value_outside_the_list_is_rejected(self, conn, client, org):
        with pytest.raises(ValueError):
            make_document(conn, org, doc_type="PDF")
        document = make_document(conn, org)
        assert document.doc_type == "other"
        response = client.patch(f"/api/orgs/{org}/documents/{document.id}", json={"doc_type": "memo"})
        assert response.status_code == 422

    def test_filter_by_client(self, conn, client, org):
        c1 = client.post(f"/api/orgs/{org}/clients", json={"name": "A", "client_type": "company"}).json()["id"]
        c2 = client.post(f"/api/orgs/{org}/clients", json={"name": "B", "client_type": "company"}).json()["id"]
        body = {"billing_type": "hourly", "responsible_user": OWNER, "opened_date": "2026-01-05", "matter_type": "corporate"}
        m1 = client.post(f"/api/orgs/{org}/matters", json={**body, "client_id": c1, "name": "m1"}).json()["id"]
        m2 = client.post(f"/api/orgs/{org}/matters", json={**body, "client_id": c2, "name": "m2"}).json()["id"]
        d1 = make_document(conn, org, name="a.pdf", matter_id=m1)
        make_document(conn, org, name="b.pdf", matter_id=m2)
        listed = client.get(f"/api/orgs/{org}/documents?client_id={c1}").json()
        assert [d["id"] for d in listed] == [d1.id]
