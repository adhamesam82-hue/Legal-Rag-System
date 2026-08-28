"""Routes for clients."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- clients ----------------------------------------------------------------


@router.get("/clients")
def get_clients(
    organization_id: int,
    status: str | None = None,
    q: str | None = Query(default=None, max_length=200),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return clients.list_clients(conn, organization_id, status=status, query=q)


@router.post("/clients", status_code=201)
def post_client(
    organization_id: int,
    body: ClientIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    client = clients.create_client(conn, organization_id, **body.model_dump())
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"added client {client.name}",
        client_id=client.id,
    )
    conn.commit()
    return client


@router.get("/clients/{client_id}")
def get_client(
    organization_id: int,
    client_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(clients.get_client(conn, organization_id, client_id), "Client")


@router.patch("/clients/{client_id}")
def patch_client(
    organization_id: int,
    client_id: int,
    body: ClientPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return clients.update_client(
            conn, organization_id, client_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Client not found")


@router.delete("/clients/{client_id}", status_code=204)
def remove_client(
    organization_id: int,
    client_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        clients.delete_client(conn, organization_id, client_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Client not found")
    except ForeignKeyViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409,
            detail="This client still has matters. Close or reassign them first.",
        )
    return Response(status_code=204)


@router.post("/clients/{client_id}/contacts", status_code=201)
def post_contact(
    organization_id: int,
    client_id: int,
    body: ContactIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return clients.add_contact(conn, organization_id, client_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Client not found")


@router.delete("/clients/{client_id}/contacts/{contact_id}", status_code=204)
def remove_contact(
    organization_id: int,
    client_id: int,
    contact_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        clients.delete_contact(conn, organization_id, client_id, contact_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return Response(status_code=204)
