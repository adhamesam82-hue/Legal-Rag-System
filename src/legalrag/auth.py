"""Who is calling, across two identity providers.

LegalOS is signed in by Clerk; the consumer mobile app is signed in by
Firebase. They are different products sold to different people, so they do not
share an identity system.

That makes the *subject* -- the string a row is owned by -- ambiguous unless it
says which provider issued it. Every subject here is namespaced:

    clerk:user_2abc...      a law-firm user
    firebase:8fK2p...       a consumer app user

Without the prefix a Firebase uid could collide with a Clerk user id and hand
one person another's conversations. The prefix makes that impossible rather
than unlikely.

Two dependencies, deliberately not one:

  * get_current_subject        -- either provider. Consumer surface:
    conversations and the streaming ask.
  * clerk.get_current_user_id  -- Clerk only, unchanged. Firm surface:
    organizations, invitations, practice management.

A consumer account must never reach a firm's matters, and the way to guarantee
that is for those routes to have no code path that accepts a Firebase token at
all.
"""
from __future__ import annotations

import time

import jwt
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient
from starlette.concurrency import run_in_threadpool

from legalrag.clerk import _verify_clerk_session, get_current_user_id
from legalrag.config import get_dev_auth_user, get_firebase_project_id

CLERK_PREFIX = "clerk:"
FIREBASE_PREFIX = "firebase:"

# Google publishes the Firebase token-signing keys here in JWK form. (The
# better-known .../x509/... endpoint serves PEM certificates instead, which
# PyJWKClient cannot consume.)
FIREBASE_JWK_URL = (
    "https://www.googleapis.com/service_accounts/v1/jwk/"
    "securetoken@system.gserviceaccount.com"
)
FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/"

_jwk_client: PyJWKClient | None = None


def _firebase_jwk_client() -> PyJWKClient:
    """Cached JWK client. Caching matters: without it every request refetches
    Google's key set, turning each API call into an extra round trip."""
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(FIREBASE_JWK_URL, cache_keys=True)
    return _jwk_client


def verify_firebase_token(token: str, project_id: str) -> str:
    """Return the Firebase uid for a valid ID token, or raise HTTPException.

    Checks the signature against Google's published keys and then the claims
    that make a token *this* project's. A signature check alone is not enough:
    an ID token from any other Firebase project is signed by the very same
    Google keys, so skipping the audience check would let anyone with any
    Firebase app sign in as anyone here.

    Blocking (PyJWKClient fetches over HTTP on a cache miss); callers on the
    event loop run it in a threadpool.
    """
    try:
        signing_key = _firebase_jwk_client().get_signing_key_from_jwt(token)
    except jwt.exceptions.PyJWKClientConnectionError as exc:
        # Google unreachable is this server's problem, not the caller's, and
        # must not read as "your credentials are bad" -- a 401 would send a
        # correctly signed-in user to a sign-in screen that cannot help them.
        raise HTTPException(
            status_code=503, detail="Could not reach the token signing service"
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    try:
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"{FIREBASE_ISSUER_PREFIX}{project_id}",
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.ExpiredSignatureError as exc:
        # Firebase ID tokens last an hour and the client SDK refreshes them.
        # Distinguished from a bad token so the app can retry with a fresh one
        # instead of signing the user out.
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    subject = claims.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Token has no subject")

    # auth_time is when the user actually authenticated. A token claiming to
    # have been issued in the future is not one this server should honour.
    if claims.get("auth_time", 0) > time.time() + 60:
        raise HTTPException(status_code=401, detail="Token is not yet valid")

    return subject


def _bearer_token(request: Request) -> str | None:
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def _unverified_issuer(token: str) -> str:
    """The token's `iss` claim, read without verifying.

    Used only to choose a verifier. Nothing is trusted on the strength of it:
    a token claiming a Firebase issuer is still rejected unless Google signed
    it for this exact project.
    """
    try:
        return jwt.decode(token, options={"verify_signature": False}).get("iss", "")
    except jwt.InvalidTokenError:
        return ""


async def get_current_subject(request: Request) -> str:
    """The calling user's namespaced subject, from either provider."""
    dev_user = get_dev_auth_user()
    if dev_user:
        # Same escape hatch as clerk.py, and just as opt-in. Namespaced under
        # clerk: so local data looks like firm data rather than becoming a
        # third, invisible provider.
        return f"{CLERK_PREFIX}{dev_user}"

    token = _bearer_token(request)
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if _unverified_issuer(token).startswith(FIREBASE_ISSUER_PREFIX):
        project_id = get_firebase_project_id()
        if not project_id:
            raise HTTPException(
                status_code=503,
                detail="Consumer sign-in is not configured on this server "
                "(FIREBASE_PROJECT_ID is unset).",
            )
        uid = await run_in_threadpool(verify_firebase_token, token, project_id)
        return f"{FIREBASE_PREFIX}{uid}"

    # Anything else goes to Clerk, which verifies it properly and 401s if it
    # is not one of theirs.
    credentials = await _verify_clerk_session(request)
    assert credentials is not None  # _verify_clerk_session raises otherwise
    return f"{CLERK_PREFIX}{credentials.decoded['sub']}"


def clerk_subject(clerk_user_id: str = Depends(get_current_user_id)) -> str:
    """The namespaced subject for a Clerk-authenticated firm user.

    For routes that are Clerk-only and need to read or write a `subject`.
    """
    return f"{CLERK_PREFIX}{clerk_user_id}"
