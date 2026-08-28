"""Routes for communications."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- communications ---------------------------------------------------------


@router.get("/communications")
def get_communications(
    organization_id: int,
    matter_id: int | None = None,
    client_id: int | None = None,
    channel: str | None = None,
    direction: str | None = None,
    since: date | None = None,
    until: date | None = None,
    q: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=200, ge=1, le=500),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return comms.list_communications(
        conn,
        organization_id,
        matter_id=matter_id,
        client_id=client_id,
        channel=channel,
        direction=direction,
        since=since,
        until=until,
        query=q,
        limit=limit,
    )


@router.post("/communications", status_code=201)
def post_communication(
    organization_id: int,
    body: CommunicationIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        entry = comms.log_communication(
            conn,
            organization_id,
            logged_by=membership.clerk_user_id,
            **body.model_dump(),
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"logged {entry.direction} {entry.channel}",
        matter_id=entry.matter_id,
        client_id=entry.client_id,
    )
    conn.commit()
    return entry


@router.patch("/communications/{communication_id}")
def patch_communication(
    organization_id: int,
    communication_id: int,
    body: CommunicationPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return comms.update_communication(
            conn,
            organization_id,
            communication_id,
            **body.model_dump(exclude_unset=True),
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Communication not found")


@router.delete("/communications/{communication_id}", status_code=204)
def remove_communication(
    organization_id: int,
    communication_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        comms.delete_communication(conn, organization_id, communication_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Communication not found")
    return Response(status_code=204)
