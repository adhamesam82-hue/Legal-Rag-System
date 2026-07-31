"""Phase 2 retrieval gate. Opt-in: these call the LLM and cost money.

Run: LEGALRAG_RUN_EVALS=1 uv run pytest evals/ -v
"""
from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("LEGALRAG_RUN_EVALS"),
    reason="set LEGALRAG_RUN_EVALS=1 to run gold-set evals (makes paid LLM calls)",
)

RECALL_TARGET = 0.85


@pytest.fixture(scope="module")
def outcomes():
    from harness import load_goldset, run_retrieval

    return run_retrieval(load_goldset())


@pytest.fixture(scope="module")
def summary(outcomes):
    from harness import summarize

    return summarize(outcomes)


def test_answerable_recall_at_8_meets_the_gate(summary):
    assert summary["ANSWERABLE"]["recall"] >= RECALL_TARGET


def test_exact_citation_queries_all_resolve(summary):
    assert summary["exact_citation"]["recall"] == 1.0


def test_exact_citation_queries_use_direct_lookup(outcomes):
    """Citation lookup must win outright, not compete with ranked search."""
    citation_entries = [o for o in outcomes if o.entry.category == "exact_citation"]
    assert citation_entries
    for outcome in citation_entries:
        assert outcome.retrieval.strategy == "direct_citation", outcome.entry.id


def test_retrieval_never_leaks_across_jurisdiction(outcomes):
    from legalrag.db import get_connection

    ids = [c.article_id for o in outcomes for c in o.retrieval.candidates]
    if not ids:
        pytest.skip("no candidates retrieved")
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM articles WHERE id = ANY(%s) AND jurisdiction <> 'EG'",
            (ids,),
        )
        assert cur.fetchone()[0] == 0
