"""Tasks — assignable work items, optionally scoped to a matter."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

STATUSES = ("todo", "in_progress", "done")
PRIORITIES = ("low", "medium", "high")

_COLUMNS = """
    t.id, t.organization_id, t.matter_id, m.name AS matter_name, t.title,
    t.assignee, t.due_date, t.status, t.priority, t.created_at, t.completed_at
"""


@dataclass
class Task:
    id: int
    organization_id: int
    matter_id: int | None
    matter_name: str | None
    title: str
    assignee: str
    due_date: date | None
    status: str
    priority: str
    created_at: datetime
    completed_at: datetime | None


def list_tasks(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    assignee: str | None = None,
    status: str | None = None,
    due_before: date | None = None,
) -> list[Task]:
    sql = (
        f"SELECT {_COLUMNS} FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id "
        "WHERE t.organization_id = %s"
    )
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND t.matter_id = %s"
        params.append(matter_id)
    if assignee:
        sql += " AND t.assignee = %s"
        params.append(assignee)
    if status:
        sql += " AND t.status = %s"
        params.append(status)
    if due_before:
        sql += " AND t.due_date <= %s"
        params.append(due_before)
    # Undated tasks sort last rather than first, which is what NULLS LAST buys.
    sql += " ORDER BY t.due_date NULLS LAST, t.id"
    return fetch_all(conn, Task, sql, tuple(params))


def get_task(
    conn: psycopg.Connection, organization_id: int, task_id: int
) -> Task | None:
    return fetch_one(
        conn,
        Task,
        f"SELECT {_COLUMNS} FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id "
        "WHERE t.organization_id = %s AND t.id = %s",
        (organization_id, task_id),
    )


def create_task(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    title: str,
    assignee: str,
    matter_id: int | None = None,
    due_date: date | None = None,
    status: str = "todo",
    priority: str = "medium",
) -> Task:
    if status not in STATUSES:
        raise ValueError(f"invalid status {status!r}")
    if priority not in PRIORITIES:
        raise ValueError(f"invalid priority {priority!r}")
    with conn.cursor() as cur:
        if matter_id is not None:
            cur.execute(
                "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
                (organization_id, matter_id),
            )
            if cur.fetchone() is None:
                raise NotFoundError(f"matter {matter_id}")
        cur.execute(
            "INSERT INTO tasks (organization_id, matter_id, title, assignee, "
            "due_date, status, priority, completed_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, "
            "CASE WHEN %s = 'done' THEN now() END) RETURNING id",
            (
                organization_id, matter_id, title, assignee, due_date, status,
                priority, status,
            ),
        )
        task_id = cur.fetchone()[0]
    conn.commit()
    task = get_task(conn, organization_id, task_id)
    assert task is not None
    return task


_UPDATABLE = {"title", "assignee", "matter_id", "due_date", "status", "priority"}


def update_task(
    conn: psycopg.Connection, organization_id: int, task_id: int, **changes
) -> Task:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    if "status" in fields and fields["status"] not in STATUSES:
        raise ValueError(f"invalid status {fields['status']!r}")
    if "priority" in fields and fields["priority"] not in PRIORITIES:
        raise ValueError(f"invalid priority {fields['priority']!r}")

    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        # completed_at tracks status rather than being set by callers, so a
        # task reopened after being done does not keep a stale completion time.
        if "status" in fields:
            assignments += (
                ", completed_at = CASE WHEN %s = 'done' "
                "THEN coalesce(completed_at, now()) END"
            )
            params = (*fields.values(), fields["status"], organization_id, task_id)
        else:
            params = (*fields.values(), organization_id, task_id)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE tasks SET {assignments} "
                "WHERE organization_id = %s AND id = %s",
                params,
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"task {task_id}")
        conn.commit()
    task = get_task(conn, organization_id, task_id)
    if task is None:
        raise NotFoundError(f"task {task_id}")
    return task


def delete_task(conn: psycopg.Connection, organization_id: int, task_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM tasks WHERE organization_id = %s AND id = %s",
            (organization_id, task_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"task {task_id}")
    conn.commit()
