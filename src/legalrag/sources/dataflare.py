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
    r"قانون\s+رقم\s*[:\-]?\s*(?P<number>[0-9٠-٩]+)\s*لسنة\s*(?P<year>[0-9٠-٩]{4})"
)


def extract_law_number_year(text: str) -> tuple[str, int] | None:
    match = _LAW_NUMBER_YEAR.search(text)
    if not match:
        return None
    number = normalize_digits(match.group("number"))
    year = int(normalize_digits(match.group("year")))
    return number, year


def classify_rows(rows: list[dict], token_threshold: int = 10000) -> list[dict]:
    candidates = []
    for row in rows:
        if row.get("tokens", 0) <= token_threshold:
            continue
        law_number_year = extract_law_number_year(row.get("text", ""))
        candidates.append(
            {
                "law_name": row["law_name"],
                "categories": row.get("categories", []),
                "tokens": row["tokens"],
                "law_number": law_number_year[0] if law_number_year else None,
                "law_year": law_number_year[1] if law_number_year else None,
                "text": row["text"],
            }
        )
    return candidates
