"""Routes for custom fields."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- custom fields ----------------------------------------------------------


@router.get("/custom-fields")
def get_custom_fields(
    organization_id: int,
    matter_type: str | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return fields.list_definitions(conn, organization_id, matter_type=matter_type)


@router.post("/custom-fields", status_code=201)
def post_custom_field(
    organization_id: int,
    body: FieldDefinitionIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    if membership.role == "lawyer":
        raise HTTPException(
            status_code=403, detail="Only an owner or staff can define custom fields"
        )
    try:
        return fields.create_definition(conn, organization_id, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="A field with that key already exists."
        )


@router.patch("/custom-fields/{definition_id}")
def patch_custom_field(
    organization_id: int,
    definition_id: int,
    body: FieldDefinitionPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return fields.update_definition(
            conn, organization_id, definition_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Custom field not found")


@router.delete("/custom-fields/{definition_id}", status_code=204)
def remove_custom_field(
    organization_id: int,
    definition_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    if membership.role == "lawyer":
        raise HTTPException(
            status_code=403, detail="Only an owner or staff can remove custom fields"
        )
    try:
        fields.delete_definition(conn, organization_id, definition_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Custom field not found")
    return Response(status_code=204)


@router.get("/matters/{matter_id}/custom-fields")
def get_matter_custom_fields(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return fields.list_matter_values(conn, organization_id, matter_id)


@router.put("/matters/{matter_id}/custom-fields/{definition_id}")
def put_matter_custom_field(
    organization_id: int,
    matter_id: int,
    definition_id: int,
    body: FieldValueIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return fields.set_matter_value(
            conn, organization_id, matter_id, definition_id, body.value
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
