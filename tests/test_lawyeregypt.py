import pytest

from legalrag.sources.lawyeregypt import GUARANTEED_STATUTES, extract_law_text

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


def test_extract_law_text_raises_when_no_container_found():
    with pytest.raises(ValueError):
        extract_law_text("<html><body><p>no container here</p></body></html>")


def test_guaranteed_statutes_has_the_three_core_statutes():
    slugs = {s["slug"] for s in GUARANTEED_STATUTES}
    assert slugs == {
        "eg-civil-code-131-1948",
        "eg-labour-law-12-2003",
        "eg-companies-law-159-1981",
    }
