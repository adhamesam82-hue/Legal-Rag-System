"""Grounded answering with citation enforcement.

The model is instructed to cite only the articles it was given. Instructions are
not trusted: every citation in the output is resolved against the retrieved set
afterwards, and an answer containing one that does not resolve is blocked
outright. A hallucinated article number is otherwise indistinguishable from a
correct one -- it is the primary failure mode of legal RAG and it looks
completely convincing.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from openai import OpenAI

from legalrag.llm import client_for
from legalrag.retrieve import Candidate, Retrieval

REFUSAL_MARKER = "NO_ANSWER_IN_CORPUS"

DISCLAIMER_EN = (
    "This is research assistance, not legal advice. Verify against the official "
    "gazette before relying on it."
)
DISCLAIMER_AR = (
    "هذه مساعدة بحثية وليست استشارة قانونية. يُرجى التحقق من الجريدة الرسمية قبل "
    "الاعتماد عليها."
)

_SYSTEM_PROMPT = f"""You are a legal research assistant for Egyptian and Saudi law.

You answer ONLY from the articles supplied in the user message. You have no other \
source. Your own knowledge of the law is not admissible here, even when you are \
confident it is correct.

Rules:
1. Every factual claim about the law must be followed by a citation in exactly \
this form: [Law NUMBER/YEAR, Art. ARTICLE]. Copy the number, year, and article \
exactly as they are labelled in the supplied articles, and nothing else -- never \
add a paragraph, clause, or item number inside the brackets, even when the \
article is a numbered list and only one item applies. If that level of detail \
matters, name it in the surrounding sentence instead: 'Art. 69, item 7 of Law \
12/2003 lists...' with the citation still reading exactly [Law 12/2003, Art. 69]. \
Never write a citation for an article that was not supplied.
2. If the supplied articles do not answer the question, reply with the single \
line {REFUSAL_MARKER} and nothing else. Do not reason from general legal \
knowledge to fill the gap. Do not offer a partial answer that the articles do not \
support. Refusing is the correct outcome, not a failure.
3. If the articles are related to the question but do not actually resolve it, \
that is still {REFUSAL_MARKER}. Being near the answer is not being the answer.
4. Answer in the same language as the question: Arabic question, Arabic answer; \
English question, English answer.
5. Quote the operative wording of the article when it matters to the answer.
6. Be direct and brief. No preamble, no restating the question.

Do not add a disclaimer; one is appended automatically."""

_CITATION_PATTERN = re.compile(r"\[Law\s*([^\s/,\]]+)\s*/\s*(\d{4})\s*,\s*Art\.?\s*([^\]]+)\]")


@dataclass(frozen=True)
class Answer:
    text: str
    citations: list[str]
    retrieval: Retrieval
    refused: bool
    blocked: bool
    blocked_citations: tuple[str, ...] = ()

    @property
    def is_grounded(self) -> bool:
        return not self.refused and not self.blocked


def build_context(candidates: list[Candidate]) -> str:
    return "\n\n".join(
        f"[Law {c.instrument_number}/{c.instrument_year}, Art. {c.article_number}]"
        f" ({c.instrument_title})\n{c.article_text}"
        for c in candidates
    )


def extract_citations(text: str) -> list[str]:
    return list(
        dict.fromkeys(
            f"{number}/{year} Art. {article.strip()}"
            for number, year, article in _CITATION_PATTERN.findall(text)
        )
    )


def _is_arabic(text: str) -> bool:
    return any("؀" <= ch <= "ۿ" for ch in text)


def _refusal(question: str, retrieval: Retrieval) -> Answer:
    if _is_arabic(question):
        text = (
            "لم أعثر على ما يجيب عن هذا السؤال في نصوص القوانين المتاحة.\n\n"
            f"_{DISCLAIMER_AR}_"
        )
    else:
        text = (
            "I could not find anything in the corpus that answers this question.\n\n"
            f"_{DISCLAIMER_EN}_"
        )
    return Answer(
        text=text, citations=[], retrieval=retrieval, refused=True, blocked=False
    )


def answer(
    question: str,
    retrieval: Retrieval,
    client: OpenAI | None = None,
    model: str | None = None,
) -> Answer:
    """Compose an answer from retrieved articles, or refuse."""
    if not retrieval.candidates:
        return _refusal(question, retrieval)
    if client is None or model is None:
        default_client, default_model = client_for("answer")
        client = client or default_client
        model = model or default_model

    # The system prompt asks the model to match the question's language, but
    # that alone was not reliable: llama-3.3-70b answered an English question in
    # Arabic on a real query during testing. Detecting the language server-side
    # and stating it as an instruction, rather than leaving inference to the
    # model, is what actually holds across providers.
    answer_language = "Arabic" if _is_arabic(question) else "English"

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\n"
                    f"Answer in {answer_language}.\n\n"
                    f"Supplied articles:\n\n{build_context(retrieval.candidates)}"
                ),
            },
        ],
        temperature=0,
    )
    text = (response.choices[0].message.content or "").strip()

    if REFUSAL_MARKER in text:
        return _refusal(question, retrieval)

    citations = extract_citations(text)
    retrieved = {c.citation for c in retrieval.candidates}
    unresolvable = tuple(c for c in citations if c not in retrieved)

    if unresolvable:
        # The model cited an article it was not given. The answer is discarded
        # rather than shown with a warning: a plausible-looking legal answer with
        # a footnote is still read as an answer.
        blocked_text = (
            "This answer was blocked because it cited articles that were not "
            "retrieved from the corpus, which means they cannot be verified: "
            + ", ".join(unresolvable)
            + f"\n\n_{DISCLAIMER_EN}_"
        )
        return Answer(
            text=blocked_text,
            citations=citations,
            retrieval=retrieval,
            refused=False,
            blocked=True,
            blocked_citations=unresolvable,
        )

    if not citations:
        return _refusal(question, retrieval)

    disclaimer = DISCLAIMER_AR if _is_arabic(text) else DISCLAIMER_EN
    return Answer(
        text=f"{text}\n\n_{disclaimer}_",
        citations=citations,
        retrieval=retrieval,
        refused=False,
        blocked=False,
    )
