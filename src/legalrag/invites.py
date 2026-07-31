"""Invitation tokens: an Owner invites someone by email, they accept via a link.

Not Clerk's native Organizations invite flow -- see orgs.py's docstring for
why organization state lives entirely in our own Postgres.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import psycopg

from legalrag.orgs import add_membership

INVITE_TTL = timedelta(days=7)


class InvitationError(Exception):
    """Raised when an invitation token cannot be accepted as given."""


@dataclass(frozen=True)
class Invitation:
    id: int
    organization_id: int
    email: str
    role: str
    token: str
    status: str
    expires_at: datetime


def create_invitation(
    conn: psycopg.Connection,
    organization_id: int,
    email: str,
    role: str,
    invited_by: str,
) -> Invitation:
    if role not in ("lawyer", "staff"):
        raise ValueError(f"invalid invite role {role!r}; owner is not invitable")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + INVITE_TTL
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO invitations
                (organization_id, email, role, token, invited_by, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, status
            """,
            (organization_id, email, role, token, invited_by, expires_at),
        )
        invitation_id, status = cur.fetchone()
    conn.commit()
    return Invitation(
        id=invitation_id,
        organization_id=organization_id,
        email=email,
        role=role,
        token=token,
        status=status,
        expires_at=expires_at,
    )


def get_invitation_by_token(
    conn: psycopg.Connection, token: str
) -> Invitation | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, email, role, token, status, expires_at "
            "FROM invitations WHERE token = %s",
            (token,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return Invitation(
            id=row[0],
            organization_id=row[1],
            email=row[2],
            role=row[3],
            token=row[4],
            status=row[5],
            expires_at=row[6],
        )


def accept_invitation(
    conn: psycopg.Connection,
    token: str,
    accepting_clerk_user_id: str,
    accepting_email: str,
) -> Invitation:
    """Validates the token and creates the membership.

    Raises InvitationError if the token is unknown, already used/revoked,
    expired, or the authenticated account's email doesn't match who it was
    sent to.
    """
    invitation = get_invitation_by_token(conn, token)
    if invitation is None:
        raise InvitationError("invitation not found")
    if invitation.status != "pending":
        raise InvitationError(f"invitation is {invitation.status}, not pending")
    if invitation.expires_at < datetime.now(timezone.utc):
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE invitations SET status = 'expired' WHERE id = %s",
                (invitation.id,),
            )
        conn.commit()
        raise InvitationError("invitation has expired")
    if invitation.email.lower() != accepting_email.lower():
        raise InvitationError(
            "this invitation was sent to a different email address"
        )

    add_membership(
        conn, invitation.organization_id, accepting_clerk_user_id, invitation.role
    )
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE invitations SET status = 'accepted', accepted_at = now() "
            "WHERE id = %s",
            (invitation.id,),
        )
    conn.commit()
    return invitation
