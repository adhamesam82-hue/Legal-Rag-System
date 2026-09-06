"""Postgres connections — thin wrapper, no ORM.

Two ways in, for two different callers:

  * get_connection()   -- a brand new connection. For scripts, migrations and
    tests: things that run once, or that want a connection nothing else is
    touching.
  * request_connection() / db() -- borrowed from a pool. For anything serving
    an HTTP request.

The split exists because opening a connection is the expensive part. Measured
against the local Postgres this project runs in Docker, psycopg.connect costs
~12ms median, while every list query behind the practice screens answers in
under 3ms. Each authenticated request used to open two connections -- one for
the membership check, one for the route body -- so roughly 25ms of every
request was spent on handshakes for ~1ms of actual work, and a screen that
fires three requests paid it three times over.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg_pool import ConnectionPool

from legalrag.config import get_database_url


def get_connection() -> psycopg.Connection:
    """A new, unpooled connection. The caller owns it and must close it."""
    return psycopg.connect(get_database_url())


_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    """The process-wide connection pool, opened on first use.

    Lazy for the same reason every config getter here is: building it reads
    DATABASE_URL, and doing that at import time would crash the whole app on
    startup even for routes that touch no database at all.

    `check` is what makes this safe across a Postgres restart or an idle
    connection killed by a proxy. Without it the pool hands out a dead
    connection and the request fails, once per stale entry; with it the pool
    tests and replaces it first.
    """
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            get_database_url(),
            min_size=2,
            # Comfortably above what one Uvicorn worker can have in flight
            # (FastAPI runs sync routes in a 40-thread pool) while staying far
            # below Postgres's default 100-connection ceiling.
            max_size=20,
            # Recycled hourly so a long-lived process does not sit on
            # connections a server-side change never reaches.
            max_lifetime=3600,
            check=ConnectionPool.check_connection,
            open=True,
        )
    return _pool


def close_pool() -> None:
    """Closes the pool, if one was opened. For shutdown hooks and tests."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def set_tenant_context(conn: psycopg.Connection, organization_id: int) -> None:
    """Sets the transaction-scoped tenant context for Row Level Security (RLS).

    Uses SET LOCAL so that the setting is scoped strictly to the current
    transaction and automatically cleared on commit or rollback when
    the connection returns to the pool.
    """
    with conn.cursor() as cur:
        cur.execute(f"SET LOCAL app.organization_id = {int(organization_id)}")


@contextmanager
def request_connection(
    organization_id: int | None = None,
) -> Iterator[psycopg.Connection]:
    """A pooled connection, returned to the pool on exit.

    Commits on clean exit and rolls back on an exception, which is psycopg's
    own `with connection` behaviour -- unchanged from what the unpooled
    `with get_connection()` callers already relied on.

    If organization_id is provided, sets transaction-local tenant context
    via SET LOCAL app.organization_id for Row Level Security (RLS).
    """
    with get_pool().connection() as conn:
        if organization_id is not None:
            set_tenant_context(conn, organization_id)
        yield conn


def db() -> Iterator[psycopg.Connection]:
    """FastAPI dependency handing a route the request's connection.

    One per request, not one per dependency: FastAPI caches a dependency's
    result for the lifetime of a request, so a route that declares
    `conn=Depends(db)` and also depends on `get_current_membership` -- which
    declares the same thing -- gets a single connection shared by both, inside
    a single transaction.
    """
    with request_connection() as conn:
        yield conn
