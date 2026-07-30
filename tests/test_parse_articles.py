from decimal import Decimal
from pathlib import Path

from legalrag.arabic import normalize_digits
from legalrag.parse.articles import ARTICLE_MARKER, parse_articles

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def _read_raw(slug: str) -> str:
    return (RAW_DIR / f"{slug}.txt").read_text(encoding="utf-8")


def test_parses_dash_style_marker():
    # Real format from eg-civil-code-131-1948.txt
    text = (
        "مادة 1 –\n"
        "يلغى القانون المدنى المعمول به أمام المحاكم الوطنية.\n"
        "مادة 2 –\n"
        "على وزير العدل تنفيذ هذا القانون.\n"
    )
    articles = parse_articles(text)
    assert len(articles) == 2
    assert articles[0].article_number == "1"
    assert articles[0].article_sort_key == Decimal("1")
    assert "يلغى القانون المدنى" in articles[0].article_text
    assert articles[1].article_number == "2"


def test_parses_colon_style_marker():
    # Real format from eg-labour-law-12-2003.txt
    text = (
        "مادة 1:\n"
        "يقصد في تطبيق أحكام هذا القانون بالمصطلحات الآتية.\n"
        "مادة 2:\n"
        "في تطبيق أحكام هذا القانون تعتبر السنة 365 يوما.\n"
    )
    articles = parse_articles(text)
    assert len(articles) == 2
    assert articles[0].article_number == "1"
    assert articles[1].article_text.strip().startswith("في تطبيق")


def test_parses_parenthesized_style_marker():
    # Real format from eg-companies-law-159-1981.txt
    text = (
        "مادة (1):\n"
        "نص المادة الاولى.\n"
        "مادة (2):\n"
        "نص المادة الثانية.\n"
    )
    articles = parse_articles(text)
    assert len(articles) == 2
    assert articles[0].article_number == "1"
    assert articles[1].article_number == "2"


def test_parses_real_mukarrar_marker():
    # Real format from eg-companies-law-159-1981.txt, article (1 مكررًا)
    text = (
        "مادة (1):\n"
        "نص المادة الاولى.\n"
        "مادة (1 مكررًا):\n"
        "مع عدم الإخلال بأحكام قانون سوق رأس المال.\n"
        "مادة (2):\n"
        "نص المادة الثانية.\n"
    )
    articles = parse_articles(text)
    assert len(articles) == 3
    assert articles[1].article_number == "1 مكررًا"
    assert articles[1].article_sort_key == Decimal("1.01")
    assert articles[2].article_sort_key == Decimal("2")


def test_second_mukarrar_for_same_base_increments_sort_key():
    text = (
        "مادة 5 –\nنص خامس.\n"
        "مادة 5 مكرر –\nنص خامس مكرر اول.\n"
        "مادة 5 مكرر –\nنص خامس مكرر ثان.\n"
    )
    articles = parse_articles(text)
    assert [a.article_sort_key for a in articles] == [
        Decimal("5"),
        Decimal("5.01"),
        Decimal("5.02"),
    ]


def test_many_mukarrar_insertions_do_not_collide_with_next_article():
    # Regression test: with a divisor of 10, the 10th مكرر on a base article
    # would compute sort_key = base + 10/10 = base + 1, colliding with the
    # next real article's integer sort key. With a divisor of 100, up to 99
    # مكرر insertions have headroom before any collision risk.
    mukarrar_blocks = "".join(
        f"مادة 5 مكرر –\nنص خامس مكرر رقم {i}.\n" for i in range(1, 13)
    )
    text = "مادة 5 –\nنص خامس.\n" + mukarrar_blocks + "مادة 6 –\nنص سادس.\n"
    articles = parse_articles(text)

    base_article = articles[0]
    mukarrar_articles = articles[1:13]
    next_article = articles[13]

    assert base_article.article_sort_key == Decimal("5")
    assert len(mukarrar_articles) == 12
    assert next_article.article_sort_key == Decimal("6")
    for article in mukarrar_articles:
        assert article.article_sort_key < next_article.article_sort_key


def test_arabic_indic_digits_in_marker_are_normalized():
    text = "مادة ١ –\nنص.\nمادة ٢ –\nنص ثان.\n"
    articles = parse_articles(text)
    assert [a.article_number for a in articles] == ["1", "2"]


def test_captures_chapter_header_preceding_article():
    text = (
        "الباب الأول\n"
        "التعاريف\n"
        "مادة 1:\n"
        "نص.\n"
    )
    articles = parse_articles(text)
    assert articles[0].chapter == "الباب الأول"


def test_no_markers_returns_empty_list():
    assert parse_articles("لا يوجد مواد هنا على الإطلاق.") == []


def test_article_text_stops_before_next_marker():
    text = "مادة 1 –\nسطر اول.\nسطر ثان.\nمادة 2 –\nنص اخر.\n"
    articles = parse_articles(text)
    assert "مادة 2" not in articles[0].article_text
    assert "سطر اول" in articles[0].article_text
    assert "سطر ثان" in articles[0].article_text


def test_inline_title_before_colon_kept_separate_from_next_article():
    # Regression for the corpus-wide bug: many broad-corpus statutes put a
    # short inline title on the *same* line as the marker, after the dash,
    # before a terminating colon (e.g. "مادة 131 – <title>:"), instead of on
    # its own line like the 3 guaranteed statutes do. Extracted
    # programmatically from the real Civil Aviation Law (28/1981) raw file
    # -- never hand-typed -- so the exact byte content is trustworthy.
    text = _read_raw("eg-statute-7e98eee0a420")
    markers = list(ARTICLE_MARKER.finditer(text))
    nums = [normalize_digits(m.group("num")) for m in markers]
    i = nums.index("131")

    marker_131 = markers[i]
    fixture = text[marker_131.start():markers[i + 2].start()]

    # Sanity check on the real fixture: article 131's marker line does carry
    # an inline title (non-empty text between the marker and the newline),
    # which is exactly the shape that broke the old end-of-line-anchored regex.
    title_line_end = text.index("\n", marker_131.end())
    inline_title = text[marker_131.end():title_line_end].strip()
    assert inline_title

    articles = parse_articles(fixture)
    assert len(articles) == 2
    assert articles[0].article_number == "131"
    assert articles[1].article_number == "132"

    # The inline title text is not swallowed into the marker match -- it
    # remains part of article 131's body text.
    assert inline_title in articles[0].article_text
    # Article 132's marker line must not leak into article 131's text, and
    # article 131's body must not run past its own boundary into 132's.
    assert f"مادة {articles[1].article_number}" not in articles[0].article_text


def test_real_civil_aviation_130_to_134_all_recovered_distinctly():
    # Regression for the confirmed corpus bug: Civil Aviation Law 28/1981
    # was losing article 131 (merged into 130's text) because its marker
    # line has an inline title before the colon. Extracted programmatically
    # from the real raw file around articles 130-134 -- never hand-typed.
    text = _read_raw("eg-statute-7e98eee0a420")
    markers = list(ARTICLE_MARKER.finditer(text))
    nums = [normalize_digits(m.group("num")) for m in markers]
    i = nums.index("130")

    start = markers[i].start()
    end = markers[i + 5].start()  # up to (not including) article 135's marker
    fixture = text[start:end]

    articles = parse_articles(fixture)
    assert [a.article_number for a in articles] == ["130", "131", "132", "133", "134"]

    # No article's body absorbed the next marker's text (i.e. no merging).
    for j in range(len(articles) - 1):
        next_marker_text = f"مادة {articles[j + 1].article_number}"
        assert next_marker_text not in articles[j].article_text
        assert articles[j].article_text.strip()


def test_mid_paragraph_cross_reference_is_not_a_new_article_boundary():
    # Regression guard: widening ARTICLE_MARKER to not require end-of-line
    # must not start matching "مادة N" occurrences embedded mid-sentence
    # (e.g. "... طبقا للمادة 440." referencing another article from deep
    # inside a body paragraph). These are still protected by the ^ anchor
    # with re.MULTILINE, since they are never the first thing on their line.
    # Extracted programmatically from the real Civil Code raw file --
    # never hand-typed. Article 443's body cites article 440 mid-paragraph;
    # this fixture spans articles 443 and 444 only.
    text = _read_raw("eg-civil-code-131-1948")
    markers = list(ARTICLE_MARKER.finditer(text))
    nums = [normalize_digits(m.group("num")) for m in markers]
    i = nums.index("443")

    cross_ref_target = "طبقا للمادة"
    body_search_start = markers[i].end()
    body_search_end = markers[i + 1].start()
    assert cross_ref_target in text[body_search_start:body_search_end]

    fixture = text[markers[i].start():markers[i + 2].start()]
    articles = parse_articles(fixture)

    assert [a.article_number for a in articles] == ["443", "444"]
    assert cross_ref_target in articles[0].article_text


def test_mukarrar_suffix_letter_does_not_cross_line_boundary():
    # Regression: dropping the end-of-line anchor let the mukarrar
    # sub-pattern's optional trailing-letter group (meant for suffixes like
    # "مكرر أ") greedily match across a newline when "مكرر" itself ends a
    # marker line, swallowing the first letter of the *following* line's
    # body text into article_number (observed as the literal value
    # "22 مكرر\nي" for Law 359/1956's real "المادة 22 مكرر" marker, whose
    # body happens to start with a word beginning with "ي"). Extracted
    # programmatically from the real raw file -- never hand-typed.
    text = _read_raw("eg-statute-7fa34c77a1a9")
    markers = list(ARTICLE_MARKER.finditer(text))
    nums = [normalize_digits(m.group("num")) for m in markers]
    i = nums.index("22")
    mukarrar_idx = next(j for j in range(i, i + 3) if markers[j].group("mukarrar"))

    fixture = text[markers[i].start():markers[mukarrar_idx + 2].start()]
    articles = parse_articles(fixture)

    numbers = [a.article_number for a in articles]
    assert "\n" not in "".join(numbers)
    assert any(n.startswith("22") and "مكرر" in n for n in numbers)
    assert "23" in numbers
