"""Invitation accept/expiry rules against a real Postgres."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from legalrag.invites import InvitationError, accept_invitation, create_invitation
from legalrag.orgs import create_organization, get_membership


@pytest.fixture(scope="module")
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    yield connection
    connection.close()


@pytest.fixture(autouse=True)
def rollback_after_each(conn):
    yield
    conn.rollback()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM invitations")
        cur.execute("DELETE FROM memberships")
        cur.execute("DELETE FROM organizations")
    conn.commit()


class TestCreateInvitation:
    def test_rejects_owner_role(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        with pytest.raises(ValueError):
            create_invitation(conn, org.id, "new@example.com", "owner", "user_owner")

    def test_creates_a_pending_invitation_with_a_unique_token(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "new@example.com", "lawyer", "user_owner"
        )
        assert invite.status == "pending"
        assert len(invite.token) > 20


class TestAcceptInvitation:
    def test_accepting_creates_the_membership(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "new@example.com", "lawyer", "user_owner"
        )

        accept_invitation(conn, invite.token, "user_new", "new@example.com")

        membership = get_membership(conn, org.id, "user_new")
        assert membership is not None
        assert membership.role == "lawyer"

    def test_email_mismatch_is_rejected(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "invited@example.com", "staff", "user_owner"
        )

        with pytest.raises(InvitationError, match="different email"):
            accept_invitation(conn, invite.token, "user_new", "someone-else@example.com")

    def test_email_match_is_case_insensitive(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "New@Example.com", "staff", "user_owner"
        )
        accept_invitation(conn, invite.token, "user_new", "new@example.com")
        assert get_membership(conn, org.id, "user_new") is not None

    def test_unknown_token_is_rejected(self, conn):
        with pytest.raises(InvitationError, match="not found"):
            accept_invitation(conn, "not-a-real-token", "user_new", "x@example.com")

    def test_already_accepted_token_cannot_be_reused(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "new@example.com", "lawyer", "user_owner"
        )
        accept_invitation(conn, invite.token, "user_new", "new@example.com")

        with pytest.raises(InvitationError, match="not pending"):
            accept_invitation(conn, invite.token, "user_other", "new@example.com")

    def test_expired_token_is_rejected(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "new@example.com", "lawyer", "user_owner"
        )
        # Force it into the past -- create_invitation always sets a 7-day
        # expiry, so backdate it directly to exercise the expiry path.
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE invitations SET expires_at = %s WHERE id = %s",
                (datetime.now(timezone.utc) - timedelta(days=1), invite.id),
            )
        conn.commit()

        with pytest.raises(InvitationError, match="expired"):
            accept_invitation(conn, invite.token, "user_new", "new@example.com")
