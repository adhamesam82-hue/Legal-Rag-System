"""T-041: the free trial is real, the plan choice is recorded, payment is not.

What is asserted here is exactly what the owner decided: a new firm gets a
trial of LEGALOS_TRIAL_DAYS days (14 unless set), changing that setting
reaches the next firm without touching existing ones, the membership list
carries the trial so the shell can show it, an owner can record which plan
they want, and -- the one that matters most -- an expired trial refuses
NOTHING. Locking a firm out of its cases with no way to pay is out of scope
until the plans and the gateway are decided.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag import orgs
from legalrag.api import app
from legalrag.clerk import get_current_user_id

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


def create_firm(client, name="Trial Firm") -> dict:
    response = client.post("/api/orgs", json={"name": name})
    assert response.status_code == 200, response.text
    return response.json()


def parse(iso: str) -> datetime:
    return datetime.fromisoformat(iso)


def days_until(iso: str) -> float:
    return (parse(iso) - datetime.now(UTC)) / timedelta(days=1)


def set_trial_end(conn, org_id: int, when: datetime) -> None:
    with conn.cursor() as cur:
        cur.execute("UPDATE organizations SET trial_ends_at = %s WHERE id = %s", (when, org_id))
    conn.commit()


class TestTrialLength:
    def test_a_new_firm_starts_a_fourteen_day_trial(self, client, monkeypatch):
        monkeypatch.delenv("LEGALOS_TRIAL_DAYS", raising=False)
        firm = create_firm(client)
        assert firm["plan"] == "trial"
        assert firm["plan_intent"] is None
        assert firm["trial_expired"] is False
        assert 13.9 < days_until(firm["trial_ends_at"]) <= 14.0

    def test_the_length_is_a_setting_read_at_creation(self, client, monkeypatch):
        """Change the variable, restart: the next firm gets the new length."""
        monkeypatch.setenv("LEGALOS_TRIAL_DAYS", "7")
        firm = create_firm(client)
        assert 6.9 < days_until(firm["trial_ends_at"]) <= 7.0

    def test_changing_the_setting_leaves_existing_firms_alone(self, client, monkeypatch):
        monkeypatch.delenv("LEGALOS_TRIAL_DAYS", raising=False)
        first = create_firm(client, "First")
        monkeypatch.setenv("LEGALOS_TRIAL_DAYS", "7")
        second = create_firm(client, "Second")
        first_again = client.get(f"/api/orgs/{first['id']}").json()
        assert first_again["trial_ends_at"] == first["trial_ends_at"]
        assert 13.9 < days_until(first_again["trial_ends_at"]) <= 14.0
        assert 6.9 < days_until(second["trial_ends_at"]) <= 7.0

    def test_the_plans_route_reports_the_configured_length(self, client, monkeypatch):
        monkeypatch.setenv("LEGALOS_TRIAL_DAYS", "7")
        body = client.get("/api/plans").json()
        assert body["trial_days"] == 7
        # No gateway exists. The subscribe page shows this, not a card field.
        assert body["payment_available"] is False

    def test_a_bad_setting_is_refused_rather_than_read_as_zero(self, monkeypatch):
        from legalrag.config import get_trial_days

        monkeypatch.setenv("LEGALOS_TRIAL_DAYS", "soon")
        with pytest.raises(RuntimeError):
            get_trial_days()
        monkeypatch.setenv("LEGALOS_TRIAL_DAYS", "0")
        with pytest.raises(RuntimeError):
            get_trial_days()


class TestTrialOnTheMembershipList:
    """The shell reads /api/orgs/me on every page; the trial rides on it."""

    def test_the_list_carries_the_trial(self, client):
        firm = create_firm(client)
        [row] = [m for m in client.get("/api/orgs/me").json() if m["organization_id"] == firm["id"]]
        assert row["plan"] == "trial"
        assert row["trial_ends_at"] == firm["trial_ends_at"]
        assert row["trial_expired"] is False

    def test_expiry_is_reported_once_the_date_has_passed(self, client, conn):
        firm = create_firm(client)
        set_trial_end(conn, firm["id"], datetime.now(UTC) - timedelta(days=1))
        [row] = [m for m in client.get("/api/orgs/me").json() if m["organization_id"] == firm["id"]]
        assert row["trial_expired"] is True
        assert client.get(f"/api/orgs/{firm['id']}").json()["trial_expired"] is True


class TestExpiryIsASignalNotALock:
    def test_an_expired_firm_can_still_write(self, client, conn):
        """The acceptance criterion the ticket underlines: nothing is refused."""
        firm = create_firm(client)
        set_trial_end(conn, firm["id"], datetime.now(UTC) - timedelta(days=1))
        org = firm["id"]
        client_id = client.post(
            f"/api/orgs/{org}/clients", json={"name": "موكّل", "client_type": "company"}
        ).json()["id"]
        response = client.post(
            f"/api/orgs/{org}/matters",
            json={
                "billing_type": "hourly",
                "responsible_user": OWNER,
                "opened_date": "2026-01-05",
                "matter_type": "corporate",
                "client_id": client_id,
                "name": "قضية بعد انتهاء التجربة",
            },
        )
        assert response.status_code == 200, response.text
        assert client.patch(f"/api/orgs/{org}", json={"phone": "0100"}).status_code == 200


class TestPlanIntent:
    def test_the_owner_records_a_choice_and_settings_show_it(self, client):
        firm = create_firm(client)
        response = client.post(f"/api/orgs/{firm['id']}/plan-intent", json={"plan": "pro"})
        assert response.status_code == 200, response.text
        assert response.json()["plan_intent"] == "pro"
        # An intent, not a subscription: the plan and the trial are untouched.
        assert response.json()["plan"] == "trial"
        assert response.json()["trial_ends_at"] == firm["trial_ends_at"]
        assert client.get(f"/api/orgs/{firm['id']}").json()["plan_intent"] == "pro"

    def test_a_second_choice_replaces_the_first(self, client):
        firm = create_firm(client)
        client.post(f"/api/orgs/{firm['id']}/plan-intent", json={"plan": "basic"})
        client.post(f"/api/orgs/{firm['id']}/plan-intent", json={"plan": "enterprise"})
        assert client.get(f"/api/orgs/{firm['id']}").json()["plan_intent"] == "enterprise"

    def test_an_unknown_plan_is_refused(self, client):
        firm = create_firm(client)
        response = client.post(f"/api/orgs/{firm['id']}/plan-intent", json={"plan": "trial"})
        assert response.status_code == 422
        response = client.post(f"/api/orgs/{firm['id']}/plan-intent", json={"plan": "platinum"})
        assert response.status_code == 422

    def test_a_lawyer_cannot_commit_the_firm(self, client, conn):
        firm = create_firm(client)
        orgs.add_membership(conn, firm["id"], LAWYER, "lawyer")
        app.dependency_overrides[get_current_user_id] = lambda: LAWYER
        response = client.post(f"/api/orgs/{firm['id']}/plan-intent", json={"plan": "pro"})
        assert response.status_code == 403
        # They still see the trial on their own membership list, like anyone.
        [row] = client.get("/api/orgs/me").json()
        assert row["plan"] == "trial"

    def test_the_settings_patch_cannot_set_it_by_accident(self, client):
        """plan_intent is not an UpdateOrganizationRequest field: a client that
        posts every column it knows cannot record a choice nobody made."""
        firm = create_firm(client)
        response = client.patch(f"/api/orgs/{firm['id']}", json={"plan_intent": "pro", "phone": "0100"})
        assert response.status_code == 200
        assert response.json()["plan_intent"] is None
