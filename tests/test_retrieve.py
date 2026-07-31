"""Unit tests for the pure retrieval logic -- no database, no network."""
from __future__ import annotations

from legalrag.retrieve import (
    Candidate,
    parse_citation,
    reciprocal_rank_fusion,
)


def make_candidate(article_id: int, number: str = "12", article: str = "1") -> Candidate:
    return Candidate(
        article_id=article_id,
        instrument_number=number,
        instrument_year=2003,
        instrument_title="قانون العمل",
        instrument_type="law",
        article_number=article,
        article_text="نص",
        score=0.0,
    )


class TestParseCitation:
    def test_arabic_article_with_law_number_and_year(self):
        citation = parse_citation("ماذا تنص المادة 80 من قانون العمل رقم 12 لسنة 2003؟")
        assert citation is not None
        assert citation.article_numbers == ("80",)
        assert citation.law_number == "12"
        assert citation.law_year == 2003

    def test_arabic_article_with_title_only(self):
        citation = parse_citation("ماذا تنص المادة 163 من القانون المدني؟")
        assert citation is not None
        assert citation.article_numbers == ("163",)
        assert citation.law_number is None
        assert "القانون المدني" in citation.title_hint

    def test_english_article_with_slash_law_reference(self):
        citation = parse_citation("What does Article 9 of Egypt's IP Law (82/2002) say?")
        assert citation is not None
        assert citation.article_numbers == ("9",)
        assert (citation.law_number, citation.law_year) == ("82", 2002)

    def test_arabic_indic_digits_are_normalized(self):
        citation = parse_citation("المادة ٥٥٨ من القانون المدني")
        assert citation is not None
        assert citation.article_numbers == ("558",)

    def test_article_range_expands(self):
        citation = parse_citation("ماذا تنص المواد من 54 إلى 60 من القانون المدني؟")
        assert citation is not None
        assert citation.article_numbers == tuple(str(n) for n in range(54, 61))

    def test_absurd_range_is_not_expanded(self):
        """A 6,000-article range is a parse error, not a citation."""
        citation = parse_citation("المواد من 1 إلى 6000")
        assert citation is None or len(citation.article_numbers) <= 2

    def test_plain_question_is_not_a_citation(self):
        assert parse_citation("كم يومًا تكون مدة الإجازة السنوية للعامل؟") is None
        assert parse_citation("Can my employer fire me for being drunk?") is None

    def test_bare_year_is_not_read_as_a_law_reference(self):
        citation = parse_citation("ماذا تنص المادة 5 من قانون التجارة؟")
        assert citation is not None
        assert citation.law_number is None


class TestReciprocalRankFusion:
    def test_agreement_between_lists_outranks_a_single_top_hit(self):
        a, b, c = make_candidate(1), make_candidate(2), make_candidate(3)
        fused = reciprocal_rank_fusion([[a, b], [b, c]])
        assert fused[0].article_id == 2

    def test_deduplicates_across_lists(self):
        a, b = make_candidate(1), make_candidate(2)
        fused = reciprocal_rank_fusion([[a, b], [a, b]])
        assert [f.article_id for f in fused] == [1, 2]

    def test_empty_input_yields_nothing(self):
        assert reciprocal_rank_fusion([]) == []
        assert reciprocal_rank_fusion([[], []]) == []

    def test_scores_are_replaced_by_fusion_scores(self):
        """Fusion must rank on position; raw scores are on incomparable scales."""
        strong = Candidate(**{**make_candidate(1).__dict__, "score": 999.0})
        fused = reciprocal_rank_fusion([[strong]])
        assert fused[0].score < 1.0


class TestCandidateCitation:
    def test_citation_format_matches_the_goldset(self):
        assert make_candidate(1, "131", "558").citation == "131/2003 Art. 558"
