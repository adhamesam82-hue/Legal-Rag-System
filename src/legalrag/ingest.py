"""Loads parsed, normalized articles into the instruments/articles tables."""
from __future__ import annotations

import hashlib
from collections import Counter
from datetime import datetime

import psycopg

from legalrag.arabic import NORM_VERSION, normalize
from legalrag.parse.articles import ParsedArticle


def upsert_instrument(
    conn: psycopg.Connection,
    *,
    jurisdiction: str,
    instrument_type: str,
    number: str,
    year: int,
    title: str,
    source_url: str,
    fetched_at: datetime,
) -> int:
    title_norm = normalize(title)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO instruments
                    (jurisdiction, instrument_type, number, year, title, title_norm, source_url, fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (jurisdiction, instrument_type, number, year)
                DO UPDATE SET title = EXCLUDED.title, title_norm = EXCLUDED.title_norm,
                              source_url = EXCLUDED.source_url, fetched_at = EXCLUDED.fetched_at
                RETURNING id
                """,
                (jurisdiction, instrument_type, number, year, title, title_norm, source_url, fetched_at),
            )
            row = cur.fetchone()
            assert row is not None
            instrument_id = row[0]
    except Exception:
        conn.rollback()
        raise
    conn.commit()
    return instrument_id


def insert_articles(
    conn: psycopg.Connection,
    *,
    instrument_id: int,
    articles: list[ParsedArticle],
    language: str,
    source_url: str,
) -> int:
    number_counts = Counter(article.article_number for article in articles)
    duplicates = {number: n for number, n in number_counts.items() if n > 1}
    if duplicates:
        detail = ", ".join(
            f"{number!r} x{n}" for number, n in sorted(duplicates.items())
        )
        raise ValueError(
            f"insert_articles: instrument_id={instrument_id} has duplicate "
            f"article_number values, refusing to insert (would silently "
            f"overwrite via ON CONFLICT): {detail}"
        )

    count = 0
    try:
        with conn.cursor() as cur:
            # Derive jurisdiction from the parent instrument row rather than
            # trusting a separately-passed value -- this is the only place
            # articles.jurisdiction is set, so it can never disagree with
            # instruments.jurisdiction (see migrations/0002 for the DB-level
            # backstop on top of this).
            cur.execute("SELECT jurisdiction FROM instruments WHERE id = %s", (instrument_id,))
            row = cur.fetchone()
            if row is None:
                raise ValueError(
                    f"insert_articles: no instrument with id={instrument_id}"
                )
            jurisdiction = row[0]

            for article in articles:
                article_text_norm = normalize(article.article_text)
                content_hash = hashlib.sha256(article.article_text.encode("utf-8")).hexdigest()
                cur.execute(
                    """
                    INSERT INTO articles
                        (instrument_id, jurisdiction, book, chapter, section, article_number,
                         article_sort_key, article_text, article_text_norm, norm_version,
                         language, content_hash, source_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (instrument_id, article_number, language)
                    DO UPDATE SET book = EXCLUDED.book,
                                  chapter = EXCLUDED.chapter,
                                  section = EXCLUDED.section,
                                  article_sort_key = EXCLUDED.article_sort_key,
                                  article_text = EXCLUDED.article_text,
                                  article_text_norm = EXCLUDED.article_text_norm,
                                  norm_version = EXCLUDED.norm_version,
                                  content_hash = EXCLUDED.content_hash,
                                  source_url = EXCLUDED.source_url
                    """,
                    (
                        instrument_id,
                        jurisdiction,
                        article.book,
                        article.chapter,
                        article.section,
                        article.article_number,
                        article.article_sort_key,
                        article.article_text,
                        article_text_norm,
                        NORM_VERSION,
                        language,
                        content_hash,
                        source_url,
                    ),
                )
                count += 1
    except Exception:
        conn.rollback()
        raise
    conn.commit()
    return count
