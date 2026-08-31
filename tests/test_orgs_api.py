"""API route tests. The Clerk auth dependency is overridden throughout, so
this suite never makes a real Clerk network call -- only get_current_user_id
is faked; get_current_membership and require_owner still run for real against
a real database, so the role-check logic itself is exercised.
"""
from __future__ import annotations

import pytest

from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id


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
    # Scoped to organizations this test created; see tests/conftest.py.
    drop_organizations_after(connection, mark)
    connection.close()


@pytest.fixture
def client(conn):
    def fake_user():
        return "user_owner"

    app.dependency_overrides[get_current_user_id] = fake_user
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user_id, None)


class TestCreateOrganization:
    def test_creates_and_returns_the_org(self, client):
        response = client.post("/api/orgs", json={"name": "Test Firm"})
        assert response.status_code == 200
        assert response.json()["name"] == "Test Firm"


class TestListMyOrganizations:
    def test_lists_organizations_the_caller_belongs_to(self, client):
        client.post("/api/orgs", json={"name": "Firm A"})
        response = client.get("/api/orgs/me")
        assert response.status_code == 200
        names = [m["organization_name"] for m in response.json()]
        assert names == ["Firm A"]


class TestInvites:
    def test_owner_can_invite_and_the_invite_previews_publicly(self, client, conn, monkeypatch):
        monkeypatch.setattr("legalrag.api.send_invite_email", lambda **kwargs: None)
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]

        invite_response = client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        )
        assert invite_response.status_code == 200
        token = invite_response.json()["token"]

        preview_response = client.get(f"/api/invites/{token}")
        assert preview_response.status_code == 200
        assert preview_response.json()["organization_name"] == "Firm"
        assert preview_response.json()["role"] == "lawyer"

    def test_non_owner_cannot_invite(self, client, conn, monkeypatch):
        from legalrag.orgs import add_membership

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        add_membership(conn, org_id, "user_staff", "staff")

        app.dependency_overrides[get_current_user_id] = lambda: "user_staff"
        response = client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        )
        assert response.status_code == 403

    def test_accepting_an_invite_creates_membership(self, client, conn, monkeypatch):
        monkeypatch.setattr("legalrag.api.send_invite_email", lambda **kwargs: None)
        monkeypatch.setattr(
            "legalrag.api.get_user_primary_email", lambda clerk_user_id: "new@example.com"
        )
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        token = client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        ).json()["token"]

        app.dependency_overrides[get_current_user_id] = lambda: "user_new"
        response = client.post(f"/api/invites/{token}/accept")
        assert response.status_code == 200
        assert response.json()["role"] == "lawyer"

    def test_dev_auth_accepts_without_clerk(self, client, conn, monkeypatch):
        """Accepting must work where Clerk is not configured at all.

        The dev escape hatch exists so the whole stack runs before Clerk is
        set up, and accept was its one dead end: the endpoint asked Clerk's
        Backend API for the accepter's email, which raised over the missing
        CLERK_SECRET_KEY -- a 500 that surfaced in the browser as a CORS
        failure and read as "API unreachable". In dev mode the invitation's
        own address is the accepting address.
        """
        monkeypatch.setattr("legalrag.api.send_invite_email", lambda **kwargs: None)

        def explode(clerk_user_id):
            raise AssertionError("dev mode must never call Clerk")

        monkeypatch.setattr("legalrag.api.get_user_primary_email", explode)
        monkeypatch.setenv("LEGALOS_DEV_AUTH", "user_dev_invitee")

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        token = client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "colleague@example.com", "role": "lawyer"},
        ).json()["token"]

        app.dependency_overrides[get_current_user_id] = lambda: "user_dev_invitee"
        response = client.post(f"/api/invites/{token}/accept")
        assert response.status_code == 200
        assert response.json()["role"] == "lawyer"


class TestListOrgMembers:
    def test_member_can_list_the_roster(self, client, conn):
        from legalrag.orgs import add_membership

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        add_membership(conn, org_id, "user_lawyer", "lawyer")
        add_membership(conn, org_id, "user_staff", "staff")

        response = client.get(f"/api/orgs/{org_id}/members")
        assert response.status_code == 200
        roster = {m["clerk_user_id"]: m["role"] for m in response.json()}
        assert roster == {
            "user_owner": "owner",
            "user_lawyer": "lawyer",
            "user_staff": "staff",
        }

    def test_non_owner_member_can_list_the_roster(self, client, conn):
        """The route is deliberately gated with get_current_membership (any
        member may view the roster), not require_owner (which gates
        invite/remove). This proves a lawyer/staff member -- not just the
        owner -- is genuinely granted access, so a regression that swapped
        the dependency back to require_owner would be caught here.
        """
        from legalrag.orgs import add_membership

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        add_membership(conn, org_id, "user_lawyer", "lawyer")
        add_membership(conn, org_id, "user_staff", "staff")

        app.dependency_overrides[get_current_user_id] = lambda: "user_lawyer"
        response = client.get(f"/api/orgs/{org_id}/members")
        assert response.status_code == 200
        roster = {m["clerk_user_id"]: m["role"] for m in response.json()}
        assert roster == {
            "user_owner": "owner",
            "user_lawyer": "lawyer",
            "user_staff": "staff",
        }

    def test_non_member_cannot_list_the_roster(self, client, conn):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]

        app.dependency_overrides[get_current_user_id] = lambda: "user_outsider"
        response = client.get(f"/api/orgs/{org_id}/members")
        assert response.status_code == 403


class TestRemoveMember:
    def test_owner_can_remove_a_member(self, client, conn):
        from legalrag.orgs import add_membership

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        add_membership(conn, org_id, "user_lawyer", "lawyer")

        response = client.delete(f"/api/orgs/{org_id}/members/user_lawyer")
        assert response.status_code == 204

    def test_cannot_remove_the_last_owner(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        response = client.delete(f"/api/orgs/{org_id}/members/user_owner")
        assert response.status_code == 409
