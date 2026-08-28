"""The توكيل a firm acts under. T-012.

Against a real Postgres, like the other practice-pillar tests: only
get_current_user_id is faked, so get_current_membership still runs and the
tenant gate on every route is genuinely exercised.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"
LAWYER = "user_lawyer"


@pytest.fixture(autouse=True)
def _fresh_limits():
    reset_limits()
    yield
    reset_limits()


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
    return client.post("/api/orgs", json={"name": "Test Firm"}).json()["id"]


@pytest.fixture
def client_id(client, org):
    response = client.post(
        f"/api/orgs/{org}/clients", json={"name": "شركة دلتا للأغذية"}
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def make_poa(client, org, client_id, **overrides):
    body = {
        "client_id": client_id,
        "poa_number": "4521/ج",
        "poa_type": "litigation",
        "issued_on": "2026-01-15",
        "notary_office": "الشهر العقاري - مصر الجديدة",
    }
    body.update(overrides)
    return client.post(f"/api/orgs/{org}/powers-of-attorney", json=body)


class TestCreate:
    def test_records_a_power_of_attorney(self, client, org, client_id):
        response = make_poa(client, org, client_id)
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["poa_number"] == "4521/ج"
        assert body["poa_type"] == "litigation"
        assert body["client_name"] == "شركة دلتا للأغذية"

    def test_rejects_an_unknown_type(self, client, org, client_id):
        assert make_poa(client, org, client_id, poa_type="حاجة").status_code == 422

    def test_rejects_a_client_from_another_firm(self, client, org, client_id):
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        # The client id is real, but it is not this firm's.
        assert make_poa(client, other, client_id).status_code == 404

    def test_rejects_expiry_before_issue(self, client, org, client_id):
        response = make_poa(
            client, org, client_id, issued_on="2026-01-15", expires_on="2025-01-15"
        )
        assert response.status_code == 422

    def test_refuses_a_duplicate_number_in_the_same_firm(self, client, org, client_id):
        assert make_poa(client, org, client_id).status_code == 201
        assert make_poa(client, org, client_id).status_code == 409

    def test_the_same_number_may_exist_in_another_firm(self, client, org, client_id):
        assert make_poa(client, org, client_id).status_code == 201
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        other_client = client.post(
            f"/api/orgs/{other}/clients", json={"name": "موكّل آخر"}
        ).json()["id"]
        assert make_poa(client, other, other_client).status_code == 201


class TestList:
    def test_lists_only_this_firms_records(self, client, org, client_id):
        make_poa(client, org, client_id)
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        rows = client.get(f"/api/orgs/{other}/powers-of-attorney").json()
        assert rows == []

    def test_filters_by_client(self, client, org, client_id):
        make_poa(client, org, client_id)
        second = client.post(
            f"/api/orgs/{org}/clients", json={"name": "موكّل ثانٍ"}
        ).json()["id"]
        make_poa(client, org, second, poa_number="99/د")

        rows = client.get(
            f"/api/orgs/{org}/powers-of-attorney", params={"client_id": second}
        ).json()
        assert [r["poa_number"] for r in rows] == ["99/د"]

    def test_can_hide_expired_ones(self, client, org, client_id):
        make_poa(
            client, org, client_id,
            poa_number="old/1", issued_on="2020-01-01", expires_on="2020-12-31",
        )
        make_poa(client, org, client_id, poa_number="live/1")

        everything = client.get(f"/api/orgs/{org}/powers-of-attorney").json()
        current = client.get(
            f"/api/orgs/{org}/powers-of-attorney", params={"include_expired": False}
        ).json()
        assert len(everything) == 2
        assert [r["poa_number"] for r in current] == ["live/1"]

    def test_an_open_ended_one_never_counts_as_expired(self, client, org, client_id):
        """Most توكيلات carry no expiry at all; those must not be filtered out."""
        make_poa(client, org, client_id, expires_on=None)
        current = client.get(
            f"/api/orgs/{org}/powers-of-attorney", params={"include_expired": False}
        ).json()
        assert len(current) == 1


class TestExpiring:
    def test_reports_one_about_to_lapse(self, client, org, client_id):
        soon = (date.today() + timedelta(days=10)).isoformat()
        make_poa(client, org, client_id, expires_on=soon)
        rows = client.get(f"/api/orgs/{org}/powers-of-attorney/expiring").json()
        assert len(rows) == 1

    def test_ignores_one_further_out(self, client, org, client_id):
        later = (date.today() + timedelta(days=200)).isoformat()
        make_poa(client, org, client_id, expires_on=later)
        rows = client.get(f"/api/orgs/{org}/powers-of-attorney/expiring").json()
        assert rows == []

    def test_ignores_one_already_lapsed(self, client, org, client_id):
        """Already gone is a different problem from about to go."""
        past = (date.today() - timedelta(days=5)).isoformat()
        make_poa(
            client, org, client_id, issued_on="2020-01-01", expires_on=past
        )
        rows = client.get(f"/api/orgs/{org}/powers-of-attorney/expiring").json()
        assert rows == []


class TestAttachToMatter:
    @pytest.fixture
    def matter_id(self, client, org, client_id):
        response = client.post(
            f"/api/orgs/{org}/matters",
            json={
                "name": "نزاع توريد",
                "client_id": client_id,
                "matter_type": "litigation",
                "billing_type": "hourly",
                "responsible_user": OWNER,
                "opened_date": "2026-02-01",
            },
        )
        assert response.status_code == 201, response.text
        return response.json()["id"]

    def test_links_a_matter_to_its_authority(self, client, org, client_id, matter_id):
        poa_id = make_poa(client, org, client_id).json()["id"]
        response = client.put(
            f"/api/orgs/{org}/matters/{matter_id}/power-of-attorney",
            json={"power_of_attorney_id": poa_id},
        )
        assert response.status_code == 200, response.text
        assert response.json()["power_of_attorney_id"] == poa_id

    def test_the_link_can_be_cleared(self, client, org, client_id, matter_id):
        poa_id = make_poa(client, org, client_id).json()["id"]
        client.put(
            f"/api/orgs/{org}/matters/{matter_id}/power-of-attorney",
            json={"power_of_attorney_id": poa_id},
        )
        response = client.put(
            f"/api/orgs/{org}/matters/{matter_id}/power-of-attorney",
            json={"power_of_attorney_id": None},
        )
        assert response.json()["power_of_attorney_id"] is None

    def test_a_matter_may_be_opened_with_no_authority_yet(self, client, matter_id):
        """Opening the file before the توكيل is signed is ordinary practice."""
        # matter_id fixture created one without ever setting a poa.
        assert matter_id is not None

    def test_cannot_point_a_matter_at_another_firms_authority(
        self, client, org, client_id, matter_id
    ):
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        other_client = client.post(
            f"/api/orgs/{other}/clients", json={"name": "موكّل آخر"}
        ).json()["id"]
        foreign = make_poa(client, other, other_client, poa_number="X/1").json()["id"]

        response = client.put(
            f"/api/orgs/{org}/matters/{matter_id}/power-of-attorney",
            json={"power_of_attorney_id": foreign},
        )
        assert response.status_code == 404

    def test_deleting_the_authority_leaves_the_matter(
        self, client, org, client_id, matter_id
    ):
        """A matter must not disappear because its توكيل was tidied away."""
        poa_id = make_poa(client, org, client_id).json()["id"]
        client.put(
            f"/api/orgs/{org}/matters/{matter_id}/power-of-attorney",
            json={"power_of_attorney_id": poa_id},
        )
        assert (
            client.delete(f"/api/orgs/{org}/powers-of-attorney/{poa_id}").status_code
            == 204
        )
        matter = client.get(f"/api/orgs/{org}/matters/{matter_id}").json()
        assert matter["power_of_attorney_id"] is None


class TestUpdateAndDelete:
    def test_updates_a_field(self, client, org, client_id):
        poa_id = make_poa(client, org, client_id).json()["id"]
        response = client.patch(
            f"/api/orgs/{org}/powers-of-attorney/{poa_id}",
            json={"notary_office": "الشهر العقاري - الدقي"},
        )
        assert response.json()["notary_office"] == "الشهر العقاري - الدقي"

    def test_a_lawyer_cannot_delete_one(self, client, conn, org, client_id):
        poa_id = make_poa(client, org, client_id).json()["id"]
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role) "
                "VALUES (%s, %s, 'lawyer')",
                (org, LAWYER),
            )
        conn.commit()

        app.dependency_overrides[get_current_user_id] = lambda: LAWYER
        try:
            assert (
                client.delete(
                    f"/api/orgs/{org}/powers-of-attorney/{poa_id}"
                ).status_code
                == 403
            )
        finally:
            app.dependency_overrides[get_current_user_id] = lambda: OWNER

    def test_a_missing_one_is_a_404(self, client, org):
        assert client.get(f"/api/orgs/{org}/powers-of-attorney/999999").status_code == 404
