"""Citation enforcement tests -- the guard against hallucinated article numbers."""
from __future__ import annotations

from legalrag.answer import REFUSAL_MARKER, answer, extract_citations
from legalrag.retrieve import Candidate, Retrieval


def make_candidate(number: str = "12", year: int = 2003, article: str = "80") -> Candidate:
    return Candidate(
        article_id=1,
        instrument_number=number,
        instrument_year=year,
        instrument_title="قانون العمل",
        instrument_type="law",
        article_number=article,
        article_text="لا يجوز تشغيل العامل أكثر من ثماني ساعات",
        score=1.0,
    )


def make_retrieval(candidates: list[Candidate]) -> Retrieval:
    return Retrieval(candidates=candidates, strategy="hybrid", search_text="x")


class FakeClient:
    """Stands in for the OpenAI client, returning a canned completion."""

    def __init__(self, reply: str):
        self.reply = reply
        self.calls = 0
        outer = self

        class Completions:
            def create(self, **kwargs):
                outer.calls += 1
                outer.last_kwargs = kwargs
                message = type("M", (), {"content": outer.reply})()
                choice = type("C", (), {"message": message})()
                return type("R", (), {"choices": [choice]})()

        self.chat = type("Chat", (), {"completions": Completions()})()


class TestExtractCitations:
    def test_extracts_and_deduplicates(self):
        text = "Working hours are capped [Law 12/2003, Art. 80]. See also [Law 12/2003, Art. 80]."
        assert extract_citations(text) == ["12/2003 Art. 80"]

    def test_extracts_arabic_sub_index_article_numbers(self):
        assert extract_citations("[Law 159/1981, Art. 4 مكررًا]") == ["159/1981 Art. 4 مكررًا"]

    def test_returns_empty_when_there_are_no_citations(self):
        assert extract_citations("The law is complicated.") == []


class TestAnswerEnforcement:
    def test_hallucinated_citation_blocks_the_answer(self):
        """The model cites an article it was never given -- the answer must not ship."""
        client = FakeClient("Notice is three months [Law 12/2003, Art. 999].")
        result = answer("notice period?", make_retrieval([make_candidate()]), client=client, model="fake")

        assert result.blocked
        assert result.blocked_citations == ("12/2003 Art. 999",)
        assert not result.is_grounded
        assert "Notice is three months" not in result.text

    def test_citation_of_a_retrieved_article_is_allowed_through(self):
        client = FakeClient("Hours are capped at eight [Law 12/2003, Art. 80].")
        result = answer("working hours?", make_retrieval([make_candidate()]), client=client, model="fake")

        assert result.is_grounded
        assert result.citations == ["12/2003 Art. 80"]
        assert "not legal advice" in result.text

    def test_one_bad_citation_blocks_even_when_others_are_valid(self):
        client = FakeClient("[Law 12/2003, Art. 80] and also [Law 99/1999, Art. 1].")
        result = answer("q", make_retrieval([make_candidate()]), client=client, model="fake")

        assert result.blocked
        assert result.blocked_citations == ("99/1999 Art. 1",)

    def test_empty_retrieval_refuses_without_calling_the_model(self):
        client = FakeClient("should never be used")
        result = answer("What is Saudi VAT?", make_retrieval([]), client=client, model="fake")

        assert result.refused
        assert client.calls == 0

    def test_refusal_marker_produces_a_refusal(self):
        client = FakeClient(REFUSAL_MARKER)
        result = answer("unrelated question", make_retrieval([make_candidate()]), client=client, model="fake")

        assert result.refused
        assert not result.blocked

    def test_uncited_prose_is_treated_as_a_refusal(self):
        """An answer with no citation at all is ungrounded by definition."""
        client = FakeClient("Employers generally must give reasonable notice.")
        result = answer("notice?", make_retrieval([make_candidate()]), client=client, model="fake")

        assert result.refused
        assert result.citations == []

    def test_arabic_question_refuses_in_arabic(self):
        client = FakeClient(REFUSAL_MARKER)
        result = answer("ما هي عقوبة السرقة؟", make_retrieval([make_candidate()]), client=client, model="fake")

        assert result.refused
        assert "لم أعثر" in result.text

    def test_answer_language_is_told_to_the_model_not_left_to_inference(self):
        """Regression: llama-3.3-70b answered an English question in Arabic when
        the system prompt's language rule was the only instruction. The language
        is now detected server-side and stated explicitly in the user message."""
        client = FakeClient("Hours are capped at eight [Law 12/2003, Art. 80].")
        answer("How many hours can I be made to work?", make_retrieval([make_candidate()]), client=client, model="fake")
        assert "Answer in English" in client.last_kwargs["messages"][1]["content"]

        client = FakeClient("ساعات العمل محدودة بثمان ساعات [Law 12/2003, Art. 80].")
        answer("كم ساعة يجوز تشغيل العامل؟", make_retrieval([make_candidate()]), client=client, model="fake")
        assert "Answer in Arabic" in client.last_kwargs["messages"][1]["content"]
