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


def send_plain_email(to_email: str, subject: str, body: str) -> None:
    """A plain-text message. Used by operational alerts, which have no template.

    Separate from send_invite_email rather than a generalisation of it: that
    function's subject and HTML are part of the invitation flow's behaviour and
    are asserted by tests/test_invites.py.
    """
    response = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {get_resend_api_key()}"},
        json={
            "from": FROM_ADDRESS,
            "to": [to_email],
            "subject": subject,
            "text": body,
        },
        timeout=15.0,
    )
    if response.status_code >= 400:
        raise EmailError(
            f"Resend returned {response.status_code}: {response.text[:300]}"
        )


# --- reminders --------------------------------------------------------------

_WHEN_AR = {
    3: "بعد ثلاثة أيام",
    1: "غدًا",
    0: "اليوم",
}

_KIND_AR = {
    "hearing": "جلسة",
    "deadline": "ميعاد",
    "task": "مهمة",
}


def reminder_subject(kind: str, offset_days: int, title: str) -> str:
    """Arabic, and the WHEN comes first.

    A lawyer scanning a phone at 7am reads the first few words of a subject
    line and nothing else, so "غدًا" has to be in them. The matter name goes
    last because it is the part they will recognise even truncated.
    """
    when = _WHEN_AR.get(offset_days, f"بعد {offset_days} أيام")
    return f"{_KIND_AR.get(kind, kind)} {when}: {title}"


def send_reminder_email(
    to_email: str,
    *,
    kind: str,
    offset_days: int,
    title: str,
    matter_name: str,
    on_date: str,
    detail: str = "",
) -> None:
    """One reminder. Raises EmailError so the caller can leave it unrecorded.

    Deliberately not swallowing failures: an un-sent reminder that is written
    down as sent is worse than one that retries tomorrow, because the second
    is recoverable and the first is silent.
    """
    heading = reminder_subject(kind, offset_days, title)
    rows = [f"<p><strong>{title}</strong></p>", f"<p>{on_date}</p>"]
    if matter_name:
        rows.append(f"<p>القضية: {matter_name}</p>")
    if detail:
        rows.append(f"<p>{detail}</p>")

    response = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {get_resend_api_key()}"},
        json={
            "from": FROM_ADDRESS,
            "to": [to_email],
            "subject": heading,
            # dir=rtl on the wrapper: an Arabic mail laid out left-to-right is
            # readable but wrong, and every client honours this one attribute.
            "html": '<div dir="rtl" style="font-family:sans-serif">'
            + "".join(rows)
            + "</div>",
        },
        timeout=15.0,
    )
    if response.status_code >= 400:
        raise EmailError(
            f"Resend returned {response.status_code}: {response.text[:300]}"
        )
