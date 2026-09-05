"""Activity feed and the cross-pillar dashboard rollup.

`activity` is append-only: it is the record of what happened, so nothing here
updates or deletes a row.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

import psycopg

from legalrag.practice import fetch_all

AI_ACTOR = "system:ai"


@dataclass
class ActivityEntry:
    id: int
    matter_id: int | None
    matter_name: str | None
    client_id: int | None
    client_name: str | None
    actor: str
    action: str
    occurred_at: datetime


_COLUMNS = """
    a.id, a.matter_id, m.name AS matter_name, a.client_id,
    c.name AS client_name, a.actor, a.action, a.occurred_at
"""


def list_activity(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    client_id: int | None = None,
    limit: int = 50,
) -> list[ActivityEntry]:
    sql = (
        f"SELECT {_COLUMNS} FROM activity a "
        "LEFT JOIN matters m ON m.id = a.matter_id "
        "LEFT JOIN clients c ON c.id = a.client_id "
        "WHERE a.organization_id = %s"
    )
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND a.matter_id = %s"
        params.append(matter_id)
    if client_id is not None:
        sql += " AND a.client_id = %s"
        params.append(client_id)
    sql += " ORDER BY a.occurred_at DESC LIMIT %s"
    params.append(limit)
    return fetch_all(conn, ActivityEntry, sql, tuple(params))


def record(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    actor: str,
    action: str,
    matter_id: int | None = None,
    client_id: int | None = None,
    occurred_at: datetime | None = None,
) -> None:
    """Appends an activity entry. Does not commit — callers commit their own work.

    Activity is written alongside the change it describes, so it must join that
    transaction rather than committing independently and leaving a log entry for
    a change that then rolled back.
    """
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO activity (organization_id, matter_id, client_id, actor, "
            "action, occurred_at) VALUES (%s, %s, %s, %s, %s, coalesce(%s, now()))",
            (organization_id, matter_id, client_id, actor, action, occurred_at),
        )


# --- dashboard --------------------------------------------------------------


@dataclass
class UpcomingItem:
    kind: str  # 'hearing' | 'task' | 'deadline'
    label: str
    due_date: date
    matter_id: int | None
    matter_name: str | None


@dataclass
class Dashboard:
    active_matters: int
    open_tasks: int
    overdue_tasks: int
    active_clients: int
    unbilled_amount: Decimal
    outstanding_amount: Decimal
    hours_this_month: Decimal
    upcoming: list[UpcomingItem]
    recent_activity: list[ActivityEntry]
    tasks_due_this_week: int


def dashboard(
    conn: psycopg.Connection, organization_id: int, *, upcoming_days: int = 30
) -> Dashboard:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              (SELECT count(*) FROM matters
                WHERE organization_id = %(org)s AND status = 'active'),
              (SELECT count(*) FROM tasks
                WHERE organization_id = %(org)s AND status <> 'done'),
              (SELECT count(*) FROM tasks
                WHERE organization_id = %(org)s AND status <> 'done'
                  AND due_date < CURRENT_DATE),
              (SELECT count(*) FROM clients
                WHERE organization_id = %(org)s AND status = 'active'),
              (SELECT coalesce(sum(hours * rate), 0) FROM time_entries
                WHERE organization_id = %(org)s AND billable AND invoice_id IS NULL),
              (SELECT coalesce(sum(amount), 0) FROM invoices
                WHERE organization_id = %(org)s AND status IN ('sent', 'overdue')),
              (SELECT coalesce(sum(hours), 0) FROM time_entries
                WHERE organization_id = %(org)s
                  AND entry_date >= date_trunc('month', CURRENT_DATE)),
              (SELECT count(*) FROM tasks
                WHERE organization_id = %(org)s AND status <> 'done'
                  AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)
            """,
            {"org": organization_id},
        )
        row = cur.fetchone()

        cur.execute(
            """
            SELECT kind, label, due_date, matter_id, matter_name FROM (
                SELECT 'hearing' AS kind, h.purpose AS label, h.hearing_date AS due_date,
                       h.matter_id, m.name AS matter_name
                  FROM hearings h JOIN matters m ON m.id = h.matter_id
                 WHERE h.organization_id = %(org)s
                UNION ALL
                SELECT 'task', t.title, t.due_date, t.matter_id, m.name
                  FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id
                 WHERE t.organization_id = %(org)s AND t.status <> 'done'
                   AND t.due_date IS NOT NULL
                UNION ALL
                SELECT 'deadline', d.label, d.due_date, c.matter_id, m.name
                  FROM case_deadlines d
                  JOIN cases c ON c.id = d.case_id
                  JOIN matters m ON m.id = c.matter_id
                 WHERE c.organization_id = %(org)s AND NOT d.completed
            ) items
            WHERE due_date BETWEEN CURRENT_DATE
                              AND CURRENT_DATE + make_interval(days => %(days)s)
            ORDER BY due_date, kind
            """,
            {"org": organization_id, "days": upcoming_days},
        )
        upcoming = [UpcomingItem(*values) for values in cur.fetchall()]

    return Dashboard(
        active_matters=row[0],
        open_tasks=row[1],
        overdue_tasks=row[2],
        active_clients=row[3],
        unbilled_amount=row[4],
        outstanding_amount=row[5],
        hours_this_month=row[6],
        upcoming=upcoming,
        recent_activity=list_activity(conn, organization_id, limit=15),
        tasks_due_this_week=row[7],
    )
