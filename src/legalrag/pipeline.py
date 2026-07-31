"""End-to-end ask(): expand, retrieve, rerank, answer. One path for UI and evals.

Each stage resolves its own model from config, so answering can run on a
different provider from expansion and reranking without threading clients
through every call.
"""
from __future__ import annotations

import dataclasses

import psycopg

from legalrag.answer import Answer, answer
from legalrag.expand import Expansion, expand_query
from legalrag.rerank import RERANK_POOL, rerank
from legalrag.retrieve import Retrieval, search


def retrieve_for(
    conn: psycopg.Connection,
    question: str,
    jurisdiction: str,
    limit: int = 8,
    # Measured on the gold set: with vector search available, expansion and
    # reranking contribute nothing (identical recall/MRR to leaving them off)
    # and cost two LLM calls per query. Off by default; left as toggles rather
    # than removed so that finding stays reproducible in evals/report.py.
    expand: bool = False,
    do_rerank: bool = False,
    use_vectors: bool = True,
) -> Retrieval:
    # Expansion and reranking improve on a lexical baseline that works without
    # them, so an API failure degrades the result rather than losing the query.
    # Only answer() has no fallback: there is no acceptable substitute for a
    # grounded answer, so that error propagates.
    degraded: list[str] = []

    expansion: Expansion | None = None
    if expand:
        try:
            expansion = expand_query(question)
        except Exception as exc:  # noqa: BLE001 - any API failure falls back
            degraded.append(f"expansion unavailable ({type(exc).__name__})")

    # A direct citation hit is exact, so it is neither reranked nor truncated
    # against the pool depth used for ranked search.
    pool_size = max(limit, RERANK_POOL) if do_rerank else limit
    retrieval = search(
        conn,
        question,
        jurisdiction,
        limit=pool_size,
        expansion=expansion,
        use_vectors=use_vectors,
    )
    if retrieval.strategy == "direct_citation":
        return dataclasses.replace(
            retrieval,
            candidates=retrieval.candidates[:limit],
            debug={**retrieval.debug, "degraded": degraded},
        )

    candidates = retrieval.candidates[:limit]
    if do_rerank:
        try:
            reranked = rerank(question, retrieval.candidates, limit=limit)
            candidates = _backfill(reranked, retrieval.candidates, limit)
        except Exception as exc:  # noqa: BLE001 - any API failure falls back
            degraded.append(f"rerank unavailable ({type(exc).__name__})")

    return dataclasses.replace(
        retrieval,
        candidates=candidates,
        debug={
            **retrieval.debug,
            "reranked_from": len(retrieval.candidates),
            "degraded": degraded,
        },
    )


def _backfill(reranked, pool, limit):
    """Top up a short rerank result with the next-best fused candidates.

    The reranker usually names fewer articles than the budget allows. Handing the
    answering model 3 articles when 8 were affordable throws away recall for
    nothing, since it re-judges relevance anyway and is instructed to refuse on
    articles that do not answer the question. An empty rerank result is left
    empty -- that is the reranker refusing, not being terse.
    """
    if not reranked:
        return []
    chosen = list(reranked)
    seen = {c.article_id for c in chosen}
    for candidate in pool:
        if len(chosen) >= limit:
            break
        if candidate.article_id not in seen:
            chosen.append(candidate)
            seen.add(candidate.article_id)
    return chosen


def ask(
    conn: psycopg.Connection,
    question: str,
    jurisdiction: str,
    limit: int = 8,
    expand: bool = False,
    do_rerank: bool = False,
    use_vectors: bool = True,
) -> Answer:
    retrieval = retrieve_for(
        conn,
        question,
        jurisdiction,
        limit=limit,
        expand=expand,
        do_rerank=do_rerank,
        use_vectors=use_vectors,
    )
    return answer(question, retrieval)
