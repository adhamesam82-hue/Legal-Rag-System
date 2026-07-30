"""TawasulAI/egyptian-law-articles cross-check.

Verified during Phase 1 planning: 1,105 rows, article-level, bilingual
(text_ar/text_en per row), covering the Civil Code only. Used here as a
coverage/fidelity cross-check against the Civil Code rows already loaded
from lawyeregypt.net (Task 7), not as an ingestion source — Phase 1 stores
Arabic-only rows (language='ar'); TawasulAI's text_en is noted for future
Phase 3 bilingual work, not stored now.

Deviation from the original task brief: the Civil Code (131/1948) was split
into two instruments sharing (number, year) = ('131', 1948) -- a 2-article
promulgation_decree that precedes it and restarts numbering at 1, and the
1091-article substantive law itself. The brief's query would merge both and
pull the decree's articles "1" and "2" into the comparison set, so this
version adds "AND i.instrument_type = 'law'" to compare only the substantive
Civil Code.

Second deviation from the brief, discovered at run time: the hub's default
loader ("TawasulAI/egyptian-law-articles", split="train") fails with a
pyarrow JSON parse error, because the repo's single file
(egyptian_law_articles.json) is not JSON-lines -- it is one JSON object
shaped {"articles": [...]}, where each element is a flat record with keys
number/text_ar/text_en/page (no nested "articles.number" field as the brief
assumed). This script instead loads that file directly via the "json"
builder with field="articles", and reads row["number"] rather than
row["articles"]["number"].

Third observation: 2 of the 1105 TawasulAI rows have "number": null (text
fragments that spill across a page boundary in the source JSON, not real
articles). The sort used for the sample printouts below is None-safe to
tolerate this.

Run: uv run python -m legalrag.sources.tawasul
"""
from __future__ import annotations

from datasets import load_dataset

from legalrag.db import get_connection

TAWASUL_DATA_FILE = "hf://datasets/TawasulAI/egyptian-law-articles/egyptian_law_articles.json"


def main() -> None:
    print("Loading TawasulAI/egyptian-law-articles...")
    dataset = load_dataset("json", data_files=TAWASUL_DATA_FILE, field="articles", split="train")
    rows = list(dataset)
    tawasul_numbers = {row["number"] for row in rows}
    print(f"  {len(rows)} rows, {len(tawasul_numbers)} distinct article numbers")

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT article_number FROM articles a JOIN instruments i ON i.id = a.instrument_id "
            "WHERE i.number = '131' AND i.year = 1948 AND i.instrument_type = 'law'"
        )
        db_numbers = {row[0] for row in cur.fetchall()}
    conn.close()
    print(f"  {len(db_numbers)} article numbers already in DB for Civil Code 131/1948")

    only_in_tawasul = tawasul_numbers - db_numbers
    only_in_db = db_numbers - tawasul_numbers
    # TawasulAI has a couple of rows with a null "number" (page-boundary text
    # fragments in the source JSON), so sort with a None-safe key rather than
    # assuming every element is a comparable string.
    sort_key = lambda v: (v is None, v)
    print(f"  in TawasulAI but not in DB: {len(only_in_tawasul)} (sample: {sorted(only_in_tawasul, key=sort_key)[:10]})")
    print(f"  in DB but not in TawasulAI: {len(only_in_db)} (sample: {sorted(only_in_db, key=sort_key)[:10]})")


if __name__ == "__main__":
    main()
