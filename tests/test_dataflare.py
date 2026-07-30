from legalrag.sources.dataflare import classify_rows, extract_law_number_year


def test_extract_law_number_year_finds_real_pattern():
    # Real snippet from dataflare's Civil Code row
    text = "ا دودو 1 القانون رقم 131 لسنة 1948 باصدار - القانون المدني"
    assert extract_law_number_year(text) == ("131", 1948)


def test_extract_law_number_year_handles_arabic_indic_digits():
    text = "قانون رقم ١٥٩ لسنة ١٩٨١ بإصدار قانون الشركات"
    assert extract_law_number_year(text) == ("159", 1981)


def test_extract_law_number_year_returns_none_when_no_match():
    assert extract_law_number_year("دعوى مدنية تعويض عن ضرر") is None


def test_classify_rows_filters_by_token_threshold_and_pattern():
    rows = [
        {"law_name": "القانون المدني", "categories": ["الاكواد"], "text": "القانون رقم 131 لسنة 1948", "tokens": 192818},
        {"law_name": "دعوى مدنية تعويض", "categories": ["الاكواد"], "text": "نص قصير عن التعويض", "tokens": 850},
        {"law_name": "قانون بلا رقم واضح", "categories": ["الاكواد"], "text": "نص طويل بلا رقم قانون واضح فيه", "tokens": 15000},
    ]
    candidates = classify_rows(rows, token_threshold=10000)
    assert len(candidates) == 2
    assert candidates[0]["law_name"] == "القانون المدني"
    assert candidates[0]["law_number"] == "131"
    assert candidates[0]["law_year"] == 1948
    assert candidates[1]["law_name"] == "قانون بلا رقم واضح"
    assert candidates[1]["law_number"] is None  # over threshold but no number/year match


def test_classify_rows_excludes_short_rows_even_with_law_pattern():
    rows = [
        {"law_name": "ذكر عابر", "categories": [], "text": "اشارة الى قانون رقم 1 لسنة 2000 فى سياق اخر", "tokens": 200},
    ]
    assert classify_rows(rows, token_threshold=10000) == []


def test_extract_law_number_year_quoted_number_matches_own_law_not_amendment():
    # Real snippet from dataflare row 0 (law_name='قوانين_الأحوال_الشخصية'): its own
    # number is wrapped in quotes (" 25") and a later *amending* law
    # (100 / 1985) also appears in the same text. The row's own law must win.
    text = 'المال حسب احداث التعديلات القانون رقم " 25" لسنة 1920 باحكام النفقة وبعض مسائل الاحوال الشخصية المعدل بالقانون رقم 100 لسنة 1985 الباب الاول في النفقة القس'
    assert extract_law_number_year(text) == ("25", 1920)


def test_extract_law_number_year_handles_parenthesized_number():
    # Real snippet from dataflare's Press/Printing/Publishing law row: the
    # number is wrapped in parentheses, "(47)", which previously broke the match.
    text = 'مرسوم بقانون رقم (47) لسنة 2002 بشان تنظيم الصحافة والطباع'
    assert extract_law_number_year(text) == ("47", 2002)


def test_find_all_law_number_years_exposes_both_references_in_order():
    from legalrag.sources.dataflare import find_all_law_number_years

    # Same real snippet as above: contains the row's own quoted law (25/1920)
    # followed later by the amending law (100/1985). Both must be surfaced,
    # in order of first appearance, rather than silently picking one.
    text = 'المال حسب احداث التعديلات القانون رقم " 25" لسنة 1920 باحكام النفقة وبعض مسائل الاحوال الشخصية المعدل بالقانون رقم 100 لسنة 1985 الباب الاول في النفقة القس'
    assert find_all_law_number_years(text) == [("25", 1920), ("100", 1985)]


def test_classify_rows_populates_law_number_candidates_for_ambiguous_row():
    rows = [
        {"law_name": 'قوانين_الأحوال_الشخصية', "categories": [], "text": 'المال حسب احداث التعديلات القانون رقم " 25" لسنة 1920 باحكام النفقة وبعض مسائل الاحوال الشخصية المعدل بالقانون رقم 100 لسنة 1985 الباب الاول في النفقة القس', "tokens": 15000},
    ]
    candidates = classify_rows(rows, token_threshold=10000)
    assert len(candidates) == 1
    assert candidates[0]["law_number"] == "25"
    assert candidates[0]["law_year"] == 1920
    assert candidates[0]["law_number_candidates"] == [("25", 1920), ("100", 1985)]


def test_classify_rows_excludes_row_at_exact_threshold():
    rows = [
        {"law_name": 'قانون بلا رقم واضح', "categories": [], "text": 'نص طويل بلا رقم قانون واضح فيه', "tokens": 10000},
    ]
    assert classify_rows(rows, token_threshold=10000) == []


def test_classify_rows_includes_row_just_above_threshold():
    rows = [
        {"law_name": 'قانون بلا رقم واضح', "categories": [], "text": 'نص طويل بلا رقم قانون واضح فيه', "tokens": 10001},
    ]
    candidates = classify_rows(rows, token_threshold=10000)
    assert len(candidates) == 1
    assert candidates[0]["law_name"] == 'قانون بلا رقم واضح'
