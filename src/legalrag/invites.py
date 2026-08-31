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


def list_invitations(
    conn: psycopg.Connection, organization_id: int
) -> list[Invitation]:
    """Every invitation this firm has issued, newest first.

    Without this an owner who sends an invitation has nowhere to see it: the
    dialog closes, the recipient is not a member until they accept, and the
    roster is the only list on the screen. "Did I already invite them?" was
    unanswerable from inside the product.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, email, role, token, status, expires_at "
            "FROM invitations WHERE organization_id = %s "
            "ORDER BY created_at DESC",
            (organization_id,),
        )
        return [
            Invitation(
                id=row[0],
                organization_id=row[1],
                email=row[2],
                role=row[3],
                token=row[4],
                status=row[5],
                expires_at=row[6],
            )
            for row in cur.fetchall()
        ]


def effective_status(invitation: Invitation) -> str:
    """The status a reader should be shown, expiry included.

    The `status` column is only advanced when somebody tries to ACCEPT an
    invitation -- nothing sweeps the table -- so a pending row whose window has
    closed still reads 'pending' long after it stopped being usable. A preview
    that repeats the column verbatim therefore offers an Accept button on a
    dead invitation, and the recipient only learns otherwise by pressing it.

    Terminal states are returned untouched, matching accept_invitation's own
    ordering: 'accepted' and 'revoked' are permanent, and must not be
    reclassified as 'expired' merely because time has since passed.

    Deliberately pure. The obvious alternative -- writing 'expired' back here
    -- would make a GET mutate the row, which is both a surprise on a public
    unauthenticated endpoint and a way for anyone holding an old token to
    write to the table.
    """
    if invitation.status != "pending":
        return invitation.status
    if invitation.expires_at < datetime.now(timezone.utc):
        return "expired"
    return invitation.status


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
    # Reject on the invitation's actual current status before ever touching
    # expiry. This must run first: a long-expired 7-day window on an
    # invitation that's already 'accepted' or 'revoked' is irrelevant --
    # those are permanent terminal states and must never be reclassified as
    # 'expired' just because time has passed since they were reached.
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

    # Compare-and-swap: the WHERE status = 'pending' guard makes this
    # read-and-flip atomic. If two callers race on the same token, only the
    # first UPDATE to commit actually flips the row; Postgres blocks the
    # second on the row lock until the first commits, then re-evaluates the
    # WHERE clause against the now-'accepted' row and matches zero rows --
    # so only one caller ever proceeds to add_membership below.
    #
    # We already confirmed invitation.status == "pending" above, so zero
    # rows here means a genuine race occurred between that read and this
    # UPDATE -- the rare case this CAS exists to catch.
    with conn.cursor() as cur:
        cur.execute(
            # accepted_by closes the question "which invitation created this
            # membership", which nothing recorded before -- so a backfill of
            # member addresses had to join on the organization alone and could
            # write one person's address onto everybody in the firm.
            "UPDATE invitations SET status = 'accepted', accepted_at = now(), "
            "accepted_by = %s "
            "WHERE id = %s AND status = 'pending' "
            "RETURNING id, organization_id, email, role, token, status, expires_at",
            (accepting_clerk_user_id, invitation.id),
        )
        row = cur.fetchone()
    if row is None:
        # Nothing of ours to undo, but the failed CAS attempt may have left
        # an implicit transaction open -- leave the connection clean.
        conn.rollback()
        raise InvitationError("invitation is no longer pending")

    accepted = Invitation(
        id=row[0],
        organization_id=row[1],
        email=row[2],
        role=row[3],
        token=row[4],
        status=row[5],
        expires_at=row[6],
    )

    # Deliberately no commit here. add_membership() commits internally, and
    # we want that single commit to durably apply both the CAS update above
    # and the membership insert together, atomically, as one transaction on
    # this connection. If add_membership fails, roll back the whole
    # transaction -- including the CAS -- so the invitation reverts to its
    # actual pre-accept state instead of being stranded as 'accepted' with
    # no membership ever created.
    try:
        add_membership(
            conn,
            accepted.organization_id,
            accepting_clerk_user_id,
            accepted.role,
            # The address the invitation was sent to, which is the address
            # this account proved it owns a moment ago. Leaving it off made
            # every invited member undeliverable to the reminder sweep -- and
            # 0013's backfill only ever covered the rows that existed when it
            # ran, so every acceptance since re-created the same gap.
            email=accepted.email,
        )
    except Exception as exc:
        conn.rollback()
        if isinstance(exc, psycopg.errors.UniqueViolation):
            raise InvitationError(
                "you are already a member of this organization"
            ) from exc
        raise InvitationError(
            "could not accept invitation: membership could not be created"
        ) from exc

    return accepted
