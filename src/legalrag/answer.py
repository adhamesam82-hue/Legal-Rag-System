"""Grounded answering with citation enforcement.

The model is instructed to cite only the articles it was given. Instructions are
not trusted: every citation in the output is resolved against the retrieved set
afterwards, and an answer containing one that does not resolve is blocked
outright. A hallucinated article number is otherwise indistinguishable from a
correct one -- it is the primary failure mode of legal RAG and it looks
completely convincing.

finalize() is the one place that decides refused/blocked/grounded.
stream_answer() exists so a phone can show an answer forming instead of a
spinner, and it releases text only once that text can no longer belong to an
answer the enforcement would discard -- see the "streaming" section below for
what that costs and the one case it cannot cover.
"""
from __future__ import annotations

import re
from collections.abc import Iterator
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

JURISDICTION_NAMES = {"EG": "EGYPT", "SA": "SAUDI ARABIA"}

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
7. Every supplied article is labelled '(Jurisdiction: COUNTRY)'. If the question names a \
country and it does not match every supplied article's labelled jurisdiction, the supplied \
articles cannot answer it -- this is {REFUSAL_MARKER}, no matter how closely the topic \
matches. Topical similarity across the wrong country is not an answer. Check the label, \
not the article's subject matter, to decide this.
8. If the question asks for a specific figure, deadline, or threshold, and a supplied \
article addresses that exact matter but does not state one -- e.g. it leaves an amount to \
be freely agreed, or imposes no cap or floor -- that silence IS the answer. Say plainly \
that the law does not fix one, and quote what the article does say instead. This is still \
answering from the supplied text, not guessing: it is different from staying silent when \
the supplied articles do not address the topic at all, which is still {REFUSAL_MARKER} \
under rule 2. Silence-as-answer never overrides rule 7: it only ever applies within the \
correct country's labelled articles.

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


def build_context(candidates: list[Candidate], jurisdiction: str = "EG") -> str:
    """Format retrieved articles, labelling each with its jurisdiction explicitly.

    The label is a concrete fact for rule 7 to check rather than something the
    model has to infer from an article's title or content -- inference proved
    unreliable: a topically-similar Egyptian article was answering questions
    asked about Saudi Arabia even though nothing in this project's corpus is
    Saudi. Every candidate in one Retrieval shares the same jurisdiction (the
    SQL WHERE clause guarantees it), so one label value applies to all of them.
    """
    country = JURISDICTION_NAMES.get(jurisdiction, jurisdiction)
    return "\n\n".join(
        f"[Law {c.instrument_number}/{c.instrument_year}, Art. {c.article_number}]"
        f" (Jurisdiction: {country}) ({c.instrument_title})\n{c.article_text}"
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


def _blocked(citations: list[str], retrieval: Retrieval, unresolvable: tuple[str, ...]) -> Answer:
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


def finalize(question: str, text: str, retrieval: Retrieval) -> Answer:
    """Turn raw model output into a verdict: refused, blocked, or grounded.

    The single place that decides whether text may be shown as an answer.
    Both answer() and stream_answer() end here, so streaming cannot drift into
    a weaker version of the enforcement -- which is the failure this function
    exists to prevent, not a stylistic preference.
    """
    text = text.strip()

    if REFUSAL_MARKER in text:
        return _refusal(question, retrieval)

    citations = extract_citations(text)
    retrieved = {c.citation for c in retrieval.candidates}
    unresolvable = tuple(c for c in citations if c not in retrieved)

    if unresolvable:
        return _blocked(citations, retrieval, unresolvable)

    # An answer that cites nothing is not grounded in anything, whatever it
    # says. Treated as a refusal rather than shown uncited.
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


def _request_messages(question: str, retrieval: Retrieval) -> list[dict]:
    # The system prompt asks the model to match the question's language, but
    # that alone was not reliable: llama-3.3-70b answered an English question in
    # Arabic on a real query during testing. Detecting the language server-side
    # and stating it as an instruction, rather than leaving inference to the
    # model, is what actually holds across providers.
    answer_language = "Arabic" if _is_arabic(question) else "English"
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Question: {question}\n\n"
                f"Answer in {answer_language}.\n\n"
                f"Supplied articles:\n\n"
                f"{build_context(retrieval.candidates, retrieval.jurisdiction)}"
            ),
        },
    ]


def _resolve_client(
    client: OpenAI | None, model: str | None
) -> tuple[OpenAI, str]:
    if client is not None and model is not None:
        return client, model
    default_client, default_model = client_for("answer")
    return client or default_client, model or default_model


def answer(
    question: str,
    retrieval: Retrieval,
    client: OpenAI | None = None,
    model: str | None = None,
) -> Answer:
    """Compose an answer from retrieved articles, or refuse."""
    if not retrieval.candidates:
        return _refusal(question, retrieval)
    client, model = _resolve_client(client, model)

    response = client.chat.completions.create(
        model=model,
        messages=_request_messages(question, retrieval),
        temperature=0,
    )
    return finalize(question, response.choices[0].message.content or "", retrieval)


# --- streaming --------------------------------------------------------------
#
# Streaming is gated, not raw. A token is released to the caller only once it
# cannot still turn out to belong to an answer that must not be shown, which
# means two things are withheld:
#
#   1. Everything, until the first citation appears AND resolves against the
#      retrieved set. Before that point the reply may still be REFUSAL_MARKER
#      (rule 2), or may end up citing nothing at all -- both of which discard
#      the text entirely. Nothing is shown while either is still possible.
#   2. Any trailing fragment that could still be growing into a citation or
#      into the refusal marker. A citation is checked at the moment its closing
#      bracket arrives, before the bracket is released, so an unverifiable
#      citation never reaches a screen.
#
# One reversal survives this and cannot be designed away short of not
# streaming: a valid citation early followed by an invented one later blocks
# the whole answer after some text has already been released. The stream aborts
# at that token and the terminal Completed event carries blocked=True; clients
# MUST replace the text they have rendered with Completed.answer.text rather
# than appending to it. That is the contract -- a client that treats deltas as
# final will show a blocked answer.


@dataclass(frozen=True)
class TextDelta:
    """A run of answer text cleared for display."""

    text: str


@dataclass(frozen=True)
class Completed:
    """Terminal event. `answer.text` is authoritative and replaces all deltas."""

    answer: Answer


StreamEvent = TextDelta | Completed


def _hold_from(text: str) -> int:
    """Index from which `text` must be withheld because it may still be growing.

    Two things are unsafe to release half-formed: a citation (its article
    number is what gets verified, and the check needs the closing bracket) and
    the refusal marker (releasing 'NO_ANSWER' would show a fragment of a reply
    that is about to be discarded).
    """
    open_bracket = text.rfind("[")
    if open_bracket != -1 and "]" not in text[open_bracket:]:
        return open_bracket

    for length in range(min(len(text), len(REFUSAL_MARKER) - 1), 0, -1):
        if REFUSAL_MARKER.startswith(text[-length:]):
            return len(text) - length

    return len(text)


def stream_answer(
    question: str,
    retrieval: Retrieval,
    client: OpenAI | None = None,
    model: str | None = None,
) -> Iterator[StreamEvent]:
    """Stream an answer, releasing only text that has cleared enforcement.

    Yields zero or more TextDelta events followed by exactly one Completed.
    """
    if not retrieval.candidates:
        yield Completed(_refusal(question, retrieval))
        return
    client, model = _resolve_client(client, model)

    retrieved = {c.citation for c in retrieval.candidates}
    raw = ""
    released = 0
    gate_open = False

    stream = client.chat.completions.create(
        model=model,
        messages=_request_messages(question, retrieval),
        temperature=0,
        stream=True,
    )

    for chunk in stream:
        if not chunk.choices:
            # Providers send a final usage-only chunk with no choices.
            continue
        delta = chunk.choices[0].delta.content
        if not delta:
            continue
        raw += delta

        if REFUSAL_MARKER in raw:
            yield Completed(_refusal(question, retrieval))
            return

        citations = extract_citations(raw)
        unresolvable = tuple(c for c in citations if c not in retrieved)
        if unresolvable:
            yield Completed(_blocked(citations, retrieval, unresolvable))
            return

        # The first resolvable citation is what opens the gate: past it, the
        # reply can no longer be discarded for citing nothing, and it is no
        # longer a bare refusal marker.
        gate_open = gate_open or bool(citations)
        if not gate_open:
            continue

        safe_upto = _hold_from(raw)
        if safe_upto > released:
            yield TextDelta(raw[released:safe_upto])
            released = safe_upto

    yield Completed(finalize(question, raw, retrieval))

