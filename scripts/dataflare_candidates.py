"""Classifies dataflare's candidate rows and partitions them by whether the
law_number/law_year extraction is unambiguous, per Task 10 Deviation 1.

The brief's original Step 4 assumed a short candidate list a human could
hand-edit. Verified against live data, classify_rows(token_threshold=10000)
yields 545 candidates: some with exactly one distinct (number, year) pair
found in the row text, most with more than one (the row mentions the
statute plus the laws that amended it -- picking the first match is a real
bug, fixed in Task 9's classify_rows: it now returns *all* distinct pairs
as law_number_candidates instead of silently picking one), and a handful
with none at all.

Decision: only rows with exactly one distinct (number, year) pair are safe
to ingest without a human resolving the ambiguity. Those go to
data/interim/dataflare_candidates.json (the ingest list). Everything else
(0 or 2+ candidates) goes to data/interim/dataflare_deferred.json with a
reason recorded, so the work is visible and resumable later rather than
silently dropped.

Run: uv run python scripts/dataflare_candidates.py
"""
from __future__ import annotations

import json
from pathlib import Path

from datasets import load_dataset

from legalrag.sources.dataflare import classify_rows

INTERIM_DIR = Path(__file__).resolve().parent.parent / "data" / "interim"


def partition_candidates(candidates: list[dict]) -> tuple[list[dict], list[dict]]:
    """Split candidates into (ingest_list, deferred_list).

    ingest_list: exactly one distinct (number, year) pair found in the text.
    deferred_list: zero pairs, or two-or-more (ambiguous) pairs -- each entry
    gets a "reason" key explaining why it was deferred.
    """
    ingest_list: list[dict] = []
    deferred_list: list[dict] = []
    for candidate in candidates:
        n_pairs = len(candidate["law_number_candidates"])
        if n_pairs == 1:
            ingest_list.append(candidate)
        else:
            reason = (
                "no_law_number_match"
                if n_pairs == 0
                else f"ambiguous_law_number ({n_pairs} distinct (number, year) pairs found)"
            )
            deferred_list.append({**candidate, "reason": reason})
    return ingest_list, deferred_list


def main() -> None:
    print("Loading dataflare/egypt-legal-corpus...")
    dataset = load_dataset("dataflare/egypt-legal-corpus", split="train")
    rows = list(dataset)

    candidates = classify_rows(rows, token_threshold=10000)
    ingest_list, deferred_list = partition_candidates(candidates)

    n_zero = sum(1 for c in deferred_list if len(c["law_number_candidates"]) == 0)
    n_ambiguous = sum(1 for c in deferred_list if len(c["law_number_candidates"]) > 1)

    print(f"\n{len(candidates)} candidate rows (>10000 tokens):")
    print(f"  {len(ingest_list)} unambiguous (exactly 1 distinct law_number/year pair) -> ingest list")
    print(f"  {len(deferred_list)} deferred -> {n_zero} with no match, {n_ambiguous} with 2+ candidate pairs")

    print("\nIngest list (law name, tokens, law number/year):")
    for c in ingest_list:
        print(f"  [{c['tokens']:>7}] {c['law_name']}  ({c['law_number']}/{c['law_year']})")

    INTERIM_DIR.mkdir(parents=True, exist_ok=True)

    ingest_path = INTERIM_DIR / "dataflare_candidates.json"
    ingest_path.write_text(
        json.dumps(ingest_list, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nWrote {len(ingest_list)} rows to {ingest_path} (the ingest list for ingest_dataflare.py).")

    deferred_path = INTERIM_DIR / "dataflare_deferred.json"
    deferred_path.write_text(
        json.dumps(deferred_list, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {len(deferred_list)} rows to {deferred_path} (deferred -- not ingested this run).")


if __name__ == "__main__":
    main()
