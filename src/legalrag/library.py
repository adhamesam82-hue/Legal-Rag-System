"""Read-only browsing of the corpus. No LLM calls -- these work with a dry API key."""
from __future__ import annotations

from dataclasses import dataclass

import psycopg

from legalrag.arabic import normalize
from legalrag.retrieve import ARTICLE_COLUMNS, Candidate, to_candidate


@dataclass(frozen=True)
class Instrument:
    id: int
    jurisdiction: str
    instrument_type: str
    number: str
    year: int
    title: str
    article_count: int

    @property
    def reference(self) -> str:
        return f"{self.number}/{self.year}"


def corpus_stats(conn: psycopg.Connection) -> dict[str, dict[str, int]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT jurisdiction, count(DISTINCT instrument_id), count(*)
            FROM articles WHERE NOT is_repealed GROUP BY jurisdiction
            """
        )
        rows = cur.fetchall()
    return {
        row[0]: {"instruments": row[1], "articles": row[2]} for row in rows
    }


def list_instruments(
    conn: psycopg.Connection,
    jurisdiction: str,
    query: str | None = None,
    limit: int = 200,
) -> list[Instrument]:
    """List instruments, optionally filtered by a title substring."""
    clauses = ["i.jurisdiction = %s"]
    params: list = [jurisdiction]
    if query:
        clauses.append("i.title_norm LIKE %s")
        params.append(f"%{normalize(query)}%")

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT i.id, i.jurisdiction, i.instrument_type, i.number, i.year, i.title,
                   count(a.id) FILTER (WHERE NOT a.is_repealed) AS article_count
            FROM instruments i LEFT JOIN articles a ON a.instrument_id = i.id
            WHERE {' AND '.join(clauses)}
            GROUP BY i.id
            ORDER BY article_count DESC, i.year DESC
            LIMIT %s
            """,
            (*params, limit),
        )
        return [Instrument(*row) for row in cur.fetchall()]


def get_instrument(conn: psycopg.Connection, instrument_id: int) -> Instrument | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT i.id, i.jurisdiction, i.instrument_type, i.number, i.year, i.title,
                   count(a.id) FILTER (WHERE NOT a.is_repealed) AS article_count
            FROM instruments i LEFT JOIN articles a ON a.instrument_id = i.id
            WHERE i.id = %s
            GROUP BY i.id
            """,
            (instrument_id,),
        )
        row = cur.fetchone()
        return Instrument(*row) if row else None


def list_articles(
    conn: psycopg.Connection,
    instrument_id: int,
    offset: int = 0,
    limit: int = 50,
) -> list[Candidate]:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {ARTICLE_COLUMNS}
            FROM articles a JOIN instruments i ON i.id = a.instrument_id
            WHERE a.instrument_id = %s AND NOT a.is_repealed
            ORDER BY a.article_sort_key
            OFFSET %s LIMIT %s
            """,
            (instrument_id, offset, limit),
        )
        return [to_candidate(row, score=0.0) for row in cur.fetchall()]


def get_article(conn: psycopg.Connection, article_id: int) -> Candidate | None:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {ARTICLE_COLUMNS}
            FROM articles a JOIN instruments i ON i.id = a.instrument_id
            WHERE a.id = %s
            """,
            (article_id,),
        )
        row = cur.fetchone()
        return to_candidate(row, score=0.0) if row else None


def article_neighbours(
    conn: psycopg.Connection, article: Candidate
) -> dict[str, int | None]:
    """Previous/next article ids within the same instrument, for navigation."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              (SELECT id FROM articles
                WHERE instrument_id = a.instrument_id AND NOT is_repealed
                  AND article_sort_key < a.article_sort_key
                ORDER BY article_sort_key DESC LIMIT 1),
              (SELECT id FROM articles
                WHERE instrument_id = a.instrument_id AND NOT is_repealed
                  AND article_sort_key > a.article_sort_key
                ORDER BY article_sort_key ASC LIMIT 1)
            FROM articles a WHERE a.id = %s
            """,
            (article.article_id,),
        )
        row = cur.fetchone()
        return {"previous": row[0], "next": row[1]} if row else {"previous": None, "next": None}
