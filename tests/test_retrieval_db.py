"""Retrieval tests that need the corpus but no network.

Skipped when the database is unreachable, so the unit suite still runs anywhere.
"""
from __future__ import annotations

import pytest

from legalrag.retrieve import (
    lexical_search,
    parse_citation,
    resolve_instrument,
    resolve_instrument_by_title,
    search,
)


@pytest.fixture(scope="module")
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    yield connection
    connection.close()


class TestInstrumentResolution:
    @pytest.mark.parametrize(
        ("title", "expected"),
        [
            ("قانون البيئة", ("4", 1994)),
            ("القانون المدني", ("131", 1948)),
            ("قانون العمل", ("12", 2003)),
            ("قانون حماية المستهلك", ("181", 2018)),
            ("قانون الشركات رقم 159 لسنة 1981", ("159", 1981)),
        ],
    )
    def test_resolves_law_named_in_prose(self, conn, title, expected):
        instrument_id = resolve_instrument_by_title(conn, title, "EG")
        assert instrument_id is not None
        with conn.cursor() as cur:
            cur.execute(
                "SELECT number, year FROM instruments WHERE id = %s", (instrument_id,)
            )
            assert cur.fetchone() == expected

    def test_law_absent_from_corpus_resolves_to_nothing(self):
        """Fuzzy matching once mapped this to the Civil Code; it must not."""
        from legalrag.db import get_connection

        with get_connection() as conn:
            assert (
                resolve_instrument_by_title(
                    conn, "قانون المرافعات المدنية والتجارية", "EG"
                )
                is None
            )

    def test_citation_prefers_the_law_over_its_promulgation_decree(self, conn):
        """131/1948 exists twice, and each has a different Article 1."""
        citation = parse_citation("المادة 1 من القانون رقم 131 لسنة 1948")
        instrument_id = resolve_instrument(conn, citation, "EG")
        with conn.cursor() as cur:
            cur.execute(
                "SELECT instrument_type FROM instruments WHERE id = %s", (instrument_id,)
            )
            assert cur.fetchone()[0] == "law"


class TestJurisdictionIsolation:
    def test_lexical_search_never_crosses_jurisdiction(self, conn):
        results = lexical_search(conn, "العامل صاحب العمل الاجازه", "SA")
        assert results == []

    def test_egypt_scoped_search_returns_only_egyptian_rows(self, conn):
        results = lexical_search(conn, "العامل صاحب العمل الاجازه", "EG")
        assert results
        ids = [c.article_id for c in results]
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM articles WHERE id = ANY(%s) AND jurisdiction <> 'EG'",
                (ids,),
            )
            assert cur.fetchone()[0] == 0


class TestDirectCitationPath:
    def test_explicit_citation_resolves_by_lookup_not_ranking(self, conn):
        result = search(conn, "ماذا تنص المادة 80 من قانون العمل رقم 12 لسنة 2003؟", "EG")
        assert result.strategy == "direct_citation"
        assert [c.citation for c in result.candidates] == ["12/2003 Art. 80"]

    def test_known_repealed_range_reports_a_missing_citation(self, conn):
        """Civil Code arts. 54-80 were repealed and are not in the corpus."""
        result = search(conn, "ماذا تنص المواد من 54 إلى 80 من القانون المدني؟", "EG")
        assert result.missing_citation
        assert result.candidates == []


class TestGracefulDegradation:
    """A failing LLM call must not lose the query -- lexical search still works."""

    def test_expansion_and_rerank_failures_fall_back_to_lexical(self, conn, monkeypatch):
        from legalrag import pipeline

        def boom(*a, **k):
            raise RuntimeError("simulated API outage")

        monkeypatch.setattr(pipeline, "expand_query", boom)
        monkeypatch.setattr(pipeline, "rerank", boom)
        from legalrag.pipeline import retrieve_for

        # expand/do_rerank default to False now that vector search covers what
        # they used to compensate for; force them on to exercise the fallback.
        result = retrieve_for(
            conn,
            "ما هي مدة الاجازه السنويه للعامل؟",
            "EG",
            limit=8,
            expand=True,
            do_rerank=True,
        )
        assert result.candidates
        assert result.debug["degraded"]
