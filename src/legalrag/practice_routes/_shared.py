"""Imports, request bodies and the router every pillar module shares.

practice_api.py was 2,466 lines and 102 routes in one file -- the clearest
structural problem left in the project, and the layer underneath it
(legalrag.practice) had been split into thirteen modules for a long time.

`router` is defined here and MUTATED by each pillar module: they all attach to
the same APIRouter instance, and practice_api imports them in the order the
sections appeared in the original file. That order is preserved deliberately.
FastAPI matches paths in registration order, so reshuffling could change which
route answers a near-collision without any test noticing.

Imported with `*` by the pillar modules. Normally worth avoiding; here it is
the safest possible transform of a mechanical split, because it makes it
impossible for a route to lose a name it used to see.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

import json

from fastapi import (
    APIRouter,
    Depends,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
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
from legalrag.practice import powers_of_attorney as poa
from legalrag.practice import csv_import, invoice_pdf, uploads

router = APIRouter(prefix="/api/orgs/{organization_id}", tags=["practice"])


# Re-exported: `db` moved to legalrag.db so clerk.py can depend on the same
# callable and share one pooled connection per request with the route bodies.
# Deliberately NO __all__ here: the pillar modules star-import this module,
# and an __all__ would hide every name it does not list -- which is exactly
# how the first attempt at this split produced NameError: Query in all of
# them. The re-export of `router` and `db` lives on practice_api instead,
# which is the module callers actually import.


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


LitigationDegree = Literal["first_instance", "appeal", "cassation"]


class CaseIn(BaseModel):
    matter_id: int
    court: str = Field(min_length=1)
    # The number on its own. The judicial year and the court category are
    # separate fields now -- see migration 0010 for why one string could not
    # hold all three.
    case_number: str = Field(min_length=1)
    judicial_year: int | None = Field(default=None, ge=1900, le=2100)
    case_category: str = ""
    litigation_degree: LitigationDegree = "first_instance"
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
    judicial_year: int | None = Field(default=None, ge=1900, le=2100)
    case_category: str | None = None
    litigation_degree: LitigationDegree | None = None
    status: str | None = None
    opposing_party: str | None = None
    opposing_counsel: str | None = None
    filed_date: date | None = None
    ai_summary: str | None = None
    # The case file (0022). Long text; no length cap because a statement of
    # facts is as long as the facts are.
    summary: str | None = None
    facts: str | None = None
    legal_basis: str | None = None
    defences: str | None = None
    procedural_posture: str | None = None
    client_narrative: str | None = None
    # null clears the link; omitted leaves it alone (exclude_unset on the
    # route tells the two apart).
    parent_case_id: int | None = None


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


HearingOutcome = Literal[
    "adjourned", "reserved", "judgment", "struck_out", "joined", "other"
]


class HearingIn(BaseModel):
    matter_id: int
    hearing_date: date
    hearing_time: str = ""
    court: str = ""
    purpose: str = ""
    outcome: HearingOutcome | None = None
    outcome_note: str | None = None
    next_hearing_date: date | None = None


class HearingUpdate(BaseModel):
    """What a clerk records after the sitting."""

    hearing_date: date | None = None
    hearing_time: str | None = None
    court: str | None = None
    purpose: str | None = None
    outcome: HearingOutcome | None = None
    outcome_note: str | None = None
    next_hearing_date: date | None = None


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
    # A fraction, not a percentage: Egyptian VAT is 0.14, not 14. Bounded here
    # so the difference cannot reach the database as a bill fourteen times too
    # large. Stored per invoice, because a reissued 2024 bill must show the
    # rate that applied in 2024.
    tax_rate: Decimal = Field(default=Decimal(0), ge=0, le=1)
    status: Literal["draft", "sent", "paid", "overdue"] = "draft"
    lines: list[InvoiceLineIn] = Field(default_factory=list)


class InvoiceStatusIn(BaseModel):
    status: Literal["draft", "sent", "paid", "overdue"]


class GenerateInvoiceIn(BaseModel):
    matter_id: int
    issued_date: date | None = None
    payment_terms_days: int = Field(default=30, ge=0, le=365)
    include_expenses: bool = True
    # A fraction, not a percentage: Egyptian VAT is 0.14, not 14.
    tax_rate: Decimal = Field(default=Decimal(0), ge=0, le=1)


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
