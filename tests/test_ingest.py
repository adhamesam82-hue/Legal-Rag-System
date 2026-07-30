from datetime import datetime, timezone
from decimal import Decimal

import pytest

from legalrag.arabic import normalize
from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import ParsedArticle


def _delete_test_rows(connection):
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM articles WHERE instrument_id IN "
            "(SELECT id FROM instruments WHERE number LIKE 'TEST-%')"
        )
        cur.execute("DELETE FROM instruments WHERE number LIKE 'TEST-%'")
    connection.commit()


@pytest.fixture
def conn():
    connection = get_connection()
    _delete_test_rows(connection)
    yield connection
    _delete_test_rows(connection)
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

    updated_kwargs = dict(kwargs)
    updated_kwargs["title"] = kwargs["title"] + kwargs["title"]  # derived, not hand-typed
    updated_kwargs["source_url"] = "https://example.com/test2-updated"
    second_id = upsert_instrument(conn, **updated_kwargs)
    assert first_id == second_id

    with conn.cursor() as cur:
        cur.execute(
            "SELECT title, title_norm, source_url FROM instruments WHERE id = %s",
            (second_id,),
        )
        title, title_norm, source_url = cur.fetchone()
    assert title == updated_kwargs["title"]
    assert title_norm == normalize(updated_kwargs["title"])
    assert source_url == "https://example.com/test2-updated"


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


def test_insert_articles_upsert_refreshes_stale_columns(conn):
    instrument_id = upsert_instrument(
        conn,
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-4",
        year=2003,
        title='قانون تجريبى ثالث',
        source_url="https://example.com/test4",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    original_text = 'نص المادة الأولى.'
    articles = [
        ParsedArticle(
            article_number="1",
            article_sort_key=Decimal("1"),
            article_text=original_text,
            chapter=None,
        )
    ]
    insert_articles(
        conn,
        instrument_id=instrument_id,
        articles=articles,
        language="ar",
        source_url="https://example.com/test4",
    )

    updated_text = original_text + 'قانون تجريبى ثان'
    updated_chapter = 'قانون تجريبى'
    updated_articles = [
        ParsedArticle(
            article_number="1",
            article_sort_key=Decimal("1"),
            article_text=updated_text,
            chapter=updated_chapter,
        )
    ]
    insert_articles(
        conn,
        instrument_id=instrument_id,
        articles=updated_articles,
        language="ar",
        source_url="https://example.com/test4",
    )

    with conn.cursor() as cur:
        cur.execute(
            "SELECT article_text, chapter FROM articles WHERE instrument_id = %s AND article_number = %s",
            (instrument_id, "1"),
        )
        article_text, chapter = cur.fetchone()
    assert article_text == updated_text
    assert chapter == updated_chapter


def test_insert_articles_rejects_duplicate_article_numbers(conn):
    instrument_id = upsert_instrument(
        conn,
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-5",
        year=2004,
        title="قانون تجريبى ثالث",
        source_url="https://example.com/test5",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    articles = [
        ParsedArticle(
            article_number="1",
            article_sort_key=Decimal("1"),
            article_text="first article text",
        ),
        ParsedArticle(
            article_number="2",
            article_sort_key=Decimal("2"),
            article_text="second article text",
        ),
        ParsedArticle(
            article_number="1",
            article_sort_key=Decimal("1"),
            article_text="duplicate first article text",
        ),
    ]

    with pytest.raises(ValueError, match="duplicate"):
        insert_articles(
            conn,
            instrument_id=instrument_id,
            articles=articles,
            language="ar",
            source_url="https://example.com/test5",
        )

    with conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM articles WHERE instrument_id = %s",
            (instrument_id,),
        )
        (count,) = cur.fetchone()
    assert count == 0


def test_insert_articles_derives_jurisdiction_from_instrument(conn):
    """insert_articles no longer takes a jurisdiction parameter -- it must
    derive articles.jurisdiction from the parent instruments row, so the
    two can never disagree (the exact mismatch migrations/0002's CHECK
    constraint also guards against at the DB level).
    """
    instrument_id = upsert_instrument(
        conn,
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-6",
        year=2005,
        title="قانون تجريبى ثالث",
        source_url="https://example.com/test6",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    articles = [
        ParsedArticle(
            article_number="1",
            article_sort_key=Decimal("1"),
            article_text="نص المادة الأولى.",
        )
    ]

    insert_articles(
        conn,
        instrument_id=instrument_id,
        articles=articles,
        language="ar",
        source_url="https://example.com/test6",
    )

    with conn.cursor() as cur:
        cur.execute(
            "SELECT i.jurisdiction, a.jurisdiction FROM instruments i "
            "JOIN articles a ON a.instrument_id = i.id WHERE i.id = %s",
            (instrument_id,),
        )
        instrument_jurisdiction, article_jurisdiction = cur.fetchone()
    assert article_jurisdiction == instrument_jurisdiction == "EG"
