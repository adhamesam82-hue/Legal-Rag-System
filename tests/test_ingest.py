from datetime import datetime, timezone
from decimal import Decimal

import pytest

from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import ParsedArticle


@pytest.fixture
def conn():
    connection = get_connection()
    yield connection
    connection.rollback()
    connection.close()


def test_upsert_instrument_inserts_and_returns_id(conn):
    instrument_id = upsert_instrument(
        conn,
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-1",
        year=2000,
        title="قانون تجريبى",
        source_url="https://example.com/test",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    assert isinstance(instrument_id, int)

    with conn.cursor() as cur:
        cur.execute("SELECT title_norm FROM instruments WHERE id = %s", (instrument_id,))
        (title_norm,) = cur.fetchone()
    assert title_norm == "قانون تجريبي"  # ى -> ي applied


def test_upsert_instrument_is_idempotent_on_conflict(conn):
    kwargs = dict(
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-2",
        year=2001,
        title="قانون تجريبى ثان",
        source_url="https://example.com/test2",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    first_id = upsert_instrument(conn, **kwargs)
    second_id = upsert_instrument(conn, **kwargs)
    assert first_id == second_id


def test_insert_articles_writes_normalized_text_and_hash(conn):
    instrument_id = upsert_instrument(
        conn,
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-3",
        year=2002,
        title="قانون تجريبى ثالث",
        source_url="https://example.com/test3",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    articles = [
        ParsedArticle(
            article_number="1",
            article_sort_key=Decimal("1"),
            article_text="نص المادة الأولى.",
        )
    ]

    count = insert_articles(
        conn,
        instrument_id=instrument_id,
        jurisdiction="EG",
        articles=articles,
        language="ar",
        source_url="https://example.com/test3",
    )
    assert count == 1

    with conn.cursor() as cur:
        cur.execute(
            "SELECT article_text_norm, norm_version, content_hash FROM articles "
            "WHERE instrument_id = %s AND article_number = %s",
            (instrument_id, "1"),
        )
        text_norm, norm_version, content_hash = cur.fetchone()
    assert "نص الماده الاولي" in text_norm  # ة->ه, ى->ي applied
    assert norm_version == "v1"
    assert len(content_hash) == 64  # sha256 hex digest
