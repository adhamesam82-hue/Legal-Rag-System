"""Transactional email via Resend's REST API directly.

Called directly with httpx rather than adding Resend's SDK, matching this
codebase's existing pattern for single-purpose provider calls (see
embed.py's direct calls to NVIDIA's API).
"""
from __future__ import annotations

import httpx

from legalrag.config import get_resend_api_key

RESEND_API_URL = "https://api.resend.com/emails"
FROM_ADDRESS = "LegalRAG <onboarding@resend.dev>"


class EmailError(RuntimeError):
    pass


def send_invite_email(to_email: str, organization_name: str, accept_url: str) -> None:
    response = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {get_resend_api_key()}"},
        json={
            "from": FROM_ADDRESS,
            "to": [to_email],
            "subject": f"You've been invited to join {organization_name}",
            "html": (
                f"<p>You've been invited to join <strong>{organization_name}</strong>.</p>"
                f'<p><a href="{accept_url}">Accept the invitation</a></p>'
                f"<p>This link expires in 7 days.</p>"
            ),
        },
        timeout=15.0,
    )
    if response.status_code >= 400:
        raise EmailError(
            f"Resend returned {response.status_code}: {response.text[:300]}"
        )
