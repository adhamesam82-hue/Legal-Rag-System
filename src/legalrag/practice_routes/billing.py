"""Routes for billing."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


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
    except ValueError as exc:
        # Line tax and invoice tax on the same bill, or a rate out of range
        # that got past the model (e.g. via `amount` without lines).
        conn.rollback()
        raise HTTPException(status_code=422, detail=str(exc))
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
            # Accepted by the model since T-021 and never passed on: every
            # generated invoice came out untaxed whatever the caller sent.
            tax_rate=body.tax_rate,
            notes=body.notes,
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


# Every visible word on the PDF, so the module that draws it holds no
# language of its own. Arabic is the default because the firm and its clients
# are; `lang=en` is there for a foreign client on the same matter.
_PDF_LABELS = {
    "ar": {
        "invoice": "فاتورة رقم",
        "issued": "تاريخ الإصدار",
        "due": "تاريخ الاستحقاق",
        "billedTo": "الفاتورة إلى",
        "taxId": "البطاقة الضريبية",
        "matter": "القضية",
        "description": "البيان",
        "quantity": "الكمية",
        "unitPrice": "سعر الوحدة",
        "amount": "الإجمالي",
        "subtotal": "الإجمالي قبل الضريبة",
        "tax": "ضريبة القيمة المضافة",
        "total": "المستحق",
        "lineTax": "الضريبة",
        "notes": "ملاحظات",
        "footer": "شكرًا لثقتكم.",
    },
    "en": {
        "invoice": "Invoice",
        "issued": "Issued",
        "due": "Due",
        "billedTo": "Billed to",
        "taxId": "Tax ID",
        "matter": "Case",
        "description": "Description",
        "quantity": "Qty",
        "unitPrice": "Unit price",
        "amount": "Amount",
        "subtotal": "Subtotal",
        "tax": "VAT",
        "total": "Total due",
        "lineTax": "Tax",
        "notes": "Notes",
        "footer": "Thank you for your business.",
    },
}


@router.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(
    organization_id: int,
    invoice_id: int,
    lang: Literal["ar", "en"] = "ar",
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """The invoice as a document the firm can send.

    Until this existed the billing cycle ran hours -> invoice -> nothing: the
    system could compute a bill and not deliver one.
    """
    invoice = found(billing.get_invoice(conn, organization_id, invoice_id), "Invoice")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT name FROM organizations WHERE id = %s", (organization_id,)
        )
        row = cur.fetchone()
    firm_name = row[0] if row else ""

    document = invoice_pdf.InvoiceDocument(
        firm_name=firm_name,
        number=invoice.number,
        issued_date=invoice.issued_date,
        due_date=invoice.due_date,
        client_name=invoice.client_name,
        client_tax_id=invoice.client_tax_id,
        matter_name=invoice.matter_name,
        currency=invoice.currency,
        lines=[
            invoice_pdf.InvoiceLine(
                description=line.description,
                quantity=line.quantity,
                unit_amount=line.unit_amount,
                line_total=line.line_total,
                tax_rate=line.tax_rate,
                tax_amount=line.tax_amount,
            )
            for line in invoice.lines
        ],
        subtotal=invoice.amount,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        total=invoice.total_amount,
        status=invoice.status,
        notes=invoice.notes,
    )
    pdf = invoice_pdf.render(document, _PDF_LABELS[lang])

    # A filename carrying the invoice number, so a folder of these is
    # navigable. Same RFC 6266 pair as uploaded documents: the number can hold
    # a slash or Arabic.
    serve = uploads.serve_headers(f"{invoice.number}.pdf", "application/pdf")
    return Response(content=pdf, media_type="application/pdf", headers=serve.headers)
