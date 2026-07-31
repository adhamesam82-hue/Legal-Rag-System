"""Embeds every article that lacks a current vector.

Run: uv run python scripts/embed_corpus.py [--limit N] [--force]

Resumable by design: it selects only rows whose embedding is NULL or whose
embedding_model differs from the configured one, and commits per batch. A crash
or a rate limit costs the current batch, not the run.
"""
from __future__ import annotations

import argparse
import sys
import time

from legalrag.config import get_model_spec
from legalrag.db import get_connection
from legalrag.embed import BATCH_SIZE, EmbeddingError, embed_documents, to_pgvector

MAX_RETRIES = 4


def pending_count(conn, model: str, force: bool) -> int:
    with conn.cursor() as cur:
        if force:
            cur.execute("SELECT count(*) FROM articles")
        else:
            cur.execute(
                """
                SELECT count(*) FROM articles
                WHERE embedding IS NULL OR embedding_model IS DISTINCT FROM %s
                """,
                (model,),
            )
        return cur.fetchone()[0]


def fetch_batch(conn, model: str, force: bool, size: int) -> list[tuple[int, str]]:
    with conn.cursor() as cur:
        if force:
            cur.execute(
                "SELECT id, article_text FROM articles ORDER BY id LIMIT %s", (size,)
            )
        else:
            cur.execute(
                """
                SELECT id, article_text FROM articles
                WHERE embedding IS NULL OR embedding_model IS DISTINCT FROM %s
                ORDER BY id LIMIT %s
                """,
                (model, size),
            )
        return cur.fetchall()


def store(conn, model: str, ids: list[int], vectors: list[list[float]]) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            "UPDATE articles SET embedding = %s::halfvec, embedding_model = %s WHERE id = %s",
            [(to_pgvector(v), model, i) for i, v in zip(ids, vectors)],
        )
    conn.commit()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="stop after N articles")
    parser.add_argument("--force", action="store_true", help="re-embed everything")
    args = parser.parse_args()

    spec = get_model_spec("embed")
    model = str(spec)
    conn = get_connection()

    total = pending_count(conn, model, args.force)
    if args.limit:
        total = min(total, args.limit)
    if not total:
        print(f"Nothing to embed. All articles are current for {model}.")
        return 0

    print(f"Embedding {total:,} articles with {model} (batch {BATCH_SIZE})")
    done = 0
    started = time.time()

    while done < total:
        size = min(BATCH_SIZE, total - done)
        # --force would re-select the same rows forever, since they never stop
        # matching; offset past what this run has already written.
        rows = fetch_batch(conn, model, args.force and done == 0, size)
        if not rows:
            break
        ids = [r[0] for r in rows]
        texts = [r[1] for r in rows]

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                store(conn, model, ids, embed_documents(texts))
                break
            except EmbeddingError as exc:
                if attempt == MAX_RETRIES:
                    print(f"\nGiving up after {attempt} attempts: {exc}")
                    print(f"Committed {done:,} articles; re-run to resume.")
                    return 1
                backoff = 2**attempt
                print(f"\n  batch failed ({exc}); retrying in {backoff}s")
                time.sleep(backoff)

        done += len(rows)
        rate = done / max(time.time() - started, 1e-6)
        remaining = (total - done) / rate if rate else 0
        print(
            f"\r  {done:,}/{total:,} ({done / total:.0%}) "
            f"· {rate:.1f}/s · ~{remaining / 60:.1f} min left",
            end="",
            flush=True,
        )

    elapsed = time.time() - started
    print(f"\nDone: {done:,} articles in {elapsed / 60:.1f} min")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM articles WHERE embedding IS NOT NULL AND embedding_model = %s",
            (model,),
        )
        print(f"Articles with a current embedding: {cur.fetchone()[0]:,}")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
