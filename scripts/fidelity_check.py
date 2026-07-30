"""Character-by-character fidelity check: dataflare's Civil Code row vs.
the already-scraped lawyeregypt.net text (data/raw/eg-civil-code-131-1948.txt).

tashreaat.com (the roadmap's originally intended ground-truth source) is
confirmed unreachable, so lawyeregypt.net text — already spot-checked
clean in Phase 0 — is used instead.

Run: uv run python scripts/fidelity_check.py
"""
from __future__ import annotations

from pathlib import Path

from datasets import load_dataset

from legalrag.parse.articles import parse_articles

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
SAMPLE_SIZE = 20


def find_civil_code_row(rows: list[dict]) -> dict:
    matches = [r for r in rows if r["law_name"] == "القانون المدني"]
    if not matches:
        raise RuntimeError("no dataflare row with law_name == 'القانون المدني'")
    return max(matches, key=lambda r: r["tokens"])


def main() -> None:
    print("Loading dataflare/egypt-legal-corpus...")
    dataset = load_dataset("dataflare/egypt-legal-corpus", split="train")
    rows = list(dataset)
    dataflare_row = find_civil_code_row(rows)
    dataflare_articles = {a.article_number: a.article_text for a in parse_articles(dataflare_row["text"])}
    print(f"dataflare Civil Code row: {len(dataflare_articles)} articles parsed")

    ground_truth_text = (RAW_DIR / "eg-civil-code-131-1948.txt").read_text(encoding="utf-8")
    ground_truth_articles = {a.article_number: a.article_text for a in parse_articles(ground_truth_text)}
    print(f"lawyeregypt.net Civil Code: {len(ground_truth_articles)} articles parsed")

    common_numbers = sorted(
        (set(dataflare_articles) & set(ground_truth_articles)),
        key=lambda n: int(n.split()[0]),
    )[:SAMPLE_SIZE]

    if not common_numbers:
        print("No overlapping article numbers found between the two sources — investigate before proceeding.")
        return

    exact_matches = 0
    for number in common_numbers:
        df_text = dataflare_articles[number].strip()
        gt_text = ground_truth_articles[number].strip()
        is_match = df_text == gt_text
        exact_matches += is_match
        status = "MATCH" if is_match else "DIFFERS"
        print(f"  Art. {number}: {status}")
        if not is_match:
            print(f"    dataflare:     {df_text[:120]!r}")
            print(f"    lawyeregypt:   {gt_text[:120]!r}")

    print(f"\nFidelity: {exact_matches}/{len(common_numbers)} articles exact-matched.")


if __name__ == "__main__":
    main()
