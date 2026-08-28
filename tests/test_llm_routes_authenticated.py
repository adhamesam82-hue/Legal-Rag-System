"""Every route that reaches a paid model requires a caller.

T-001. Before this, /api/ask, /api/search and /api/articles/{id}/explain were
reachable by anyone on the internet, each one spending money per call against
the project's own API keys.

The check that matters is that rejection happens in the dependency, *before*
the handler body opens a database connection or calls a provider -- otherwise
an unauthenticated request still costs something. These tests run with no
DATABASE_URL and no provider key set, so a route that got as far as its body
would fail differently (500/503) and the assertion on 401 would catch it.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.ratelimit import reset_limits

PAID_ROUTES = [
    ("/api/ask", {"question": "ما هي مدة الإخطار؟", "jurisdiction": "EG"}),
    ("/api/search", {"query": "الإخطار", "jurisdiction": "EG"}),
    ("/api/articles/1/explain", {"language": "ar"}),
    ("/api/ask/stream", {"question": "س", "jurisdiction": "EG"}),
]


@pytest.fixture(autouse=True)
def _fresh_limits():
    """The ceiling is process-wide, so one test's requests would otherwise
    spend the next test's budget."""
    reset_limits()
    yield
    reset_limits()


@pytest.fixture
def client(monkeypatch):
    # The dev-auth escape hatch would bypass verification entirely, so make
    # sure it is off no matter what the developer's .env says.
    monkeypatch.delenv("LEGALOS_DEV_AUTH", raising=False)
    return TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize("path,body", PAID_ROUTES, ids=lambda v: v if isinstance(v, str) else "")
def test_rejects_a_caller_with_no_token(client, path, body):
    assert client.post(path, json=body).status_code == 401


@pytest.mark.parametrize("path,body", PAID_ROUTES, ids=lambda v: v if isinstance(v, str) else "")
def test_never_serves_a_malformed_bearer_token(client, path, body):
    """A garbage token is refused, whatever the exact status.

    Not pinned to 401: with CLERK_JWKS_URL unset -- as here, and as on a
    misconfigured deploy -- verification raises before it can reach Clerk, and
    a server that cannot verify anything should say 500 rather than 401. A 401
    would send a correctly signed-in user to a sign-in screen that cannot help
    them. What must never happen is a 2xx, which is what this asserts.
    """
    response = client.post(path, json=body, headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code >= 400


@pytest.mark.parametrize("path,body", PAID_ROUTES, ids=lambda v: v if isinstance(v, str) else "")
def test_rejects_a_non_bearer_scheme(client, path, body):
    response = client.post(path, json=body, headers={"Authorization": "Basic abc123"})
    assert response.status_code == 401


def test_health_stays_open(client):
    """The deploy health check has no session and must not need one."""
    # It touches the database, so it will not be 200 here -- the point is only
    # that it is not turned away for lack of a token.
    assert client.get("/api/health").status_code != 401


def test_the_ceiling_applies_before_authentication(monkeypatch):
    """A flood is turned away without each request paying for a JWT check.

    The limiter is the outermost middleware, so it answers before routing and
    before the route's own dependency runs. That ordering is the point: an
    unauthenticated flood must cost this server almost nothing.
    """
    monkeypatch.delenv("LEGALOS_DEV_AUTH", raising=False)
    monkeypatch.setenv("LEGALOS_RATE_LIMIT_PAID", "5")

    from legalrag.api import app as fresh_app

    with TestClient(fresh_app, raise_server_exceptions=False) as client:
        body = {"question": "س", "jurisdiction": "EG"}
        codes = [client.post("/api/ask", json=body).status_code for _ in range(12)]

    assert 429 in codes, f"never rate limited: {codes}"
    # Everything before the ceiling is a plain 401 -- rejected, but counted.
    assert codes[0] == 401
    # Once the ceiling is hit it stays hit for the rest of the window.
    assert codes[-1] == 429


def test_a_429_tells_the_caller_when_to_retry(monkeypatch):
    monkeypatch.delenv("LEGALOS_DEV_AUTH", raising=False)
    monkeypatch.setenv("LEGALOS_RATE_LIMIT_PAID", "2")

    from legalrag.api import app as fresh_app

    with TestClient(fresh_app, raise_server_exceptions=False) as client:
        body = {"question": "س", "jurisdiction": "EG"}
        last = None
        for _ in range(8):
            last = client.post("/api/ask", json=body)

    assert last.status_code == 429
    assert int(last.headers["Retry-After"]) >= 1
