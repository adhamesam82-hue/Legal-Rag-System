"""LLM reranking of the fused candidate pool.

Stands in for the roadmap's bge-reranker-v2-m3, which cannot run on this machine
(no torch wheel for this platform). Lexical scoring reliably finds the right
*law* -- every gold-set miss at this stage was the correct statute with the
answering article ranked below 8 -- but it cannot tell which article within that
law actually addresses the question. That judgement is what the reranker adds.

The reranker is also allowed to return nothing. A pool of topically-related but
non-answering articles is the exact situation refusal exists for.
"""
from __future__ import annotations

import re

from openai import OpenAI

from legalrag.llm import client_for
from legalrag.retrieve import Candidate

RERANK_POOL = 30

# Long definitions articles bury the operative clause deep -- Law 148/2019 Art. 1
# is 4,300 characters and states the retirement age in item 10. Truncating short
# enough to hide that makes the reranker discard articles that do answer the
# question, so this is set well past the length of a typical article.
_SNIPPET_CHARS = 2500

_SYSTEM_PROMPT = """You rank statute articles by how directly they answer a question.

You will get a question and a numbered list of articles. Return the numbers of \
the articles that actually answer the question, most relevant first, as a \
comma-separated list (for example: 7, 2, 15).

Rules:
- Judge whether the article RESOLVES the question, not whether it shares a topic \
with it. An article about employment contracts generally does not answer a \
question about notice periods unless it states the notice period.
- Return at most 8 numbers.
- If no article answers the question, return the single word NONE. Returning NONE \
is correct and expected when the collection genuinely lacks the answer.
- Output only the numbers or NONE. No explanation."""


def rerank(
    question: str,
    candidates: list[Candidate],
    limit: int = 8,
    client: OpenAI | None = None,
    model: str | None = None,
) -> list[Candidate]:
    """Reorder candidates by relevance. Empty result means nothing answers it."""
    if not candidates:
        return []
    if client is None or model is None:
        default_client, default_model = client_for("rerank")
        client = client or default_client
        model = model or default_model

    pool = candidates[:RERANK_POOL]
    listing = "\n\n".join(
        f"{index}. [Law {c.instrument_number}/{c.instrument_year}, Art. {c.article_number}]"
        f" ({c.instrument_title})\n{c.article_text[:_SNIPPET_CHARS]}"
        for index, c in enumerate(pool, start=1)
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"Question: {question}\n\nArticles:\n\n{listing}"},
        ],
        temperature=0,
    )
    raw = (response.choices[0].message.content or "").strip()

    if "NONE" in raw.upper():
        return []

    chosen: list[Candidate] = []
    for match in re.findall(r"\d+", raw):
        index = int(match)
        if 1 <= index <= len(pool):
            candidate = pool[index - 1]
            if candidate not in chosen:
                chosen.append(candidate)
        if len(chosen) >= limit:
            break

    # A response we cannot parse must not silently empty the pool -- that would
    # turn a reranker failure into a false refusal.
    return chosen if chosen else pool[:limit]
