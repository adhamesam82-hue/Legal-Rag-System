"""Routes for client portal and secure messages."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router
from legalrag.practice import client_access


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


@router.post("/portals/{portal_id}/link", status_code=201)
def post_portal_link(
    organization_id: int,
    portal_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Issues the link the client signs in with. Returns it ONCE.

    Only the hash is stored, so this response is the only time the secret
    exists in readable form -- mail it now or issue another. Re-issuing
    invalidates the previous link, which is how "the client forwarded the
    email to their brother-in-law" gets undone.
    """
    try:
        token = client_access.issue_token(conn, organization_id, portal_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Portal not found")
    return {
        "token": token,
        "expires_in_days": client_access.TOKEN_LIFETIME.days,
        "note": "Shown once. Only a hash is stored.",
    }


class DocumentVisibilityIn(BaseModel):
    visible_to_client: bool


@router.put("/documents/{document_id}/client-visibility")
def put_document_client_visibility(
    organization_id: int,
    document_id: int,
    body: DocumentVisibilityIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Whether the client may see this one document.

    Per document, because can_view_documents on the grant is all-or-nothing
    and no firm can use that: the client should see the filed pleading and not
    the internal note weighing their chances. Defaults to hidden, so a
    document becomes visible because somebody decided it should.
    """
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE documents SET visible_to_client = %s "
            "WHERE organization_id = %s AND id = %s",
            (body.visible_to_client, organization_id, document_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Document not found")
    # One commit for both: the entry has to land with the change it describes,
    # or the firm's log shows a sharing that may not have happened.
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=(
            "shared a document with the client"
            if body.visible_to_client
            else "hid a document from the client"
        ),
    )
    conn.commit()
    return {"document_id": document_id, "visible_to_client": body.visible_to_client}


@router.delete("/portals/{portal_id}/link", status_code=200)
def delete_portal_link(
    organization_id: int,
    portal_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Revokes the client's access, immediately.

    The grant row survives so the firm can see it existed and reopen it by
    re-inviting; the secret does not.
    """
    try:
        return portals.revoke(conn, organization_id, portal_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Portal not found")
