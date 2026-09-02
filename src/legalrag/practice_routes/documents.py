"""Routes for documents."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- documents --------------------------------------------------------------


@router.get("/documents")
def get_documents(
    organization_id: int,
    matter_id: int | None = None,
    client_id: int | None = None,
    status: str | None = None,
    doc_type: str | None = None,
    # Repeated: ?tag_ids=3&tag_ids=7. They combine as AND.
    tag_ids: list[int] | None = Query(default=None),
    unfiled: bool = False,
    limit: int | None = Query(default=None, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None, max_length=200),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return docs.list_documents(
        conn,
        organization_id,
        viewer=membership,
        matter_id=matter_id,
        client_id=client_id,
        status=status,
        doc_type=doc_type,
        tag_ids=tag_ids,
        unfiled=unfiled,
        limit=limit,
        offset=offset,
        query=q,
    )


# Registered here, ahead of /documents/{document_id} in powers_of_attorney.py,
# so "facets" is never read as a document id.
@router.get("/documents/facets")
def get_document_facets(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return docs.facets(conn, organization_id, viewer=membership)
