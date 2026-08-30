"""What a client sees of their own case, and how they get to it.

E-1. `client_portals` has recorded permissions since migration 0007 and nothing
ever read them, because a client had no way to reach the product at all. The
firm's half of the portal was built; the client's half did not exist.

HOW A CLIENT SIGNS IN: THEY DO NOT
----------------------------------
Clerk signs in firms; Firebase signs in the consumer app. A third provider for
clients would mean a third set of credentials to store, reset, support and one
day breach -- and a client following one case does not want an account, they
want to see their case.

So the credential is a signed link. One random secret per grant, mailed to the
contact, carrying exactly the access the firm gave on exactly one matter. The
firm revokes by setting status; expiry is only a backstop for grants everyone
forgot.

The secret is returned in plaintext ONCE, when it is issued, and only its
SHA-256 is stored. A dump of client_portals hands over no live access, and a
lost link is re-issued rather than recovered -- which is the same gesture as
inviting, so nothing new to learn.

EVERY READ IS GATED TWICE
-------------------------
By the grant (is this token live, on this matter?) and by the permission
(can_view_documents, can_view_bills, can_message). Documents carry a third
gate of their own: `visible_to_client`, defaulting to false, because a client
should see the filed pleading and not the internal note assessing their
chances. All-or-nothing on documents is not something a firm can use.
"""
from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

import psycopg

from legalrag.practice import NotFoundError

# Long enough that a client following a case for a year is not locked out
# mid-matter, short enough that a forgotten grant does not live forever. The
# firm's revoke is the real control; this is the backstop.
TOKEN_LIFETIME = timedelta(days=180)


def hash_token(token: str) -> str:
    """SHA-256, not bcrypt.

    This is a 256-bit random secret, not a password: there is no dictionary to
    attack and no user-chosen weakness to stretch away from. A slow hash on
    every portal request would only cost latency.
    """
    return hashlib.sha256(token.encode()).hexdigest()


@dataclass(frozen=True)
class PortalGrant:
    portal_id: int
    organization_id: int
    matter_id: int
    contact_id: int
    contact_name: str
    matter_name: str
    can_view_documents: bool
    can_view_bills: bool
    can_message: bool


class PortalAccessError(Exception):
    """The token is unknown, revoked, or past its expiry."""


def issue_token(
    conn: psycopg.Connection, organization_id: int, portal_id: int
) -> str:
    """A fresh secret for this grant. Returns the plaintext, once.

    Re-issuing invalidates the previous link by overwriting its hash, which is
    what makes "the client forwarded the email to someone" recoverable.
    """
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE client_portals SET access_token_hash = %s, token_issued_at = %s, "
            "token_expires_at = %s, status = 'active', activated_at = "
            "coalesce(activated_at, %s) "
            "WHERE organization_id = %s AND id = %s",
            (hash_token(token), now, now + TOKEN_LIFETIME, now,
             organization_id, portal_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"portal {portal_id}")
    conn.commit()
    return token


def resolve(conn: psycopg.Connection, token: str) -> PortalGrant:
    """The grant behind a token, or PortalAccessError.

    One query, and every reason to refuse is checked in it. The error message
    is deliberately the same for all of them: telling a caller that a token was
    *revoked* rather than *unknown* confirms it once existed, which is a fact
    about the firm's clients.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.id, p.organization_id, p.matter_id, p.contact_id,
                   cc.name, m.name,
                   p.can_view_documents, p.can_view_bills, p.can_message
              FROM client_portals p
              JOIN client_contacts cc ON cc.id = p.contact_id
              JOIN matters m ON m.id = p.matter_id
             WHERE p.access_token_hash = %s
               AND p.status = 'active'
               AND (p.token_expires_at IS NULL OR p.token_expires_at > now())
            """,
            (hash_token(token),),
        )
        row = cur.fetchone()
    if row is None:
        raise PortalAccessError("This link is no longer valid")

    # Recorded so a firm can see whether the client ever opened it -- the
    # difference between "they were told" and "they were sent an email".
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE client_portals SET last_active_at = now() WHERE id = %s",
            (row[0],),
        )
    conn.commit()
    return PortalGrant(*row)


# --- what the client may read ---------------------------------------------


def case_summary(conn: psycopg.Connection, grant: PortalGrant) -> dict:
    """The state of the matter, in the terms a client asks about it.

    Deliberately narrow: the name, whether it is open, and the litigation
    record if there is one. Not the budget, not who is assigned, not the notes.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT m.name, m.status, m.opened_date, c.case_number, "
            "       c.judicial_year, c.case_category, c.court, c.litigation_degree "
            "  FROM matters m LEFT JOIN cases c ON c.matter_id = m.id "
            " WHERE m.id = %s",
            (grant.matter_id,),
        )
        row = cur.fetchone()
    if row is None:
        raise NotFoundError(f"matter {grant.matter_id}")
    return {
        "matter_name": row[0],
        "status": row[1],
        "opened_date": row[2],
        "case_number": row[3],
        "judicial_year": row[4],
        "case_category": row[5],
        "court": row[6],
        "litigation_degree": row[7],
    }


def hearing_timeline(conn: psycopg.Connection, grant: PortalGrant) -> list[dict]:
    """Every sitting on the case, oldest first.

    This is the thing a client actually wants and the reason to build a portal
    at all: instead of ringing the office to ask when the next date is, they
    look. The clerk's note is included -- "تأجيل للاطلاع" tells them more than
    a status word does -- and nothing else from the record is.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT hearing_date, court, purpose, outcome, outcome_note, "
            "       next_hearing_date "
            "  FROM hearings WHERE matter_id = %s ORDER BY hearing_date",
            (grant.matter_id,),
        )
        return [
            {
                "hearing_date": r[0],
                "court": r[1],
                "purpose": r[2],
                "outcome": r[3],
                "outcome_note": r[4],
                "next_hearing_date": r[5],
            }
            for r in cur.fetchall()
        ]


def documents(conn: psycopg.Connection, grant: PortalGrant) -> list[dict]:
    """Only what the firm marked visible, and only if the grant allows any.

    Two gates, and the per-document one is the important half: a client should
    see the filed pleading and not the internal assessment of their chances.
    """
    if not grant.can_view_documents:
        return []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, doc_type, uploaded_at FROM documents "
            " WHERE matter_id = %s AND visible_to_client "
            " ORDER BY uploaded_at DESC",
            (grant.matter_id,),
        )
        return [
            {"id": r[0], "name": r[1], "doc_type": r[2], "uploaded_at": r[3]}
            for r in cur.fetchall()
        ]


def may_read_document(
    conn: psycopg.Connection, grant: PortalGrant, document_id: int
) -> bool:
    """Whether this grant may fetch these bytes.

    Asked separately from the listing because the listing is not a boundary:
    a client who guesses an id must be refused by the same rule that hid it.
    """
    if not grant.can_view_documents:
        return False
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM documents WHERE id = %s AND matter_id = %s "
            "  AND visible_to_client",
            (document_id, grant.matter_id),
        )
        return cur.fetchone() is not None


def invoices(conn: psycopg.Connection, grant: PortalGrant) -> list[dict]:
    """Bills, when the firm has said so. Drafts are never included.

    A draft invoice is the firm thinking aloud about what to charge, and a
    client reading one before it is issued is a conversation nobody wanted.
    """
    if not grant.can_view_bills:
        return []
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, number, issued_date, due_date, total_amount, currency, "
            "       status FROM invoices "
            " WHERE matter_id = %s AND status <> 'draft' "
            " ORDER BY issued_date DESC",
            (grant.matter_id,),
        )
        return [
            {
                "id": r[0], "number": r[1], "issued_date": r[2], "due_date": r[3],
                "total_amount": r[4], "currency": r[5], "status": r[6],
            }
            for r in cur.fetchall()
        ]
