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

    def test_the_name_alone_is_enough(self, client):
        """The create screen asks for specialties, but a firm may start without."""
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        assert client.get(f"/api/orgs/{org_id}").json()["specialties"] == []

    def test_specialties_chosen_at_creation_reach_settings(self, client):
        response = client.post(
            "/api/orgs", json={"name": "Firm", "specialties": ["labour", "civil", "labour"]}
        )
        assert response.status_code == 200, response.text
        org_id = response.json()["id"]
        # Order kept, duplicate dropped -- same rule as the settings PATCH.
        assert client.get(f"/api/orgs/{org_id}").json()["specialties"] == ["labour", "civil"]

    def test_an_unknown_specialty_is_refused_and_no_firm_is_created(self, client, conn):
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM organizations")
            before = cur.fetchone()[0]
        response = client.post("/api/orgs", json={"name": "Firm", "specialties": ["space_law"]})
        assert response.status_code == 422
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM organizations")
            assert cur.fetchone()[0] == before


class TestFirmDetails:
    """The firm's own details -- what /settings collects.

    The screen offered a name, a registration number, a phone and an address,
    and there was no route to send them to and no columns to hold them, so
    Save issued no request at all.
    """

    def test_a_new_firm_has_a_name_and_nothing_else(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        body = client.get(f"/api/orgs/{org_id}").json()
        assert body["name"] == "Firm"
        assert body["registration_number"] is None
        assert body["phone"] is None
        assert body["address"] is None

    def test_the_owner_can_save_the_details(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        response = client.patch(
            f"/api/orgs/{org_id}",
            json={
                "name": "السيد وشركاه",
                "registration_number": "س.ت 4821 لسنة 2019",
                "phone": "+20 2 2735 1190",
                "address": "14 شارع طلعت حرب، القاهرة",
            },
        )
        assert response.status_code == 200, response.text
        assert response.json()["registration_number"] == "س.ت 4821 لسنة 2019"

    def test_what_was_saved_survives_a_reload(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        client.patch(f"/api/orgs/{org_id}", json={"name": "الاسم الجديد"})
        assert client.get(f"/api/orgs/{org_id}").json()["name"] == "الاسم الجديد"

    def test_the_new_name_reaches_the_membership_list(self, client):
        """The rename has to show up where every screen reads the firm name."""
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        client.patch(f"/api/orgs/{org_id}", json={"name": "الاسم الجديد"})
        names = [m["organization_name"] for m in client.get("/api/orgs/me").json()]
        assert names == ["الاسم الجديد"]

    def test_an_omitted_field_is_left_alone(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        client.patch(f"/api/orgs/{org_id}", json={"phone": "0100"})
        client.patch(f"/api/orgs/{org_id}", json={"address": "القاهرة"})
        body = client.get(f"/api/orgs/{org_id}").json()
        assert body["phone"] == "0100"
        assert body["address"] == "القاهرة"

    def test_a_non_owner_cannot_rename_the_firm(self, client, conn):
        from legalrag.orgs import add_membership

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        add_membership(conn, org_id, "user_lawyer", "lawyer")

        app.dependency_overrides[get_current_user_id] = lambda: "user_lawyer"
        response = client.patch(f"/api/orgs/{org_id}", json={"name": "Mine now"})
        assert response.status_code == 403

    def test_a_non_member_cannot_read_the_details(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]

        app.dependency_overrides[get_current_user_id] = lambda: "user_outsider"
        assert client.get(f"/api/orgs/{org_id}").status_code == 403


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


class TestListingIssuedInvitations:
    """Who has been invited, for the owner who sent the invitations.

    Sending one closed the dialog and left nothing behind: the recipient is
    not a member until they accept, and the roster was the only list on the
    screen -- so "did I already invite them?" could not be answered.
    """

    @pytest.fixture(autouse=True)
    def _no_mail(self, monkeypatch):
        monkeypatch.setattr("legalrag.api.send_invite_email", lambda **kwargs: None)

    def test_lists_what_was_sent(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        )
        rows = client.get(f"/api/orgs/{org_id}/invites").json()
        assert [(r["email"], r["role"], r["status"]) for r in rows] == [
            ("new@example.com", "lawyer", "pending")
        ]

    def test_the_same_address_can_be_invited_twice_and_both_are_listed(
        self, client
    ):
        """Re-inviting somebody is ordinary -- the first link may have been
        lost. Each row therefore has to be identifiable by something other
        than the address, or a client keying on the address collapses them."""
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        for _ in range(2):
            client.post(
                f"/api/orgs/{org_id}/invites",
                json={"email": "new@example.com", "role": "lawyer"},
            )
        rows = client.get(f"/api/orgs/{org_id}/invites").json()
        assert len(rows) == 2
        assert len({row["id"] for row in rows}) == 2

    def test_does_not_hand_back_the_acceptance_token(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        )
        assert "token" not in client.get(f"/api/orgs/{org_id}/invites").json()[0]

    def test_an_accepted_invitation_says_so(self, client, monkeypatch):
        monkeypatch.setattr(
            "legalrag.api.get_user_primary_email",
            lambda clerk_user_id: "new@example.com",
        )
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        token = client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        ).json()["token"]

        app.dependency_overrides[get_current_user_id] = lambda: "user_new"
        client.post(f"/api/invites/{token}/accept")

        app.dependency_overrides[get_current_user_id] = lambda: "user_owner"
        assert client.get(f"/api/orgs/{org_id}/invites").json()[0]["status"] == (
            "accepted"
        )

    def test_a_non_owner_cannot_read_them(self, client, conn):
        from legalrag.orgs import add_membership

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        add_membership(conn, org_id, "user_lawyer", "lawyer")

        app.dependency_overrides[get_current_user_id] = lambda: "user_lawyer"
        assert client.get(f"/api/orgs/{org_id}/invites").status_code == 403


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
