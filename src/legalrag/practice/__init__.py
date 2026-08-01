"""Practice management: clients, matters, cases, documents, tasks, time, billing.

The firm-operations half of the product, as opposed to the statute corpus
(legalrag.library, legalrag.retrieve). Every function here takes an
`organization_id` and filters on it in SQL. Tenant isolation is enforced in
this layer rather than only in the route layer, so a route that forgets a
check still cannot read another firm's rows.

Same house style as legalrag.orgs: thin psycopg, no ORM, frozen dataclasses.
Rows are mapped with psycopg's class_row, so dataclass field names must match
the selected column names.
"""
from __future__ import annotations

from typing import Any, TypeVar

import psycopg
from psycopg.rows import class_row

T = TypeVar("T")


def fetch_all(
    conn: psycopg.Connection, record: type[T], sql: str, params: tuple[Any, ...] = ()
) -> list[T]:
    with conn.cursor(row_factory=class_row(record)) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def fetch_one(
    conn: psycopg.Connection, record: type[T], sql: str, params: tuple[Any, ...] = ()
) -> T | None:
    with conn.cursor(row_factory=class_row(record)) as cur:
        cur.execute(sql, params)
        return cur.fetchone()


class NotFoundError(Exception):
    """Raised when a record does not exist, or belongs to another organization.

    Deliberately does not distinguish the two: telling a caller "that id exists
    but is not yours" leaks the existence of another firm's records.
    """
