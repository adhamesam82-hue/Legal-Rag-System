"""Post-deploy smoke check. Exits non-zero if the deployment is not usable.

Run: uv run python scripts/smoke_check.py https://alsigil.com

Deliberately checks more than "did the process start". /api/health touches the
database and reports corpus counts, so a zero-article corpus -- the signature
of a restore that moved the schema but not the rows -- fails here rather than
being discovered by the first person to search.
"""
from __future__ import annotations

import sys
import time

import httpx

TIMEOUT_SECONDS = 10
RETRY_WINDOW_SECONDS = 30
RETRY_INTERVAL_SECONDS = 2


def check_api_health(client: httpx.Client, base_url: str) -> str | None:
    """None if the API is healthy, otherwise the reason it is not."""
    try:
        response = client.get(f"{base_url}/api/health", timeout=TIMEOUT_SECONDS)
    except httpx.HTTPError as exc:
        return f"health request failed: {exc}"

    if response.status_code != 200:
        return f"health returned {response.status_code}"

    payload = response.json()
    if payload.get("status") != "ok":
        return f"health status is {payload.get('status')!r}"

    corpus = payload.get("corpus") or {}
    if not any(count for count in corpus.values() if isinstance(count, int)):
        return f"health reports an empty corpus: {corpus}"

    return None


def check_frontend_serves(client: httpx.Client, base_url: str) -> str | None:
    """None if Caddy is serving the Next.js app, otherwise the reason it is not."""
    try:
        response = client.get(
            base_url, timeout=TIMEOUT_SECONDS, follow_redirects=True
        )
    except httpx.HTTPError as exc:
        return f"frontend request failed: {exc}"

    if response.status_code >= 400:
        return f"frontend returned {response.status_code}"

    return None


def run_checks(base_url: str) -> list[str]:
    """Every failure reason, empty when the deployment is healthy."""
    with httpx.Client() as client:
        return [
            reason
            for reason in (
                check_api_health(client, base_url),
                check_frontend_serves(client, base_url),
            )
            if reason is not None
        ]


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: smoke_check.py <base_url>", file=sys.stderr)
        return 2

    base_url = sys.argv[1].rstrip("/")
    deadline = time.monotonic() + RETRY_WINDOW_SECONDS

    # Containers take a few seconds to accept connections. Retrying inside the
    # window is what distinguishes "still starting" from "broken".
    while True:
        failures = run_checks(base_url)
        if not failures:
            print(f"smoke check passed against {base_url}")
            return 0
        if time.monotonic() >= deadline:
            for reason in failures:
                print(f"SMOKE CHECK FAILED: {reason}", file=sys.stderr)
            return 1
        time.sleep(RETRY_INTERVAL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
