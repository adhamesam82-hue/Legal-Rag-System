"""Routes for matter contacts."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- matter contacts --------------------------------------------------------


@router.get("/matters/{matter_id}/contacts")
def get_matter_contacts(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return matters.list_matter_contacts(conn, organization_id, matter_id)


@router.post("/matters/{matter_id}/contacts", status_code=201)
def post_matter_contact(
    organization_id: int,
    matter_id: int,
    body: MatterContactIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return matters.add_matter_contact(
            conn, organization_id, matter_id, **body.model_dump()
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="That contact is already on this matter."
        )


@router.patch("/matters/{matter_id}/contacts/{contact_row_id}")
def patch_matter_contact(
    organization_id: int,
    matter_id: int,
    contact_row_id: int,
    body: MatterContactPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return matters.update_matter_contact(
            conn, organization_id, contact_row_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Contact not found on this matter")


@router.delete("/matters/{matter_id}/contacts/{contact_row_id}", status_code=204)
def remove_matter_contact(
    organization_id: int,
    matter_id: int,
    contact_row_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        matters.remove_matter_contact(conn, organization_id, contact_row_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Contact not found on this matter")
    return Response(status_code=204)


@router.post("/matters/{matter_id}/duplicate", status_code=201)
def post_duplicate_matter(
    organization_id: int,
    matter_id: int,
    body: DuplicateMatterIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        copy = matters.duplicate_matter(
            conn, organization_id, matter_id, **body.model_dump()
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"opened matter {copy.matter_number} from matter {matter_id}",
        matter_id=copy.id,
        client_id=copy.client_id,
    )
    conn.commit()
    return copy
