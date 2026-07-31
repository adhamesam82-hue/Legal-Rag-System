"""Gold-set scoring shared by the pytest suites and report.py."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import yaml

from legalrag.db import get_connection
from legalrag.answer import Answer
from legalrag.pipeline import ask, retrieve_for
from legalrag.retrieve import Retrieval

GOLDSET_PATH = Path(__file__).resolve().parent / "goldset.yaml"
HISTORY_PATH = Path(__file__).resolve().parent / "history.md"
RECALL_AT = 8
WORKERS = 3  # NVIDIA free tier rate-limits above this


@dataclass(frozen=True)
class GoldEntry:
    id: str
    question: str
    jurisdiction: str
    expected_articles: list[str]
    category: str

    @property
    def is_unanswerable(self) -> bool:
        return self.category == "unanswerable"


@dataclass(frozen=True)
class RetrievalOutcome:
    entry: GoldEntry
    retrieval: Retrieval

    @property
    def retrieved(self) -> list[str]:
        return [c.citation for c in self.retrieval.candidates]

    @property
    def hit(self) -> bool:
        """For unanswerable entries, retrieving nothing is the correct outcome."""
        if self.entry.is_unanswerable:
            return not self.retrieval.candidates
        return bool(set(self.entry.expected_articles) & set(self.retrieved))

    @property
    def reciprocal_rank(self) -> float:
        expected = set(self.entry.expected_articles)
        for rank, citation in enumerate(self.retrieved, start=1):
            if citation in expected:
                return 1.0 / rank
        return 0.0


def load_goldset(path: Path = GOLDSET_PATH) -> list[GoldEntry]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [
        GoldEntry(
            id=e["id"],
            question=e["question"],
            jurisdiction=e["jurisdiction"],
            expected_articles=e.get("expected_articles") or [],
            category=e["category"],
        )
        for e in raw
    ]


def run_retrieval(
    entries: list[GoldEntry],
    expand: bool = True,
    do_rerank: bool = True,
    use_vectors: bool = True,
    limit: int = RECALL_AT,
) -> list[RetrievalOutcome]:
    """Score retrieval over the gold set.

    Each task opens its own connection: psycopg connections are not safe to share
    across threads, and the LLM calls are network-bound enough that running the
    entries serially dominates the wall clock.
    """

    def run_one(entry: GoldEntry) -> RetrievalOutcome:
        with get_connection() as conn:
            retrieval = retrieve_for(
                conn,
                entry.question,
                entry.jurisdiction,
                limit=limit,
                expand=expand,
                do_rerank=do_rerank,
                use_vectors=use_vectors,
            )
        return RetrievalOutcome(entry=entry, retrieval=retrieval)

    if not (expand or do_rerank or use_vectors):
        return [run_one(entry) for entry in entries]
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        return list(pool.map(run_one, entries))


def summarize(outcomes: list[RetrievalOutcome]) -> dict[str, dict[str, float]]:
    """Recall@8 and MRR per category, plus an ANSWERABLE row.

    Answerable and unanswerable entries measure opposite things -- one wants
    articles back, the other wants none -- so they are never averaged together.
    The phase gate's recall target is the ANSWERABLE row.
    """
    buckets: dict[str, list[RetrievalOutcome]] = {}
    for outcome in outcomes:
        buckets.setdefault(outcome.entry.category, []).append(outcome)
    buckets["ANSWERABLE"] = [o for o in outcomes if not o.entry.is_unanswerable]

    summary = {}
    for category, group in buckets.items():
        if not group:
            continue
        answerable = [o for o in group if not o.entry.is_unanswerable]
        summary[category] = {
            "n": len(group),
            "hits": sum(o.hit for o in group),
            "recall": sum(o.hit for o in group) / len(group),
            "mrr": (
                sum(o.reciprocal_rank for o in answerable) / len(answerable)
                if answerable
                else float("nan")
            ),
        }
    return summary


def format_summary(summary: dict[str, dict[str, float]]) -> str:
    lines = [
        "| category | n | hits | recall@8 | MRR |",
        "| --- | --- | --- | --- | --- |",
    ]
    order = ["exact_citation", "plain_language", "ANSWERABLE", "unanswerable"]
    for category in order:
        if category not in summary:
            continue
        row = summary[category]
        mrr = "n/a" if row["mrr"] != row["mrr"] else f"{row['mrr']:.2f}"
        lines.append(
            f"| {category} | {int(row['n'])} | {int(row['hits'])} "
            f"| {row['recall']:.2f} | {mrr} |"
        )
    return "\n".join(lines)


@dataclass(frozen=True)
class AnswerOutcome:
    entry: GoldEntry
    answer: "Answer"

    @property
    def unresolvable_citations(self) -> tuple[str, ...]:
        return self.answer.blocked_citations

    @property
    def correct(self) -> bool:
        """Unanswerable entries must refuse; answerable ones must cite an expected article."""
        if self.entry.is_unanswerable:
            return self.answer.refused
        return set(self.entry.expected_articles) & set(self.answer.citations) != set()


def run_answers(entries: list[GoldEntry]) -> list[AnswerOutcome]:
    def run_one(entry: GoldEntry) -> AnswerOutcome:
        with get_connection() as conn:
            result = ask(conn, entry.question, entry.jurisdiction, limit=RECALL_AT)
        return AnswerOutcome(entry=entry, answer=result)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        return list(pool.map(run_one, entries))
