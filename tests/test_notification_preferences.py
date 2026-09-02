"""T-034: a member's own reminder channels.

Not a firm setting -- any member reads and writes their own regardless of
role, and the route reports whether each channel can deliver anything at
all right now (Resend/Firebase configured), so the settings screen never
shows a switch that does nothing.
"""
from __future__ import annotations

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


@pytest.fixture
def org(client):
    return client.post("/api/orgs", json={"name": "Notification Firm"}).json()["id"]


class TestNotificationPreferences:
    def test_defaults_are_both_on(self, client, org):
        response = client.get(f"/api/orgs/{org}/notification-preferences")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["wants_reminders"] is True
        assert body["wants_push"] is True
        assert isinstance(body["email_available"], bool)
        assert isinstance(body["push_available"], bool)

    def test_a_partial_patch_leaves_the_other_channel_alone(self, client, org):
        response = client.patch(
            f"/api/orgs/{org}/notification-preferences", json={"wants_push": False}
        )
        assert response.status_code == 200, response.text
        assert response.json()["wants_reminders"] is True
        assert response.json()["wants_push"] is False
        again = client.get(f"/api/orgs/{org}/notification-preferences").json()
        assert again["wants_reminders"] is True
        assert again["wants_push"] is False

    def test_a_lawyer_sets_their_own_without_being_owner(self, client, conn, org):
        """Not a firm setting: role does not gate this, unlike PATCH /orgs/{id}."""
        orgs.add_membership(conn, org, LAWYER, "lawyer")
        app.dependency_overrides[get_current_user_id] = lambda: LAWYER
        response = client.patch(
            f"/api/orgs/{org}/notification-preferences", json={"wants_reminders": False}
        )
        assert response.status_code == 200, response.text
        assert response.json()["wants_reminders"] is False

    def test_setting_your_own_does_not_touch_anyone_elses(self, client, conn, org):
        orgs.add_membership(conn, org, LAWYER, "lawyer")
        app.dependency_overrides[get_current_user_id] = lambda: LAWYER
        client.patch(f"/api/orgs/{org}/notification-preferences", json={"wants_push": False})

        app.dependency_overrides[get_current_user_id] = lambda: OWNER
        owner_prefs = client.get(f"/api/orgs/{org}/notification-preferences").json()
        assert owner_prefs["wants_push"] is True

    def test_a_non_member_is_refused_not_shown_someone_elses_row(self, client, org):
        # get_current_membership gates this before the route body ever runs.
        app.dependency_overrides[get_current_user_id] = lambda: "user_stranger"
        assert client.get(f"/api/orgs/{org}/notification-preferences").status_code == 403
