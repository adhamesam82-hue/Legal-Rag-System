"""Parses and ingests the 3 guaranteed statutes from their already-acquired
data/raw/ files (fetched in Phase 0) into Postgres.

Deviation from the original brief: eg-civil-code-131-1948.txt begins with a
2-article promulgation decree (repeals the 1883/1875 codes, sets the
effective date), after which the substantive Civil Code restarts its own
numbering at Article 1. parse_articles() therefore returns article numbers
1, 2, 1, 2, 3, 4, ... -- "1" and "2" each appear twice. Since articles has
UNIQUE (instrument_id, article_number, language) with ON CONFLICT ... DO
UPDATE, ingesting all of them under one instrument would let the
substantive Articles 1 and 2 silently overwrite the decree's -- real,
undetected data loss.

So: split the parsed article list at the index of the *second* article
whose article_number is "1". Everything before that index is the
promulgation decree (its own instrument, instrument_type="promulgation_decree");
everything from it onward is the substantive law (instrument_type="law").
If there is no second "1", there is no decree and the statute is ingested
as a single "law" instrument exactly as before (this is the case for the
Labour Law and the Companies Law).

Run: uv run python scripts/ingest_guaranteed.py
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import ParsedArticle, parse_articles
from legalrag.sources.lawyeregypt import GUARANTEED_STATUTES

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def split_promulgation_decree(
    articles: list[ParsedArticle],
) -> tuple[list[ParsedArticle], list[ParsedArticle]]:
    """Split articles at the second occurrence of article_number == "1".

    Returns (decree_articles, law_articles). If there is no second "1",
    decree_articles is empty and law_articles is the full input list.
    """
    seen_first_one = False
    split_index: int | None = None
    for i, article in enumerate(articles):
        if article.article_number == "1":
            if seen_first_one:
                split_index = i
                break
            seen_first_one = True

    if split_index is None:
        return [], articles

    return articles[:split_index], articles[split_index:]


def ingest_instrument(
    conn,
    *,
    statute: dict,
    instrument_type: str,
    articles: list[ParsedArticle],
    fetched_at: datetime,
) -> None:
    instrument_id = upsert_instrument(
        conn,
        jurisdiction="EG",
        instrument_type=instrument_type,
        number=statute["number"],
        year=statute["year"],
        title=statute["title"],
        source_url=statute["source_url"],
        fetched_at=fetched_at,
    )

    count = insert_articles(
        conn,
        instrument_id=instrument_id,
        articles=articles,
        language="ar",
        source_url=statute["source_url"],
    )
    print(
        f"  [{instrument_type}] inserted/updated {count} article rows "
        f"(instrument_id={instrument_id})"
    )


def main() -> None:
    conn = get_connection()
    try:
        for statute in GUARANTEED_STATUTES:
            txt_path = RAW_DIR / f"{statute['slug']}.txt"
            meta_path = RAW_DIR / f"{statute['slug']}.meta.json"
            if not txt_path.exists():
                print(f"SKIP {statute['slug']}: {txt_path} not found")
                continue

            text = txt_path.read_text(encoding="utf-8")
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            fetched_at = datetime.fromisoformat(meta["fetched_at"])

            articles = parse_articles(text)
            print(f"{statute['slug']}: parsed {len(articles)} articles")

            decree_articles, law_articles = split_promulgation_decree(articles)

            if decree_articles:
                print(
                    f"  split detected: {len(decree_articles)} promulgation-decree "
                    f"article(s) + {len(law_articles)} substantive-law article(s)"
                )
                ingest_instrument(
                    conn,
                    statute=statute,
                    instrument_type="promulgation_decree",
                    articles=decree_articles,
                    fetched_at=fetched_at,
                )
                ingest_instrument(
                    conn,
                    statute=statute,
                    instrument_type="law",
                    articles=law_articles,
                    fetched_at=fetched_at,
                )
            else:
                print("  no numbering restart detected: ingesting as a single instrument")
                ingest_instrument(
                    conn,
                    statute=statute,
                    instrument_type=statute["instrument_type"],
                    articles=law_articles,
                    fetched_at=fetched_at,
                )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
