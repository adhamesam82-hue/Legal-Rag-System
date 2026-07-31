"""Clerk owns identity; this module answers two questions for FastAPI routes:
"who is calling" (get_current_user_id) and "what can they do" (combined with
orgs.py's memberships, get_current_membership / require_owner).
"""
from __future__ import annotations

from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, Path, Request
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials

from legalrag.config import get_clerk_jwks_url, get_clerk_secret_key
from legalrag.db import get_connection
from legalrag.orgs import Membership, get_membership


@lru_cache(maxsize=1)
def _clerk_guard() -> ClerkHTTPBearer:
    # Lazy and cached: constructing this calls get_clerk_jwks_url(), which
    # raises if unset. Building it at import time would crash the whole app
    # on startup even for routes that need no auth at all -- every other
    # config getter in this codebase (get_database_url, get_model_spec) is
    # read lazily for the same reason.
    return ClerkHTTPBearer(config=ClerkConfig(jwks_url=get_clerk_jwks_url()))


async def _verify_clerk_session(request: Request) -> HTTPAuthorizationCredentials:
    guard = _clerk_guard()
    return await guard(request)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_verify_clerk_session),
) -> str:
    """The authenticated Clerk user's id -- the JWT's `sub` claim."""
    return credentials.decoded["sub"]


def get_current_membership(
    organization_id: int = Path(...),
    clerk_user_id: str = Depends(get_current_user_id),
) -> Membership:
    """The caller's membership in the organization named by the path.

    403s if they authenticated successfully but aren't a member of *this*
    organization -- a valid session is not the same as access to this org.
    """
    with get_connection() as conn:
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
