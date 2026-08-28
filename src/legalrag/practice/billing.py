"""Invoices and invoice lines.

Generating an invoice from unbilled time is the one operation here that has to
be atomic: it inserts the invoice, writes a line per time entry, and stamps
those entries with the new invoice id. If any part fails, none of it holds,
otherwise hours could be marked billed against an invoice that does not exist.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

STATUSES = ("draft", "sent", "paid", "overdue")

_COLUMNS = """
    i.id, i.organization_id, i.matter_id, m.name AS matter_name, i.client_id,
    c.name AS client_name, c.tax_id AS client_tax_id, i.number, i.amount,
    i.tax_rate, i.tax_amount, i.total_amount, i.currency, i.status,
    i.issued_date, i.due_date, i.paid_date, i.created_at
"""

# Two places, half-up. An invoice is the one document where a rounding
# difference becomes an argument with a client, so the rule is stated once
# here and every total goes through it.
CENTS = Decimal("0.01")


def round_money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(CENTS, rounding=ROUND_HALF_UP)


def compute_tax(subtotal: Decimal, tax_rate: Decimal) -> tuple[Decimal, Decimal]:
    """Returns (tax_amount, total). Rounded once, at the end.

    Taxing the rounded subtotal rather than each line keeps the printed
    arithmetic addable: a client checking the page must be able to sum the
    lines, apply the rate, and land on the total.
    """
    subtotal = round_money(subtotal)
    tax_amount = round_money(subtotal * Decimal(tax_rate))
    return tax_amount, round_money(subtotal + tax_amount)


@dataclass
class InvoiceLine:
    id: int
    description: str
    quantity: Decimal
    unit_amount: Decimal
    line_total: Decimal


@dataclass
class Invoice:
    id: int
    organization_id: int
    matter_id: int | None
    matter_name: str | None
    client_id: int
    client_name: str
    # Required on an Egyptian invoice to a registered client. Stored on the
    # client since 0006 and never reached the document until now.
    client_tax_id: str | None
    number: str
    # The sum of the lines, before tax. Unchanged in meaning.
    amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    # What the client actually owes. Its own column so no reader has to work
    # out which figure a given call site meant.
    total_amount: Decimal
    currency: str
    status: str
    issued_date: date
    due_date: date
    paid_date: date | None
    created_at: datetime
    lines: list[InvoiceLine] = field(default_factory=list)

    @property
    def is_overdue(self) -> bool:
        return self.status in ("sent", "overdue") and self.due_date < date.today()


def _load_lines(conn: psycopg.Connection, invoice: Invoice) -> Invoice:
    invoice.lines = fetch_all(
        conn,
        InvoiceLine,
        "SELECT id, description, quantity, unit_amount, line_total "
        "FROM invoice_lines WHERE invoice_id = %s ORDER BY id",
        (invoice.id,),
    )
    return invoice


def list_invoices(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    status: str | None = None,
    client_id: int | None = None,
    matter_id: int | None = None,
) -> list[Invoice]:
    sql = (
        f"SELECT {_COLUMNS} FROM invoices i JOIN clients c ON c.id = i.client_id "
        "LEFT JOIN matters m ON m.id = i.matter_id WHERE i.organization_id = %s"
    )
    params: list[object] = [organization_id]
    if status:
        sql += " AND i.status = %s"
        params.append(status)
    if client_id is not None:
        sql += " AND i.client_id = %s"
        params.append(client_id)
    if matter_id is not None:
        sql += " AND i.matter_id = %s"
        params.append(matter_id)
    sql += " ORDER BY i.issued_date DESC, i.id DESC"
    return fetch_all(conn, Invoice, sql, tuple(params))


def get_invoice(
    conn: psycopg.Connection, organization_id: int, invoice_id: int
) -> Invoice | None:
    invoice = fetch_one(
        conn,
        Invoice,
        f"SELECT {_COLUMNS} FROM invoices i JOIN clients c ON c.id = i.client_id "
        "LEFT JOIN matters m ON m.id = i.matter_id "
        "WHERE i.organization_id = %s AND i.id = %s",
        (organization_id, invoice_id),
    )
    return _load_lines(conn, invoice) if invoice else None


def next_invoice_number(conn: psycopg.Connection, organization_id: int) -> str:
    """Next sequential number in the INV-<year>-<nnnn> series for this firm."""
    year = date.today().year
    prefix = f"INV-{year}-"
    with conn.cursor() as cur:
        cur.execute(
            "SELECT number FROM invoices WHERE organization_id = %s "
            "AND number LIKE %s ORDER BY number DESC LIMIT 1",
            (organization_id, f"{prefix}%"),
        )
        row = cur.fetchone()
    if row is None:
        return f"{prefix}0001"
    try:
        return f"{prefix}{int(row[0].removeprefix(prefix)) + 1:04d}"
    except ValueError:
        # A hand-entered number that does not fit the series; fall back to a
        # count-based suffix rather than crashing invoice creation.
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM invoices WHERE organization_id = %s "
                "AND number LIKE %s",
                (organization_id, f"{prefix}%"),
            )
            return f"{prefix}{cur.fetchone()[0] + 1:04d}"


def create_invoice(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    client_id: int,
    issued_date: date,
    due_date: date,
    matter_id: int | None = None,
    number: str | None = None,
    amount: Decimal = Decimal(0),
    tax_rate: Decimal = Decimal(0),
    currency: str = "EGP",
    status: str = "draft",
    lines: list[dict] | None = None,
) -> Invoice:
    if status not in STATUSES:
        raise ValueError(f"invalid status {status!r}")
    tax_rate = Decimal(str(tax_rate))
    if not (0 <= tax_rate <= 1):
        # A rate is a fraction, not a percentage: 0.14, not 14. Caught here
        # because the difference is a bill fourteen times too large.
        raise ValueError(f"tax rate must be between 0 and 1, got {tax_rate}")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM clients WHERE organization_id = %s AND id = %s",
            (organization_id, client_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"client {client_id}")
        invoice_number = number or next_invoice_number(conn, organization_id)
        cur.execute(
            "INSERT INTO invoices (organization_id, matter_id, client_id, number, "
            "amount, tax_rate, tax_amount, total_amount, currency, status, "
            "issued_date, due_date) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                organization_id, matter_id, client_id, invoice_number, amount,
                tax_rate, *compute_tax(amount, tax_rate), currency, status,
                issued_date, due_date,
            ),
        )
        invoice_id = cur.fetchone()[0]
        total = Decimal(0)
        for line in lines or []:
            quantity = Decimal(str(line.get("quantity", 1)))
            unit_amount = Decimal(str(line.get("unit_amount", 0)))
            line_total = quantity * unit_amount
            total += line_total
            cur.execute(
                "INSERT INTO invoice_lines (invoice_id, description, quantity, "
                "unit_amount, line_total) VALUES (%s, %s, %s, %s, %s)",
                (invoice_id, line["description"], quantity, unit_amount, line_total),
            )
        if lines:
            # The lines are the truth once there are any; recompute rather
            # than trusting an `amount` the caller also passed.
            tax_amount, grand_total = compute_tax(total, tax_rate)
            cur.execute(
                "UPDATE invoices SET amount = %s, tax_amount = %s, total_amount = %s "
                "WHERE id = %s",
                (round_money(total), tax_amount, grand_total, invoice_id),
            )
    conn.commit()
    invoice = get_invoice(conn, organization_id, invoice_id)
    assert invoice is not None
    return invoice


def generate_from_unbilled(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int,
    issued_date: date | None = None,
    payment_terms_days: int = 30,
    include_expenses: bool = True,
    tax_rate: Decimal = Decimal(0),
) -> Invoice:
    """Draft an invoice for every unbilled billable hour and expense on a matter.

    Time and disbursements are recovered on the same invoice because that is
    what a client receives: one bill for the period, fees and outlays together.
    Both are stamped with the invoice id in the same transaction that creates
    it, so neither can be pulled onto a second invoice.
    """
    issued = issued_date or date.today()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT m.client_id FROM matters m "
            "WHERE m.organization_id = %s AND m.id = %s",
            (organization_id, matter_id),
        )
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(f"matter {matter_id}")
        client_id = row[0]

        # FOR UPDATE so a concurrent generate for the same matter cannot select
        # the same entries and bill them onto two invoices.
        cur.execute(
            "SELECT id, entry_date, description, hours, rate, currency "
            "FROM time_entries WHERE organization_id = %s AND matter_id = %s "
            "AND billable AND invoice_id IS NULL ORDER BY entry_date FOR UPDATE",
            (organization_id, matter_id),
        )
        entries = cur.fetchall()

        expense_rows: list[tuple] = []
        if include_expenses:
            cur.execute(
                "SELECT id, entry_date, description, category, quantity, "
                "unit_amount, currency FROM expenses "
                "WHERE organization_id = %s AND matter_id = %s "
                "AND billable AND invoice_id IS NULL ORDER BY entry_date FOR UPDATE",
                (organization_id, matter_id),
            )
            expense_rows = cur.fetchall()

        if not entries and not expense_rows:
            raise ValueError("no unbilled billable time or expenses on this matter")

        currency = entries[0][5] if entries else expense_rows[0][6]
        number = next_invoice_number(conn, organization_id)
        total = sum(hours * rate for _, _, _, hours, rate, _ in entries) + sum(
            quantity * unit for _, _, _, _, quantity, unit, _ in expense_rows
        )
        cur.execute(
            "INSERT INTO invoices (organization_id, matter_id, client_id, number, "
            "amount, tax_rate, tax_amount, total_amount, currency, status, "
            "issued_date, due_date) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'draft', %s, %s) "
            "RETURNING id",
            (
                organization_id, matter_id, client_id, number,
                round_money(total), tax_rate, *compute_tax(total, tax_rate),
                currency, issued, issued + timedelta(days=payment_terms_days),
            ),
        )
        invoice_id = cur.fetchone()[0]
        for entry_id, entry_date, description, hours, rate, _ in entries:
            cur.execute(
                "INSERT INTO invoice_lines (invoice_id, description, quantity, "
                "unit_amount, line_total) VALUES (%s, %s, %s, %s, %s)",
                (
                    invoice_id,
                    f"{entry_date:%Y-%m-%d} — {description}" if description
                    else f"{entry_date:%Y-%m-%d} — legal services",
                    hours,
                    rate,
                    hours * rate,
                ),
            )
            cur.execute(
                "UPDATE time_entries SET invoice_id = %s WHERE id = %s",
                (invoice_id, entry_id),
            )
        for expense_id, entry_date, description, category, quantity, unit, _ in (
            expense_rows
        ):
            label = description or category.replace("_", " ")
            cur.execute(
                "INSERT INTO invoice_lines (invoice_id, description, quantity, "
                "unit_amount, line_total) VALUES (%s, %s, %s, %s, %s)",
                (
                    invoice_id,
                    f"{entry_date:%Y-%m-%d} — {label} (disbursement)",
                    quantity,
                    unit,
                    quantity * unit,
                ),
            )
            cur.execute(
                "UPDATE expenses SET invoice_id = %s WHERE id = %s",
                (invoice_id, expense_id),
            )
    conn.commit()
    invoice = get_invoice(conn, organization_id, invoice_id)
    assert invoice is not None
    return invoice


def update_invoice_status(
    conn: psycopg.Connection, organization_id: int, invoice_id: int, status: str
) -> Invoice:
    if status not in STATUSES:
        raise ValueError(f"invalid status {status!r}")
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE invoices SET status = %s, updated_at = now(), "
            "paid_date = CASE WHEN %s = 'paid' THEN coalesce(paid_date, CURRENT_DATE) "
            "ELSE NULL END WHERE organization_id = %s AND id = %s",
            (status, status, organization_id, invoice_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"invoice {invoice_id}")
    conn.commit()
    invoice = get_invoice(conn, organization_id, invoice_id)
    assert invoice is not None
    return invoice


def delete_invoice(
    conn: psycopg.Connection, organization_id: int, invoice_id: int
) -> None:
    """Deletes a draft invoice and releases its time entries back to unbilled."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM invoices "
            "WHERE organization_id = %s AND id = %s AND status = 'draft'",
            (organization_id, invoice_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"draft invoice {invoice_id}")
    conn.commit()


@dataclass
class BillingSummary:
    outstanding: Decimal
    overdue: Decimal
    paid_this_year: Decimal
    draft_count: int


def summarize(conn: psycopg.Connection, organization_id: int) -> BillingSummary:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              coalesce(sum(amount) FILTER (WHERE status IN ('sent', 'overdue')), 0),
              coalesce(sum(amount) FILTER (WHERE status IN ('sent', 'overdue')
                       AND due_date < CURRENT_DATE), 0),
              coalesce(sum(amount) FILTER (WHERE status = 'paid'
                       AND date_part('year', issued_date) = date_part('year', CURRENT_DATE)), 0),
              count(*) FILTER (WHERE status = 'draft')
            FROM invoices WHERE organization_id = %s
            """,
            (organization_id,),
        )
        return BillingSummary(*cur.fetchone())
