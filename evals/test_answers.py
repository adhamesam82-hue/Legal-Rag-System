"""Phase 2 answering gate. Opt-in: these call the LLM and cost money.

Run: LEGALRAG_RUN_EVALS=1 uv run pytest evals/ -v
"""
from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("LEGALRAG_RUN_EVALS"),
    reason="set LEGALRAG_RUN_EVALS=1 to run gold-set evals (makes paid LLM calls)",
)


@pytest.fixture(scope="module")
def outcomes():
    from harness import load_goldset, run_answers

    return run_answers(load_goldset())


def test_every_delivered_answer_resolves_all_its_citations(outcomes):
    """The gate is on what reaches the user.

    The model does emit unresolvable citations -- roughly one answer in twenty on
    this gold set. Enforcement is what makes that a blocked answer rather than a
    confidently miscited one, so the assertion is that nothing ungrounded ships.
    """
    for outcome in outcomes:
        if outcome.answer.is_grounded:
            retrieved = {c.citation for c in outcome.answer.retrieval.candidates}
            unresolved = set(outcome.answer.citations) - retrieved
            assert not unresolved, f"{outcome.entry.id} shipped {unresolved}"


def test_unanswerable_questions_are_always_refused(outcomes):
    unanswerable = [o for o in outcomes if o.entry.is_unanswerable]
    assert unanswerable
    failures = [o.entry.id for o in unanswerable if not o.answer.refused]
    assert not failures, f"answered questions the corpus cannot support: {failures}"


def test_no_answer_is_delivered_without_a_citation(outcomes):
    for outcome in outcomes:
        if outcome.answer.is_grounded:
            assert outcome.answer.citations, outcome.entry.id


def test_every_answer_carries_the_not_legal_advice_notice(outcomes):
    for outcome in outcomes:
        assert "legal advice" in outcome.answer.text or "استشارة قانونية" in outcome.answer.text
