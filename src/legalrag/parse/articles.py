"""Article-boundary parser — splits raw statute text on مادة markers.

Handles the three marker formats found across the Phase 0-acquired
statutes: "مادة N –" (Civil Code), "مادة N:" (Labour Law), and
"مادة (N):" (Companies Law), plus مكرر suffixes for added articles
(e.g. "مادة (1 مكررًا):"). Development is iterative by design: run
parse_report (parse/report.py) after any regex change and eyeball the
gaps it flags.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal

from legalrag.arabic import normalize_digits

ARTICLE_MARKER = re.compile(
    r"^(?:ال)?مادة\s*\(?\s*(?P<num>[0-9٠-٩]+)"
    r"(?:\s*(?P<mukarrar>مكرر(?:[اةً]{0,2})?(?:\s+[ء-غف-ي])?))?"
    r"\s*\)?\s*[:\-–]?\s*$",
    re.MULTILINE,
)

_HEADER_PATTERNS: dict[str, re.Pattern[str]] = {
    "book": re.compile(r"^(الكتاب\s.+)$", re.MULTILINE),
    "chapter": re.compile(r"^(الباب\s.+)$", re.MULTILINE),
    "section": re.compile(r"^(الفصل\s.+)$", re.MULTILINE),
}


@dataclass(frozen=True)
class ParsedArticle:
    article_number: str
    article_sort_key: Decimal
    article_text: str
    book: str | None = None
    chapter: str | None = None
    section: str | None = None


def parse_articles(text: str) -> list[ParsedArticle]:
    markers = list(ARTICLE_MARKER.finditer(text))
    if not markers:
        return []

    headers: list[tuple[int, str, str]] = []
    for kind, pattern in _HEADER_PATTERNS.items():
        for m in pattern.finditer(text):
            headers.append((m.start(), kind, m.group(1).strip()))
    headers.sort(key=lambda h: h[0])

    current: dict[str, str | None] = {"book": None, "chapter": None, "section": None}
    header_idx = 0
    mukarrar_counts: dict[str, int] = {}
    articles: list[ParsedArticle] = []

    for i, marker in enumerate(markers):
        while header_idx < len(headers) and headers[header_idx][0] < marker.start():
            _, kind, value = headers[header_idx]
            current[kind] = value
            header_idx += 1

        body_start = marker.end()
        body_end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
        article_text = text[body_start:body_end].strip()

        base = int(normalize_digits(marker.group("num")))
        mukarrar = marker.group("mukarrar")
        if mukarrar:
            key = str(base)
            mukarrar_counts[key] = mukarrar_counts.get(key, 0) + 1
            sort_key = Decimal(base) + Decimal(mukarrar_counts[key]) / Decimal(100)
            article_number = f"{base} {mukarrar.strip()}"
        else:
            sort_key = Decimal(base)
            article_number = str(base)

        articles.append(
            ParsedArticle(
                article_number=article_number,
                article_sort_key=sort_key,
                article_text=article_text,
                book=current["book"],
                chapter=current["chapter"],
                section=current["section"],
            )
        )

    return articles
