"""Applies numbered SQL migrations in migrations/, tracked in schema_migrations.

Run: uv run python scripts/migrate.py
"""
from __future__ import annotations

from pathlib import Path

import psycopg

from legalrag.db import get_connection

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def pending_migrations(migrations_dir: Path, applied: set[str]) -> list[Path]:
    all_files = sorted(migrations_dir.glob("*.sql"))
    return [f for f in all_files if f.name not in applied]


def ensure_schema_migrations_table(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    conn.commit()


def applied_migration_filenames(conn: psycopg.Connection) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT filename FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}


def apply_migration(conn: psycopg.Connection, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(
            "INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,)
        )
    conn.commit()


def main() -> None:
    conn = get_connection()
    ensure_schema_migrations_table(conn)
    applied = applied_migration_filenames(conn)
    pending = pending_migrations(MIGRATIONS_DIR, applied)
    if not pending:
        print("No pending migrations.")
        conn.close()
        return
    for path in pending:
        print(f"Applying {path.name}...")
        apply_migration(conn, path)
        print("  applied.")
    conn.close()


if __name__ == "__main__":
    main()
