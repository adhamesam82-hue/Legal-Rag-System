"""T-023: the unified matter-type list and the firm's specialties.

Against a real Postgres, like tests/test_practice_api.py. The migration's data
mapping is exercised by inserting a pre-0021 value under the old constraint
shape is not possible once 0021 has run, so the mapping is checked the other
way round: a `legacy_litigation` row is readable and filterable, and the API
refuses to create another one.
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.practice.matters import LEGACY_MATTER_TYPES, MATTER_TYPES

OWNER = "user_owner"
LAWYER = "user_lawyer"


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
    return client.post("/api/orgs", json={"name": "Taxonomy Firm"}).json()["id"]


@pytest.fixture
def client_id(client, org):
    response = client.post(
        f"/api/orgs/{org}/clients", json={"name": "Nile Trading Co.", "client_type": "company"}
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def post_matter(client, org, client_id, matter_type):
    return client.post(
        f"/api/orgs/{org}/matters",
        json={
            "client_id": client_id,
            "name": f"matter of type {matter_type}",
            "matter_type": matter_type,
            "billing_type": "hourly",
            "responsible_user": OWNER,
            "opened_date": "2026-01-05",
        },
    )


class TestTheList:
    def test_fourteen_values_and_the_legacy_marker_is_not_one(self):
        assert len(MATTER_TYPES) == 14
        assert "litigation" not in MATTER_TYPES
        assert "family_probate" not in MATTER_TYPES
        assert "contract_review" not in MATTER_TYPES
        assert LEGACY_MATTER_TYPES == ("legacy_litigation",)
        assert not set(LEGACY_MATTER_TYPES) & set(MATTER_TYPES)

    def test_every_value_is_accepted_by_the_api_and_the_database(self, client, org, client_id):
        # The gap this ticket closes: before 0021 the request schema listed
        # six values while the database took ten, so criminal, administrative,
        # execution and arbitration were 422s. Every value must round-trip.
        for matter_type in MATTER_TYPES:
            response = post_matter(client, org, client_id, matter_type)
            assert response.status_code == 201, (matter_type, response.text)
            assert response.json()["matter_type"] == matter_type

    @pytest.mark.parametrize("old", ["litigation", "family_probate", "contract_review"])
    def test_pre_0021_values_are_rejected_on_create(self, client, org, client_id, old):
        assert post_matter(client, org, client_id, old).status_code == 422

    def test_legacy_marker_is_rejected_on_create_and_on_patch(self, client, org, client_id):
        assert post_matter(client, org, client_id, "legacy_litigation").status_code == 422
        created = post_matter(client, org, client_id, "civil").json()
        response = client.patch(
            f"/api/orgs/{org}/matters/{created['id']}", json={"matter_type": "legacy_litigation"}
        )
        assert response.status_code == 422


class TestLegacyRowsSurvive:
    def test_a_legacy_row_is_readable_filterable_and_reclassifiable(
        self, conn, client, org, client_id
    ):
        created = post_matter(client, org, client_id, "civil").json()
        # What 0021 did to every "litigation" row, done to this one directly.
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE matters SET matter_type = 'legacy_litigation' WHERE id = %s",
                (created["id"],),
            )
        conn.commit()

        fetched = client.get(f"/api/orgs/{org}/matters/{created['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["matter_type"] == "legacy_litigation"

        listed = client.get(f"/api/orgs/{org}/matters?matter_type=legacy_litigation").json()
        assert [m["id"] for m in listed] == [created["id"]]

        # The way out: the lawyer says what it actually was.
        response = client.patch(
            f"/api/orgs/{org}/matters/{created['id']}", json={"matter_type": "commercial"}
        )
        assert response.status_code == 200
        assert response.json()["matter_type"] == "commercial"


class TestSpecialties:
    def test_empty_by_default(self, client, org):
        assert client.get(f"/api/orgs/{org}").json()["specialties"] == []

    def test_set_and_read_back_in_order(self, client, org):
        response = client.patch(
            f"/api/orgs/{org}", json={"specialties": ["criminal", "civil", "criminal"]}
        )
        assert response.status_code == 200, response.text
        # De-duplicated, order as given.
        assert response.json()["specialties"] == ["criminal", "civil"]
        assert client.get(f"/api/orgs/{org}").json()["specialties"] == ["criminal", "civil"]

    def test_patching_other_fields_leaves_specialties_alone(self, client, org):
        client.patch(f"/api/orgs/{org}", json={"specialties": ["tax"]})
        response = client.patch(f"/api/orgs/{org}", json={"phone": "+20 2 1234"})
        assert response.json()["specialties"] == ["tax"]
        assert response.json()["phone"] == "+20 2 1234"

    def test_can_be_cleared_with_an_empty_list(self, client, org):
        client.patch(f"/api/orgs/{org}", json={"specialties": ["tax"]})
        response = client.patch(f"/api/orgs/{org}", json={"specialties": []})
        assert response.json()["specialties"] == []

    @pytest.mark.parametrize("bad", ["legacy_litigation", "litigation", "space law"])
    def test_values_outside_the_list_are_422(self, client, org, bad):
        response = client.patch(f"/api/orgs/{org}", json={"specialties": ["civil", bad]})
        assert response.status_code == 422
        assert bad in response.json()["detail"]
        # Nothing was written.
        assert client.get(f"/api/orgs/{org}").json()["specialties"] == []

    def test_database_constraint_agrees_with_the_api(self, conn, org):
        # If the Python list and the CHECK ever drift, this is what catches it.
        import psycopg

        with conn.cursor() as cur:
            cur.execute(
                "UPDATE organizations SET specialties = %s WHERE id = %s",
                (list(MATTER_TYPES), org),
            )
        conn.commit()
        with pytest.raises(psycopg.errors.CheckViolation):
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE organizations SET specialties = %s WHERE id = %s",
                    (["legacy_litigation"], org),
                )
        conn.rollback()

    def test_only_the_owner_may_set_them(self, conn, client, org):
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role) "
                "VALUES (%s, %s, 'lawyer')",
                (org, LAWYER),
            )
        conn.commit()
        app.dependency_overrides[get_current_user_id] = lambda: LAWYER
        try:
            response = client.patch(f"/api/orgs/{org}", json={"specialties": ["civil"]})
        finally:
            app.dependency_overrides[get_current_user_id] = lambda: OWNER
        assert response.status_code == 403
