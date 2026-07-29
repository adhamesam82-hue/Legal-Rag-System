"""One-off Phase 0 acquisition script.

Checks fr3on/eg-legal-rag for our 3 statutes first (expected to report
"not found" — see the investigation notes in the plan), then fetches each
from lawyeregypt.net and writes data/raw/{slug}.txt + {slug}.meta.json.

Run: uv run python scratch/fetch_statutes.py
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import httpx
from datasets import load_dataset

from scratch.statute_sources import (
    STATUTES,
    extract_law_text,
    fr3on_titles_matching,
    write_statute_files,
)

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def check_fr3on() -> None:
    print("Checking fr3on/eg-legal-rag for our 3 statutes...")
    dataset = load_dataset("fr3on/eg-legal-rag", split="train")
    rows = list(dataset)
    for statute in STATUTES:
        matches = fr3on_titles_matching(rows, statute["fr3on_keywords"])
        if matches:
            print(f"  FOUND in fr3on for {statute['slug']}: {matches}")
        else:
            print(f"  not found in fr3on for {statute['slug']}, will fetch instead")


def fetch_statute(statute: dict) -> None:
    print(f"Fetching {statute['slug']} from {statute['source_url']}")
    response = httpx.get(
        statute["source_url"],
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
        timeout=30.0,
    )
    response.raise_for_status()
    text = extract_law_text(response.text)
    article_mentions = text.count("مادة")
    print(f"  extracted {len(text)} chars, {article_mentions} occurrences of 'مادة'")
    txt_path, meta_path = write_statute_files(
        RAW_DIR, statute, text, datetime.now(timezone.utc), source="lawyeregypt.net"
    )
    print(f"  wrote {txt_path}")
    print(f"  wrote {meta_path}")


def main() -> None:
    check_fr3on()
    for statute in STATUTES:
        fetch_statute(statute)


if __name__ == "__main__":
    main()
