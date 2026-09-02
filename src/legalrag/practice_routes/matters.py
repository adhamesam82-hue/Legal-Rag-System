"""Routes for matters."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- matters ----------------------------------------------------------------


@router.get("/matters")
def get_matters(
    organization_id: int,
    status: str | None = None,
    client_id: int | None = None,
    responsible_user: str | None = None,
    matter_type: str | None = None,
    q: str | None = Query(default=None, max_length=200),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return matters.list_matters(
        conn,
        organization_id,
        viewer=membership,
        status=status,
        client_id=client_id,
        responsible_user=responsible_user,
        matter_type=matter_type,
        query=q,
    )


@router.post("/matters", status_code=201)
def post_matter(
    organization_id: int,
    body: MatterIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        matter = matters.create_matter(conn, organization_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Client not found")
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="A matter with that number already exists."
        )
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"opened matter {matter.name}",
        matter_id=matter.id,
        client_id=matter.client_id,
    )
    conn.commit()
    return matter


@router.get("/matters/{matter_id}")
def get_matter(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(
        matters.get_matter(conn, organization_id, matter_id, viewer=membership),
        "Matter",
    )


@router.patch("/matters/{matter_id}")
def patch_matter(
    organization_id: int,
    matter_id: int,
    body: MatterPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return matters.update_matter(
            conn, organization_id, matter_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        # MatterPatch types matter_type/status/billing_type as plain strings,
        # so an out-of-list value reaches update_matter's validation. That
        # used to surface as a 500; it is the caller's mistake, so 422.
        raise HTTPException(status_code=422, detail=str(exc))
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="A matter with that number already exists."
        )


@router.delete("/matters/{matter_id}", status_code=204)
def remove_matter(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        matters.delete_matter(conn, organization_id, matter_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    return Response(status_code=204)


@router.get("/matters/{matter_id}/notes")
def get_notes(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return matters.list_notes(conn, organization_id, matter_id)


@router.post("/matters/{matter_id}/notes", status_code=201)
def post_note(
    organization_id: int,
    matter_id: int,
    body: NoteIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return matters.add_note(
            conn,
            organization_id,
            matter_id,
            author=membership.clerk_user_id,
            content=body.content,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")


@router.get("/matters/{matter_id}/timeline")
def get_matter_timeline(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return matters.list_timeline(conn, organization_id, matter_id)


@router.post("/matters/{matter_id}/timeline", status_code=201)
def post_matter_timeline(
    organization_id: int,
    matter_id: int,
    body: MatterTimelineIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return matters.add_timeline_event(
        conn, organization_id, matter_id, **body.model_dump()
    )
