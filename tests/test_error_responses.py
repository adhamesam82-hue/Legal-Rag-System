"""An unhandled server error has to reach the browser as a server error.

Three separate faults -- accepting an invitation without Clerk configured, a
case whose next hearing had not happened yet, and the calendar behind it --
all surfaced in the UI as "Could not reach the API", because Starlette's
last-resort handler runs outside CORSMiddleware and produced a 500 with no
Access-Control-Allow-Origin header. The browser then refused to expose the
response and the fetch rejected as a network failure, so every server bug
accused the connection instead.

These tests use raise_server_exceptions=False so the client returns the
response a browser would receive rather than re-raising the exception.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.config import LOCAL_CORS_ORIGINS
from legalrag.ratelimit import reset_limits

ALLOWED_ORIGIN = LOCAL_CORS_ORIGINS[0]


@pytest.fixture(autouse=True)
def _fresh_limits():
    reset_limits()
    yield
    reset_limits()


@pytest.fixture
def broken(monkeypatch):
    """A route that raises, standing in for any unhandled server fault."""

    def explode(_conn):
        raise RuntimeError("the database fell over")

    monkeypatch.setattr("legalrag.api.corpus_stats", explode)
    return TestClient(app, raise_server_exceptions=False)


def test_a_crash_answers_500_rather_than_dropping_the_connection(broken):
    response = broken.get("/api/health", headers={"Origin": ALLOWED_ORIGIN})
    assert response.status_code == 500


def test_the_500_is_readable_across_origins(broken):
    response = broken.get("/api/health", headers={"Origin": ALLOWED_ORIGIN})
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_the_body_names_the_fault(broken):
    """A support call starts from what the screen says; "unreachable" is a
    dead end, and the type and message are not privileged information."""
    response = broken.get("/api/health", headers={"Origin": ALLOWED_ORIGIN})
    assert "RuntimeError" in response.json()["detail"]


def test_an_unlisted_origin_gets_no_cors_grant(broken):
    response = broken.get("/api/health", headers={"Origin": "https://evil.example"})
    assert response.status_code == 500
    assert "access-control-allow-origin" not in response.headers
