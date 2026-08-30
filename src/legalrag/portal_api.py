"""The client's own surface. E-1.

Deliberately a SEPARATE router from the practice one, mounted at /api/portal
with no dependency on get_current_membership and no path under
/api/orgs/{organization_id}. A client is not a member of the firm, and the way
to guarantee they can never reach firm data is for these routes to have no code
path that could -- the same reasoning auth.py gives for keeping Clerk and
Firebase apart.

The credential is the link itself: a random secret in the Authorization header
(or ?token= for the first click out of an email), resolving to exactly one
grant on exactly one matter. There is no session, no cookie, and nothing to
enumerate -- an unknown token and a revoked one return the same refusal, so a
caller cannot learn that a grant once existed.

Every route reads through legalrag.practice.client_access, which applies the
grant's permissions. Nothing here decides what may be seen.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field

from legalrag.db import db
from legalrag.practice import NotFoundError, documents as docs_layer, portals
from legalrag.practice import client_access
from legalrag.practice import uploads

router = APIRouter(prefix="/api/portal", tags=["client portal"])


def portal_grant(
    authorization: str | None = Header(default=None),
    token: str | None = Query(default=None),
    conn=Depends(db),
) -> client_access.PortalGrant:
    """The grant behind this request, or 401.

    Two ways in on purpose: a bearer header for anything the page fetches, and
    a query parameter for the first click, because an email link cannot carry
    a header. The query form is why every portal response is uncacheable --
    see the header set on the document route.
    """
    presented = token
    if not presented and authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer":
            presented = value.strip()
    if not presented:
        raise HTTPException(status_code=401, detail="This link is no longer valid")
    try:
        return client_access.resolve(conn, presented)
    except client_access.PortalAccessError as exc:
        # Same message and status for unknown, revoked and expired: telling a
        # caller which one confirms a grant existed, and that is a fact about
        # the firm's clients.
        raise HTTPException(status_code=401, detail=str(exc))


@router.get("/me")
def get_portal_me(grant: client_access.PortalGrant = Depends(portal_grant)):
    """Who this link belongs to and what it may show.

    The page needs the permissions up front so it can render three tabs or
    one, rather than asking and being refused.
    """
    return {
        "contact_name": grant.contact_name,
        "matter_name": grant.matter_name,
        "can_view_documents": grant.can_view_documents,
        "can_view_bills": grant.can_view_bills,
        "can_message": grant.can_message,
    }


@router.get("/case")
def get_portal_case(
    grant: client_access.PortalGrant = Depends(portal_grant), conn=Depends(db)
):
    return client_access.case_summary(conn, grant)


@router.get("/hearings")
def get_portal_hearings(
    grant: client_access.PortalGrant = Depends(portal_grant), conn=Depends(db)
):
    """The reason to build a portal: the client stops ringing to ask the date."""
    return client_access.hearing_timeline(conn, grant)


@router.get("/documents")
def get_portal_documents(
    grant: client_access.PortalGrant = Depends(portal_grant), conn=Depends(db)
):
    return client_access.documents(conn, grant)


@router.get("/documents/{document_id}")
def get_portal_document(
    document_id: int,
    grant: client_access.PortalGrant = Depends(portal_grant),
    conn=Depends(db),
):
    if not client_access.may_read_document(conn, grant, document_id):
        # 404 rather than 403: a client guessing ids must not learn which ones
        # exist on their own matter but were withheld.
        raise HTTPException(status_code=404, detail="Document not found")

    document = docs_layer.get_document(conn, grant.organization_id, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        content = docs_layer.read_document_bytes(document)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    serve = uploads.serve_headers(document.name, document.content_type)
    headers = dict(serve.headers)
    # A portal link can arrive as ?token=..., so a shared cache must never keep
    # the response: the next person through the same proxy would be served
    # somebody else's document.
    headers["Cache-Control"] = "no-store, private"
    return Response(content=content, media_type=serve.media_type, headers=headers)


@router.get("/invoices")
def get_portal_invoices(
    grant: client_access.PortalGrant = Depends(portal_grant), conn=Depends(db)
):
    return client_access.invoices(conn, grant)


# --- messages --------------------------------------------------------------


class PortalMessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


@router.get("/threads")
def get_portal_threads(
    grant: client_access.PortalGrant = Depends(portal_grant), conn=Depends(db)
):
    if not grant.can_message:
        return []
    return portals.list_threads(
        conn, grant.organization_id, matter_id=grant.matter_id, with_messages=True
    )


@router.post("/threads/{thread_id}/messages", status_code=201)
def post_portal_message(
    thread_id: int,
    body: PortalMessageIn,
    grant: client_access.PortalGrant = Depends(portal_grant),
    conn=Depends(db),
):
    """The client's reply. Attributed to the contact, never to a firm user."""
    if not grant.can_message:
        raise HTTPException(status_code=403, detail="Messaging is not enabled")
    # The thread must belong to this grant's matter. Without this a client
    # could post into another matter's thread by id -- the same class of leak
    # the matter scoping closes on the firm side.
    threads = portals.list_threads(
        conn, grant.organization_id, matter_id=grant.matter_id
    )
    if thread_id not in {t.id for t in threads}:
        raise HTTPException(status_code=404, detail="Conversation not found")
    try:
        # author_contact_id, never author_user: the layer refuses a message
        # claiming both, and a client's reply must never be attributable to
        # someone at the firm.
        return portals.post_message(
            conn,
            grant.organization_id,
            thread_id,
            body=body.body,
            author_contact_id=grant.contact_id,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Conversation not found")
