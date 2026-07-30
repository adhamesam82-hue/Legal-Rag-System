"""lawyeregypt.net source — guarantee-list fallback for the 3 core statutes.

Extraction logic ported from scratch/statute_sources.py (Phase 0), which
validated it against all 3 target pages returning clean text. Duplicated
here rather than imported so src/legalrag has no dependency on the
disposable scratch/ prototype.
"""
from __future__ import annotations

from bs4 import BeautifulSoup

JUNK_MARKER = "Lawyer Egypt Firm"

GUARANTEED_STATUTES = [
    {
        "slug": "eg-civil-code-131-1948",
        "instrument_type": "law",
        "number": "131",
        "year": 1948,
        "title": "القانون المدني",
        "source_url": (
            "https://lawyeregypt.net/%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8%D8%A9-"
            "%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%D9%8A%D8%A9/%D9%86%D8%B5"
            "%D9%88%D8%B5-%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%A7%D9%84"
            "%D9%85%D8%AF%D9%86%D9%89-%D8%A7%D9%84%D9%85%D8%B5%D8%B1%D9%89-%D8%B1"
            "%D9%82%D9%85-131-%D9%84%D8%B3%D9%86%D8%A9-1948/"
        ),
    },
    {
        "slug": "eg-labour-law-12-2003",
        "instrument_type": "law",
        "number": "12",
        "year": 2003,
        "title": "قانون العمل",
        "source_url": (
            "https://lawyeregypt.net/%d8%a7%d9%84%d9%85%d9%83%d8%aa%d8%a8%d8%a9-"
            "%d8%a7%d9%84%d9%82%d8%a7%d9%86%d9%88%d9%86%d9%8a%d8%a9/%d9%82%d8%a7"
            "%d9%86%d9%88%d9%86-%d8%a7%d9%84%d8%b9%d9%85%d9%84-%d8%a7%d9%84%d9%85"
            "%d8%b5%d8%b1%d9%89-%d8%b1%d9%82%d9%85-12-%d9%84%d8%b3%d9%86%d8%a9-2003/"
        ),
    },
    {
        "slug": "eg-companies-law-159-1981",
        "instrument_type": "law",
        "number": "159",
        "year": 1981,
        "title": "قانون الشركات",
        "source_url": (
            "https://lawyeregypt.net/%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8%D8%A9-"
            "%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%D9%8A%D8%A9/%D9%82%D8%A7"
            "%D9%86%D9%88%D9%86-%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A7%D8%AA-%D8%B1"
            "%D9%82%D9%85-159-%D9%84%D8%B3%D9%86%D8%A9-1981/"
        ),
    },
]


def extract_law_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    candidates = soup.select(".elementor-widget-theme-post-content")
    if not candidates:
        raise ValueError("no .elementor-widget-theme-post-content container found")
    best = max(candidates, key=lambda c: len(c.get_text(strip=True)))
    text = best.get_text("\n", strip=True)
    if JUNK_MARKER in text:
        text = text[: text.index(JUNK_MARKER)].rstrip()
    return text
