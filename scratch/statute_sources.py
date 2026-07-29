"""Statute definitions and extraction/storage helpers for Phase 0 acquisition."""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup

STATUTES = [
    {
        "slug": "eg-civil-code-131-1948",
        "law_number": "131",
        "law_year": 1948,
        "title_ar": "القانون المدني",
        "fr3on_keywords": ["مدني", "المدني"],
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
        "law_number": "12",
        "law_year": 2003,
        "title_ar": "قانون العمل",
        "fr3on_keywords": ["العمل"],
        "source_url": (
            "https://lawyeregypt.net/%d8%a7%d9%84%d9%85%d9%83%d8%aa%d8%a8%d8%a9-"
            "%d8%a7%d9%84%d9%82%d8%a7%d9%86%d9%88%d9%86%d9%8a%d8%a9/%d9%82%d8%a7"
            "%d9%86%d9%88%d9%86-%d8%a7%d9%84%d8%b9%d9%85%d9%84-%d8%a7%d9%84%d9%85"
            "%d8%b5%d8%b1%d9%89-%d8%b1%d9%82%d9%85-12-%d9%84%d8%b3%d9%86%d8%a9-2003/"
        ),
    },
    {
        "slug": "eg-companies-law-159-1981",
        "law_number": "159",
        "law_year": 1981,
        "title_ar": "قانون الشركات",
        "fr3on_keywords": ["الشركات", "شركات"],
        "source_url": (
            "https://lawyeregypt.net/%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8%D8%A9-"
            "%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%D9%8A%D8%A9/%D9%82%D8%A7"
            "%D9%86%D9%88%D9%86-%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A7%D8%AA-%D8%B1"
            "%D9%82%D9%85-159-%D9%84%D8%B3%D9%86%D8%A9-1981/"
        ),
    },
]

JUNK_MARKERS = [
    "Lawyer Egypt Firm",
    "مكتب محامى مصر للمحاماة والاستشارات القانونية",
]


def extract_law_text(html: str) -> str:
    """Pull the statute body out of a lawyeregypt.net article page.

    The site's Elementor theme renders post content inside one or more
    `.elementor-widget-theme-post-content` containers (one is often an
    empty duplicate); pick the longest one. Trim the trailing law-firm
    contact block if present (the marker appears in either English or
    Arabic depending on the page).
    """
    soup = BeautifulSoup(html, "html.parser")
    candidates = soup.select(".elementor-widget-theme-post-content")
    if not candidates:
        raise ValueError("no .elementor-widget-theme-post-content container found")
    best = max(candidates, key=lambda c: len(c.get_text(strip=True)))
    text = best.get_text("\n", strip=True)
    for marker in JUNK_MARKERS:
        if marker in text:
            text = text[: text.index(marker)].rstrip()
    return text


def fr3on_titles_matching(rows: list[dict], keywords: list[str]) -> list[str]:
    """Return distinct statute names (from HF row titles) matching any keyword.

    `rows` are fr3on/eg-legal-rag rows; each row's `title` looks like
    "المادة 1 - <statute name>". Matching is a substring check against
    the statute-name portion of the title.
    """
    matched = set()
    for row in rows:
        title = row.get("title", "")
        statute_name = title.split(" - ", 1)[1] if " - " in title else title
        if any(kw in statute_name for kw in keywords):
            matched.add(statute_name)
    return sorted(matched)


def write_statute_files(
    raw_dir: Path, statute: dict, text: str, fetched_at: datetime, source: str
) -> tuple[Path, Path]:
    """Write a statute's text and provenance sidecar to `raw_dir`.

    Returns (txt_path, meta_path). `source` is a short label such as
    "lawyeregypt.net" or "fr3on/eg-legal-rag@<revision>".
    """
    raw_dir.mkdir(parents=True, exist_ok=True)
    txt_path = raw_dir / f"{statute['slug']}.txt"
    meta_path = raw_dir / f"{statute['slug']}.meta.json"
    txt_path.write_text(text, encoding="utf-8")
    meta = {
        "slug": statute["slug"],
        "law_number": statute["law_number"],
        "law_year": statute["law_year"],
        "title_ar": statute["title_ar"],
        "source": source,
        "source_url": statute["source_url"],
        "fetched_at": fetched_at.isoformat(),
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return txt_path, meta_path
