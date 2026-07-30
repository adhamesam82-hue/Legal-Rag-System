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


def test_mukarrar_slash_digit_subindex_recovered_distinctly():
    # Real format from eg-companies-law-159-1981.txt: article 129's مكرر
    # amendment is itself split into 9 sub-clauses (single-person company
    # formation, self-dealing, conversion, etc. -- each a distinct legal
    # provision) via a "/ 1" through "/ 9" suffix. The old regex collapsed
    # all of these to the same article_number, dropping 8 of the 9 during
    # ingestion. Fixture and every expected Arabic substring below are
    # extracted programmatically from the real match objects -- never
    # hand-typed -- so a silently reordered codepoint can't slip in.
    text = _read_raw("eg-companies-law-159-1981")
    markers = list(ARTICLE_MARKER.finditer(text))
    nums = [normalize_digits(m.group("num")) for m in markers]
    i = nums.index("129")

    fixture = text[markers[i].start():markers[i + 12].start()]
    articles = parse_articles(fixture)

    assert len(articles) == 12
    base_article, major_article, *sub_articles, next_base = articles
    assert len(sub_articles) == 9

    mukarrar_text = markers[i + 1].group("mukarrar").strip()
    assert base_article.article_number == "129"
    assert major_article.article_number == f"129 {mukarrar_text}"
    assert next_base.article_number == "130"

    # Each sub-clause's article_number is the major مكرر article's own
    # number (already asserted above) plus "/ N" for N = 1..9 in document
    # order -- proving each one kept a distinct identity instead of
    # collapsing into "129 <mukarrar_text>" like before the fix.
    prefix = major_article.article_number
    for n, article in enumerate(sub_articles, start=1):
        assert article.article_number == f"{prefix} / {n}"

    numbers = [a.article_number for a in articles]
    assert len(numbers) == len(set(numbers))

    sort_keys = [a.article_sort_key for a in articles]
    assert sort_keys == sorted(sort_keys)
    assert len(sort_keys) == len(set(sort_keys))
    for article in sub_articles:
        assert article.article_sort_key < next_base.article_sort_key


def test_mukarrar_slash_letter_subindex_recovered_distinctly():
    # Real format from eg-companies-law-159-1981.txt: article 135's مكرر
    # amendment splits into 4 lettered sub-clauses (Arabic-letter suffixes
    # instead of digits). Fixture and expected letters extracted
    # programmatically from the real match objects -- never hand-typed.
    text = _read_raw("eg-companies-law-159-1981")
    markers = list(ARTICLE_MARKER.finditer(text))
    nums = [normalize_digits(m.group("num")) for m in markers]
    i = nums.index("135")
    end = markers[i + 7].start() if i + 7 < len(markers) else len(text)

    fixture = text[markers[i].start():end]
    articles = parse_articles(fixture)

    assert len(articles) == 7
    base_article, major_article, *lettered, next_base = articles
    assert len(lettered) == 4

    mukarrar_text = markers[i + 1].group("mukarrar").strip()
    assert base_article.article_number == "135"
    assert major_article.article_number == f"135 {mukarrar_text}"
    assert next_base.article_number == "136"

    prefix = major_article.article_number
    letters = [markers[i + 2 + k].group("subidx") for k in range(4)]
    assert all(letter is not None for letter in letters)
    # The four letters are pairwise distinct in the source text -- proves
    # each sub-clause kept its own identity instead of collapsing.
    assert len(letters) == len(set(letters))
    for k, article in enumerate(lettered):
        assert article.article_number == f"{prefix} / {letters[k]}"

    numbers = [a.article_number for a in articles]
    assert len(numbers) == len(set(numbers))

    sort_keys = [a.article_sort_key for a in articles]
    assert sort_keys == sorted(sort_keys)
    assert len(sort_keys) == len(set(sort_keys))
    for article in lettered:
        assert article.article_sort_key < next_base.article_sort_key


def test_mukarrar_parenthesized_index_with_letter_recovered_distinctly():
    # Real format from eg-statute-1dbcc6bcbf7d.txt (Emergency Law
    # 162/1958): article 3's مكرر amendments use a numbered-index scheme
    # instead of a slash -- a bare "(1)"-style index for the first
    # sub-clause, and a letter immediately after مكرر (no space before the
    # parenthesis) followed by a "(2)"-style index for the second. Both
    # were colliding on the same article_number before this fix. Fixture
    # and every expected Arabic substring extracted programmatically from
    # the real match objects -- never hand-typed.
    text = _read_raw("eg-statute-1dbcc6bcbf7d")
    markers = list(ARTICLE_MARKER.finditer(text))
    nums = [normalize_digits(m.group("num")) for m in markers]
    i = nums.index("3")  # first occurrence: the base article 3

    fixture = text[markers[i].start():markers[i + 4].start()]
    articles = parse_articles(fixture)

    assert len(articles) == 4
    base, first_sub, second_sub, next_base = articles
    assert base.article_number == "3"
    assert next_base.article_number == "4"

    # First sub-clause: مكرر plus a bare numbered index only.
    m1 = markers[i + 1]
    assert m1.group("subletter") is None
    assert m1.group("subnum") is not None
    mukarrar_1 = m1.group("mukarrar").strip()
    subnum_1 = normalize_digits(m1.group("subnum"))
    assert first_sub.article_number == f"3 {mukarrar_1} ({subnum_1})"

    # Second sub-clause: مكرر plus a letter immediately after it, plus a
    # numbered index.
    m2 = markers[i + 2]
    assert m2.group("subletter") is not None
    assert m2.group("subnum") is not None
    mukarrar_2 = m2.group("mukarrar").strip()
    subletter_2 = m2.group("subletter")
    subnum_2 = normalize_digits(m2.group("subnum"))
    assert second_sub.article_number == f"3 {mukarrar_2} ({subletter_2}) ({subnum_2})"

    # Both sub-clauses recovered as distinct rows with distinct sort keys.
    assert first_sub.article_number != second_sub.article_number
    assert first_sub.article_sort_key != second_sub.article_sort_key
    assert base.article_sort_key < first_sub.article_sort_key < second_sub.article_sort_key
    assert second_sub.article_sort_key < next_base.article_sort_key


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
