"""Unit tests for split_promulgation_decree(), the only custom logic in
scripts/ingest_guaranteed.py.

These tests use plain ASCII article_text values -- the split logic only
inspects article_number, so no Arabic content is needed here.
"""
from __future__ import annotations

from decimal import Decimal

from legalrag.parse.articles import ParsedArticle
from scripts.ingest_guaranteed import split_promulgation_decree


def _article(number: str) -> ParsedArticle:
    return ParsedArticle(
        article_number=number,
        article_sort_key=Decimal(number),
        article_text=f"text of article {number}",
    )


def _numbers(articles: list[ParsedArticle]) -> list[str]:
    return [a.article_number for a in articles]


def test_real_shape_splits_decree_from_law():
    # Mirrors the actual Civil Code shape: 1, 2, then restart at 1, 2, 3, ...
    numbers = ["1", "2", "1", "2", "3", "4", "5"]
    articles = [_article(n) for n in numbers]

    decree, law = split_promulgation_decree(articles)

    assert _numbers(decree) == ["1", "2"]
    assert _numbers(law) == ["1", "2", "3", "4", "5"]


def test_no_second_one_returns_empty_decree_and_full_law():
    numbers = ["1", "2", "3"]
    articles = [_article(n) for n in numbers]

    decree, law = split_promulgation_decree(articles)

    assert decree == []
    assert _numbers(law) == ["1", "2", "3"]


def test_empty_article_list():
    decree, law = split_promulgation_decree([])

    assert decree == []
    assert law == []


def test_single_article_numbered_one():
    articles = [_article("1")]

    decree, law = split_promulgation_decree(articles)

    assert decree == []
    assert _numbers(law) == ["1"]


def test_three_or_more_occurrences_of_one_documents_current_limitation():
    # "1" appears three times: the split fires at the *second* occurrence,
    # so the returned "law" half still contains a duplicate "1". This test
    # pins down that known limitation (guarded against downstream by the
    # insert_articles() duplicate check, not by this function).
    numbers = ["1", "2", "1", "3", "1", "4"]
    articles = [_article(n) for n in numbers]

    decree, law = split_promulgation_decree(articles)

    assert _numbers(decree) == ["1", "2"]
    # The law half still has "1" twice -- this is the documented gap.
    assert _numbers(law) == ["1", "3", "1", "4"]
    assert _numbers(law).count("1") == 2
