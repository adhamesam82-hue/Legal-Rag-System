"""Resend API call, tested against a fake httpx transport -- no real network."""
from __future__ import annotations

import httpx
import pytest

from legalrag.email import EmailError, send_invite_email


def test_sends_with_the_expected_payload(monkeypatch):
    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return httpx.Response(200, json={"id": "email-123"})

    monkeypatch.setattr("legalrag.email.httpx.post", fake_post)
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

    send_invite_email("new@example.com", "Test Firm", "https://app.example/invite/abc")

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer re_test_key"
    assert captured["json"]["to"] == ["new@example.com"]
    assert "Test Firm" in captured["json"]["subject"]
    assert "https://app.example/invite/abc" in captured["json"]["html"]


def test_raises_email_error_on_a_failed_send(monkeypatch):
    def fake_post(url, headers=None, json=None, timeout=None):
        return httpx.Response(422, text="invalid recipient")

    monkeypatch.setattr("legalrag.email.httpx.post", fake_post)
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

    with pytest.raises(EmailError, match="422"):
        send_invite_email("bad", "Test Firm", "https://app.example/invite/abc")


def test_raises_when_the_api_key_is_unset(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="RESEND_API_KEY"):
        send_invite_email("new@example.com", "Test Firm", "https://app.example/invite/abc")
