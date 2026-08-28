"""Routes for importing an existing book of business."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- importing an existing book of business ---------------------------------
#
# Two steps on purpose. A spreadsheet out of a decade-old system is never
# clean, and finding that out on row 140 with 139 already written is worse
# than not importing at all -- so the caller sees exactly what would happen
# before anything does.


def _preview_body(preview) -> dict:
    return {
        "columns": preview.columns,
        "total_rows": preview.total_rows,
        "ready_count": len(preview.ready),
        "ready_sample": preview.ready[:20],
        "problems": [
            {"row": p.row, "reason": p.reason} for p in preview.problems
        ],
    }


@router.post("/imports/clients/preview")
async def post_preview_client_import(
    organization_id: int,
    file: UploadFile,
    mapping: str = Form(...),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """What this file would create. Writes nothing."""
    raw = await uploads.read_capped(file, get_max_upload_bytes())
    try:
        column_map = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="mapping must be JSON")
    try:
        preview = csv_import.preview_clients(raw, column_map)
    except csv_import.ImportError_ as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return _preview_body(preview)


@router.post("/imports/clients", status_code=201)
async def post_client_import(
    organization_id: int,
    file: UploadFile,
    mapping: str = Form(...),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Writes the rows that pass, and names the ones that do not.

    Partial and loud: refusing the file until it is perfect makes the firm edit
    a spreadsheet against error messages, and importing silently while dropping
    what does not fit is how a client goes missing unnoticed.
    """
    raw = await uploads.read_capped(file, get_max_upload_bytes())
    try:
        column_map = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="mapping must be JSON")
    try:
        preview = csv_import.preview_clients(raw, column_map)
        created = csv_import.import_clients(conn, organization_id, preview)
    except csv_import.ImportError_ as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="A client in this file already exists"
        )
    return {
        "created": len(created),
        "skipped": len(preview.problems),
        "problems": [{"row": p.row, "reason": p.reason} for p in preview.problems],
    }


@router.post("/imports/matters/preview")
async def post_preview_matter_import(
    organization_id: int,
    file: UploadFile,
    mapping: str = Form(...),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    raw = await uploads.read_capped(file, get_max_upload_bytes())
    try:
        column_map = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="mapping must be JSON")
    try:
        preview = csv_import.preview_matters(
            conn, organization_id, raw, column_map, membership.clerk_user_id
        )
    except csv_import.ImportError_ as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return _preview_body(preview)


@router.post("/imports/matters", status_code=201)
async def post_matter_import(
    organization_id: int,
    file: UploadFile,
    mapping: str = Form(...),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Cases, against clients that must already exist.

    Clients import first by design: a case with no client is not a case, and
    inventing one from a spreadsheet name would quietly duplicate clients the
    firm already has.
    """
    raw = await uploads.read_capped(file, get_max_upload_bytes())
    try:
        column_map = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="mapping must be JSON")
    try:
        preview = csv_import.preview_matters(
            conn, organization_id, raw, column_map, membership.clerk_user_id
        )
        created = csv_import.import_matters(conn, organization_id, preview)
    except csv_import.ImportError_ as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {
        "created": len(created),
        "skipped": len(preview.problems),
        "problems": [{"row": p.row, "reason": p.reason} for p in preview.problems],
    }


@router.patch("/invoices/{invoice_id}")
def patch_invoice(
    organization_id: int,
    invoice_id: int,
    body: InvoiceStatusIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return billing.update_invoice_status(
            conn, organization_id, invoice_id, body.status
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Invoice not found")


@router.delete("/invoices/{invoice_id}", status_code=204)
def remove_invoice(
    organization_id: int,
    invoice_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        billing.delete_invoice(conn, organization_id, invoice_id)
    except NotFoundError:
        raise HTTPException(
            status_code=404, detail="Draft invoice not found. Only drafts can be deleted."
        )
    return Response(status_code=204)
