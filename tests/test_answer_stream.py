"""Streaming must not be a weaker version of the citation enforcement.

Every test here is about what reaches the caller *before* the answer is
complete. The verdict tests in test_answer.py already cover finalize(); these
cover the thing streaming newly makes possible -- text on screen ahead of the
check -- and assert it does not happen.
"""
from __future__ import annotations

from legalrag.answer import (
    REFUSAL_MARKER,
    Completed,
    TextDelta,
    _hold_from,
    stream_answer,
)
from tests.test_answer import make_candidate, make_retrieval


class FakeStreamClient:
    """Streams a canned reply one chunk at a time, like the OpenAI SDK does."""

    def __init__(self, chunks: list[str]):
        self.chunks = chunks
        self.calls = 0
        outer = self

        class Completions:
            def create(self, **kwargs):
                outer.calls += 1
                outer.last_kwargs = kwargs
                assert kwargs.get("stream") is True

                def generate():
                    for piece in outer.chunks:
                        delta = type("D", (), {"content": piece})()
                        choice = type("C", (), {"delta": delta})()
                        yield type("R", (), {"choices": [choice]})()
                    # Providers close with a usage-only chunk carrying no choices.
                    yield type("R", (), {"choices": []})()

                return generate()

        self.chat = type("Chat", (), {"completions": Completions()})()


def by_character(text: str) -> list[str]:
    """The harshest chunking: every boundary lands mid-token."""
    return list(text)


def run(chunks: list[str], question: str = "working hours?", candidates=None):
    client = FakeStreamClient(chunks)
    retrieval = make_retrieval(
        [make_candidate()] if candidates is None else candidates
    )
    events = list(stream_answer(question, retrieval, client=client, model="fake"))
    deltas = "".join(e.text for e in events if isinstance(e, TextDelta))
    completed = events[-1]
    assert isinstance(completed, Completed), "a stream must end in Completed"
    return deltas, completed.answer


class TestHoldFrom:
    def test_releases_plain_text_entirely(self):
        text = "Hours are capped at eight."
        assert _hold_from(text) == len(text)

    def test_withholds_an_unterminated_citation(self):
        text = "Hours are capped [Law 12/2003, Art. 8"
        assert _hold_from(text) == text.index("[")

    def test_releases_a_closed_citation(self):
        text = "Hours are capped [Law 12/2003, Art. 80]."
        assert _hold_from(text) == len(text)

    def test_withholds_a_partial_refusal_marker(self):
        text = "some text NO_ANSW"
        assert _hold_from(text) == len("some text ")


class TestStreamGate:
    def test_nothing_is_released_before_the_first_valid_citation(self):
        """The prose ahead of a citation is only safe once one has resolved --
        until then the reply can still end up uncited, which is a refusal."""
        events = []
        client = FakeStreamClient(by_character("Hours are capped [Law 12/2003, Art. 80]."))
        for event in stream_answer(
            "working hours?", make_retrieval([make_candidate()]), client=client, model="fake"
        ):
            events.append(event)
            if isinstance(event, TextDelta):
                # The first release must already contain the citation that
                # cleared it, not the prose that preceded it alone.
                assert "[Law 12/2003, Art. 80]" in event.text
                break

    def test_a_refusal_marker_reply_streams_nothing_at_all(self):
        deltas, answer = run(by_character(REFUSAL_MARKER))
        assert deltas == ""
        assert answer.refused

    def test_uncited_prose_streams_nothing_and_refuses(self):
        deltas, answer = run(by_character("Employers must generally give notice."))
        assert deltas == ""
        assert answer.refused

    def test_a_hallucinated_citation_is_never_released(self):
        deltas, answer = run(
            by_character("Notice is three months [Law 12/2003, Art. 999].")
        )
        assert answer.blocked
        assert answer.blocked_citations == ("12/2003 Art. 999",)
        assert deltas == "", "no part of a blocked answer may be shown"

    def test_a_late_bad_citation_aborts_the_stream(self):
        """The one reversal gating cannot prevent: a good citation opens the
        gate, then an invented one blocks the answer. The contract is that the
        stream stops there and Completed carries the blocked verdict, so a
        client that honours it replaces what it had rendered."""
        deltas, answer = run(
            by_character(
                "Hours are capped [Law 12/2003, Art. 80]. "
                "Notice is three months [Law 99/1999, Art. 1]."
            )
        )
        assert answer.blocked
        assert answer.blocked_citations == ("99/1999 Art. 1",)

        # The invented citation itself never leaves the server, and the
        # authoritative text a client must fall back to contains none of the
        # rejected answer.
        assert "[Law 99/1999, Art. 1]" not in deltas
        assert "Notice is three months" not in answer.text
        assert "Hours are capped" not in answer.text

        # What the gate does not prevent, stated as a fact rather than a hope:
        # prose released before the bad citation arrived was already shown.
        assert "Hours are capped" in deltas

    def test_a_grounded_answer_streams_its_text(self):
        deltas, answer = run(
            by_character("Hours are capped at eight [Law 12/2003, Art. 80].")
        )
        assert answer.is_grounded
        assert "Hours are capped at eight" in deltas
        assert answer.citations == ["12/2003 Art. 80"]

    def test_completed_text_is_authoritative_and_carries_the_disclaimer(self):
        """Deltas are a preview; the disclaimer is appended by finalize and so
        only ever appears in the terminal event."""
        deltas, answer = run(
            by_character("Hours are capped at eight [Law 12/2003, Art. 80].")
        )
        assert "not legal advice" in answer.text
        assert "not legal advice" not in deltas

    def test_empty_retrieval_refuses_without_calling_the_model(self):
        client = FakeStreamClient(["should never be used"])
        events = list(
            stream_answer("q", make_retrieval([]), client=client, model="fake")
        )
        assert client.calls == 0
        assert len(events) == 1
        assert events[0].answer.refused

    def test_chunking_does_not_change_the_verdict(self):
        """Whole-reply and character-by-character chunking must agree, since a
        provider's chunk boundaries are arbitrary."""
        reply = "Hours are capped at eight [Law 12/2003, Art. 80]."
        whole_deltas, whole = run([reply])
        split_deltas, split = run(by_character(reply))

        assert whole.text == split.text
        assert whole.citations == split.citations
        assert whole_deltas == split_deltas

    def test_arabic_answer_streams_and_stays_grounded(self):
        deltas, answer = run(
            by_character("ساعات العمل محدودة بثماني ساعات [Law 12/2003, Art. 80]."),
            question="كم ساعة يجوز تشغيل العامل؟",
        )
        assert answer.is_grounded
        assert "ساعات العمل" in deltas
