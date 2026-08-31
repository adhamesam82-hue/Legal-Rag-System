"""Post-deploy smoke check. Exits non-zero if the deployment is not usable.

Run: uv run python scripts/smoke_check.py https://alsigil.com <box-ip>

Deliberately checks more than "did the process start". /api/health touches the
database and reports corpus counts, so a zero-article corpus -- the signature
of a restore that moved the schema but not the rows -- fails here rather than
being discovered by the first person to search.

The optional second argument is curl's `--resolve`: it pins the URL's hostname
to a specific address so the check reaches the box being deployed rather than
whatever DNS currently answers for that name. Without it a deploy run before
the DNS cutover would smoke-green against the old Vercel deployment -- a box
that never came up at all would look healthy, and no rollback would fire. The
URL is left untouched, so TLS SNI and certificate verification still happen
against the real hostname.
"""
from __future__ import annotations

import os
import socket
import sys
import time
from urllib.parse import urlsplit

import httpx

TIMEOUT_SECONDS = 10
RETRY_WINDOW_SECONDS = 30
RETRY_INTERVAL_SECONDS = 2


def resolver_pinning(hostname: str, address: str, getaddrinfo):
    """A getaddrinfo replacement that sends `hostname` to `address`.

    Everything else resolves normally. Substituting at the resolver rather than
    in the URL is what keeps the Host header, the TLS SNI name and certificate
    validation pointed at the real hostname -- rewriting the URL to the IP
    would fail certificate verification and never reach the right vhost.
    """

    def resolve(host, port, *args, **kwargs):
        return getaddrinfo(
            address if host == hostname else host, port, *args, **kwargs
        )

    return resolve


def pin_host(base_url: str, address: str) -> None:
    """Pin the URL's hostname to `address` for the rest of this process."""
    hostname = urlsplit(base_url).hostname
    if not hostname:
        raise ValueError(f"no hostname to pin in {base_url!r}")
    socket.getaddrinfo = resolver_pinning(hostname, address, socket.getaddrinfo)


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
    article_count = sum(
        stats.get("articles", 0)
        for stats in corpus.values()
        if isinstance(stats, dict)
    )
    if article_count == 0:
        return f"health reports no articles: {corpus}"

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


def basic_auth() -> tuple[str, str] | None:
    """Credentials from SMOKE_BASIC_AUTH ("user:password"), or None.

    staging.alsigil.com sits behind Caddy's basic_auth, which covers /api/* as
    well as the frontend -- the password is the only thing between a hostname
    running a Clerk development instance and an open system. Without a way to
    present it, every staging check would read 401 as a broken deployment and
    roll back a perfectly healthy one.

    A malformed value is treated as absent rather than raising: the request
    then gets a 401 the checks already report clearly, which is a better
    failure than a traceback that says nothing about the deployment.
    """
    raw = os.environ.get("SMOKE_BASIC_AUTH")
    if not raw or ":" not in raw:
        return None
    user, _, password = raw.partition(":")
    return user, password


def run_checks(base_url: str) -> list[str]:
    """Every failure reason, empty when the deployment is healthy."""
    with httpx.Client(auth=basic_auth()) as client:
        return [
            reason
            for reason in (
                check_api_health(client, base_url),
                check_frontend_serves(client, base_url),
            )
            if reason is not None
        ]


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv if argv is None else argv
    if len(argv) not in (2, 3):
        print("usage: smoke_check.py <base_url> [address-to-pin]", file=sys.stderr)
        return 2

    base_url = argv[1].rstrip("/")
    if len(argv) == 3 and argv[2]:
        pin_host(base_url, argv[2])
        print(f"pinned {urlsplit(base_url).hostname} to {argv[2]}")

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
