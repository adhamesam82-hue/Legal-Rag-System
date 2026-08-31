"""Push notifications through Firebase Cloud Messaging.

The second channel for the reminder sweep. The sweep already decides WHO to
tell and WHEN (see reminders.py); this is only how a message reaches a handset
rather than an inbox.

WHY NOT firebase-admin
----------------------
Two calls -- mint a token, post a message -- against a documented REST API,
using PyJWT and cryptography which are already here for verifying incoming
Firebase ID tokens. Pulling in the Admin SDK and its google-auth tree for that
would be a large dependency for a small surface. This matches email.py, which
calls Resend's REST API directly for the same reason.

WHY v1 AND NOT THE LEGACY ENDPOINT
----------------------------------
The old `fcm.googleapis.com/fcm/send` with a static server key was shut down in
2024. v1 requires an OAuth2 access token minted from a service account, which
is the bulk of the code below.

A STALE TOKEN IS NOT A FAILURE
------------------------------
FCM answers UNREGISTERED/NOT_FOUND for a handset that was wiped or had the app
removed. That is the normal end of a device token's life, not an error, and it
is reported separately so the caller can delete the row. Treating it as a send
failure would make the sweep retry it every morning forever and exit non-zero
on a unit that is working correctly.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass

import httpx
import jwt

from legalrag.config import get_firebase_service_account

TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
# The access token FCM issues lasts an hour; asking for less leaves room for
# clock skew between this box and Google without ever presenting a stale one.
TOKEN_TTL = 3600
REFRESH_MARGIN = 300


class PushError(RuntimeError):
    """A send that should be retried. Distinct from an unregistered device."""


class DeviceGone(Exception):
    """The handset no longer exists. Delete the token; do not retry it."""


@dataclass(frozen=True)
class _Credentials:
    project_id: str
    client_email: str
    private_key: str


def _load_credentials() -> _Credentials:
    """Reads the service account from a path or from inline JSON."""
    raw = get_firebase_service_account()
    if not raw:
        raise PushError("FIREBASE_SERVICE_ACCOUNT not set")

    # A path is the common case; inline JSON always starts with a brace, so
    # the two cannot be confused for one another.
    if not raw.lstrip().startswith("{"):
        if not os.path.exists(raw):
            raise PushError(f"FIREBASE_SERVICE_ACCOUNT points at {raw}, which is missing")
        with open(raw, encoding="utf-8") as handle:
            raw = handle.read()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PushError(f"FIREBASE_SERVICE_ACCOUNT is not valid JSON: {exc}") from exc

    missing = [
        key
        for key in ("project_id", "client_email", "private_key")
        if not data.get(key)
    ]
    if missing:
        raise PushError(f"service account is missing {', '.join(missing)}")

    return _Credentials(
        project_id=data["project_id"],
        client_email=data["client_email"],
        # Escaped newlines survive being passed through an env var; a key with
        # real newlines is left alone.
        private_key=data["private_key"].replace("\\n", "\n"),
    )


def push_is_configured() -> bool:
    """Whether pushing is possible at all, without raising.

    Asked BEFORE a send so the sweep can skip the channel deliberately rather
    than reporting a failure per reminder. An install with no mobile app has
    nothing to push to, and that is a supported state, not a fault.
    """
    return bool(get_firebase_service_account())


_cached_token: tuple[str, float] | None = None


def _access_token(credentials: _Credentials) -> str:
    """An OAuth2 access token, reused until it is nearly expired.

    Cached at module level: the sweep sends to many devices in one pass, and
    minting a token per message would be one extra network round trip each.
    """
    global _cached_token
    now = time.time()
    if _cached_token and _cached_token[1] - REFRESH_MARGIN > now:
        return _cached_token[0]

    assertion = jwt.encode(
        {
            "iss": credentials.client_email,
            "scope": SCOPE,
            "aud": TOKEN_URL,
            "iat": int(now),
            "exp": int(now) + TOKEN_TTL,
        },
        credentials.private_key,
        algorithm="RS256",
    )
    response = httpx.post(
        TOKEN_URL,
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        },
        timeout=15.0,
    )
    if response.status_code >= 400:
        raise PushError(f"token endpoint returned {response.status_code}: {response.text[:300]}")

    body = response.json()
    token = body.get("access_token")
    if not token:
        raise PushError("token endpoint returned no access_token")
    _cached_token = (token, now + body.get("expires_in", TOKEN_TTL))
    return token


def reset_token_cache() -> None:
    """Drops the cached access token. For tests, and after a credential change."""
    global _cached_token
    _cached_token = None


def send_push(
    device_token: str,
    *,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> None:
    """One notification to one handset.

    Raises PushError for anything worth retrying, and DeviceGone when the
    handset is unregistered -- the caller deletes the row rather than treating
    it as a failed delivery.
    """
    credentials = _load_credentials()
    access_token = _access_token(credentials)

    message: dict[str, object] = {
        "token": device_token,
        "notification": {"title": title, "body": body},
    }
    if data:
        # FCM requires every data value to be a string, and silently rejects
        # the whole message otherwise.
        message["data"] = {key: str(value) for key, value in data.items()}

    response = httpx.post(
        f"https://fcm.googleapis.com/v1/projects/{credentials.project_id}/messages:send",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"message": message},
        timeout=15.0,
    )

    if response.status_code == 404 or _is_unregistered(response):
        raise DeviceGone(device_token)
    if response.status_code == 401:
        # The cached token was rejected -- most likely rotated underneath us.
        # Drop it so the next attempt mints a fresh one instead of failing
        # identically until the process restarts.
        reset_token_cache()
        raise PushError("FCM rejected the access token")
    if response.status_code >= 400:
        raise PushError(f"FCM returned {response.status_code}: {response.text[:300]}")


def _is_unregistered(response: httpx.Response) -> bool:
    """FCM reports a dead handset as 400 + UNREGISTERED as often as 404."""
    if response.status_code != 400:
        return False
    try:
        error = response.json().get("error", {})
    except ValueError:
        return False
    if error.get("status") == "NOT_FOUND":
        return True
    # UNREGISTERED only. INVALID_ARGUMENT also arrives as a 400 here, but it
    # is what a malformed *payload* looks like too -- treating it as a dead
    # handset would let one bug in this file quietly delete every working
    # device token in the table.
    return any(
        detail.get("errorCode") == "UNREGISTERED"
        for detail in error.get("details", [])
    )
