"""Per-stage LLM clients. Clients are cached so each stage opens one connection pool."""
from __future__ import annotations

from functools import lru_cache

from openai import OpenAI

from legalrag.config import ModelSpec, get_model_spec

__all__ = ["get_client", "get_model_spec", "client_for"]


# NVIDIA's free tier rate-limits well below what a parallel eval run produces,
# and a 429 there is transient rather than a real failure. The SDK's own
# exponential backoff handles it; without this a burst turns into lost queries.
MAX_RETRIES = 5
TIMEOUT_SECONDS = 180.0


@lru_cache(maxsize=None)
def _client(base_url: str, api_key: str) -> OpenAI:
    return OpenAI(
        base_url=base_url,
        api_key=api_key,
        max_retries=MAX_RETRIES,
        timeout=TIMEOUT_SECONDS,
    )


def client_for(stage: str) -> tuple[OpenAI, str]:
    """Return the client and model id configured for a stage."""
    spec = get_model_spec(stage)
    return _client(spec.base_url, spec.api_key), spec.model


def get_client(stage: str = "answer") -> OpenAI:
    return client_for(stage)[0]


def spec_for(stage: str) -> ModelSpec:
    return get_model_spec(stage)
