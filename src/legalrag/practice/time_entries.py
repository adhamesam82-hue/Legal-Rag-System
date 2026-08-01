"""Time tracking.

An entry is billable work until it is pulled onto an invoice, at which point
billing.py stamps its invoice_id. Entries already stamped are excluded from
the next invoice, which is what stops the same hour being billed twice.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

_COLUMNS = """
    t.id, t.organization_id, t.matter_id, m.name AS matter_name,
    t.clerk_user_id, t.entry_date, t.hours, t.description, t.billable, t.rate,
    t.currency, t.invoice_id, t.created_at
"""


@dataclass
class TimeEntry:
    id: int
    organization_id: int
    matter_id: int
    matter_name: str
    clerk_user_id: str
    entry_date: date
    hours: Decimal
    description: str
    billable: bool
    rate: Decimal
    currency: str
    invoice_id: int | None
    created_at: datetime

    @property
    def amount(self) -> Decimal:
        return self.hours * self.rate if self.billable else Decimal(0)


def list_time_entries(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    clerk_user_id: str | None = None,
    since: date | None = None,
    until: date | None = None,
    unbilled_only: bool = False,
) -> list[TimeEntry]:
    sql = (
        f"SELECT {_COLUMNS} FROM time_entries t JOIN matters m ON m.id = t.matter_id "
        "WHERE t.organization_id = %s"
    )
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND t.matter_id = %s"
        params.append(matter_id)
    if clerk_user_id:
        sql += " AND t.clerk_user_id = %s"
        params.append(clerk_user_id)
    if since:
        sql += " AND t.entry_date >= %s"
        params.append(since)
    if until:
        sql += " AND t.entry_date <= %s"
        params.append(until)
    if unbilled_only:
        sql += " AND t.invoice_id IS NULL AND t.billable"
    sql += " ORDER BY t.entry_date DESC, t.id DESC"
    return fetch_all(conn, TimeEntry, sql, tuple(params))


def get_time_entry(
    conn: psycopg.Connection, organization_id: int, entry_id: int
) -> TimeEntry | None:
    return fetch_one(
        conn,
        TimeEntry,
        f"SELECT {_COLUMNS} FROM time_entries t JOIN matters m ON m.id = t.matter_id "
        "WHERE t.organization_id = %s AND t.id = %s",
        (organization_id, entry_id),
    )


def create_time_entry(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int,
    clerk_user_id: str,
    entry_date: date,
    hours: Decimal,
    description: str = "",
    billable: bool = True,
    rate: Decimal = Decimal(0),
    currency: str = "EGP",
) -> TimeEntry:
    if hours <= 0:
        raise ValueError("hours must be greater than zero")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")
        cur.execute(
            "INSERT INTO time_entries (organization_id, matter_id, clerk_user_id, "
            "entry_date, hours, description, billable, rate, currency) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                organization_id, matter_id, clerk_user_id, entry_date, hours,
                description, billable, rate, currency,
            ),
        )
        entry_id = cur.fetchone()[0]
    conn.commit()
    entry = get_time_entry(conn, organization_id, entry_id)
    assert entry is not None
    return entry


_UPDATABLE = {
    "matter_id", "entry_date", "hours", "description", "billable", "rate",
}


def update_time_entry(
    conn: psycopg.Connection, organization_id: int, entry_id: int, **changes
) -> TimeEntry:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    if "hours" in fields and fields["hours"] <= 0:
        raise ValueError("hours must be greater than zero")
    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        with conn.cursor() as cur:
            # An entry already on an invoice is frozen: editing it would change
            # a total that has been sent to a client.
            cur.execute(
                f"UPDATE time_entries SET {assignments} "
                "WHERE organization_id = %s AND id = %s AND invoice_id IS NULL",
                (*fields.values(), organization_id, entry_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"unbilled time entry {entry_id}")
        conn.commit()
    entry = get_time_entry(conn, organization_id, entry_id)
    if entry is None:
        raise NotFoundError(f"time entry {entry_id}")
    return entry


def delete_time_entry(
    conn: psycopg.Connection, organization_id: int, entry_id: int
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM time_entries "
            "WHERE organization_id = %s AND id = %s AND invoice_id IS NULL",
            (organization_id, entry_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"unbilled time entry {entry_id}")
    conn.commit()


@dataclass
class TimeSummary:
    total_hours: Decimal
    billable_hours: Decimal
    billable_amount: Decimal
    unbilled_amount: Decimal


def summarize(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    clerk_user_id: str | None = None,
    since: date | None = None,
    until: date | None = None,
) -> TimeSummary:
    sql = """
        SELECT coalesce(sum(hours), 0),
               coalesce(sum(hours) FILTER (WHERE billable), 0),
               coalesce(sum(hours * rate) FILTER (WHERE billable), 0),
               coalesce(sum(hours * rate) FILTER (WHERE billable
                        AND invoice_id IS NULL), 0)
          FROM time_entries WHERE organization_id = %s
    """
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND matter_id = %s"
        params.append(matter_id)
    if clerk_user_id:
        sql += " AND clerk_user_id = %s"
        params.append(clerk_user_id)
    if since:
        sql += " AND entry_date >= %s"
        params.append(since)
    if until:
        sql += " AND entry_date <= %s"
        params.append(until)
    with conn.cursor() as cur:
        cur.execute(sql, tuple(params))
        return TimeSummary(*cur.fetchone())
