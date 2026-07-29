"""parse_report CLI: article counts, numbering gaps, duplicates, length outliers per instrument.

Run: uv run python -m legalrag.parse.report
"""
from __future__ import annotations

import json
import statistics
from collections import Counter
from pathlib import Path

from legalrag.parse.articles import parse_articles

RAW_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw"


def load_instruments(raw_dir: Path) -> list[dict]:
    instruments = []
    for meta_path in sorted(raw_dir.glob("*.meta.json")):
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        txt_path = raw_dir / f"{meta['slug']}.txt"
        if not txt_path.exists():
            continue
        instruments.append({"slug": meta["slug"], "text": txt_path.read_text(encoding="utf-8")})
    return instruments


def report_instrument(slug: str, text: str) -> None:
    articles = parse_articles(text)
    print(f"{slug}: {len(articles)} articles")
    if not articles:
        print("  WARNING: no articles found")
        return

    base_numbers = sorted({int(a.article_sort_key) for a in articles})
    base_number_set = set(base_numbers)
    missing = [n for n in range(base_numbers[0], base_numbers[-1]) if n not in base_number_set]
    gap_labels = []
    i = 0
    while i < len(missing):
        start = missing[i]
        end = start
        while i + 1 < len(missing) and missing[i + 1] == end + 1:
            i += 1
            end = missing[i]
        gap_labels.append(f"{start}-{end}" if end != start else str(start))
        i += 1
    print(f"  numbering gaps: [{', '.join(gap_labels)}]" if gap_labels else "  no numbering gaps")

    number_counts = Counter(a.article_number for a in articles)
    duplicates = {number: count for number, count in number_counts.items() if count > 1}
    if duplicates:
        print(f"  WARNING duplicate article numbers (ingest will silently overwrite these): {duplicates}")

    lengths = [len(a.article_text) for a in articles]
    mean = statistics.mean(lengths)
    stdev = statistics.pstdev(lengths) if len(lengths) > 1 else 0
    outliers = [
        (a.article_number, len(a.article_text))
        for a in articles
        if stdev and abs(len(a.article_text) - mean) > 2 * stdev
    ]
    if outliers:
        print(f"  length outliers (>2 stdev from mean {mean:.0f} chars): {outliers}")


def main() -> None:
    instruments = load_instruments(RAW_DIR)
    if not instruments:
        print(f"No instruments found in {RAW_DIR}")
        return
    for instrument in instruments:
        report_instrument(instrument["slug"], instrument["text"])


if __name__ == "__main__":
    main()
