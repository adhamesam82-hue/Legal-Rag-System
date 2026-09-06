"""Activity feed and the cross-pillar dashboard rollup.

`activity` is append-only: it is the record of what happened, so nothing here
updates or deletes a row.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal

import psycopg

from legalrag.orgs import Membership
from legalrag.practice import fetch_all
from legalrag.practice.scope import matter_visibility, nullable_matter_visibility

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


# --- dashboard insights (T-059) ---------------------------------------------


ARABIC_MONTHS = {
    1: "يناير",
    2: "فبراير",
    3: "مارس",
    4: "أبريل",
    5: "مايو",
    6: "يونيو",
    7: "يوليو",
    8: "أغسطس",
    9: "سبتمبر",
    10: "أكتوبر",
    11: "نوفمبر",
    12: "ديسمبر",
}


@dataclass
class MonthMovement:
    month: str  # YYYY-MM
    label: str  # e.g. "سبتمبر"
    opened: int
    closed: int


@dataclass
class MatterTypeStat:
    matter_type: str
    count: int
    percentage: float


@dataclass
class MattersByType:
    items: list[MatterTypeStat]
    total_active: int


@dataclass
class KpiDeltas:
    active_matters: dict[str, object]
    open_tasks: dict[str, object]
    unbilled_hours: dict[str, object]
    outstanding_amount: dict[str, object]


@dataclass
class KpiSeries:
    active_matters: list[float]
    open_tasks: list[float]
    unbilled_hours: list[float]
    outstanding_amount: list[float]


@dataclass
class CollectionsInsight:
    collected: float
    outstanding: float


@dataclass
class TopCollectionRate:
    matter_type: str | None
    rate: float


@dataclass
class RecentMatterItem:
    id: int
    matter_number: str
    name: str
    client_name: str
    matter_type: str
    court: str
    responsible_user: str
    status: str
    next_deadline: dict[str, str] | None


@dataclass
class RecentMatters:
    items: list[RecentMatterItem]
    total: int
    limit: int
    offset: int


@dataclass
class MyTaskItem:
    id: int
    title: str
    status: str
    due_date: str | None
    priority: str
    matter_id: int | None
    matter_name: str | None


@dataclass
class MyTasksToday:
    items: list[MyTaskItem]
    done: int
    total: int


@dataclass
class DashboardInsights:
    matters_movement: list[MonthMovement]
    matters_by_type: MattersByType
    kpi_series: KpiSeries
    kpi_deltas: KpiDeltas
    collections: CollectionsInsight
    top_collection_rate: TopCollectionRate
    recent_matters: RecentMatters
    my_tasks_today: MyTasksToday


def _calc_delta(curr: float, prev: float) -> dict[str, object]:
    if prev == 0:
        if curr > 0:
            return {"delta_pct": 100.0, "direction": "up"}
        return {"delta_pct": 0.0, "direction": "flat"}
    diff = curr - prev
    pct = round((diff / prev) * 100.0, 1)
    if pct > 0:
        return {"delta_pct": pct, "direction": "up"}
    elif pct < 0:
        return {"delta_pct": abs(pct), "direction": "down"}
    return {"delta_pct": 0.0, "direction": "flat"}


def dashboard_insights(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    clerk_user_id: str,
    membership: Membership,
    limit: int = 5,
    offset: int = 0,
    scope: str = "all",
) -> DashboardInsights:
    """Aggregates all insights for the template-parity dashboard (T-059).

    All sub-queries are strictly scoped by organization_id and filtered through
    matter_visibility() to ensure zero leakage across tenants and staff boundaries.
    """
    today = date.today()
    m_vis, m_params = matter_visibility("m.id", membership)
    inv_vis, inv_params = nullable_matter_visibility("i.matter_id", membership)

    # 1. Eight-month movement (opened vs closed)
    cur_year, cur_month = today.year, today.month
    months_meta: list[tuple[str, str, int, int]] = []
    for i in range(7, -1, -1):
        m = cur_month - i
        y = cur_year
        while m <= 0:
            m += 12
            y -= 1
        months_meta.append((f"{y:04d}-{m:02d}", ARABIC_MONTHS.get(m, str(m)), y, m))

    earliest_month_str = f"{months_meta[0][2]:04d}-{months_meta[0][3]:02d}-01"

    with conn.cursor() as cur:
        # Opened counts by month
        cur.execute(
            f"""
            SELECT to_char(m.opened_date, 'YYYY-MM') AS mth, count(*)
              FROM matters m
             WHERE m.organization_id = %s AND {m_vis}
               AND m.opened_date >= %s
             GROUP BY 1
            """,
            (organization_id, *m_params, earliest_month_str),
        )
        opened_by_month = dict(cur.fetchall())

        # Closed counts by month
        cur.execute(
            f"""
            SELECT to_char(m.closed_date, 'YYYY-MM') AS mth, count(*)
              FROM matters m
             WHERE m.organization_id = %s AND {m_vis}
               AND m.closed_date >= %s
             GROUP BY 1
            """,
            (organization_id, *m_params, earliest_month_str),
        )
        closed_by_month = dict(cur.fetchall())

        matters_movement = [
            MonthMovement(
                month=m_key,
                label=m_label,
                opened=opened_by_month.get(m_key, 0),
                closed=closed_by_month.get(m_key, 0),
            )
            for m_key, m_label, _, _ in months_meta
        ]

        # 2. Matters by type (active only)
        cur.execute(
            f"""
            SELECT coalesce(m.matter_type, 'other') AS mtype, count(*) AS cnt
              FROM matters m
             WHERE m.organization_id = %s AND {m_vis} AND m.status = 'active'
             GROUP BY 1
             ORDER BY 2 DESC
            """,
            (organization_id, *m_params),
        )
        type_rows = cur.fetchall()
        total_active = sum(r[1] for r in type_rows)
        matters_by_type = MattersByType(
            items=[
                MatterTypeStat(
                    matter_type=r[0],
                    count=r[1],
                    percentage=round((r[1] / total_active * 100.0), 1) if total_active > 0 else 0.0,
                )
                for r in type_rows
            ],
            total_active=total_active,
        )

        # 3. KPI series (9 snapshot points spaced over the last 8 weeks)
        start_date = today - timedelta(days=56)
        cur.execute(
            f"""
            SELECT s.snap::date,
                   (SELECT count(*) FROM matters m
                     WHERE m.organization_id = %(org)s AND {m_vis}
                       AND m.opened_date <= s.snap::date
                       AND (m.closed_date IS NULL OR m.closed_date > s.snap::date)),
                   (SELECT count(*) FROM tasks t
                     WHERE t.organization_id = %(org)s
                       AND t.created_at::date <= s.snap::date
                       AND (t.completed_at IS NULL OR t.completed_at::date > s.snap::date)),
                   (SELECT coalesce(sum(te.hours), 0) FROM time_entries te
                     WHERE te.organization_id = %(org)s AND te.billable AND te.invoice_id IS NULL
                       AND te.entry_date <= s.snap::date),
                   (SELECT coalesce(sum(i.amount), 0) FROM invoices i
                     WHERE i.organization_id = %(org)s AND i.status IN ('sent', 'overdue')
                       AND i.issued_date <= s.snap::date)
              FROM generate_series(%(start_date)s::date, %(end_date)s::date, '7 days'::interval) s(snap)
             ORDER BY s.snap
             LIMIT 9
            """,
            {
                "org": organization_id,
                "start_date": start_date,
                "end_date": today,
            },
        )
        snap_rows = cur.fetchall()
        active_matters_series = [float(r[1]) for r in snap_rows]
        open_tasks_series = [float(r[2]) for r in snap_rows]
        unbilled_hours_series = [float(r[3]) for r in snap_rows]
        outstanding_series = [float(r[4]) for r in snap_rows]

        # Ensure exactly 9 points
        while len(active_matters_series) < 9:
            active_matters_series.insert(0, active_matters_series[0] if active_matters_series else 0.0)
            open_tasks_series.insert(0, open_tasks_series[0] if open_tasks_series else 0.0)
            unbilled_hours_series.insert(0, unbilled_hours_series[0] if unbilled_hours_series else 0.0)
            outstanding_series.insert(0, outstanding_series[0] if outstanding_series else 0.0)

        kpi_series = KpiSeries(
            active_matters=active_matters_series[-9:],
            open_tasks=open_tasks_series[-9:],
            unbilled_hours=unbilled_hours_series[-9:],
            outstanding_amount=outstanding_series[-9:],
        )

        # 4. KPI deltas (comparing latest snapshot point to previous period point)
        kpi_deltas = KpiDeltas(
            active_matters=_calc_delta(kpi_series.active_matters[-1], kpi_series.active_matters[-5]),
            open_tasks=_calc_delta(kpi_series.open_tasks[-1], kpi_series.open_tasks[-5]),
            unbilled_hours=_calc_delta(kpi_series.unbilled_hours[-1], kpi_series.unbilled_hours[-5]),
            outstanding_amount=_calc_delta(kpi_series.outstanding_amount[-1], kpi_series.outstanding_amount[-5]),
        )

        # 5. Collections (collected vs outstanding)
        cur.execute(
            f"""
            SELECT
              coalesce(sum(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS collected,
              coalesce(sum(CASE WHEN i.status IN ('sent', 'overdue') THEN i.amount ELSE 0 END), 0) AS outstanding
            FROM invoices i
            WHERE i.organization_id = %s AND {inv_vis}
            """,
            (organization_id, *inv_params),
        )
        col_row = cur.fetchone() or (0, 0)
        collections = CollectionsInsight(
            collected=float(col_row[0]),
            outstanding=float(col_row[1]),
        )

        # 6. Top collection rate this month by matter type
        cur.execute(
            f"""
            SELECT m.matter_type,
                   coalesce(sum(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS paid_amt,
                   coalesce(sum(i.amount), 0) AS total_amt
              FROM invoices i
              JOIN matters m ON m.id = i.matter_id
             WHERE i.organization_id = %s AND {m_vis}
               AND i.issued_date >= date_trunc('month', CURRENT_DATE)
             GROUP BY m.matter_type
            HAVING sum(i.amount) > 0
             ORDER BY (sum(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) / sum(i.amount)) DESC
             LIMIT 1
            """,
            (organization_id, *m_params),
        )
        top_row = cur.fetchone()
        if not top_row:
            cur.execute(
                f"""
                SELECT m.matter_type,
                       coalesce(sum(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS paid_amt,
                       coalesce(sum(i.amount), 0) AS total_amt
                  FROM invoices i
                  JOIN matters m ON m.id = i.matter_id
                 WHERE i.organization_id = %s AND {m_vis}
                 GROUP BY m.matter_type
                HAVING sum(i.amount) > 0
                 ORDER BY (sum(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) / sum(i.amount)) DESC
                 LIMIT 1
                """,
                (organization_id, *m_params),
            )
            top_row = cur.fetchone()

        if top_row and float(top_row[2]) > 0:
            top_collection_rate = TopCollectionRate(
                matter_type=top_row[0],
                rate=round((float(top_row[1]) / float(top_row[2])) * 100.0, 1),
            )
        else:
            top_collection_rate = TopCollectionRate(matter_type=None, rate=0.0)

        # 7. Recent matters (paginated, with batch next_deadline enrichment)
        base_where = f"m.organization_id = %s AND {m_vis}"
        base_params: list[object] = [organization_id, *m_params]
        if scope == "my":
            base_where += " AND (m.responsible_user = %s OR m.id IN (SELECT matter_id FROM matter_staff WHERE clerk_user_id = %s))"
            base_params.extend([clerk_user_id, clerk_user_id])

        cur.execute(f"SELECT count(*) FROM matters m WHERE {base_where}", tuple(base_params))
        total_recent_matters = cur.fetchone()[0]

        cur.execute(
            f"""
            SELECT m.id, m.matter_number, m.name, coalesce(c.name, '') AS client_name,
                   m.matter_type, coalesce(cs.court, '—') AS court,
                   coalesce(m.responsible_user, '—') AS responsible_user,
                   m.status
              FROM matters m
              LEFT JOIN clients c ON c.id = m.client_id
              LEFT JOIN cases cs ON cs.matter_id = m.id
             WHERE {base_where}
             ORDER BY m.opened_date DESC, m.id DESC
             LIMIT %s OFFSET %s
            """,
            (*base_params, limit, offset),
        )
        m_rows = cur.fetchall()
        m_ids = [r[0] for r in m_rows]

        deadlines: dict[int, tuple[str, date]] = {}
        if m_ids:
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
                (m_ids, m_ids),
            )
            for mid, lbl, dt in cur.fetchall():
                deadlines[mid] = (lbl, dt)

        recent_matters = RecentMatters(
            items=[
                RecentMatterItem(
                    id=r[0],
                    matter_number=r[1],
                    name=r[2],
                    client_name=r[3],
                    matter_type=r[4],
                    court=r[5],
                    responsible_user=r[6],
                    status=r[7],
                    next_deadline=(
                        {"label": deadlines[r[0]][0], "due_date": deadlines[r[0]][1].isoformat()}
                        if r[0] in deadlines
                        else None
                    ),
                )
                for r in m_rows
            ],
            total=total_recent_matters,
            limit=limit,
            offset=offset,
        )

        # 8. My Tasks Today (scoped to clerk_user_id)
        cur.execute(
            """
            SELECT t.id, t.title, t.status, t.due_date, t.priority, t.matter_id, m.name AS matter_name
              FROM tasks t
              LEFT JOIN matters m ON m.id = t.matter_id
             WHERE t.organization_id = %s AND t.assignee = %s
               AND (
                 (t.status <> 'done' AND (t.due_date <= CURRENT_DATE + 7 OR t.due_date IS NULL))
                 OR
                 (t.status = 'done' AND t.completed_at >= CURRENT_DATE - interval '1 day')
               )
             ORDER BY (t.status = 'done') ASC, t.due_date ASC NULLS LAST, t.id DESC
             LIMIT 10
            """,
            (organization_id, clerk_user_id),
        )
        task_rows = cur.fetchall()
        task_items = [
            MyTaskItem(
                id=r[0],
                title=r[1],
                status=r[2],
                due_date=r[3].isoformat() if r[3] else None,
                priority=r[4],
                matter_id=r[5],
                matter_name=r[6],
            )
            for r in task_rows
        ]
        my_tasks_today = MyTasksToday(
            items=task_items,
            done=sum(1 for t in task_items if t.status == "done"),
            total=len(task_items),
        )

    return DashboardInsights(
        matters_movement=matters_movement,
        matters_by_type=matters_by_type,
        kpi_series=kpi_series,
        kpi_deltas=kpi_deltas,
        collections=collections,
        top_collection_rate=top_collection_rate,
        recent_matters=recent_matters,
        my_tasks_today=my_tasks_today,
    )

