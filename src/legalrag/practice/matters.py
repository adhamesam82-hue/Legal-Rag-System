"""Matters — the core practice record.

A matter belongs to one client and may hold one litigation `case` (see
cases.py). Its "next deadline" is not stored: it is derived from the matter's
open tasks and its case deadlines, so the two cannot drift apart.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

MATTER_TYPES = (
    "litigation", "corporate", "tax", "labour", "family_probate", "contract_review",
)
MATTER_STATUSES = ("active", "on_hold", "closed")
BILLING_TYPES = ("hourly", "fixed_fee", "retainer")

_COLUMNS = """
    m.id, m.organization_id, m.client_id, c.name AS client_name, m.name,
    m.matter_type, m.status, m.responsible_user, m.opened_date, m.closed_date,
    m.description, m.billing_type, m.budget_amount, m.budget_is_estimate,
    m.tags, m.created_at
"""


@dataclass
class Deadline:
    label: str
    due_date: date


@dataclass
class Matter:
    id: int
    organization_id: int
    client_id: int
    client_name: str
    name: str
    matter_type: str
    status: str
    responsible_user: str
    opened_date: date
    closed_date: date | None
    description: str
    billing_type: str
    budget_amount: Decimal | None
    budget_is_estimate: bool
    tags: list[str]
    created_at: datetime
    staff: list[str] = field(default_factory=list)
    case_id: int | None = None
    next_deadline: Deadline | None = None


def _enrich(conn: psycopg.Connection, matters: list[Matter]) -> list[Matter]:
    """Fills staff, case_id and next_deadline for a batch of matters.

    Three fixed queries regardless of batch size, rather than three per matter.
    """
    if not matters:
        return matters
    by_id = {m.id: m for m in matters}
    ids = list(by_id)

    with conn.cursor() as cur:
        cur.execute(
            "SELECT matter_id, clerk_user_id FROM matter_staff "
            "WHERE matter_id = ANY(%s)",
            (ids,),
        )
        for matter_id, user_id in cur.fetchall():
            by_id[matter_id].staff.append(user_id)

        cur.execute("SELECT matter_id, id FROM cases WHERE matter_id = ANY(%s)", (ids,))
        for matter_id, case_id in cur.fetchall():
            by_id[matter_id].case_id = case_id

        # Earliest still-open commitment per matter, from either source.
        cur.execute(
            """
            SELECT matter_id, label, due_date FROM (
                SELECT t.matter_id, t.title AS label, t.due_date,
                       row_number() OVER (PARTITION BY t.matter_id ORDER BY t.due_date) AS rn
                  FROM (
                        SELECT matter_id, title, due_date
                          FROM tasks
                         WHERE matter_id = ANY(%s) AND status <> 'done'
                           AND due_date IS NOT NULL
                        UNION ALL
                        SELECT c.matter_id, d.label, d.due_date
                          FROM case_deadlines d
                          JOIN cases c ON c.id = d.case_id
                         WHERE c.matter_id = ANY(%s) AND NOT d.completed
                       ) t
            ) ranked WHERE rn = 1
            """,
            (ids, ids),
        )
        for matter_id, label, due_date in cur.fetchall():
            by_id[matter_id].next_deadline = Deadline(label, due_date)

    return matters


def list_matters(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    status: str | None = None,
    client_id: int | None = None,
    responsible_user: str | None = None,
    matter_type: str | None = None,
    query: str | None = None,
) -> list[Matter]:
    sql = (
        f"SELECT {_COLUMNS} FROM matters m JOIN clients c ON c.id = m.client_id "
        "WHERE m.organization_id = %s"
    )
    params: list[object] = [organization_id]
    if status:
        sql += " AND m.status = %s"
        params.append(status)
    if client_id is not None:
        sql += " AND m.client_id = %s"
        params.append(client_id)
    if responsible_user:
        sql += " AND m.responsible_user = %s"
        params.append(responsible_user)
    if matter_type:
        sql += " AND m.matter_type = %s"
        params.append(matter_type)
    if query:
        sql += " AND (m.name ILIKE %s OR c.name ILIKE %s)"
        params += [f"%{query}%", f"%{query}%"]
    sql += " ORDER BY m.opened_date DESC, m.id DESC"
    return _enrich(conn, fetch_all(conn, Matter, sql, tuple(params)))


def get_matter(
    conn: psycopg.Connection, organization_id: int, matter_id: int
) -> Matter | None:
    matter = fetch_one(
        conn,
        Matter,
        f"SELECT {_COLUMNS} FROM matters m JOIN clients c ON c.id = m.client_id "
        "WHERE m.organization_id = %s AND m.id = %s",
        (organization_id, matter_id),
    )
    if matter is None:
        return None
    return _enrich(conn, [matter])[0]


def _validate(matter_type: str | None, status: str | None, billing_type: str | None):
    if matter_type is not None and matter_type not in MATTER_TYPES:
        raise ValueError(f"invalid matter_type {matter_type!r}")
    if status is not None and status not in MATTER_STATUSES:
        raise ValueError(f"invalid status {status!r}")
    if billing_type is not None and billing_type not in BILLING_TYPES:
        raise ValueError(f"invalid billing_type {billing_type!r}")


def create_matter(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    client_id: int,
    name: str,
    matter_type: str,
    billing_type: str,
    responsible_user: str,
    opened_date: date,
    status: str = "active",
    closed_date: date | None = None,
    description: str = "",
    budget_amount: Decimal | None = None,
    budget_is_estimate: bool = False,
    tags: list[str] | None = None,
    staff: list[str] | None = None,
) -> Matter:
    _validate(matter_type, status, billing_type)
    with conn.cursor() as cur:
        # Refuse a client from another organization rather than creating a
        # matter that silently bridges two tenants.
        cur.execute(
            "SELECT 1 FROM clients WHERE organization_id = %s AND id = %s",
            (organization_id, client_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"client {client_id}")
        cur.execute(
            "INSERT INTO matters (organization_id, client_id, name, matter_type, "
            "status, responsible_user, opened_date, closed_date, description, "
            "billing_type, budget_amount, budget_is_estimate, tags) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                organization_id, client_id, name, matter_type, status,
                responsible_user, opened_date, closed_date, description,
                billing_type, budget_amount, budget_is_estimate, tags or [],
            ),
        )
        matter_id = cur.fetchone()[0]
        for user_id in staff or []:
            cur.execute(
                "INSERT INTO matter_staff (matter_id, clerk_user_id) VALUES (%s, %s)",
                (matter_id, user_id),
            )
    conn.commit()
    matter = get_matter(conn, organization_id, matter_id)
    assert matter is not None
    return matter


_UPDATABLE = {
    "client_id", "name", "matter_type", "status", "responsible_user",
    "opened_date", "closed_date", "description", "billing_type",
    "budget_amount", "budget_is_estimate", "tags",
}


def update_matter(
    conn: psycopg.Connection,
    organization_id: int,
    matter_id: int,
    *,
    staff: list[str] | None = None,
    **changes,
) -> Matter:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    _validate(
        fields.get("matter_type"), fields.get("status"), fields.get("billing_type")
    )
    # The schema requires closed_date to be set exactly when status is closed.
    # Fill or clear it in the same UPDATE as the status: doing it in two
    # statements would briefly leave the row closed with no closed_date, which
    # the check constraint rejects.
    if fields.get("status") == "closed" and "closed_date" not in fields:
        fields["closed_date"] = date.today()
    elif fields.get("status") in ("active", "on_hold"):
        fields["closed_date"] = None

    with conn.cursor() as cur:
        if fields:
            assignments = ", ".join(f"{name} = %s" for name in fields)
            cur.execute(
                f"UPDATE matters SET {assignments}, updated_at = now() "
                "WHERE organization_id = %s AND id = %s",
                (*fields.values(), organization_id, matter_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"matter {matter_id}")
        if staff is not None:
            cur.execute("DELETE FROM matter_staff WHERE matter_id = %s", (matter_id,))
            for user_id in staff:
                cur.execute(
                    "INSERT INTO matter_staff (matter_id, clerk_user_id) "
                    "VALUES (%s, %s)",
                    (matter_id, user_id),
                )
    conn.commit()
    matter = get_matter(conn, organization_id, matter_id)
    if matter is None:
        raise NotFoundError(f"matter {matter_id}")
    return matter


def delete_matter(
    conn: psycopg.Connection, organization_id: int, matter_id: int
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"matter {matter_id}")
    conn.commit()


# --- notes and timeline -----------------------------------------------------


@dataclass
class Note:
    id: int
    matter_id: int
    author: str
    content: str
    created_at: datetime


def list_notes(
    conn: psycopg.Connection, organization_id: int, matter_id: int
) -> list[Note]:
    return fetch_all(
        conn,
        Note,
        "SELECT id, matter_id, author, content, created_at FROM matter_notes "
        "WHERE organization_id = %s AND matter_id = %s ORDER BY created_at DESC",
        (organization_id, matter_id),
    )


def add_note(
    conn: psycopg.Connection,
    organization_id: int,
    matter_id: int,
    *,
    author: str,
    content: str,
) -> Note:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO matter_notes (organization_id, matter_id, author, content) "
            "SELECT %s, %s, %s, %s WHERE EXISTS "
            "(SELECT 1 FROM matters WHERE organization_id = %s AND id = %s) "
            "RETURNING id, created_at",
            (organization_id, matter_id, author, content, organization_id, matter_id),
        )
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(f"matter {matter_id}")
    conn.commit()
    return Note(row[0], matter_id, author, content, row[1])


@dataclass
class TimelineEvent:
    id: int
    matter_id: int
    event_date: date
    label: str
    detail: str | None
    kind: str


def list_timeline(
    conn: psycopg.Connection, organization_id: int, matter_id: int
) -> list[TimelineEvent]:
    return fetch_all(
        conn,
        TimelineEvent,
        "SELECT id, matter_id, event_date, label, detail, kind "
        "FROM matter_timeline_events "
        "WHERE organization_id = %s AND matter_id = %s ORDER BY event_date",
        (organization_id, matter_id),
    )


def add_timeline_event(
    conn: psycopg.Connection,
    organization_id: int,
    matter_id: int,
    *,
    event_date: date,
    label: str,
    kind: str,
    detail: str | None = None,
) -> TimelineEvent:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO matter_timeline_events (organization_id, matter_id, "
            "event_date, label, detail, kind) VALUES (%s, %s, %s, %s, %s, %s) "
            "RETURNING id",
            (organization_id, matter_id, event_date, label, detail, kind),
        )
        event_id = cur.fetchone()[0]
    conn.commit()
    return TimelineEvent(event_id, matter_id, event_date, label, detail, kind)
