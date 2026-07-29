from legalrag.arabic import NORM_VERSION, normalize, normalize_digits


def test_normalize_strips_diacritics():
    # Real snippet from eg-civil-code-131-1948.txt, article 1 sub-clause (1)
    text = "تسري النصوص التشريعية على جميع المسائل التي تتناولها"
    diacritized = "تَسرِي النُّصوصُ التَّشريعيّةُ على جميع المسائل التي تتناولها"
    assert normalize(diacritized) == normalize(text)


def test_normalize_unifies_alef_variants():
    assert normalize("أحكام إحكام آحكام ٱحكام") == normalize("احكام احكام احكام احكام")


def test_normalize_ta_marbuta_and_alef_maqsura():
    assert normalize("المحكمة الكبرى") == "المحكمه الكبري"


def test_normalize_digits_arabic_indic_to_ascii():
    # Real snippet from eg-companies-law-159-1981.txt title line
    text = "قانون رقم ۱٥۹ لسنة ۱۹۸۱"
    assert normalize_digits(text) == "قانون رقم 159 لسنة 1981"


def test_normalize_collapses_whitespace():
    assert normalize("مادة   1    –  نص") == normalize("مادة 1 – نص")


def test_normalize_real_mukarrar_article_snippet():
    # Real snippet from eg-companies-law-159-1981.txt, Article (1 مكررًا)
    text = (
        "مع عدم الإخلال بأحكام قانون سوق رأس المال الصادر بالقانون رقم 95 "
        "لسنة 1992، وقانون المناطق الاقتصادية ذات الطبيعة الخاصة الصادر "
        "بالقانون رقم 83 لسنة 2002"
    )
    result = normalize(text)
    assert "قانون سوق راس المال" in result  # أ->ا applied
    assert result == result.strip()


def test_norm_version_is_a_short_string():
    assert isinstance(NORM_VERSION, str)
    assert len(NORM_VERSION) > 0
