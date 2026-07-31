"""Runs the gold set across pipeline configurations and appends to history.md.

Run: uv run python evals/report.py [--no-write]

The configurations exist so each stage has to justify itself with a number.
Query expansion and reranking both cost an LLM call per question; if a run shows
them not earning that, the record is there to act on.
"""
from __future__ import annotations

import sys
from datetime import date

from harness import (
    HISTORY_PATH,
    format_summary,
    load_goldset,
    run_retrieval,
    summarize,
)

from legalrag.config import get_model_spec

CONFIGURATIONS = [
    (
        "lexical only",
        {"expand": False, "do_rerank": False, "use_vectors": False},
    ),
    (
        "lexical + vectors",
        {"expand": False, "do_rerank": False, "use_vectors": True},
    ),
    (
        "lexical + expansion + rerank (no vectors)",
        {"expand": True, "do_rerank": True, "use_vectors": False},
    ),
    (
        "full pipeline (vectors + expansion + rerank)",
        {"expand": True, "do_rerank": True, "use_vectors": True},
    ),
]


def main() -> None:
    write = "--no-write" not in sys.argv
    entries = load_goldset()

    models = " · ".join(
        f"{stage}=`{get_model_spec(stage)}`"
        for stage in ("embed", "expand", "rerank", "answer")
    )
    sections = [
        f"## {date.today().isoformat()}",
        "",
        models,
        "",
        f"Gold set: {len(entries)} entries "
        f"({sum(not e.is_unanswerable for e in entries)} answerable, "
        f"{sum(e.is_unanswerable for e in entries)} unanswerable).",
        "",
    ]

    for label, options in CONFIGURATIONS:
        outcomes = run_retrieval(entries, **options)
        summary = summarize(outcomes)
        print(f"\n=== {label} ===")
        print(format_summary(summary))

        misses = [o for o in outcomes if not o.hit]
        sections += [f"### {label}", "", format_summary(summary), ""]
        if misses:
            sections.append("Misses:")
            sections += [
                f"- `{o.entry.id}` ({o.entry.category}) expected "
                f"{o.entry.expected_articles or 'nothing'}, got "
                f"{o.retrieved[:3] or 'nothing'}"
                for o in misses
            ]
            sections.append("")

    if write:
        header = "" if HISTORY_PATH.exists() else "# Eval history\n\n"
        with HISTORY_PATH.open("a", encoding="utf-8") as fh:
            fh.write(header + "\n".join(sections) + "\n\n")
        print(f"\nAppended to {HISTORY_PATH}")


if __name__ == "__main__":
    main()
