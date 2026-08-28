"""Routes for time tracking."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- time tracking ----------------------------------------------------------


@router.get("/time-entries")
def get_time_entries(
    organization_id: int,
    matter_id: int | None = None,
    clerk_user_id: str | None = None,
    since: date | None = None,
    until: date | None = None,
    unbilled_only: bool = False,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return time_entries.list_time_entries(
        conn,
        organization_id,
        matter_id=matter_id,
        clerk_user_id=clerk_user_id,
        since=since,
        until=until,
        unbilled_only=unbilled_only,
    )


@router.get("/time-entries/summary")
def get_time_summary(
    organization_id: int,
    matter_id: int | None = None,
    clerk_user_id: str | None = None,
    since: date | None = None,
    until: date | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return time_entries.summarize(
        conn,
        organization_id,
        matter_id=matter_id,
        clerk_user_id=clerk_user_id,
        since=since,
        until=until,
    )


@router.post("/time-entries", status_code=201)
def post_time_entry(
    organization_id: int,
    body: TimeEntryIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    payload = body.model_dump()
    # Logging time for someone else is a Staff/Owner action; anyone may log
    # their own. Defaulting to the caller keeps the common path honest.
    requested = payload.pop("clerk_user_id", None)
    if requested and requested != membership.clerk_user_id and membership.role == "lawyer":
        raise HTTPException(
            status_code=403, detail="Lawyers can only log their own time"
        )
    try:
        return time_entries.create_time_entry(
            conn,
            organization_id,
            clerk_user_id=requested or membership.clerk_user_id,
            **payload,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.patch("/time-entries/{entry_id}")
def patch_time_entry(
    organization_id: int,
    entry_id: int,
    body: TimeEntryPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return time_entries.update_time_entry(
            conn, organization_id, entry_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Time entry not found, or already billed on an invoice",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/time-entries/{entry_id}", status_code=204)
def remove_time_entry(
    organization_id: int,
    entry_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        time_entries.delete_time_entry(conn, organization_id, entry_id)
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Time entry not found, or already billed on an invoice",
        )
    return Response(status_code=204)
