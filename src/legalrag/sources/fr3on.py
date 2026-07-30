"""fr3on/eg-legal-rag coverage survey.

Verified during Phase 1 planning: this dataset (and its sibling releases —
eg-legal-multi-task, eg-legal-comparative-law, eg-legal-ner,
eg-legal-classification, eg-legal-reasoning, eg-legal-qa) are all scoped to
Penal Code + Criminal Procedure Law only. This script re-confirms that's
still true (upstream datasets can change) and prints a coverage summary —
it does not ingest anything itself.

Run: uv run python -m legalrag.sources.fr3on
"""
from __future__ import annotations

from collections import Counter

from datasets import load_dataset


def summarize_titles(rows: list[dict]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for row in rows:
        title = row.get("title", "")
        statute_name = title.split(" - ", 1)[1] if " - " in title else title
        counts[statute_name] += 1
    return counts


def main() -> None:
    print("Loading fr3on/eg-legal-rag...")
    dataset = load_dataset("fr3on/eg-legal-rag", split="train")
    rows = list(dataset)
    print(f"  {len(rows)} rows")

    counts = summarize_titles(rows)
    print("  statute coverage (by row count):")
    for name, count in counts.most_common():
        print(f"    {count:5d}  {name}")


if __name__ == "__main__":
    main()
