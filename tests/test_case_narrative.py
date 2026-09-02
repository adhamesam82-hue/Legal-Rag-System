"""T-024: the case file proper, and sub-cases before other courts.

Against a real Postgres, in the style of tests/test_hearings.py.
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.practice.cases import NARRATIVE_FIELDS

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
    return client.post("/api/orgs", json={"name": "Narrative Firm"}).json()["id"]


def make_case(client, org, name="نزاع", **overrides):
    client_id = client.post(f"/api/orgs/{org}/clients", json={"name": "شركة النيل"}).json()["id"]
    matter_id = client.post(
        f"/api/orgs/{org}/matters",
        json={
            "name": name,
            "client_id": client_id,
            "matter_type": "corporate",
            "billing_type": "hourly",
            "responsible_user": OWNER,
            "opened_date": "2026-01-05",
        },
    ).json()["id"]
    body = {
        "matter_id": matter_id,
        "court": "محكمة شمال القاهرة الابتدائية",
        "case_number": "1234",
        "judicial_year": 2026,
        "filed_date": "2026-01-10",
    } | overrides
    response = client.post(f"/api/orgs/{org}/cases", json=body)
    assert response.status_code == 201, response.text
    return response.json()


FACTS = (
    "تعاقد الطرفان في ١٥ يناير ٢٠٢٥ على توريد ٤٠ طنًّا من الحديد.\n"
    "لم يسلّم المدّعى عليه سوى ٢٥ طنًّا حتى تاريخ رفع الدعوى."
)


class TestNarrative:
    def test_a_new_case_has_six_empty_fields_not_nulls(self, client, org):
        case = make_case(client, org)
        for name in NARRATIVE_FIELDS:
            assert case[name] == "", name
        assert case["parent_case_id"] is None
        assert case["parent"] is None
        assert case["children"] == []

    def test_each_field_round_trips_verbatim(self, client, org):
        case = make_case(client, org)
        payload = {name: f"{name}: {FACTS}" for name in NARRATIVE_FIELDS}
        patched = client.patch(f"/api/orgs/{org}/cases/{case['id']}", json=payload)
        assert patched.status_code == 200, patched.text
        fetched = client.get(f"/api/orgs/{org}/cases/{case['id']}").json()
        for name in NARRATIVE_FIELDS:
            # Byte for byte: the newline and the Arabic digits survive.
            assert fetched[name] == payload[name], name

    def test_patching_one_field_leaves_the_others(self, client, org):
        case = make_case(client, org)
        client.patch(f"/api/orgs/{org}/cases/{case['id']}", json={"facts": FACTS})
        client.patch(f"/api/orgs/{org}/cases/{case['id']}", json={"defences": "دفع بعدم القبول"})
        fetched = client.get(f"/api/orgs/{org}/cases/{case['id']}").json()
        assert fetched["facts"] == FACTS
        assert fetched["defences"] == "دفع بعدم القبول"
        assert fetched["summary"] == ""

    def test_ai_summary_is_not_the_summary(self, client, org):
        case = make_case(client, org, ai_summary="machine text")
        client.patch(f"/api/orgs/{org}/cases/{case['id']}", json={"summary": "ملخّص المحامي"})
        fetched = client.get(f"/api/orgs/{org}/cases/{case['id']}").json()
        assert fetched["summary"] == "ملخّص المحامي"
        assert fetched["ai_summary"] == "machine text"


class TestSubCases:
    def test_link_then_both_sides_see_it(self, client, org):
        parent = make_case(client, org, name="أصل")
        child = make_case(client, org, name="استئناف", case_number="77", litigation_degree="appeal")
        response = client.patch(
            f"/api/orgs/{org}/cases/{child['id']}", json={"parent_case_id": parent["id"]}
        )
        assert response.status_code == 200, response.text
        assert response.json()["parent"]["id"] == parent["id"]
        assert response.json()["parent"]["case_number"] == "1234"

        fetched_parent = client.get(f"/api/orgs/{org}/cases/{parent['id']}").json()
        assert [c["id"] for c in fetched_parent["children"]] == [child["id"]]
        assert fetched_parent["children"][0]["litigation_degree"] == "appeal"
        assert fetched_parent["parent"] is None

    def test_a_case_cannot_be_its_own_parent(self, client, org):
        case = make_case(client, org)
        response = client.patch(
            f"/api/orgs/{org}/cases/{case['id']}", json={"parent_case_id": case["id"]}
        )
        assert response.status_code == 422
        assert "itself" in response.json()["detail"]

    def test_one_level_only_in_both_directions(self, client, org):
        a = make_case(client, org, name="أ")
        b = make_case(client, org, name="ب", case_number="2")
        c = make_case(client, org, name="ج", case_number="3")
        assert client.patch(f"/api/orgs/{org}/cases/{b['id']}", json={"parent_case_id": a["id"]}).status_code == 200
        # b has a parent, so b cannot be a parent.
        response = client.patch(f"/api/orgs/{org}/cases/{c['id']}", json={"parent_case_id": b["id"]})
        assert response.status_code == 422
        assert "one level" in response.json()["detail"]
        # a has children, so a cannot be given a parent -- which is also the
        # cycle a -> b -> a, refused with a reason rather than created.
        response = client.patch(f"/api/orgs/{org}/cases/{a['id']}", json={"parent_case_id": b["id"]})
        assert response.status_code == 422
        # Nothing changed underneath.
        assert client.get(f"/api/orgs/{org}/cases/{a['id']}").json()["parent_case_id"] is None

    def test_a_parent_from_another_firm_is_404_not_500(self, client, org):
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        foreign = make_case(client, other, name="غريب")
        mine = make_case(client, org)
        response = client.patch(
            f"/api/orgs/{org}/cases/{mine['id']}", json={"parent_case_id": foreign["id"]}
        )
        assert response.status_code == 404
        assert client.get(f"/api/orgs/{org}/cases/{mine['id']}").json()["parent_case_id"] is None

    def test_null_clears_the_link_and_omission_keeps_it(self, client, org):
        parent = make_case(client, org, name="أصل")
        child = make_case(client, org, name="فرع", case_number="9")
        client.patch(f"/api/orgs/{org}/cases/{child['id']}", json={"parent_case_id": parent["id"]})
        kept = client.patch(f"/api/orgs/{org}/cases/{child['id']}", json={"facts": "x"}).json()
        assert kept["parent_case_id"] == parent["id"]
        cleared = client.patch(f"/api/orgs/{org}/cases/{child['id']}", json={"parent_case_id": None}).json()
        assert cleared["parent_case_id"] is None
        assert client.get(f"/api/orgs/{org}/cases/{parent['id']}").json()["children"] == []

    def test_deleting_the_parent_orphans_the_child_rather_than_deleting_it(self, conn, client, org):
        parent = make_case(client, org, name="أصل")
        child = make_case(client, org, name="فرع", case_number="9")
        client.patch(f"/api/orgs/{org}/cases/{child['id']}", json={"parent_case_id": parent["id"]})
        with conn.cursor() as cur:
            cur.execute("DELETE FROM cases WHERE id = %s", (parent["id"],))
        conn.commit()
        fetched = client.get(f"/api/orgs/{org}/cases/{child['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["parent_case_id"] is None
        assert fetched.json()["parent"] is None
