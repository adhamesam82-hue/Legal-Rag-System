"""T-044: Creating litigation case records directly from the matter workspace.

Covers:
- Creating a case with only matter_id (all other fields optional, filed_date: null)
- 409 Conflict when creating a duplicate case for the same matter
- Updating filed_date and case details via PATCH later
- Writing facts/narrative immediately after creating a bare case
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id

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
    return client.post("/api/orgs", json={"name": "Case Creation Firm"}).json()["id"]


@pytest.fixture
def matter(client, org):
    client_id = client.post(f"/api/orgs/{org}/clients", json={"name": "موكّل تجريبي"}).json()["id"]
    return client.post(
        f"/api/orgs/{org}/matters",
        json={
            "name": "دعوى تجارية",
            "client_id": client_id,
            "matter_type": "commercial",
            "billing_type": "hourly",
            "responsible_user": OWNER,
            "opened_date": "2026-09-01",
        },
    ).json()["id"]


class TestCaseCreation:
    def test_create_case_with_matter_id_alone(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/cases",
            json={"matter_id": matter},
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["matter_id"] == matter
        assert data["court"] == ""
        assert data["case_number"] == ""
        assert data["filed_date"] is None
        assert data["litigation_degree"] == "first_instance"
        assert data["facts"] == ""

    def test_duplicate_case_for_same_matter_returns_409(self, client, org, matter):
        # First creation succeeds
        first = client.post(f"/api/orgs/{org}/cases", json={"matter_id": matter})
        assert first.status_code == 201, first.text

        # Second creation for the same matter returns 409
        second = client.post(f"/api/orgs/{org}/cases", json={"matter_id": matter})
        assert second.status_code == 409, second.text
        assert "already has a case record" in second.json()["detail"]

    def test_patch_filed_date_and_case_number_later(self, client, org, matter):
        # Create bare case
        created = client.post(f"/api/orgs/{org}/cases", json={"matter_id": matter}).json()
        case_id = created["id"]
        assert created["filed_date"] is None

        # Patch with court, number and filing date
        patched = client.patch(
            f"/api/orgs/{org}/cases/{case_id}",
            json={
                "court": "محكمة القاهرة الاقتصادية",
                "case_number": "9876",
                "judicial_year": 2026,
                "filed_date": "2026-09-03",
            },
        )
        assert patched.status_code == 200, patched.text
        data = patched.json()
        assert data["court"] == "محكمة القاهرة الاقتصادية"
        assert data["case_number"] == "9876"
        assert data["judicial_year"] == 2026
        assert data["filed_date"] == "2026-09-03"

        # Verify get endpoint returns updated fields
        fetched = client.get(f"/api/orgs/{org}/cases/{case_id}").json()
        assert fetched["court"] == "محكمة القاهرة الاقتصادية"
        assert fetched["case_number"] == "9876"
        assert fetched["filed_date"] == "2026-09-03"

    def test_write_facts_immediately_after_creation(self, client, org, matter):
        created = client.post(f"/api/orgs/{org}/cases", json={"matter_id": matter}).json()
        case_id = created["id"]

        facts_text = "حضر الموكّل وأفاد بوجود نزاع حول توريد بضائع تم الاتفاق عليها بعقد مؤرخ في أغسطس ٢٠٢٦."
        patched = client.patch(
            f"/api/orgs/{org}/cases/{case_id}",
            json={"facts": facts_text},
        )
        assert patched.status_code == 200, patched.text
        assert patched.json()["facts"] == facts_text

        fetched = client.get(f"/api/orgs/{org}/cases/{case_id}").json()
        assert fetched["facts"] == facts_text
