"""Embeddings via a hosted API, behind a narrow interface.

Two call sites with genuinely different semantics: documents and queries are
embedded with different `input_type` values, and asymmetric retrieval models
degrade badly if that distinction is dropped. Hence two functions rather than one
with a flag.

Model choice was measured, not assumed. `nvidia/nv-embedqa-e5-v5` is 1024-dim and
would have dropped into the original schema untouched, but it retrieved the wrong
article for both an Arabic and an English query against real corpus text -- it is
English-only. `nvidia/nemotron-3-embed-1b` got both right, including an English
question matching an Arabic article, so the schema moved to its 2048 dimensions
instead of the model bending to the schema.
"""
from __future__ import annotations

import httpx

from legalrag.config import EMBEDDING_DIMENSIONS, get_model_spec

# The API rejects oversized inputs outright rather than truncating, so every
# request asks it to truncate from the END. Long articles lose their tail rather
# than the whole row failing to embed.
_TRUNCATE = "END"
BATCH_SIZE = 32
_TIMEOUT = httpx.Timeout(180.0)


class EmbeddingError(RuntimeError):
    pass


def _post(texts: list[str], input_type: str) -> list[list[float]]:
    spec = get_model_spec("embed")
    response = httpx.post(
        f"{spec.base_url}/embeddings",
        headers={"Authorization": f"Bearer {spec.api_key}"},
        json={
            "input": texts,
            "model": spec.model,
            "input_type": input_type,
            "truncate": _TRUNCATE,
            "encoding_format": "float",
        },
        timeout=_TIMEOUT,
    )
    if response.status_code != 200:
        raise EmbeddingError(
            f"{spec} returned {response.status_code}: {response.text[:300]}"
        )

    payload = response.json()
    # The API does not guarantee response order, so sort by the echoed index
    # rather than trusting position -- a silent misalignment here would attach
    # every article to the wrong vector.
    ordered = sorted(payload["data"], key=lambda item: item["index"])
    vectors = [item["embedding"] for item in ordered]

    if len(vectors) != len(texts):
        raise EmbeddingError(
            f"asked for {len(texts)} embeddings, got {len(vectors)}"
        )
    for vector in vectors:
        if len(vector) != EMBEDDING_DIMENSIONS:
            raise EmbeddingError(
                f"expected {EMBEDDING_DIMENSIONS} dimensions, got {len(vector)} "
                f"-- the schema and the model disagree"
            )
    return vectors


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embed corpus text for indexing."""
    if not texts:
        return []
    vectors: list[list[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        vectors.extend(_post(texts[start : start + BATCH_SIZE], "passage"))
    return vectors


def embed_query(text: str) -> list[float]:
    """Embed a single search query."""
    return _post([text], "query")[0]


def to_pgvector(vector: list[float]) -> str:
    """pgvector's text input format, accepted by both vector and halfvec."""
    return "[" + ",".join(repr(float(x)) for x in vector) + "]"
