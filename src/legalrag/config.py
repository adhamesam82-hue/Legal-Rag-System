"""Environment configuration -- single source of truth for env var access.

Model selection is per stage, and each stage's env var carries its provider as a
prefix: `provider:model`. So switching only the answering step back to Claude is

    LEGALRAG_ANSWER_MODEL=openrouter:anthropic/claude-sonnet-5

without touching the cheap high-volume stages. Encoding the provider in the same
string keeps the two from drifting apart, which is the failure mode of a
separate LEGALRAG_PROVIDER variable.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

PROVIDERS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "key_var": "OPENROUTER_API_KEY",
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "key_var": "NVIDIA_API_KEY",
    },
}

# Defaults chosen from what was measured against this corpus:
# - nemotron-3-embed-1b is the only embedding model tested that retrieved the
#   right Arabic article for both Arabic and English queries.
# - llama-3.3-70b handles Arabic legal vocabulary for expansion and reranking.
DEFAULT_MODELS = {
    "answer": "nvidia:meta/llama-3.3-70b-instruct",
    "expand": "nvidia:meta/llama-3.3-70b-instruct",
    "rerank": "nvidia:meta/llama-3.3-70b-instruct",
    "embed": "nvidia:nvidia/nemotron-3-embed-1b",
}

EMBEDDING_DIMENSIONS = 2048


@dataclass(frozen=True)
class ModelSpec:
    provider: str
    model: str

    @property
    def base_url(self) -> str:
        return PROVIDERS[self.provider]["base_url"]

    @property
    def api_key(self) -> str:
        key_var = PROVIDERS[self.provider]["key_var"]
        key = os.environ.get(key_var)
        if not key:
            raise RuntimeError(
                f"{key_var} not set in .env (needed for provider '{self.provider}')"
            )
        return key

    def __str__(self) -> str:
        return f"{self.provider}:{self.model}"


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set in .env")
    return url


def get_clerk_jwks_url() -> str:
    url = os.environ.get("CLERK_JWKS_URL")
    if not url:
        raise RuntimeError("CLERK_JWKS_URL not set in .env")
    return url


def get_clerk_secret_key() -> str:
    key = os.environ.get("CLERK_SECRET_KEY")
    if not key:
        raise RuntimeError("CLERK_SECRET_KEY not set in .env")
    return key


def get_resend_api_key() -> str:
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        raise RuntimeError("RESEND_API_KEY not set in .env")
    return key


def get_document_root() -> Path:
    """Directory holding uploaded matter documents.

    Local disk, not object storage: this is a solo-founder deployment and the
    swap to S3-compatible storage is a change to this one function plus
    practice/documents.py's read/write helpers.
    """
    root = Path(os.environ.get("LEGALOS_DOCUMENT_ROOT", "data/documents"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_model_spec(stage: str) -> ModelSpec:
    """Resolve `LEGALRAG_<STAGE>_MODEL` into a provider and model id."""
    if stage not in DEFAULT_MODELS:
        raise ValueError(f"unknown stage {stage!r}; expected one of {sorted(DEFAULT_MODELS)}")

    raw = os.environ.get(f"LEGALRAG_{stage.upper()}_MODEL", DEFAULT_MODELS[stage])
    provider, separator, model = raw.partition(":")
    if not separator:
        raise RuntimeError(
            f"LEGALRAG_{stage.upper()}_MODEL must be 'provider:model', got {raw!r}. "
            f"Providers: {', '.join(sorted(PROVIDERS))}"
        )
    if provider not in PROVIDERS:
        raise RuntimeError(
            f"unknown provider {provider!r} in {raw!r}; expected one of "
            f"{', '.join(sorted(PROVIDERS))}"
        )
    return ModelSpec(provider=provider, model=model)
