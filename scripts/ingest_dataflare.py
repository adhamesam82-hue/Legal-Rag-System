"""Parses and ingests the reviewed dataflare candidates
(data/interim/dataflare_candidates.json -- the 63 rows with an unambiguous
law_number/year, per Task 10 Deviation 1) into Postgres. Skips any of the 3
guaranteed statutes already loaded by ingest_guaranteed.py, since the
guarantee-list source takes precedence for those per the design doc.

Deviations from the brief this script implements:

* (Deviation 2) The raw `text` for each candidate actually ingested is
  written untouched to data/raw/dataflare-{law_number}-{law_year}.txt with
  a .meta.json sidecar *before* parsing, per the project's raw-file
  immutability rule -- not bolted on after the fact.

* (Deviation 3) legalrag.ingest.insert_articles raises ValueError if a
  candidate's parsed articles contain duplicate article_number values (it
  refuses to silently overwrite via ON CONFLICT). Broad-corpus rows are
  messy enough that some trip this. That failure is caught per candidate,
  printed as a clear SKIP, and the run continues -- insert_articles rolls
  back its own transaction before re-raising, so the connection stays
  usable for the next candidate.

  upsert_instrument() commits internally and is necessarily called *before*
  insert_articles() (insert_articles needs the instrument_id as an FK), so
  a naive try/except around insert_articles alone would leave an orphan
  instruments row -- 0 articles, forever -- every time the duplicate guard
  trips. Observed on first run: 32 of the 35 non-guaranteed instruments
  created had zero articles. Fixed by replicating insert_articles' own
  duplicate-detection (same Counter-over-article_number check) *before*
  calling upsert_instrument at all, so doomed candidates never touch the
  DB. The try/except around insert_articles stays as a backstop for
  duplicates this pre-check doesn't anticipate, per Deviation 3's literal
  instruction -- but the common case is now caught pre-write.

* (Undocumented-in-brief, discovered while building fidelity_check.py):
  dataflare's `text` field contains *zero* newlines for every row in the
  entire dataset (verified, not just for the Civil Code row) -- the source
  scrape flattened each statute into one long line. legalrag.parse.articles
  .parse_articles() anchors its مادة-marker regex to the start of a line
  (^...$, MULTILINE), so calling it directly on candidate["text"] finds 0
  articles for literally every row, which would make this script ingest
  nothing and defeat the task's purpose. Before parsing (parsing only --
  the raw file on disk keeps the untouched original text), this script
  reconstructs line breaks around مادة markers using the *same* marker
  pattern parse_articles uses (derived programmatically from
  ARTICLE_MARKER.pattern, not re-typed, so it can't drift out of sync).
  This also explains the duplicate-article-number failures Deviation 3
  anticipates: a handful of the ~7% of مادة occurrences that are mid-body
  cross-references (e.g. "طبقا للمادة 5") rather than true article
  boundaries get mis-split, producing a spurious extra "article" whose
  number collides with a later real one.

Run: uv run python scripts/ingest_dataflare.py
"""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import ARTICLE_MARKER, parse_articles
from legalrag.sources.lawyeregypt import GUARANTEED_STATUTES

INTERIM_DIR = Path(__file__).resolve().parent.parent / "data" / "interim"
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
DATASET_SOURCE = "dataflare/egypt-legal-corpus"

_GUARANTEED_NUMBER_YEARS = {(s["number"], s["year"]) for s in GUARANTEED_STATUTES}

# Anchor-free version of parse_articles' مادة-marker regex, derived from the
# canonical pattern (not re-typed) so it tracks any future change to it.
_MARKER_CORE = re.compile(
    ARTICLE_MARKER.pattern.removeprefix("^").removesuffix(r"\s*$")
)


def find_duplicate_article_numbers(articles) -> dict[str, int]:
    """Preview of insert_articles' own duplicate check (Task 7's guard),
    run before upsert_instrument so a doomed candidate never creates an
    orphan instruments row. Detection only -- never renumbers or drops
    entries, per Deviation 3.
    """
    counts = Counter(a.article_number for a in articles)
    return {number: n for number, n in counts.items() if n > 1}


def reconstruct_marker_lines(text: str) -> str:
    """Insert newlines around each مادة-marker occurrence so parse_articles'
    line-anchored regex can find them in dataflare's newline-free text.

    Parsing-only transform -- never applied to the text written to disk.
    """
    pieces: list[str] = []
    last = 0
    for match in _MARKER_CORE.finditer(text):
        pieces.append(text[last:match.start()])
        pieces.append("\n")
        pieces.append(match.group(0))
        pieces.append("\n")
        last = match.end()
    pieces.append(text[last:])
    return "".join(pieces)


def main() -> None:
    candidates_path = INTERIM_DIR / "dataflare_candidates.json"
    candidates = json.loads(candidates_path.read_text(encoding="utf-8"))

    conn = get_connection()
    inserted = 0
    skipped = 0
    claimed_slugs: dict[str, str] = {}  # slug -> law_name of the candidate that claimed it

    for candidate in candidates:
        law_number = candidate["law_number"]
        law_year = candidate["law_year"]
        law_name = candidate["law_name"]

        if (law_number, law_year) in _GUARANTEED_NUMBER_YEARS:
            print(f"SKIP (already loaded via guarantee list): {law_name} ({law_number}/{law_year})")
            skipped += 1
            continue

        slug = f"dataflare-{law_number}-{law_year}"
        if slug in claimed_slugs:
            print(
                f"SKIP (duplicate law_number/year {law_number}/{law_year} across candidates -- "
                f"already ingested as {claimed_slugs[slug]!r}): {law_name}"
            )
            skipped += 1
            continue

        # --- Deviation 2: write the raw file + sidecar first, untouched. ---
        txt_path = RAW_DIR / f"{slug}.txt"
        meta_path = RAW_DIR / f"{slug}.meta.json"
        fetched_at = datetime.now(timezone.utc)
        txt_path.write_text(candidate["text"], encoding="utf-8")
        meta_path.write_text(
            json.dumps(
                {
                    "slug": slug,
                    "law_number": law_number,
                    "law_year": law_year,
                    "title_ar": law_name,
                    "source": DATASET_SOURCE,
                    "source_url": f"hf://{DATASET_SOURCE}",
                    "fetched_at": fetched_at.isoformat(),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        claimed_slugs[slug] = law_name

        parseable_text = reconstruct_marker_lines(candidate["text"])
        articles = parse_articles(parseable_text)
        if not articles:
            print(f"SKIP (no articles parsed): {law_name} ({law_number}/{law_year})")
            skipped += 1
            continue

        print(f"{law_name} ({law_number}/{law_year}): {len(articles)} articles parsed")

        duplicates = find_duplicate_article_numbers(articles)
        if duplicates:
            detail = ", ".join(f"{n!r} x{c}" for n, c in sorted(duplicates.items()))
            print(f"SKIP (duplicate article numbers, would not survive insert_articles): {law_name} ({law_number}/{law_year})")
            print(f"  duplicates: {detail}")
            skipped += 1
            continue

        instrument_id = upsert_instrument(
            conn,
            jurisdiction="EG",
            instrument_type="law",
            number=law_number,
            year=law_year,
            title=law_name,
            source_url=f"hf://{DATASET_SOURCE}",
            fetched_at=fetched_at,
        )
        try:
            count = insert_articles(
                conn,
                instrument_id=instrument_id,
                jurisdiction="EG",
                articles=articles,
                language="ar",
                source_url=f"hf://{DATASET_SOURCE}",
            )
        except ValueError as exc:
            print(f"SKIP (duplicate article numbers, insert_articles refused): {law_name} ({law_number}/{law_year})")
            print(f"  reason: {exc}")
            skipped += 1
            continue

        print(f"  inserted/updated {count} article rows (instrument_id={instrument_id})")
        inserted += 1

    conn.close()
    print(f"\nDone: {inserted} instruments ingested, {skipped} candidates skipped.")


if __name__ == "__main__":
    main()
