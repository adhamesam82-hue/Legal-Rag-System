from __future__ import annotations

import httpx

from scripts.smoke_check import check_api_health, check_frontend_serves


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
