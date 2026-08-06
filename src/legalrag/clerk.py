"""Clerk owns identity; this module answers two questions for FastAPI routes:
"who is calling" (get_current_user_id) and "what can they do" (combined with
orgs.py's memberships, get_current_membership / require_owner).
"""
from __future__ import annotations

from functools import lru_cache

import httpx
import psycopg
from fastapi import Depends, HTTPException, Path, Request
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials

from legalrag.config import (
    get_clerk_jwks_url,
    get_clerk_secret_key,
    get_dev_auth_user,
)
from legalrag.db import db
from legalrag.orgs import Membership, get_membership


@lru_cache(maxsize=1)
def _clerk_guard() -> ClerkHTTPBearer:
    # Lazy and cached: constructing this calls get_clerk_jwks_url(), which
    # raises if unset. Building it at import time would crash the whole app
    # on startup even for routes that need no auth at all -- every other
    # config getter in this codebase (get_database_url, get_model_spec) is
    # read lazily for the same reason.
    return ClerkHTTPBearer(
        config=ClerkConfig(
            jwks_url=get_clerk_jwks_url(),
            # Cache the signing keys themselves, not just the JWK set.
            #
            # Off by default in fastapi-clerk-auth, which leaves only PyJWT's
            # JWK-set cache and its 300-second lifespan: every five minutes the
            # next request to arrive refetched Clerk's JWKS over HTTPS, and
            # since ClerkHTTPBearer.__call__ verifies inline rather than in a
            # threadpool, that fetch ran on the event loop and stalled every
            # other request with it. A screen firing three requests at once
            # only had to be unlucky in one of them to feel it.
            #
            # With this on, PyJWT keys an LRU cache by the token's `kid`, which
            # has no expiry -- so the fetch happens once per signing key for
            # the life of the process instead of twelve times an hour. Clerk
            # rotates keys rarely and publishes the new `kid` in the tokens it
            # signs, so a rotation is a cache miss that fetches once, not a
            # class of request that starts failing.
            jwks_cache_keys=True,
        )
    )


async def _verify_clerk_session(
    request: Request,
) -> HTTPAuthorizationCredentials | None:
    # Checked per-request rather than at import time so enabling or clearing
    # the variable takes effect on reload, like every other config getter here.
    if get_dev_auth_user():
        return None
    guard = _clerk_guard()
    return await guard(request)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_verify_clerk_session),
) -> str:
    """The authenticated Clerk user's id -- the JWT's `sub` claim.

    Returns the impersonated id instead when LEGALOS_DEV_AUTH is set; see
    config.get_dev_auth_user for why that is opt-in only.
    """
    dev_user = get_dev_auth_user()
    if dev_user:
        return dev_user
    assert credentials is not None  # _verify_clerk_session raises otherwise
    return credentials.decoded["sub"]


def get_current_membership(
    organization_id: int = Path(...),
    clerk_user_id: str = Depends(get_current_user_id),
    conn: psycopg.Connection = Depends(db),
) -> Membership:
    """The caller's membership in the organization named by the path.

    403s if they authenticated successfully but aren't a member of *this*
    organization -- a valid session is not the same as access to this org.

    Takes the request's connection rather than opening one. FastAPI resolves
    `db` once per request, so this check and the route body it guards share a
    single pooled connection: authorising a request no longer costs a
    connection handshake of its own.
    """
    membership = get_membership(conn, organization_id, clerk_user_id)
    if membership is None:
        raise HTTPException(
            status_code=403, detail="Not a member of this organization"
        )
    return membership


def require_owner(
    membership: Membership = Depends(get_current_membership),
) -> Membership:
    if membership.role != "owner":
        raise HTTPException(status_code=403, detail="Only an Owner can do this")
    return membership


def get_user_primary_email(clerk_user_id: str) -> str:
    """Fetches the user's verified primary email from Clerk's Backend API.

    Not read from the session JWT: Clerk only includes an email claim if a
    custom JWT template is configured in the dashboard, and this must not
    depend on that being set up correctly -- accept_invitation's email match
    is a real security check, not a UX nicety.
    """
    response = httpx.get(
        f"https://api.clerk.com/v1/users/{clerk_user_id}",
        headers={"Authorization": f"Bearer {get_clerk_secret_key()}"},
        timeout=10.0,
    )
    response.raise_for_status()
    user = response.json()
    primary_id = user["primary_email_address_id"]
    for entry in user["email_addresses"]:
        if entry["id"] == primary_id:
            return entry["email_address"]
    raise RuntimeError(f"no primary email found for Clerk user {clerk_user_id}")
