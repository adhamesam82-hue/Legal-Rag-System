"""Routes for activity and dashboard."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- activity and dashboard -------------------------------------------------


@router.get("/activity")
def get_activity(
    organization_id: int,
    matter_id: int | None = None,
    client_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return activity.list_activity(
        conn, organization_id, matter_id=matter_id, client_id=client_id, limit=limit
    )


@router.get("/dashboard")
def get_dashboard(
    organization_id: int,
    upcoming_days: int = Query(default=30, ge=1, le=365),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return activity.dashboard(conn, organization_id, upcoming_days=upcoming_days)


@router.get("/me")
def get_me(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    clerk_user_id: str = Depends(get_current_user_id),
):
    """The caller's own membership, so the UI knows its role before rendering."""
    return {
        "clerk_user_id": clerk_user_id,
        "organization_id": organization_id,
        "role": membership.role,
        "display_name": membership.display_name,
        "title": membership.title,
    }
