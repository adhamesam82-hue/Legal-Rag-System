"""Plain-language explanation of a single article.

Distinct from answer.py: there is no retrieval and no question. The article is
already chosen, so the grounding problem is narrower -- the explanation must not
add law that isn't in the text in front of it.
"""
from __future__ import annotations

from dataclasses import dataclass

from openai import OpenAI

from legalrag.llm import client_for
from legalrag.retrieve import Candidate

_SYSTEM_PROMPT = """You explain a single article of statute in plain language.

You are given one article. Explain what it means to someone with no legal training.

Rules:
- Explain ONLY what this article says. Do not bring in other law, other articles, \
case law, or practical advice that the text does not contain.
- If the article cross-references another article or law, say so plainly rather \
than guessing what that other provision says.
- Lead with the single practical point: what does this article actually do or \
require? Then unpack conditions, exceptions, and defined terms.
- Preserve legal precision. Do not flatten "may" into "must", and keep any \
threshold, deadline, or amount exact.
- Write in the requested language, at the reading level of a careful non-lawyer.
- Be concise. Four short paragraphs at most. No preamble."""


@dataclass(frozen=True)
class Explanation:
    article_id: int
    citation: str
    language: str
    text: str


def explain_article(
    candidate: Candidate,
    language: str = "en",
    client: OpenAI | None = None,
    model: str | None = None,
) -> Explanation:
    if client is None or model is None:
        # Explaining shares the answering model: both turn statute text into
        # prose a non-lawyer reads, so they want the same quality setting.
        default_client, default_model = client_for("answer")
        client = client or default_client
        model = model or default_model
    target = "Arabic" if language == "ar" else "English"
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Explain in {target}.\n\n"
                    f"[Law {candidate.instrument_number}/{candidate.instrument_year}, "
                    f"Art. {candidate.article_number}] "
                    f"({candidate.instrument_title})\n\n{candidate.article_text}"
                ),
            },
        ],
        temperature=0,
    )
    return Explanation(
        article_id=candidate.article_id,
        citation=candidate.citation,
        language=language,
        text=(response.choices[0].message.content or "").strip(),
    )
