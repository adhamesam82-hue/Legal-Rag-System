"""Article-boundary parser — splits raw statute text on مادة markers.

Handles the three marker formats found across the Phase 0-acquired
statutes: "مادة N –" (Civil Code), "مادة N:" (Labour Law), and
"مادة (N):" (Companies Law), plus مكرر suffixes for added articles
(e.g. "مادة (1 مكررًا):"). The marker no longer needs to reach end-of-line:
some broad-corpus statutes carry a short inline title on the same line as
the marker, after the trailing punctuation, before a colon (e.g.
"مادة 131 – <title>:"). That title text is not part of the marker match --
it flows into the following article's body text exactly as it would if it
were on its own line. The marker also recognizes a trailing sub-index on a
مكرر (or, rarely, directly on a base article) marking a genuine sub-numbered
amendment clause: a "/" followed by a digit or a single Arabic letter, and/or
one or two parenthesized digit/letter groups. This gives each sub-clause its
own distinct article_number and article_sort_key instead of colliding with
its siblings. Development is iterative by design: run parse_report
(parse/report.py) after any regex change and eyeball the gaps it flags.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal

from legalrag.arabic import normalize_digits

ARTICLE_MARKER = re.compile(
    r"^(?:ال)?مادة\s*\(?\s*(?P<num>[0-9٠-٩]+)"
    r"\)?"
    r"(?:\s*(?P<mukarrar>مكرر(?:[اةً]{0,2})?(?:[^\S\n]+[ء-غف-ي])?))?"
    r"(?:[^\S\n]*/[^\S\n]*(?P<subidx>[0-9٠-٩]+|[ء-غف-ي]))?"
    r"(?:[^\S\n]*\([^\S\n]*(?P<subletter>[ء-غف-ي])[^\S\n]*\))?"
    r"(?:[^\S\n]*\([^\S\n]*(?P<subnum>[0-9٠-٩]+)[^\S\n]*\))?"
    r"\s*\)?\s*[:\-–]?",
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
    submukarrar_counts: dict[tuple[str, int], int] = {}
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
        subidx = marker.group("subidx")
        subletter = marker.group("subletter")
        subnum = marker.group("subnum")
        has_subindex = bool(subidx or subletter or subnum)

        if mukarrar and not has_subindex:
            # Top-level مكرر insertion (unchanged from the prior fix): its
            # own fractional slot between base and base + 1.
            key = str(base)
            mukarrar_counts[key] = mukarrar_counts.get(key, 0) + 1
            sort_key = Decimal(base) + Decimal(mukarrar_counts[key]) / Decimal(100)
            article_number = f"{base} {mukarrar.strip()}"
        elif has_subindex:
            # Sub-numbered amendment clause -- a مكرر article (or, rarely,
            # a base article) further split by a slash-digit, slash-letter,
            # or parenthesized index, e.g. "base مكرر / 1" or
            # "base مكرر (1)". Nests inside the most recent top-level مكرر
            # slot for this base (0 if none has appeared yet in the
            # document), with its own fractional sub-slot one level deeper
            # so it can never collide with the next مكرر slot or the next
            # base article.
            key = str(base)
            major = mukarrar_counts.get(key, 0)
            minor_key = (key, major)
            submukarrar_counts[minor_key] = submukarrar_counts.get(minor_key, 0) + 1
            minor = submukarrar_counts[minor_key]
            sort_key = (
                Decimal(base)
                + Decimal(major) / Decimal(100)
                + Decimal(minor) / Decimal(10000)
            )
            suffix_parts = []
            if subidx:
                suffix_parts.append(f"/ {normalize_digits(subidx)}")
            if subletter:
                suffix_parts.append(f"({subletter})")
            if subnum:
                suffix_parts.append(f"({normalize_digits(subnum)})")
            base_str = str(base) if not mukarrar else f"{base} {mukarrar.strip()}"
            article_number = " ".join([base_str, *suffix_parts])
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
