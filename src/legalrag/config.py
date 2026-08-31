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

# Sized for a scanned court bundle, not a video.
DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024

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


def get_firebase_project_id() -> str | None:
    """The Firebase project backing the consumer mobile app.

    Two products, two identity providers, on purpose: Clerk signs in law firms
    (organizations, roles, invitations), Firebase signs in consumers (Apple and
    Google, one account each, no firm). They are separate businesses with
    separate customers, so they do not share an identity system.

    Returned as None rather than raising when unset -- an API instance serving
    only LegalOS has no consumer app to authenticate, and should not fail to
    start over a variable it does not need. auth.py turns a missing project id
    into a 503 on the consumer routes specifically.
    """
    return os.environ.get("FIREBASE_PROJECT_ID") or None


def get_resend_api_key() -> str:
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        raise RuntimeError("RESEND_API_KEY not set in .env")
    return key


def email_is_configured() -> bool:
    """Whether outbound email can be sent at all.

    Asked BEFORE attempting a send, so a caller can degrade deliberately
    instead of catching an exception it cannot tell apart from a network
    failure. A firm running without a Resend key is a supported state -- most
    self-hosted installs start that way -- and inviting a colleague must still
    work there, by handing the owner a link to pass on themselves.
    """
    return bool(os.environ.get("RESEND_API_KEY"))


def get_app_base_url() -> str:
    """Where the web app is reachable, for links inside outbound email.

    Defaults to the local dev origin rather than raising: an invitation whose
    link points at localhost is obviously wrong to whoever reads it and is
    fixed by setting one variable, whereas refusing to create the invitation
    breaks the flow entirely for anyone running this on their own machine.

    Trailing slashes are stripped so callers can join with a leading-slash
    path without producing a double slash.
    """
    return os.environ.get("APP_BASE_URL", "http://localhost:3000").rstrip("/")


LOCAL_CORS_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")


def get_cors_origins() -> list[str]:
    """Browser origins allowed to call this API.

    The two local dev-server origins are always allowed; deployed frontends are
    added through LEGALOS_CORS_ORIGINS as a comma-separated list, e.g.
    "https://legalos.vercel.app,https://app.legalos.eg".

    No wildcard: these routes carry a bearer token and allow_credentials is on,
    so a permissive origin would let any site make authenticated calls on a
    signed-in user's behalf.
    """
    configured = os.environ.get("LEGALOS_CORS_ORIGINS", "")
    extra = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [*LOCAL_CORS_ORIGINS, *extra]


def get_dev_auth_user() -> str | None:
    """The Clerk user id to impersonate when LEGALOS_DEV_AUTH is set.

    An escape hatch for running the whole stack locally before Clerk is
    configured: with it set, the API skips JWT verification and treats every
    request as coming from this user.

    Deliberately opt-in and fail-closed. Missing Clerk configuration does NOT
    enable it -- that would turn a misconfigured production deploy into an open
    API. The variable's value is the impersonated user id, so there is no way
    to switch it on by setting it to a vague truthy value.

    MUST NOT be set in any deployed environment.
    """
    return os.environ.get("LEGALOS_DEV_AUTH") or None


def get_document_root() -> Path:
    """Directory holding uploaded matter documents.

    Local disk, not object storage: this is a solo-founder deployment and the
    swap to S3-compatible storage is a change to this one function plus
    practice/documents.py's read/write helpers.
    """
    root = Path(os.environ.get("LEGALOS_DOCUMENT_ROOT", "data/documents"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_max_upload_bytes() -> int:
    """Ceiling on a single uploaded document.

    Read here rather than hard-coded in the route so a firm that files large
    scanned bundles can raise it without a code change. The default is sized
    for a scanned court file, not a video.
    """
    raw = os.environ.get("LEGALOS_MAX_UPLOAD_BYTES")
    if not raw:
        return DEFAULT_MAX_UPLOAD_BYTES
    try:
        value = int(raw)
    except ValueError:
        raise RuntimeError(
            f"LEGALOS_MAX_UPLOAD_BYTES must be an integer, got {raw!r}"
        ) from None
    if value <= 0:
        raise RuntimeError("LEGALOS_MAX_UPLOAD_BYTES must be positive")
    return value


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
