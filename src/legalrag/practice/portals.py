"""Client portal — a named contact's access to one matter, and the secure
message threads that run over it.

Access is granted per matter rather than per client, because that is how firms
actually share: a company's finance officer may need the billing file without
seeing the litigation one. Revoking is a status change, not a delete: the
record that someone once had access is itself worth keeping.

Secure messages are threaded and two-sided. A message is authored either by a
firm member (a Clerk user id) or by the portal contact (a client_contacts
row) — the schema enforces exactly one of the two, so "who said this" can
never be ambiguous.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

STATUSES = ("invited", "active", "revoked")

_PORTAL_COLUMNS = """
    p.id, p.organization_id, p.matter_id, m.name AS matter_name, p.contact_id,
    cc.name AS contact_name, cc.email AS contact_email, p.status,
    p.can_view_documents, p.can_view_bills, p.can_message, p.invited_by,
    p.invited_at, p.activated_at, p.revoked_at, p.last_active_at
"""

_PORTAL_FROM = """
    FROM client_portals p
    JOIN matters m ON m.id = p.matter_id
    JOIN client_contacts cc ON cc.id = p.contact_id
"""


@dataclass
class ClientPortal:
    id: int
    organization_id: int
    matter_id: int
    matter_name: str
    contact_id: int
    contact_name: str
    contact_email: str
    status: str
    can_view_documents: bool
    can_view_bills: bool
    can_message: bool
    invited_by: str
    invited_at: datetime
    activated_at: datetime | None
    revoked_at: datetime | None
    last_active_at: datetime | None


def list_portals(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    status: str | None = None,
) -> list[ClientPortal]:
    sql = f"SELECT {_PORTAL_COLUMNS} {_PORTAL_FROM} WHERE p.organization_id = %s"
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND p.matter_id = %s"
        params.append(matter_id)
    if status:
        sql += " AND p.status = %s"
        params.append(status)
    sql += " ORDER BY p.invited_at DESC"
    return fetch_all(conn, ClientPortal, sql, tuple(params))


def get_portal(
    conn: psycopg.Connection, organization_id: int, portal_id: int
) -> ClientPortal | None:
    return fetch_one(
        conn,
        ClientPortal,
        f"SELECT {_PORTAL_COLUMNS} {_PORTAL_FROM} "
        "WHERE p.organization_id = %s AND p.id = %s",
        (organization_id, portal_id),
    )


def invite(
    conn: psycopg.Connection,
    organization_id: int,
    matter_id: int,
    *,
    contact_id: int,
    invited_by: str,
    can_view_documents: bool = True,
    can_view_bills: bool = False,
    can_message: bool = True,
) -> ClientPortal:
    """Grants a contact access to a matter, or re-grants it if revoked.

    Re-inviting updates the existing grant rather than inserting a second one:
    two grants for the same person with different permissions would leave the
    question of which applies unanswerable.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")
        cur.execute(
            "SELECT 1 FROM client_contacts cc JOIN clients c ON c.id = cc.client_id "
            "WHERE c.organization_id = %s AND cc.id = %s",
            (organization_id, contact_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"contact {contact_id}")
        cur.execute(
            "INSERT INTO client_portals (organization_id, matter_id, contact_id, "
            "can_view_documents, can_view_bills, can_message, invited_by) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (matter_id, contact_id) DO UPDATE SET "
            "status = 'invited', revoked_at = NULL, invited_at = now(), "
            "invited_by = EXCLUDED.invited_by, "
            "can_view_documents = EXCLUDED.can_view_documents, "
            "can_view_bills = EXCLUDED.can_view_bills, "
            "can_message = EXCLUDED.can_message "
            "RETURNING id",
            (
                organization_id, matter_id, contact_id, can_view_documents,
                can_view_bills, can_message, invited_by,
            ),
        )
        portal_id = cur.fetchone()[0]
    conn.commit()
    portal = get_portal(conn, organization_id, portal_id)
    assert portal is not None
    return portal


def revoke(
    conn: psycopg.Connection, organization_id: int, portal_id: int
) -> ClientPortal:
    """Shuts a client out. The firm's primary control over portal access.

    A thin name over `update_portal(status="revoked")` rather than its own
    UPDATE: the rule that revoking destroys the secret has to hold for the
    firm's PATCH too, so it lives in one place and this is the door onto it.

    Re-inviting the same contact reopens the grant (see invite), which is the
    intended way back.
    """
    return update_portal(conn, organization_id, portal_id, status="revoked")


_PORTAL_UPDATABLE = {"can_view_documents", "can_view_bills", "can_message"}


def update_portal(
    conn: psycopg.Connection,
    organization_id: int,
    portal_id: int,
    *,
    status: str | None = None,
    **changes,
) -> ClientPortal:
    fields = {
        k: v for k, v in changes.items() if k in _PORTAL_UPDATABLE and v is not None
    }
    # Assignments that are SQL expressions rather than bound values, kept
    # separate so they are never mistaken for user input.
    expressions: list[str] = []
    if status is not None:
        if status not in STATUSES:
            raise ValueError(f"invalid status {status!r}")
        fields["status"] = status
        # The schema ties revoked_at to the revoked status in both directions,
        # so both have to move in the same statement.
        expressions.append(
            "revoked_at = now()" if status == "revoked" else "revoked_at = NULL"
        )
        if status == "revoked":
            # Revoking destroys the secret, it does not merely mark the row: a
            # grant whose link still resolves is not revoked. Here rather than
            # only in revoke() because this is the path the firm's UI takes,
            # and a hash left behind is a link that re-activating would
            # silently reopen weeks later.
            expressions.append("access_token_hash = NULL")
            expressions.append("token_expires_at = NULL")
        if status == "active":
            expressions.append("activated_at = coalesce(activated_at, now())")

    if fields or expressions:
        assignments = ", ".join(
            [f"{name} = %s" for name in fields] + expressions
        )
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE client_portals SET {assignments} "
                "WHERE organization_id = %s AND id = %s",
                (*fields.values(), organization_id, portal_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"portal {portal_id}")
        conn.commit()
    portal = get_portal(conn, organization_id, portal_id)
    if portal is None:
        raise NotFoundError(f"portal {portal_id}")
    return portal


# --- secure messages --------------------------------------------------------


@dataclass
class SecureMessage:
    id: int
    thread_id: int
    author_kind: str
    author_user: str | None
    author_contact_id: int | None
    author_name: str
    body: str
    sent_at: datetime
    read_at: datetime | None


@dataclass
class SecureThread:
    id: int
    organization_id: int
    matter_id: int
    portal_id: int | None
    subject: str
    created_by: str
    created_at: datetime
    last_message_at: datetime
    contact_name: str | None = None
    message_count: int = 0
    unread_count: int = 0
    messages: list[SecureMessage] = field(default_factory=list)


_THREAD_COLUMNS = """
    t.id, t.organization_id, t.matter_id, t.portal_id, t.subject, t.created_by,
    t.created_at, t.last_message_at, cc.name AS contact_name,
    (SELECT count(*) FROM secure_messages s WHERE s.thread_id = t.id)
        AS message_count,
    (SELECT count(*) FROM secure_messages s WHERE s.thread_id = t.id
        AND s.author_kind = 'client' AND s.read_at IS NULL) AS unread_count
"""

_THREAD_FROM = """
    FROM secure_message_threads t
    LEFT JOIN client_portals p ON p.id = t.portal_id
    LEFT JOIN client_contacts cc ON cc.id = p.contact_id
"""

# The author's display name resolves for a client contact only. A firm
# member's name lives in Clerk, so the frontend resolves author_user through
# the same member roster it uses everywhere else.
_MESSAGE_COLUMNS = """
    s.id, s.thread_id, s.author_kind, s.author_user, s.author_contact_id,
    coalesce(cc.name, '') AS author_name, s.body, s.sent_at, s.read_at
"""


def list_threads(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    with_messages: bool = False,
) -> list[SecureThread]:
    sql = f"SELECT {_THREAD_COLUMNS} {_THREAD_FROM} WHERE t.organization_id = %s"
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND t.matter_id = %s"
        params.append(matter_id)
    sql += " ORDER BY t.last_message_at DESC"
    threads = fetch_all(conn, SecureThread, sql, tuple(params))
    if with_messages and threads:
        _load_messages(conn, threads)
    return threads


def _load_messages(conn: psycopg.Connection, threads: list[SecureThread]) -> None:
    """Fills every thread's messages in one query rather than one per thread."""
    by_id = {t.id: t for t in threads}
    messages = fetch_all(
        conn,
        SecureMessage,
        f"SELECT {_MESSAGE_COLUMNS} FROM secure_messages s "
        "LEFT JOIN client_contacts cc ON cc.id = s.author_contact_id "
        "WHERE s.thread_id = ANY(%s) ORDER BY s.sent_at, s.id",
        (list(by_id),),
    )
    for message in messages:
        by_id[message.thread_id].messages.append(message)


def get_thread(
    conn: psycopg.Connection, organization_id: int, thread_id: int
) -> SecureThread | None:
    thread = fetch_one(
        conn,
        SecureThread,
        f"SELECT {_THREAD_COLUMNS} {_THREAD_FROM} "
        "WHERE t.organization_id = %s AND t.id = %s",
        (organization_id, thread_id),
    )
    if thread is not None:
        _load_messages(conn, [thread])
    return thread


def start_thread(
    conn: psycopg.Connection,
    organization_id: int,
    matter_id: int,
    *,
    subject: str,
    created_by: str,
    body: str,
    portal_id: int | None = None,
) -> SecureThread:
    """Opens a thread with its first message; an empty thread is not a thing."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")
        if portal_id is not None:
            # A thread must not be attached to a portal on a different matter,
            # which would show the client a conversation about someone else's
            # file.
            cur.execute(
                "SELECT 1 FROM client_portals WHERE organization_id = %s "
                "AND id = %s AND matter_id = %s",
                (organization_id, portal_id, matter_id),
            )
            if cur.fetchone() is None:
                raise NotFoundError(f"portal {portal_id} on matter {matter_id}")
        cur.execute(
            "INSERT INTO secure_message_threads (organization_id, matter_id, "
            "portal_id, subject, created_by) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (organization_id, matter_id, portal_id, subject, created_by),
        )
        thread_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO secure_messages (thread_id, author_kind, author_user, body) "
            "VALUES (%s, 'firm', %s, %s)",
            (thread_id, created_by, body),
        )
    conn.commit()
    thread = get_thread(conn, organization_id, thread_id)
    assert thread is not None
    return thread


def post_message(
    conn: psycopg.Connection,
    organization_id: int,
    thread_id: int,
    *,
    body: str,
    author_user: str | None = None,
    author_contact_id: int | None = None,
) -> SecureMessage:
    kind = "firm" if author_user else "client"
    if (author_user is None) == (author_contact_id is None):
        raise ValueError("a message has exactly one author, firm or client")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM secure_message_threads "
            "WHERE organization_id = %s AND id = %s",
            (organization_id, thread_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"thread {thread_id}")
        cur.execute(
            "INSERT INTO secure_messages (thread_id, author_kind, author_user, "
            "author_contact_id, body) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (thread_id, kind, author_user, author_contact_id, body),
        )
        message_id = cur.fetchone()[0]
        # The thread's sort key is when it last had traffic, so it moves to the
        # top of the list in the same transaction that gave it traffic.
        cur.execute(
            "UPDATE secure_message_threads SET last_message_at = now() WHERE id = %s",
            (thread_id,),
        )
    conn.commit()
    message = fetch_one(
        conn,
        SecureMessage,
        f"SELECT {_MESSAGE_COLUMNS} FROM secure_messages s "
        "LEFT JOIN client_contacts cc ON cc.id = s.author_contact_id "
        "WHERE s.id = %s",
        (message_id,),
    )
    assert message is not None
    return message


def mark_thread_read(
    conn: psycopg.Connection, organization_id: int, thread_id: int
) -> None:
    """Marks the client's messages in a thread as read by the firm.

    Only client-authored messages: the firm reading its own outgoing message
    is not a fact anyone needs.
    """
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE secure_messages s SET read_at = now() "
            "FROM secure_message_threads t "
            "WHERE t.id = s.thread_id AND t.organization_id = %s AND t.id = %s "
            "AND s.author_kind = 'client' AND s.read_at IS NULL",
            (organization_id, thread_id),
        )
    conn.commit()
