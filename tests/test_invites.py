"""Invitation logic that needs no database -- token shape only.

The expiry/status/email-match rules themselves are tested against a real
Postgres in tests/test_invites_db.py, since they read and write invitation
rows.
"""
from __future__ import annotations

from legalrag.invites import INVITE_TTL
from datetime import timedelta


def test_invite_ttl_is_seven_days():
    assert INVITE_TTL == timedelta(days=7)
