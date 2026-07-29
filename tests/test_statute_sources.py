import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from scratch.statute_sources import extract_law_text

FIXTURE_HTML = """
<html><body>
<div class="elementor-widget-theme-post-content"></div>
<div class="elementor-widget-theme-post-content">
<p>قانون تجريبى</p>
<p>مادة 1 - نص المادة الأولى.</p>
<p>مادة 2 - نص المادة الثانية.</p>
<p>Lawyer Egypt Firm</p>
<p>واتس أب: 201220615243+</p>
</div>
</body></html>
"""


def test_extract_law_text_picks_longest_container_and_trims_junk():
    text = extract_law_text(FIXTURE_HTML)
    assert "مادة 1" in text
    assert "مادة 2" in text
    assert "Lawyer Egypt Firm" not in text
    assert "واتس" not in text


def test_extract_law_text_raises_when_no_container_found():
    with pytest.raises(ValueError):
        extract_law_text("<html><body><p>no container here</p></body></html>")


def test_fr3on_titles_matching_finds_substring_matches():
    from scratch.statute_sources import fr3on_titles_matching

    rows = [
        {"title": "المادة 1 - قانون الإجراءات الجنائية"},
        {"title": "المادة 2 - قانون الإجراءات الجنائية"},
        {"title": "المادة 1 - قانون العقوبات"},
    ]
    matched = fr3on_titles_matching(rows, ["الإجراءات"])
    assert matched == ["قانون الإجراءات الجنائية"]


def test_fr3on_titles_matching_returns_empty_when_no_match():
    from scratch.statute_sources import fr3on_titles_matching

    rows = [{"title": "المادة 1 - قانون الإجراءات الجنائية"}]
    assert fr3on_titles_matching(rows, ["الشركات"]) == []


def test_write_statute_files_writes_text_and_meta(tmp_path: Path):
    from scratch.statute_sources import write_statute_files

    statute = {
        "slug": "test-statute",
        "law_number": "1",
        "law_year": 2000,
        "title_ar": "قانون تجريبى",
        "source_url": "https://example.com/law",
    }
    fetched_at = datetime(2026, 7, 29, tzinfo=timezone.utc)

    txt_path, meta_path = write_statute_files(
        tmp_path, statute, "نص القانون", fetched_at, source="example.com"
    )

    assert txt_path.read_text(encoding="utf-8") == "نص القانون"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    assert meta["slug"] == "test-statute"
    assert meta["source"] == "example.com"
    assert meta["fetched_at"] == "2026-07-29T00:00:00+00:00"
