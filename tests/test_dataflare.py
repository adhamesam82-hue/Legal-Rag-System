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
