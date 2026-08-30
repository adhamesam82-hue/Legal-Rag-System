"""One lawyer's day. The screen a phone opens to.

The dashboard that exists answers "how is the firm doing" -- active matters,
unbilled hours, outstanding invoices. Useful at a desk, useless in a corridor
outside a courtroom, where the only question is what is mine and what is now.

So this is deliberately not the dashboard filtered. It is a different question:

    what am I in court for, what is due, and what is overdue

WHOSE DAY
---------
Hearings and case deadlines carry no assignee -- they belong to a matter -- so
they arrive through matter_staff, the same route the reminder sweep uses.
Tasks have an assignee and use it. That asymmetry is the domain's, not a
shortcut: everyone on a case needs to know about its sitting, and one person
owns a task.

SCOPING STILL APPLIES
---------------------
A lawyer restricted to their own cases must not see another's hearing here
just because this endpoint is convenient. Every query takes the same
visibility predicate as the rest of the practice layer -- an agenda would be a
silly place to open the hole that T-019 closed.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import psycopg

from legalrag.orgs import Membership
from legalrag.practice.scope import UNRESTRICTED, matter_visibility

# A working horizon. Far enough to prepare for, near enough that the list is
# still a day's work rather than a quarter's.
DEFAULT_HORIZON_DAYS = 7


@dataclass(frozen=True)
class AgendaItem:
    kind: str  # 'hearing' | 'deadline' | 'task'
    id: int
    on_date: date
    title: str
    matter_id: int | None
    matter_name: str
    detail: str

    @property
    def is_overdue(self) -> bool:
        return self.on_date < date.today()


def _visibility(membership: Membership, column: str) -> tuple[str, tuple]:
    return matter_visibility(column, membership) if membership else UNRESTRICTED


def my_hearings(
    conn: psycopg.Connection,
    organization_id: int,
    membership: Membership,
    *,
    since: date,
    until: date,
) -> list[AgendaItem]:
    visible, params = _visibility(membership, "h.matter_id")
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT h.id, h.hearing_date, h.matter_id, m.name, h.court,
                   h.purpose, h.hearing_time
              FROM hearings h
              JOIN matters m ON m.id = h.matter_id
              JOIN matter_staff s ON s.matter_id = h.matter_id
             WHERE h.organization_id = %s
               AND s.clerk_user_id = %s
               AND h.hearing_date BETWEEN %s AND %s
               AND {visible}
             ORDER BY h.hearing_date, h.hearing_time
            """,
            (organization_id, membership.clerk_user_id, since, until, *params),
        )
        return [
            AgendaItem(
                kind="hearing",
                id=row[0],
                on_date=row[1],
                title=row[4] or row[3],
                matter_id=row[2],
                matter_name=row[3],
                detail=" · ".join(p for p in (row[6], row[5]) if p),
            )
            for row in cur.fetchall()
        ]


def my_deadlines(
    conn: psycopg.Connection,
    organization_id: int,
    membership: Membership,
    *,
    since: date,
    until: date,
) -> list[AgendaItem]:
    visible, params = _visibility(membership, "c.matter_id")
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT d.id, d.due_date, c.matter_id, m.name, d.label
              FROM case_deadlines d
              JOIN cases c ON c.id = d.case_id
              JOIN matters m ON m.id = c.matter_id
              JOIN matter_staff s ON s.matter_id = c.matter_id
             WHERE c.organization_id = %s
               AND s.clerk_user_id = %s
               AND d.due_date BETWEEN %s AND %s
               AND NOT d.completed
               AND {visible}
             ORDER BY d.due_date
            """,
            (organization_id, membership.clerk_user_id, since, until, *params),
        )
        return [
            AgendaItem(
                kind="deadline",
                id=row[0],
                on_date=row[1],
                title=row[4],
                matter_id=row[2],
                matter_name=row[3],
                detail="",
            )
            for row in cur.fetchall()
        ]


def my_tasks(
    conn: psycopg.Connection,
    organization_id: int,
    membership: Membership,
    *,
    since: date,
    until: date,
) -> list[AgendaItem]:
    """Assigned to me. A task with no matter is still mine and still shown."""
    visible, params = (
        ("TRUE", ())
        if membership is None or membership.matter_scope == "all"
        or membership.role == "owner"
        else (
            "(t.matter_id IS NULL OR t.matter_id IN "
            "(SELECT matter_id FROM matter_staff WHERE clerk_user_id = %s))",
            (membership.clerk_user_id,),
        )
    )
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT t.id, t.due_date, t.matter_id, coalesce(m.name, ''), t.title,
                   t.priority
              FROM tasks t
              LEFT JOIN matters m ON m.id = t.matter_id
             WHERE t.organization_id = %s
               AND t.assignee = %s
               AND t.status <> 'done'
               AND t.due_date BETWEEN %s AND %s
               AND {visible}
             ORDER BY t.due_date, t.priority DESC
            """,
            (organization_id, membership.clerk_user_id, since, until, *params),
        )
        return [
            AgendaItem(
                kind="task",
                id=row[0],
                on_date=row[1],
                title=row[4],
                matter_id=row[2],
                matter_name=row[3],
                detail=row[5],
            )
            for row in cur.fetchall()
        ]


def my_day(
    conn: psycopg.Connection,
    organization_id: int,
    membership: Membership,
    *,
    today: date | None = None,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
) -> dict:
    """Everything of mine, from the oldest overdue thing to `horizon_days` out.

    Overdue items are included without limit and listed first. A deadline
    missed last week does not stop being the most important thing on the
    screen because the horizon starts today -- that is precisely the item a
    lawyer needs shoved in front of them.
    """
    today = today or date.today()
    until = today + timedelta(days=horizon_days)
    # No floor on the start date: overdue is overdue however long ago.
    since = date.min

    items = (
        my_hearings(conn, organization_id, membership, since=since, until=until)
        + my_deadlines(conn, organization_id, membership, since=since, until=until)
        + my_tasks(conn, organization_id, membership, since=since, until=until)
    )
    items.sort(key=lambda item: (item.on_date, item.kind))

    overdue = [i for i in items if i.on_date < today]
    todays = [i for i in items if i.on_date == today]
    upcoming = [i for i in items if i.on_date > today]

    return {
        "today": today,
        "horizon_days": horizon_days,
        "overdue": overdue,
        "today_items": todays,
        "upcoming": upcoming,
        "counts": {
            "overdue": len(overdue),
            "today": len(todays),
            "upcoming": len(upcoming),
        },
    }
