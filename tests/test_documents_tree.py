"""T-031: what the documents tree asks of the API.

The tree shows a count on every node (facets, tag document_count), an
"unfiled" node for documents with no matter, and pages through a long list
instead of downloading it. Same Postgres-backed style as test_document_tags.
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.practice import documents as docs

OWNER = "user_owner"


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
    return client.post("/api/orgs", json={"name": "Tree Firm"}).json()["id"]


def make_document(conn, org, name="memo.pdf", **kw):
    return docs.create_document(conn, org, name=name, uploaded_by=OWNER, **kw)


def make_matter(client, org, client_id, name):
    body = {
        "billing_type": "hourly",
        "responsible_user": OWNER,
        "opened_date": "2026-01-05",
        "matter_type": "corporate",
        "client_id": client_id,
        "name": name,
    }
    return client.post(f"/api/orgs/{org}/matters", json=body).json()["id"]


def make_client(client, org, name):
    return client.post(
        f"/api/orgs/{org}/clients", json={"name": name, "client_type": "company"}
    ).json()["id"]


class TestFacets:
    def test_counts_every_axis_at_once(self, conn, client, org):
        c1 = make_client(client, org, "A")
        c2 = make_client(client, org, "B")
        m1 = make_matter(client, org, c1, "m1")
        m2 = make_matter(client, org, c1, "m2")
        m3 = make_matter(client, org, c2, "m3")
        make_document(conn, org, name="1.pdf", matter_id=m1, doc_type="brief")
        make_document(conn, org, name="2.pdf", matter_id=m1, doc_type="judgment")
        make_document(conn, org, name="3.pdf", matter_id=m2, doc_type="brief")
        make_document(conn, org, name="4.pdf", matter_id=m3)
        make_document(conn, org, name="5.pdf")  # unfiled

        facets = client.get(f"/api/orgs/{org}/documents/facets").json()
        assert facets["total"] == 5
        assert facets["unfiled"] == 1
        assert facets["by_matter"] == {str(m1): 2, str(m2): 1, str(m3): 1}
        assert facets["by_client"] == {str(c1): 3, str(c2): 1}
        assert facets["by_type"] == {"brief": 2, "judgment": 1, "other": 2}

    def test_facets_is_a_route_not_a_document_id(self, client, org):
        # /documents/facets must be matched before /documents/{document_id}.
        response = client.get(f"/api/orgs/{org}/documents/facets")
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_facets_do_not_cross_firms(self, conn, client, org):
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        make_document(conn, other, name="theirs.pdf")
        assert client.get(f"/api/orgs/{org}/documents/facets").json()["total"] == 0


class TestUnfiledAndPaging:
    def test_unfiled_lists_only_documents_without_a_matter(self, conn, client, org):
        c = make_client(client, org, "A")
        m = make_matter(client, org, c, "m")
        make_document(conn, org, name="filed.pdf", matter_id=m)
        loose = make_document(conn, org, name="loose.pdf")
        listed = client.get(f"/api/orgs/{org}/documents?unfiled=true").json()
        assert [d["id"] for d in listed] == [loose.id]

    def test_limit_and_offset_page_in_upload_order(self, conn, client, org):
        made = [make_document(conn, org, name=f"{i}.pdf") for i in range(5)]
        newest_first = [d.id for d in reversed(made)]
        page1 = client.get(f"/api/orgs/{org}/documents?limit=2&offset=0").json()
        page2 = client.get(f"/api/orgs/{org}/documents?limit=2&offset=2").json()
        page3 = client.get(f"/api/orgs/{org}/documents?limit=2&offset=4").json()
        assert [d["id"] for d in page1 + page2 + page3] == newest_first

    def test_limit_bounds_are_enforced(self, client, org):
        assert client.get(f"/api/orgs/{org}/documents?limit=0").status_code == 422
        assert client.get(f"/api/orgs/{org}/documents?limit=501").status_code == 422
        assert client.get(f"/api/orgs/{org}/documents?offset=-1").status_code == 422


class TestTagCounts:
    def test_list_carries_how_many_documents_each_tag_is_on(self, conn, client, org):
        by_name = {t["name"]: t for t in client.get(f"/api/orgs/{org}/document-tags").json()}
        assert all(t["document_count"] == 0 for t in by_name.values())
        urgent = by_name["عاجل"]["id"]
        for i in range(3):
            d = make_document(conn, org, name=f"{i}.pdf")
            client.put(f"/api/orgs/{org}/documents/{d.id}/tags", json={"tag_ids": [urgent]})
        by_name = {t["name"]: t for t in client.get(f"/api/orgs/{org}/document-tags").json()}
        assert by_name["عاجل"]["document_count"] == 3
        assert by_name["أصل"]["document_count"] == 0
