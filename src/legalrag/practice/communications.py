"""Communications log — what was said on the file, and when.

A record of exchanges that happened somewhere else: a call, an email, a
meeting, a letter. It is deliberately not a mailbox. The product does not send
these; it records that they happened, so the account of what a client was told
survives the departure of whoever told them.

Messages the product itself carries are a different thing entirely and live in
portals.py, behind the client portal.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

CHANNELS = ("phone", "email", "meeting", "letter")
DIRECTIONS = ("incoming", "outgoing")
# Only a two-way exchange has a duration; an email or a letter does not.
_CONVERSATIONS = ("phone", "meeting")

_COLUMNS = """
    k.id, k.organization_id, k.matter_id, m.name AS matter_name, k.client_id,
    c.name AS client_name, k.channel, k.direction, k.subject, k.body,
    k.counterparty, k.logged_by, k.occurred_at, k.duration_minutes, k.created_at
"""

_FROM = """
    FROM communications k
    LEFT JOIN matters m ON m.id = k.matter_id
    LEFT JOIN clients c ON c.id = k.client_id
"""


@dataclass
class Communication:
    id: int
    organization_id: int
    matter_id: int | None
    matter_name: str | None
    client_id: int | None
    client_name: str | None
    channel: str
    direction: str
    subject: str
    body: str
    counterparty: str
    logged_by: str
    occurred_at: datetime
    duration_minutes: int | None
    created_at: datetime


def list_communications(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    client_id: int | None = None,
    channel: str | None = None,
    direction: str | None = None,
    since: date | None = None,
    until: date | None = None,
    query: str | None = None,
    limit: int = 200,
) -> list[Communication]:
    sql = f"SELECT {_COLUMNS} {_FROM} WHERE k.organization_id = %s"
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND k.matter_id = %s"
        params.append(matter_id)
    if client_id is not None:
        sql += " AND k.client_id = %s"
        params.append(client_id)
    if channel:
        sql += " AND k.channel = %s"
        params.append(channel)
    if direction:
        sql += " AND k.direction = %s"
        params.append(direction)
    if since:
        sql += " AND k.occurred_at >= %s"
        params.append(since)
    if until:
        # An inclusive end date: `until` names a day, and everything logged
        # during that day belongs to it.
        sql += " AND k.occurred_at < (%s::date + 1)"
        params.append(until)
    if query:
        sql += " AND (k.subject ILIKE %s OR k.body ILIKE %s OR k.counterparty ILIKE %s)"
        params += [f"%{query}%"] * 3
    sql += " ORDER BY k.occurred_at DESC, k.id DESC LIMIT %s"
    params.append(limit)
    return fetch_all(conn, Communication, sql, tuple(params))


def get_communication(
    conn: psycopg.Connection, organization_id: int, communication_id: int
) -> Communication | None:
    return fetch_one(
        conn,
        Communication,
        f"SELECT {_COLUMNS} {_FROM} WHERE k.organization_id = %s AND k.id = %s",
        (organization_id, communication_id),
    )


def log_communication(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    channel: str,
    direction: str,
    logged_by: str,
    occurred_at: datetime,
    matter_id: int | None = None,
    client_id: int | None = None,
    subject: str = "",
    body: str = "",
    counterparty: str = "",
    duration_minutes: int | None = None,
) -> Communication:
    if channel not in CHANNELS:
        raise ValueError(f"invalid channel {channel!r}")
    if direction not in DIRECTIONS:
        raise ValueError(f"invalid direction {direction!r}")
    if duration_minutes is not None:
        if channel not in _CONVERSATIONS:
            raise ValueError(f"a {channel} has no duration")
        if duration_minutes <= 0:
            raise ValueError("duration_minutes must be greater than zero")
    with conn.cursor() as cur:
        if matter_id is not None:
            cur.execute(
                "SELECT client_id FROM matters WHERE organization_id = %s AND id = %s",
                (organization_id, matter_id),
            )
            row = cur.fetchone()
            if row is None:
                raise NotFoundError(f"matter {matter_id}")
            # A communication on a matter is a communication with that matter's
            # client, so the log stays queryable by client without the caller
            # having to say so twice.
            client_id = client_id or row[0]
        elif client_id is not None:
            cur.execute(
                "SELECT 1 FROM clients WHERE organization_id = %s AND id = %s",
                (organization_id, client_id),
            )
            if cur.fetchone() is None:
                raise NotFoundError(f"client {client_id}")
        cur.execute(
            "INSERT INTO communications (organization_id, matter_id, client_id, "
            "channel, direction, subject, body, counterparty, logged_by, "
            "occurred_at, duration_minutes) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                organization_id, matter_id, client_id, channel, direction, subject,
                body, counterparty, logged_by, occurred_at, duration_minutes,
            ),
        )
        communication_id = cur.fetchone()[0]
    conn.commit()
    entry = get_communication(conn, organization_id, communication_id)
    assert entry is not None
    return entry


_UPDATABLE = {"subject", "body", "counterparty", "occurred_at", "duration_minutes"}


def update_communication(
    conn: psycopg.Connection, organization_id: int, communication_id: int, **changes
) -> Communication:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE communications SET {assignments} "
                "WHERE organization_id = %s AND id = %s",
                (*fields.values(), organization_id, communication_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"communication {communication_id}")
        conn.commit()
    entry = get_communication(conn, organization_id, communication_id)
    if entry is None:
        raise NotFoundError(f"communication {communication_id}")
    return entry


def delete_communication(
    conn: psycopg.Connection, organization_id: int, communication_id: int
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM communications WHERE organization_id = %s AND id = %s",
            (organization_id, communication_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"communication {communication_id}")
    conn.commit()
