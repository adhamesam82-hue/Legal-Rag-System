"""Postgres connection helper — thin wrapper, no ORM."""
from __future__ import annotations

import psycopg

from legalrag.config import get_database_url


def get_connection() -> psycopg.Connection:
    return psycopg.connect(get_database_url())
