"""HTTP routes for the practice-management pillars.

Every route lives under /api/orgs/{organization_id}/... and depends on
get_current_membership, so FastAPI rejects a caller who is not a member of the
organization in the path before any handler body runs. The handlers then pass
that same organization_id into the practice layer, which filters on it in SQL
-- two independent checks, neither relying on the other being correct.

Kept out of api.py so the corpus/answering routes and the firm-operations
routes stay separately readable; both are mounted on the same app.

Money crosses the wire as a JSON number. Postgres holds it as NUMERIC and all
arithmetic happens there or in Decimal; the float appears only at the
serialization boundary, for display.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile
from psycopg.errors import ForeignKeyViolation, UniqueViolation
from pydantic import BaseModel, Field

from legalrag.clerk import get_current_membership, get_current_user_id
from legalrag.config import get_max_upload_bytes
from legalrag.db import db
from legalrag.orgs import Membership
from legalrag.practice import NotFoundError, activity, billing, cases, clients
from legalrag.practice import communications as comms
from legalrag.practice import conflicts
from legalrag.practice import custom_fields as fields
from legalrag.practice import documents as docs
from legalrag.practice import expenses, matters, portals, tasks, time_entries, trust
from legalrag.practice import uploads

router = APIRouter(prefix="/api/orgs/{organization_id}", tags=["practice"])


# Re-exported: `db` moved to legalrag.db so clerk.py can depend on the same
# callable and share one pooled connection per request with the route bodies.
__all__ = ["router", "db"]


def found(value, what: str):
    """Turns a None lookup into a 404 at the point of use."""
    if value is None:
        raise HTTPException(status_code=404, detail=f"{what} not found")
    return value


# --- request bodies ---------------------------------------------------------


class ClientIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    client_type: Literal["company", "individual"] = "company"
    industry: str = ""
    status: Literal["active", "inactive"] = "active"
    client_since: date | None = None
    registration_number: str | None = None
    tax_id: str | None = None
    address: str = ""
    phone: str = ""
    email: str = ""
    notes: str | None = None


class ClientPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    client_type: Literal["company", "individual"] | None = None
    industry: str | None = None
    status: Literal["active", "inactive"] | None = None
    client_since: date | None = None
    registration_number: str | None = None
    tax_id: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    notes: str | None = None


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    title: str = ""
    email: str = ""
    phone: str = ""
    is_primary: bool = False


class MatterIn(BaseModel):
    client_id: int
    name: str = Field(min_length=1, max_length=300)
    # Omitted means "give it the next number in the firm's series".
    matter_number: str | None = Field(default=None, max_length=80)
    matter_type: Literal[
        "litigation", "corporate", "tax", "labour", "family_probate", "contract_review"
    ]
    billing_type: Literal["hourly", "fixed_fee", "retainer"]
    responsible_user: str
    opened_date: date
    status: Literal["active", "on_hold", "closed"] = "active"
    closed_date: date | None = None
    description: str = ""
    budget_amount: Decimal | None = None
    budget_is_estimate: bool = False
    tags: list[str] = Field(default_factory=list)
    staff: list[str] = Field(default_factory=list)


class MatterPatch(BaseModel):
    client_id: int | None = None
    name: str | None = None
    matter_number: str | None = Field(default=None, max_length=80)
    matter_type: str | None = None
    billing_type: str | None = None
    responsible_user: str | None = None
    opened_date: date | None = None
    status: Literal["active", "on_hold", "closed"] | None = None
    closed_date: date | None = None
    description: str | None = None
    budget_amount: Decimal | None = None
    budget_is_estimate: bool | None = None
    tags: list[str] | None = None
    staff: list[str] | None = None


class NoteIn(BaseModel):
    content: str = Field(min_length=1)


class MatterTimelineIn(BaseModel):
    event_date: date
    label: str = Field(min_length=1)
    kind: Literal["milestone", "filing", "communication", "billing"]
    detail: str | None = None


class CaseIn(BaseModel):
    matter_id: int
    court: str = Field(min_length=1)
    case_number: str = Field(min_length=1)
    filed_date: date
    judge: str = ""
    status: str = ""
    opposing_party: str = ""
    opposing_counsel: str | None = None
    ai_summary: str | None = None


class CasePatch(BaseModel):
    court: str | None = None
    judge: str | None = None
    case_number: str | None = None
    status: str | None = None
    opposing_party: str | None = None
    opposing_counsel: str | None = None
    filed_date: date | None = None
    ai_summary: str | None = None


class CaseTimelineIn(BaseModel):
    event_date: date
    label: str = Field(min_length=1)
    detail: str | None = None


class DeadlineIn(BaseModel):
    label: str = Field(min_length=1)
    due_date: date


class EvidenceIn(BaseModel):
    name: str = Field(min_length=1)
    submitted_by: Literal["us", "opposing_party", "court"]
    submitted_date: date
    evidence_type: str = ""


class CourtDocumentIn(BaseModel):
    name: str = Field(min_length=1)
    doc_date: date
    doc_type: str = ""


class HearingIn(BaseModel):
    matter_id: int
    hearing_date: date
    hearing_time: str = ""
    court: str = ""
    purpose: str = ""
    outcome: str | None = None


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    assignee: str
    matter_id: int | None = None
    due_date: date | None = None
    status: Literal["todo", "in_progress", "done"] = "todo"
    priority: Literal["low", "medium", "high"] = "medium"


class TaskPatch(BaseModel):
    title: str | None = None
    assignee: str | None = None
    matter_id: int | None = None
    due_date: date | None = None
    status: Literal["todo", "in_progress", "done"] | None = None
    priority: Literal["low", "medium", "high"] | None = None


class TimeEntryIn(BaseModel):
    matter_id: int
    entry_date: date
    hours: Decimal = Field(gt=0, le=24)
    description: str = ""
    billable: bool = True
    rate: Decimal = Field(default=Decimal(0), ge=0)
    clerk_user_id: str | None = None


class TimeEntryPatch(BaseModel):
    matter_id: int | None = None
    entry_date: date | None = None
    hours: Decimal | None = Field(default=None, gt=0, le=24)
    description: str | None = None
    billable: bool | None = None
    rate: Decimal | None = Field(default=None, ge=0)


class InvoiceLineIn(BaseModel):
    description: str
    quantity: Decimal = Decimal(1)
    unit_amount: Decimal = Decimal(0)


class InvoiceIn(BaseModel):
    client_id: int
    issued_date: date
    due_date: date
    matter_id: int | None = None
    number: str | None = None
    status: Literal["draft", "sent", "paid", "overdue"] = "draft"
    lines: list[InvoiceLineIn] = Field(default_factory=list)


class InvoiceStatusIn(BaseModel):
    status: Literal["draft", "sent", "paid", "overdue"]


class GenerateInvoiceIn(BaseModel):
    matter_id: int
    issued_date: date | None = None
    payment_terms_days: int = Field(default=30, ge=0, le=365)
    include_expenses: bool = True


class DocumentPatch(BaseModel):
    name: str | None = None
    doc_type: str | None = None
    status: Literal["draft", "under_review", "signed", "filed", "final"] | None = None
    matter_id: int | None = None


class MatterContactIn(BaseModel):
    contact_id: int | None = None
    name: str = ""
    relationship: str = ""
    email: str = ""
    phone: str = ""
    is_bill_recipient: bool = False


class MatterContactPatch(BaseModel):
    name: str | None = None
    relationship: str | None = None
    email: str | None = None
    phone: str | None = None
    is_bill_recipient: bool | None = None


class DuplicateMatterIn(BaseModel):
    name: str | None = None
    opened_date: date | None = None


class ExpenseIn(BaseModel):
    matter_id: int
    entry_date: date
    unit_amount: Decimal
    quantity: Decimal = Decimal(1)
    description: str = ""
    category: Literal[
        "court_fees", "filing", "expert", "travel", "translation", "courier", "other"
    ] = "other"
    billable: bool = True
    currency: str = "EGP"
    clerk_user_id: str | None = None


class ExpensePatch(BaseModel):
    matter_id: int | None = None
    entry_date: date | None = None
    description: str | None = None
    category: str | None = None
    quantity: Decimal | None = None
    unit_amount: Decimal | None = None
    billable: bool | None = None


class CommunicationIn(BaseModel):
    channel: Literal["phone", "email", "meeting", "letter"]
    direction: Literal["incoming", "outgoing"]
    occurred_at: datetime
    matter_id: int | None = None
    client_id: int | None = None
    subject: str = ""
    body: str = ""
    counterparty: str = ""
    duration_minutes: int | None = Field(default=None, gt=0)


class CommunicationPatch(BaseModel):
    subject: str | None = None
    body: str | None = None
    counterparty: str | None = None
    occurred_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0)


class PortalInviteIn(BaseModel):
    contact_id: int
    can_view_documents: bool = True
    can_view_bills: bool = False
    can_message: bool = True


class PortalPatch(BaseModel):
    status: Literal["invited", "active", "revoked"] | None = None
    can_view_documents: bool | None = None
    can_view_bills: bool | None = None
    can_message: bool | None = None


class ThreadIn(BaseModel):
    subject: str = Field(min_length=1, max_length=300)
    body: str = Field(min_length=1)
    portal_id: int | None = None


class MessageIn(BaseModel):
    body: str = Field(min_length=1)


class TrustAccountIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    bank_name: str = ""
    account_number: str = ""
    currency: str = "EGP"
    is_default: bool = False


class TrustTransactionIn(BaseModel):
    matter_id: int
    kind: Literal["deposit", "withdrawal", "invoice_payment", "refund"]
    amount: Decimal = Field(gt=0)
    transaction_date: date
    trust_account_id: int | None = None
    description: str = ""
    reference: str = ""
    invoice_id: int | None = None
    currency: str = "EGP"


class FieldDefinitionIn(BaseModel):
    field_key: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_]+$")
    label: str = Field(min_length=1, max_length=200)
    field_type: Literal["text", "number", "date", "checkbox", "select"]
    options: list[str] = Field(default_factory=list)
    is_required: bool = False
    display_order: int = 0
    matter_type: str | None = None


class FieldDefinitionPatch(BaseModel):
    label: str | None = None
    options: list[str] | None = None
    is_required: bool | None = None
    display_order: int | None = None
    matter_type: str | None = None


class FieldValueIn(BaseModel):
    # None clears the field; the practice layer treats empty and absent alike.
    value: str | None = None


class ConflictCheckIn(BaseModel):
    terms: list[str] = Field(min_length=1)
    notes: str = ""


class ConflictResolveIn(BaseModel):
    result: Literal["clear", "potential_conflict", "conflict"]
    notes: str | None = None


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
    return found(matters.get_matter(conn, organization_id, matter_id), "Matter")


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


# --- cases ------------------------------------------------------------------


@router.get("/cases")
def get_cases(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return cases.list_cases(conn, organization_id)


@router.post("/cases", status_code=201)
def post_case(
    organization_id: int,
    body: CaseIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return cases.create_case(conn, organization_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="This matter already has a case record."
        )


@router.get("/cases/{case_id}")
def get_case(
    organization_id: int,
    case_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(cases.get_case(conn, organization_id, case_id), "Case")


@router.get("/matters/{matter_id}/case")
def get_case_for_matter(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(
        cases.get_case_for_matter(conn, organization_id, matter_id), "Case"
    )


@router.patch("/cases/{case_id}")
def patch_case(
    organization_id: int,
    case_id: int,
    body: CasePatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return cases.update_case(
            conn, organization_id, case_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")


def _case_child(fn, conn, organization_id: int, case_id: int, **kwargs):
    try:
        return fn(conn, organization_id, case_id, **kwargs)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")


@router.post("/cases/{case_id}/timeline", status_code=201)
def post_case_timeline(
    organization_id: int,
    case_id: int,
    body: CaseTimelineIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return _case_child(
        cases.add_timeline_event, conn, organization_id, case_id, **body.model_dump()
    )


@router.post("/cases/{case_id}/deadlines", status_code=201)
def post_case_deadline(
    organization_id: int,
    case_id: int,
    body: DeadlineIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return _case_child(
        cases.add_deadline, conn, organization_id, case_id, **body.model_dump()
    )


@router.post("/cases/{case_id}/deadlines/{deadline_id}/complete", status_code=204)
def complete_case_deadline(
    organization_id: int,
    case_id: int,
    deadline_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        cases.complete_deadline(conn, organization_id, case_id, deadline_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return Response(status_code=204)


@router.post("/cases/{case_id}/evidence", status_code=201)
def post_case_evidence(
    organization_id: int,
    case_id: int,
    body: EvidenceIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return _case_child(
        cases.add_evidence, conn, organization_id, case_id, **body.model_dump()
    )


@router.post("/cases/{case_id}/court-documents", status_code=201)
def post_court_document(
    organization_id: int,
    case_id: int,
    body: CourtDocumentIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return _case_child(
        cases.add_court_document, conn, organization_id, case_id, **body.model_dump()
    )


# --- hearings / calendar ----------------------------------------------------


@router.get("/hearings")
def get_hearings(
    organization_id: int,
    matter_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return cases.list_hearings(
        conn, organization_id, matter_id=matter_id, since=since, until=until
    )


@router.post("/hearings", status_code=201)
def post_hearing(
    organization_id: int,
    body: HearingIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return cases.create_hearing(conn, organization_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")


# --- documents --------------------------------------------------------------


@router.get("/documents")
def get_documents(
    organization_id: int,
    matter_id: int | None = None,
    status: str | None = None,
    q: str | None = Query(default=None, max_length=200),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return docs.list_documents(
        conn, organization_id, matter_id=matter_id, status=status, query=q
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
    return found(docs.get_document(conn, organization_id, document_id), "Document")


@router.get("/documents/{document_id}/content")
def get_document_content(
    organization_id: int,
    document_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    document = found(docs.get_document(conn, organization_id, document_id), "Document")
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


# --- tasks ------------------------------------------------------------------


@router.get("/tasks")
def get_tasks(
    organization_id: int,
    matter_id: int | None = None,
    assignee: str | None = None,
    status: str | None = None,
    due_before: date | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return tasks.list_tasks(
        conn,
        organization_id,
        matter_id=matter_id,
        assignee=assignee,
        status=status,
        due_before=due_before,
    )


@router.post("/tasks", status_code=201)
def post_task(
    organization_id: int,
    body: TaskIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return tasks.create_task(conn, organization_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")


@router.patch("/tasks/{task_id}")
def patch_task(
    organization_id: int,
    task_id: int,
    body: TaskPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return tasks.update_task(
            conn, organization_id, task_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Task not found")


@router.delete("/tasks/{task_id}", status_code=204)
def remove_task(
    organization_id: int,
    task_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        tasks.delete_task(conn, organization_id, task_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Task not found")
    return Response(status_code=204)


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


# --- billing ----------------------------------------------------------------


@router.get("/invoices")
def get_invoices(
    organization_id: int,
    status: str | None = None,
    client_id: int | None = None,
    matter_id: int | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return billing.list_invoices(
        conn, organization_id, status=status, client_id=client_id, matter_id=matter_id
    )


@router.get("/invoices/summary")
def get_billing_summary(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return billing.summarize(conn, organization_id)


@router.post("/invoices", status_code=201)
def post_invoice(
    organization_id: int,
    body: InvoiceIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    payload = body.model_dump()
    payload["lines"] = [dict(line) for line in payload.get("lines") or []]
    try:
        return billing.create_invoice(conn, organization_id, **payload)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Client not found")
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="An invoice with that number already exists."
        )


@router.post("/invoices/generate", status_code=201)
def post_generate_invoice(
    organization_id: int,
    body: GenerateInvoiceIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        invoice = billing.generate_from_unbilled(
            conn,
            organization_id,
            matter_id=body.matter_id,
            issued_date=body.issued_date,
            payment_terms_days=body.payment_terms_days,
            include_expenses=body.include_expenses,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"drafted invoice {invoice.number}",
        matter_id=invoice.matter_id,
        client_id=invoice.client_id,
    )
    conn.commit()
    return invoice


@router.get("/invoices/{invoice_id}")
def get_invoice(
    organization_id: int,
    invoice_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(billing.get_invoice(conn, organization_id, invoice_id), "Invoice")


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


# --- expenses ---------------------------------------------------------------


@router.get("/expenses")
def get_expenses(
    organization_id: int,
    matter_id: int | None = None,
    clerk_user_id: str | None = None,
    since: date | None = None,
    until: date | None = None,
    unbilled_only: bool = False,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return expenses.list_expenses(
        conn,
        organization_id,
        matter_id=matter_id,
        clerk_user_id=clerk_user_id,
        since=since,
        until=until,
        unbilled_only=unbilled_only,
    )


@router.get("/expenses/summary")
def get_expense_summary(
    organization_id: int,
    matter_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return expenses.summarize(
        conn, organization_id, matter_id=matter_id, since=since, until=until
    )


@router.post("/expenses", status_code=201)
def post_expense(
    organization_id: int,
    body: ExpenseIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    payload = body.model_dump()
    # Same rule as time: recording someone else's disbursement is a
    # Staff/Owner action, and the caller is the default either way.
    requested = payload.pop("clerk_user_id", None)
    if requested and requested != membership.clerk_user_id and membership.role == "lawyer":
        raise HTTPException(
            status_code=403, detail="Lawyers can only record their own expenses"
        )
    try:
        return expenses.create_expense(
            conn,
            organization_id,
            clerk_user_id=requested or membership.clerk_user_id,
            **payload,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.patch("/expenses/{expense_id}")
def patch_expense(
    organization_id: int,
    expense_id: int,
    body: ExpensePatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return expenses.update_expense(
            conn, organization_id, expense_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Expense not found, or already billed on an invoice",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/expenses/{expense_id}", status_code=204)
def remove_expense(
    organization_id: int,
    expense_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        expenses.delete_expense(conn, organization_id, expense_id)
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Expense not found, or already billed on an invoice",
        )
    return Response(status_code=204)


# --- communications ---------------------------------------------------------


@router.get("/communications")
def get_communications(
    organization_id: int,
    matter_id: int | None = None,
    client_id: int | None = None,
    channel: str | None = None,
    direction: str | None = None,
    since: date | None = None,
    until: date | None = None,
    q: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=200, ge=1, le=500),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return comms.list_communications(
        conn,
        organization_id,
        matter_id=matter_id,
        client_id=client_id,
        channel=channel,
        direction=direction,
        since=since,
        until=until,
        query=q,
        limit=limit,
    )


@router.post("/communications", status_code=201)
def post_communication(
    organization_id: int,
    body: CommunicationIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        entry = comms.log_communication(
            conn,
            organization_id,
            logged_by=membership.clerk_user_id,
            **body.model_dump(),
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"logged {entry.direction} {entry.channel}",
        matter_id=entry.matter_id,
        client_id=entry.client_id,
    )
    conn.commit()
    return entry


@router.patch("/communications/{communication_id}")
def patch_communication(
    organization_id: int,
    communication_id: int,
    body: CommunicationPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return comms.update_communication(
            conn,
            organization_id,
            communication_id,
            **body.model_dump(exclude_unset=True),
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Communication not found")


@router.delete("/communications/{communication_id}", status_code=204)
def remove_communication(
    organization_id: int,
    communication_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        comms.delete_communication(conn, organization_id, communication_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Communication not found")
    return Response(status_code=204)


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


# --- client funds -----------------------------------------------------------


@router.get("/trust-accounts")
def get_trust_accounts(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return trust.list_accounts(conn, organization_id)


@router.post("/trust-accounts", status_code=201)
def post_trust_account(
    organization_id: int,
    body: TrustAccountIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    if membership.role != "owner":
        raise HTTPException(
            status_code=403, detail="Only an owner can open a client-funds account"
        )
    return trust.create_account(conn, organization_id, **body.model_dump())


@router.get("/trust-transactions")
def get_trust_transactions(
    organization_id: int,
    matter_id: int | None = None,
    client_id: int | None = None,
    trust_account_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return trust.list_transactions(
        conn,
        organization_id,
        matter_id=matter_id,
        client_id=client_id,
        trust_account_id=trust_account_id,
        since=since,
        until=until,
    )


@router.get("/matters/{matter_id}/trust-balance")
def get_trust_balance(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return trust.matter_balance(conn, organization_id, matter_id)


@router.post("/trust-transactions", status_code=201)
def post_trust_transaction(
    organization_id: int,
    body: TrustTransactionIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    if membership.role == "lawyer":
        raise HTTPException(
            status_code=403, detail="Only an owner or staff can move client funds"
        )
    try:
        entry = trust.record_transaction(
            conn,
            organization_id,
            recorded_by=membership.clerk_user_id,
            **body.model_dump(),
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"recorded a client-funds {entry.kind.replace('_', ' ')} of "
        f"{entry.currency} {entry.amount}",
        matter_id=entry.matter_id,
        client_id=entry.client_id,
    )
    conn.commit()
    return entry


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


# --- conflict checks --------------------------------------------------------


@router.get("/matters/{matter_id}/conflict-checks")
def get_conflict_checks(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return conflicts.list_checks(conn, organization_id, matter_id)


@router.post("/matters/{matter_id}/conflict-checks", status_code=201)
def post_conflict_check(
    organization_id: int,
    matter_id: int,
    body: ConflictCheckIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        check, hits = conflicts.run_check(
            conn,
            organization_id,
            matter_id,
            terms=body.terms,
            run_by=membership.clerk_user_id,
            notes=body.notes,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    # The hits are returned alongside the stored check so the caller can show
    # what was matched; only the summary is persisted.
    return {"check": check, "hits": hits}


@router.post("/conflict-checks/{check_id}/resolve")
def post_resolve_conflict_check(
    organization_id: int,
    check_id: int,
    body: ConflictResolveIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return conflicts.resolve_check(
            conn,
            organization_id,
            check_id,
            result=body.result,
            cleared_by=membership.clerk_user_id,
            notes=body.notes,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Conflict check not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# --- activity and dashboard -------------------------------------------------


@router.get("/activity")
def get_activity(
    organization_id: int,
    matter_id: int | None = None,
    client_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return activity.list_activity(
        conn, organization_id, matter_id=matter_id, client_id=client_id, limit=limit
    )


@router.get("/dashboard")
def get_dashboard(
    organization_id: int,
    upcoming_days: int = Query(default=30, ge=1, le=365),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return activity.dashboard(conn, organization_id, upcoming_days=upcoming_days)


@router.get("/me")
def get_me(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    clerk_user_id: str = Depends(get_current_user_id),
):
    """The caller's own membership, so the UI knows its role before rendering."""
    return {
        "clerk_user_id": clerk_user_id,
        "organization_id": organization_id,
        "role": membership.role,
        "display_name": membership.display_name,
        "title": membership.title,
    }
