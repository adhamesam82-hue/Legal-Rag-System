"""How old this text is, and whether a later law replaced it. ح-5.

The failure this closes is the one the rest of the product's safety machinery
cannot see. answer.py verifies that every citation resolves to a real article,
and it does that well -- but a superseded article IS a real article. It has the
right number, the right year and the right text, so verification passes and the
reader's confidence goes UP. An invented citation announces itself when someone
looks it up; a replaced one never does.

These tests seed their own instruments rather than relying on the corpus,
because the corpus is not in every volume and this behaviour has to be provable
anywhere the suite runs.
"""
from __future__ import annotations

from datetime import date, datetime, timezone

import pytest

from legalrag import currency


@pytest.fixture
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    yield connection
    connection.close()


@pytest.fixture
def corpus(conn):
    """Two laws, one replacing the other -- the 12/2003 and 14/2025 case.

    Cleaned up by id afterwards rather than by truncating: this database may
    hold the real corpus, and a test that empties it would be unforgivable.
    """
    made: dict[str, int] = {}
    fetched_on = {
        "old": datetime(2026, 7, 29, tzinfo=timezone.utc),
        "new": datetime(2026, 7, 30, tzinfo=timezone.utc),
        "lone": datetime(2026, 7, 29, tzinfo=timezone.utc),
    }
    with conn.cursor() as cur:
        for key, number, year, title in (
            ("old", "T12", 2003, "قانون العمل (اختبار)"),
            ("new", "T14", 2025, "قانون العمل الجديد (اختبار)"),
            ("lone", "T99", 1999, "قانون بلا خليفة (اختبار)"),
        ):
            cur.execute(
                "INSERT INTO instruments (jurisdiction, instrument_type, number, "
                "year, title, title_norm, source_url, fetched_at) "
                "VALUES ('EG', 'law', %s, %s, %s, %s, 'test://x', %s) RETURNING id",
                (number, year, title, title, fetched_on[key]),
            )
            made[key] = cur.fetchone()[0]

        for key in ("old", "new", "lone"):
            cur.execute(
                "INSERT INTO articles (instrument_id, jurisdiction, article_number, "
                "article_sort_key, article_text, article_text_norm, norm_version, "
                "language, content_hash, source_url) "
                "VALUES (%s, 'EG', '1', 1, 'نص', 'نص', 'v1', 'ar', %s, 'test://x') "
                "RETURNING id",
                (made[key], f"hash-{key}"),
            )
            made[f"{key}_article"] = cur.fetchone()[0]
    conn.commit()

    yield made

    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM instrument_supersessions WHERE superseded_id = ANY(%s)",
            ([made["old"], made["new"], made["lone"]],),
        )
        cur.execute(
            "DELETE FROM articles WHERE instrument_id = ANY(%s)",
            ([made["old"], made["new"], made["lone"]],),
        )
        cur.execute(
            "DELETE FROM instruments WHERE id = ANY(%s)",
            ([made["old"], made["new"], made["lone"]],),
        )
    conn.commit()


def record(conn, corpus, scope="full"):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO instrument_supersessions (superseded_id, superseding_id, "
            "superseding_label, scope, note, source) "
            "VALUES (%s, %s, 'قانون العمل الجديد', %s, 'راجع الأحكام الانتقالية', 'seed')",
            (corpus["old"], corpus["new"], scope),
        )
    conn.commit()


class TestAgeIsAlwaysReported:
    def test_a_law_nobody_replaced_still_says_when_it_was_read(self, conn, corpus):
        """The snapshot date is true of every text, so it is always shown.

        A caveat that appears only on flagged rows teaches a reader that
        unflagged means verified, and nothing here verifies anything.
        """
        result = currency.for_instrument(conn, corpus["lone"])
        assert result.fetched_at is not None
        assert result.severity == "dated"
        assert not result.is_superseded

    def test_an_article_inherits_its_laws_fetch_date(self, conn, corpus):
        """The date is per instrument -- the corpus is ingested a law at a
        time -- and an article has to carry it, because the article is what a
        citation points at."""
        result = currency.for_article(conn, corpus["new_article"])
        assert result.fetched_at.date() == date(2026, 7, 30)


class TestSupersession:
    def test_a_replaced_law_says_so(self, conn, corpus):
        record(conn, corpus)
        result = currency.for_instrument(conn, corpus["old"])
        assert result.is_superseded
        assert result.severity == "replaced"
        assert result.supersessions[0].superseding_reference == "T14/2025"

    def test_the_replacement_itself_is_not_flagged(self, conn, corpus):
        record(conn, corpus)
        assert not currency.for_instrument(conn, corpus["new"]).is_superseded

    def test_a_partial_replacement_is_softer(self, conn, corpus):
        """Partly replaced still applies in part, and telling a lawyer to
        abandon it would be as wrong as telling them nothing."""
        record(conn, corpus, scope="partial")
        assert currency.for_instrument(conn, corpus["old"]).severity == "amended"

    def test_the_warning_reaches_the_article(self, conn, corpus):
        """The article is what gets cited, so it is what has to carry it."""
        record(conn, corpus)
        result = currency.for_article(conn, corpus["old_article"])
        assert result.severity == "replaced"

    def test_the_note_survives_to_the_reader(self, conn, corpus):
        record(conn, corpus)
        result = currency.for_instrument(conn, corpus["old"])
        assert "الأحكام الانتقالية" in result.supersessions[0].note

    def test_who_said_so_is_recorded(self, conn, corpus):
        """A supersession the system seeded and one a lawyer entered carry
        different weight; a reader deserves to know which."""
        record(conn, corpus)
        assert currency.for_instrument(conn, corpus["old"]).supersessions[0].source == (
            "seed"
        )


class TestBulk:
    def test_one_query_covers_a_whole_answer(self, conn, corpus):
        """An answer cites up to eight articles. A warning costing eight round
        trips is one somebody later deletes for being slow."""
        record(conn, corpus)
        results = currency.for_instruments(
            conn, [corpus["old"], corpus["new"], corpus["lone"]]
        )
        assert results[corpus["old"]].severity == "replaced"
        assert results[corpus["new"]].severity == "dated"
        assert results[corpus["lone"]].severity == "dated"

    def test_an_empty_request_is_not_a_query(self, conn):
        assert currency.for_instruments(conn, []) == {}


class TestTheApiShape:
    def test_the_field_is_always_present(self, conn, corpus):
        """Never conditional. A field that appears only when something is
        wrong is a field the frontend forgets to render."""
        body = currency.as_dict(currency.for_instrument(conn, corpus["lone"]))
        assert set(body) == {
            "fetched_at", "severity", "is_superseded", "supersessions"
        }
        assert body["supersessions"] == []

    def test_a_replaced_law_carries_the_replacement(self, conn, corpus):
        record(conn, corpus)
        body = currency.as_dict(currency.for_instrument(conn, corpus["old"]))
        assert body["is_superseded"] is True
        assert body["supersessions"][0]["reference"] == "T14/2025"

    def test_an_unknown_article_does_not_raise(self, conn):
        """A missing article is a 404 elsewhere; this must not be what fails."""
        result = currency.for_article(conn, 99999999)
        assert result.fetched_at is None
        assert not result.is_superseded


class TestIsRepealedIsStillNotTouched:
    def test_recording_a_supersession_does_not_set_is_repealed(self, conn, corpus):
        """Deliberate. is_repealed is article-level and every retrieval query
        filters on it; setting it here would claim knowledge of which articles
        survived, which nobody has. This is a warning, not a repeal.
        """
        record(conn, corpus)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT bool_or(is_repealed) FROM articles WHERE instrument_id = %s",
                (corpus["old"],),
            )
            assert cur.fetchone()[0] is False
