"""Routes for powers of attorney."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- powers of attorney -----------------------------------------------------


class PowerOfAttorneyIn(BaseModel):
    client_id: int
    poa_number: str = Field(min_length=1, max_length=100)
    poa_type: Literal["general", "special", "litigation"]
    issued_on: date
    notary_office: str = ""
    expires_on: date | None = None
    scan_document_id: int | None = None
    notes: str = ""


class PowerOfAttorneyUpdate(BaseModel):
    poa_number: str | None = Field(default=None, min_length=1, max_length=100)
    poa_type: Literal["general", "special", "litigation"] | None = None
    issued_on: date | None = None
    notary_office: str | None = None
    expires_on: date | None = None
    scan_document_id: int | None = None
    notes: str | None = None


class MatterPoaIn(BaseModel):
    """null clears the link, which is a legitimate thing to want."""

    power_of_attorney_id: int | None = None


@router.get("/powers-of-attorney")
def get_powers_of_attorney(
    organization_id: int,
    client_id: int | None = None,
    include_expired: bool = True,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return poa.list_powers_of_attorney(
        conn, organization_id, client_id=client_id, include_expired=include_expired
    )


@router.get("/powers-of-attorney/expiring")
def get_expiring_powers_of_attorney(
    organization_id: int,
    within_days: int = Query(default=30, ge=1, le=365),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return poa.expiring_soon(conn, organization_id, within_days=within_days)


@router.get("/powers-of-attorney/{poa_id}")
def get_power_of_attorney(
    organization_id: int,
    poa_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(
        poa.get_power_of_attorney(conn, organization_id, poa_id), "Power of attorney"
    )


@router.post("/powers-of-attorney", status_code=201)
def post_power_of_attorney(
    organization_id: int,
    body: PowerOfAttorneyIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return poa.create_power_of_attorney(conn, organization_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Client not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="A power of attorney with that number already exists"
        )


@router.patch("/powers-of-attorney/{poa_id}")
def patch_power_of_attorney(
    organization_id: int,
    poa_id: int,
    body: PowerOfAttorneyUpdate,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return poa.update_power_of_attorney(
            conn, organization_id, poa_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Power of attorney not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/powers-of-attorney/{poa_id}", status_code=204)
def delete_power_of_attorney(
    organization_id: int,
    poa_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    # Recording who a firm may act for is the owner's call, and unlike most
    # rows here a stale one is a compliance problem rather than clutter.
    if membership.role != "owner":
        raise HTTPException(
            status_code=403, detail="Only an owner can remove a power of attorney"
        )
    try:
        poa.delete_power_of_attorney(conn, organization_id, poa_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Power of attorney not found")
    return Response(status_code=204)


@router.put("/matters/{matter_id}/power-of-attorney")
def put_matter_power_of_attorney(
    organization_id: int,
    matter_id: int,
    body: MatterPoaIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        poa.attach_to_matter(
            conn, organization_id, matter_id, body.power_of_attorney_id
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return found(
        matters.get_matter(conn, organization_id, matter_id, viewer=membership),
        "Matter",
    )


@router.post("/documents", status_code=201)
async def post_document(
    organization_id: int,
    file: UploadFile,
    matter_id: int | None = None,
    doc_type: str = "",
    status: str = "draft",
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Uploads a document. Multipart, so the file rides in the request body.

    The size ceiling and the stored content type are both decided by
    legalrag.practice.uploads, not by what the client sent: an unbounded read
    is a way to kill the process, and a client-supplied content type is a way
    to get HTML served back from this origin.
    """
    limit = get_max_upload_bytes()
    try:
        content = await uploads.read_capped(file, limit)
    except uploads.UploadTooLarge:
        raise HTTPException(
            status_code=413,
            detail=f"File is larger than the {limit // (1024 * 1024)}MB limit",
        )
    filename = file.filename or "untitled"
    try:
        document = docs.create_document(
            conn,
            organization_id,
            name=filename,
            uploaded_by=membership.clerk_user_id,
            matter_id=matter_id,
            doc_type=doc_type or uploads.doc_type_for(filename),
            status=status,
            content=content,
            content_type=uploads.content_type_for(filename),
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"uploaded {document.name}",
        matter_id=document.matter_id,
    )
    conn.commit()
    return document


@router.get("/documents/{document_id}")
def get_document(
    organization_id: int,
    document_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(
        docs.get_document(conn, organization_id, document_id, viewer=membership),
        "Document",
    )


@router.get("/documents/{document_id}/content")
def get_document_content(
    organization_id: int,
    document_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    document = found(
        docs.get_document(conn, organization_id, document_id, viewer=membership),
        "Document",
    )
    try:
        content = docs.read_document_bytes(document)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    # Never echo the stored type back blindly: only types known to be inert in
    # a browser are shown in place, everything else is a download. See
    # legalrag.practice.uploads.serve_headers.
    serve = uploads.serve_headers(document.name, document.content_type)
    return Response(
        content=content,
        media_type=serve.media_type,
        headers=serve.headers,
    )


@router.patch("/documents/{document_id}")
def patch_document(
    organization_id: int,
    document_id: int,
    body: DocumentPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return docs.update_document(
            conn, organization_id, document_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.delete("/documents/{document_id}", status_code=204)
def remove_document(
    organization_id: int,
    document_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        docs.delete_document(conn, organization_id, document_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    return Response(status_code=204)
