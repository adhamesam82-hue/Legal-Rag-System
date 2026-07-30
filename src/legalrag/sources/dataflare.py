"""dataflare/egypt-legal-corpus source — requires row classification.

Verified during Phase 1 planning: this dataset's 2,434 rows are mostly
short legal-encyclopedia/case-note entries (e.g. "دعوى مدنية تعويض"), not
statute text. Only rows above a token-count threshold, ideally also
matching a "قانون رقم N لسنة YYYY" pattern, are candidate full-instrument
rows — and even those must be human-eyeballed before ingestion (see
scripts/dataflare_candidates.py in Task 10).
"""
from __future__ import annotations

import re

from legalrag.arabic import normalize_digits

_LAW_NUMBER_YEAR = re.compile(
    r"""قانون\s+رقم\s*[:\-]?\s*["'“”(]?\s*(?P<number>[0-9٠-٩]+)\s*["'“”)]?\s*لسنة\s*(?P<year>[0-9٠-٩]{4})"""
)


def find_all_law_number_years(text: str) -> list[tuple[str, int]]:
    """Return all distinct (number, year) pairs found in text, in order of
    first appearance. A text mentioning more than one law (e.g. a statute
    plus the laws that amended it) yields multiple pairs; callers should
    surface that ambiguity rather than silently picking one.
    """
    seen: list[tuple[str, int]] = []
    for match in _LAW_NUMBER_YEAR.finditer(text):
        number = normalize_digits(match.group("number"))
        year = int(normalize_digits(match.group("year")))
        pair = (number, year)
        if pair not in seen:
            seen.append(pair)
    return seen


def extract_law_number_year(text: str) -> tuple[str, int] | None:
    pairs = find_all_law_number_years(text)
    return pairs[0] if pairs else None


def classify_rows(rows: list[dict], token_threshold: int = 10000) -> list[dict]:
    candidates = []
    for row in rows:
        tokens = row.get("tokens", 0)
        if tokens <= token_threshold:
            continue
        text = row.get("text", "")
        law_number_year = extract_law_number_year(text)
        candidates.append(
            {
                "law_name": row.get("law_name", ""),
                "categories": row.get("categories", []),
                "tokens": tokens,
                "law_number": law_number_year[0] if law_number_year else None,
                "law_year": law_number_year[1] if law_number_year else None,
                "law_number_candidates": find_all_law_number_years(text),
                "text": text,
            }
        )
    return candidates
