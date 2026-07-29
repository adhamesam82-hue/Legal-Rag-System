from decimal import Decimal

from legalrag.parse.articles import parse_articles


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
