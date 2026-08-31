from __future__ import annotations

import httpx

from scripts.smoke_check import (
    check_api_health,
    check_frontend_serves,
    resolver_pinning,
)


def client_returning(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_health_passes_when_status_ok_and_corpus_populated():
    def handler(request):
        return httpx.Response(200, json={"status": "ok", "corpus": {"EG": {"instruments": 3, "articles": 6985}}})

    assert check_api_health(client_returning(handler), "https://x") is None


def test_health_fails_on_non_200():
    def handler(request):
        return httpx.Response(502, text="bad gateway")

    reason = check_api_health(client_returning(handler), "https://x")
    assert reason is not None and "502" in reason


def test_health_fails_on_empty_corpus():
    """A restored database with zero articles answers 200 and is useless."""
    def handler(request):
        return httpx.Response(200, json={"status": "ok", "corpus": {"EG": {"instruments": 0, "articles": 0}}})

    reason = check_api_health(client_returning(handler), "https://x")
    assert reason is not None and "articles" in reason


def test_frontend_passes_on_200():
    def handler(request):
        return httpx.Response(200, text="<!doctype html><title>alsigil</title>")

    assert check_frontend_serves(client_returning(handler), "https://x") is None


def test_frontend_fails_on_server_error():
    def handler(request):
        return httpx.Response(500, text="boom")

    reason = check_frontend_serves(client_returning(handler), "https://x")
    assert reason is not None and "500" in reason


def test_health_passes_on_the_real_corpus_stats_shape():
    """Verify the check works with the actual shape returned by corpus_stats() in library.py.

    corpus_stats() returns dict[str, dict[str, int]] where each jurisdiction maps to
    {instruments: int, articles: int}. An earlier fixture silently tested nothing
    because it used a flat {articles: N} shape, which caused isinstance(dict, int) to fail
    on real deployments, falsely reporting "no articles" even when articles existed.
    """
    def handler(request):
        return httpx.Response(
            200,
            json={
                "status": "ok",
                "corpus": {
                    "EG": {"instruments": 3, "articles": 6985},
                    "US": {"instruments": 5, "articles": 100},
                },
            },
        )

    assert check_api_health(client_returning(handler), "https://x") is None


def test_pinning_sends_the_deployed_hostname_to_the_given_address():
    """Without this the check resolves alsigil.com normally, which before the
    DNS cutover still answers from Vercel -- so a box that never came up would
    smoke-green and the deploy would never roll back."""
    seen = []

    def fake_getaddrinfo(host, port, *args, **kwargs):
        seen.append((host, port))
        return []

    resolve = resolver_pinning("alsigil.com", "203.0.113.7", fake_getaddrinfo)
    resolve("alsigil.com", 443)

    assert seen == [("203.0.113.7", 443)]


def test_pinning_leaves_every_other_hostname_alone():
    """Pinning must not become a blanket DNS override -- a redirect target or
    any other host the check touches has to resolve normally."""
    seen = []

    def fake_getaddrinfo(host, port, *args, **kwargs):
        seen.append((host, port))
        return []

    resolve = resolver_pinning("alsigil.com", "203.0.113.7", fake_getaddrinfo)
    resolve("example.com", 443)

    assert seen == [("example.com", 443)]


def test_basic_auth_is_absent_unless_configured(monkeypatch):
    """Production has no password, and passing empty credentials to httpx
    would send an Authorization header production never asked for."""
    from scripts.smoke_check import basic_auth

    monkeypatch.delenv("SMOKE_BASIC_AUTH", raising=False)
    assert basic_auth() is None


def test_basic_auth_is_read_from_the_environment(monkeypatch):
    """staging is behind Caddy basic_auth on every route, /api included, so
    without credentials the check reads 401 as a broken deployment and rolls
    back a healthy one."""
    from scripts.smoke_check import basic_auth

    monkeypatch.setenv("SMOKE_BASIC_AUTH", "alsigil:s3cr3t:with:colons")
    assert basic_auth() == ("alsigil", "s3cr3t:with:colons")


def test_malformed_credentials_are_treated_as_absent(monkeypatch):
    """A value with no colon is a misconfiguration. Failing on the 401 that
    follows says more about the deployment than a traceback would."""
    from scripts.smoke_check import basic_auth

    monkeypatch.setenv("SMOKE_BASIC_AUTH", "no-colon-here")
    assert basic_auth() is None
