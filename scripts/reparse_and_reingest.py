"""Re-parses every already-acquired data/raw/*.txt file with the fixed
ARTICLE_MARKER regex (see src/legalrag/parse/articles.py) and re-ingests
the corpus into Postgres, without re-fetching anything.

Why this script exists: the original ARTICLE_MARKER regex required a
marker's trailing punctuation to reach end-of-line, so any statute whose
marker line carried an inline title before the terminating colon (e.g.
"مادة 131 – اشتراك الطائرات فى احداث الضرر:") failed to match at all --
silently merging that article's text into the previous article and
dropping its own row. That's now fixed (parse_articles() recovers those
articles correctly), but the DB still holds the old, merged parse until
this script re-runs ingestion for every raw file.

Two things this script has to generalize beyond scripts/ingest_guaranteed.py
(which only special-cases the Civil Code):

1. Promulgation-decree numbering restart. The Civil Code's raw text opens
   with a short promulgation decree (its own articles 1, 2, ...) before the
   substantive law restarts its own numbering at article 1. The fixed regex
   reveals that at least one other broad-corpus statute (Senate Law
   141/2020) has the exact same shape. So this script applies
   split_promulgation_decree() -- imported unchanged from
   scripts/ingest_guaranteed.py, it is already generic, not Civil-Code-
   specific -- to *every* statute, not just the 3 guaranteed ones.

2. Residual duplicate article numbers. A handful of statutes (confirmed:
   companies law 159/1981, civil aviation 28/1981, and several others --
   see the printed report) carry appended amendment/explanatory-note text
   whose own "مادة N ..." markers now also match post-fix, but collide with
   an article number already used earlier in the same document (e.g. a
   later "مادة (129 مكررا / 1):" sub-clause colliding with the earlier
   base "مادة (129 مكررا):" marker, since the regex intentionally does not
   parse "/ 1" sub-numbering into article_number -- that's a separate,
   unrelated gap from the inline-title bug this task fixes). insert_articles()
   already refuses to ingest a batch with duplicate article_number values
   (its own duplicate guard, from a prior fix) rather than silently
   overwriting via ON CONFLICT. Rather than let that abort the whole
   statute's re-ingestion, this script keeps the first (canonical,
   earliest-in-document) occurrence of each duplicated number and drops
   later duplicates, printing every dropped entry so nothing disappears
   silently. This is a known, reported limitation, not a hidden one --
   see the SUMMARY output.

Does not delete any instrument first: upsert_instrument()/insert_articles()
key off (jurisdiction, instrument_type, number, year) and
(instrument_id, article_number, language) respectively, so re-running this
against an already-ingested corpus updates rows in place.

Run: uv run python -m scripts.reparse_and_reingest
(module form required -- it imports sibling modules via `scripts.*`, which
only resolves when the project root, not scripts/, is on sys.path)
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import ParsedArticle, parse_articles
from scripts.crawl_lawyeregypt import REGULATION_TYPE_OVERRIDES
from scripts.ingest_guaranteed import split_promulgation_decree

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def dedupe_keep_first(
    articles: list[ParsedArticle],
) -> tuple[list[ParsedArticle], list[ParsedArticle]]:
    """Keep the first occurrence of each article_number (document order);
    return (kept, dropped). Dropped entries are reported by the caller,
    never silently discarded from the output.
    """
    seen: set[str] = set()
    kept: list[ParsedArticle] = []
    dropped: list[ParsedArticle] = []
    for article in articles:
        if article.article_number in seen:
            dropped.append(article)
            continue
        seen.add(article.article_number)
        kept.append(article)
    return kept, dropped


def ingest_group(
    conn,
    *,
    slug: str,
    jurisdiction: str,
    instrument_type: str,
    number: str,
    year: int,
    title: str,
    source_url: str,
    fetched_at: datetime,
    articles: list[ParsedArticle],
) -> int | None:
    if not articles:
        return None
    try:
        instrument_id = upsert_instrument(
            conn,
            jurisdiction=jurisdiction,
            instrument_type=instrument_type,
            number=number,
            year=year,
            title=title,
            source_url=source_url,
            fetched_at=fetched_at,
        )
        count = insert_articles(
            conn,
            instrument_id=instrument_id,
            jurisdiction=jurisdiction,
            articles=articles,
            language="ar",
            source_url=source_url,
        )
    except ValueError as exc:
        print(f"  FAILED [{slug}] instrument_type={instrument_type}: {exc}")
        return None
    print(
        f"  [{slug}] instrument_type={instrument_type} number={number} year={year}: "
        f"upserted {count} article rows (instrument_id={instrument_id})"
    )
    return count


def main() -> None:
    meta_paths = sorted(RAW_DIR.glob("*.meta.json"))
    print(f"Found {len(meta_paths)} raw statutes under {RAW_DIR}")

    conn = get_connection()
    total_articles = 0
    total_instruments = 0
    total_dropped: list[tuple[str, str, str]] = []
    failures: list[str] = []

    try:
        for meta_path in meta_paths:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            slug = meta["slug"]
            txt_path = RAW_DIR / f"{slug}.txt"
            if not txt_path.exists():
                print(f"SKIP {slug}: {txt_path} not found")
                continue

            text = txt_path.read_text(encoding="utf-8")
            number = str(meta["law_number"])
            year = int(meta["law_year"])
            title = meta["title_ar"]
            source_url = meta["source_url"]
            fetched_at = datetime.fromisoformat(meta["fetched_at"])

            articles = parse_articles(text)
            decree_articles, law_articles = split_promulgation_decree(articles)

            print(f"{slug} ({number}/{year}): parsed {len(articles)} articles")
            if decree_articles:
                print(
                    f"  numbering restart detected: {len(decree_articles)} "
                    f"promulgation-decree article(s) + {len(law_articles)} "
                    f"substantive-law article(s)"
                )

            for group_type_default, group in (
                ("promulgation_decree", decree_articles),
                (REGULATION_TYPE_OVERRIDES.get((number, str(year)), "law"), law_articles),
            ):
                if not group:
                    continue
                kept, dropped = dedupe_keep_first(group)
                for d in dropped:
                    total_dropped.append((slug, d.article_number, d.article_text[:80]))
                    print(
                        f"  DROPPED duplicate article_number={d.article_number!r} "
                        f"(kept earlier occurrence): {d.article_text[:60]!r}..."
                    )
                count = ingest_group(
                    conn,
                    slug=slug,
                    jurisdiction="EG",
                    instrument_type=group_type_default,
                    number=number,
                    year=year,
                    title=title,
                    source_url=source_url,
                    fetched_at=fetched_at,
                    articles=kept,
                )
                if count is None:
                    if kept:
                        failures.append(slug)
                else:
                    total_articles += count
                    total_instruments += 1
    finally:
        conn.close()

    print("\n=== SUMMARY ===")
    print(f"Instruments upserted: {total_instruments}")
    print(f"Article rows upserted: {total_articles}")
    print(f"Duplicate article_number entries dropped (kept earliest occurrence): {len(total_dropped)}")
    if total_dropped:
        print("  (see DROPPED lines above for detail per statute)")
    if failures:
        print(f"FAILED instruments (still refused after dedup -- needs manual review): {failures}")


if __name__ == "__main__":
    main()
