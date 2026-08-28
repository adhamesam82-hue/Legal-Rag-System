"""Routes for client portal and secure messages."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- client portal and secure messages --------------------------------------


@router.get("/portals")
def get_portals(
    organization_id: int,
    matter_id: int | None = None,
    status: str | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return portals.list_portals(
        conn, organization_id, matter_id=matter_id, status=status
    )


@router.post("/matters/{matter_id}/portals", status_code=201)
def post_portal_invite(
    organization_id: int,
    matter_id: int,
    body: PortalInviteIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        portal = portals.invite(
            conn,
            organization_id,
            matter_id,
            invited_by=membership.clerk_user_id,
            **body.model_dump(),
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"invited {portal.contact_name} to the client portal",
        matter_id=matter_id,
    )
    conn.commit()
    return portal


@router.patch("/portals/{portal_id}")
def patch_portal(
    organization_id: int,
    portal_id: int,
    body: PortalPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return portals.update_portal(
            conn, organization_id, portal_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Portal access not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/matters/{matter_id}/threads")
def get_threads(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return portals.list_threads(
        conn, organization_id, matter_id=matter_id, with_messages=True
    )


@router.post("/matters/{matter_id}/threads", status_code=201)
def post_thread(
    organization_id: int,
    matter_id: int,
    body: ThreadIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return portals.start_thread(
            conn,
            organization_id,
            matter_id,
            created_by=membership.clerk_user_id,
            **body.model_dump(),
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/threads/{thread_id}/messages", status_code=201)
def post_message(
    organization_id: int,
    thread_id: int,
    body: MessageIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return portals.post_message(
            conn,
            organization_id,
            thread_id,
            body=body.body,
            author_user=membership.clerk_user_id,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Thread not found")


@router.post("/threads/{thread_id}/read", status_code=204)
def post_thread_read(
    organization_id: int,
    thread_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    portals.mark_thread_read(conn, organization_id, thread_id)
    return Response(status_code=204)
