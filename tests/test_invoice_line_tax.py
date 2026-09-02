"""T-026: notes on the invoice, tax per line, and the promise that 0024 keeps.

The arithmetic is tested without a database because it is pure; the routes
and the migration's effect on stored rows need Postgres, in the style of
tests/test_invoice_pdf.py.
"""
from __future__ import annotations

import re
from decimal import Decimal
from pathlib import Path

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.practice import invoice_pdf
from legalrag.practice.billing import compute_tax, price_lines, totals_of
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"
MIGRATION = Path(__file__).resolve().parent.parent / "migrations" / "0024_invoice_notes_line_tax.sql"


# --- arithmetic, no database -------------------------------------------------


class TestPerLineTax:
    def test_the_ticket_example(self):
        """1000 at 14% and 500 at 0: subtotal 1500, tax 140, total 1640."""
        priced = price_lines([
            {"description": "fees", "quantity": 1, "unit_amount": 1000, "tax_rate": "0.14"},
            {"description": "court fee", "quantity": 1, "unit_amount": 500},
        ])
        amount, rate, tax, total = totals_of(priced, Decimal(0))
        assert (amount, tax, total) == (Decimal("1500.00"), Decimal("140.00"), Decimal("1640.00"))
        # The invoice rate is derived for display, not an input.
        assert rate == Decimal("0.0933")

    def test_each_line_is_rounded_once(self):
        priced = price_lines([
            {"description": "a", "quantity": 1, "unit_amount": "99.99", "tax_rate": "0.14"},
            {"description": "b", "quantity": 3, "unit_amount": "33.335", "tax_rate": "0.14"},
        ])
        assert priced[0].tax_amount == Decimal("14.00")  # 13.9986 -> 14.00, once
        assert priced[1].line_total == Decimal("100.01")  # 100.005 half-up, once
        assert priced[1].tax_amount == Decimal("14.00")  # 14.0014 -> 14.00
        amount, _, tax, total = totals_of(priced, Decimal(0))
        # The printed page adds up: lines -> subtotal, taxes -> tax, both -> total.
        assert amount == priced[0].line_total + priced[1].line_total
        assert tax == priced[0].tax_amount + priced[1].tax_amount
        assert total == amount + tax

    def test_two_different_rates_sum_correctly(self):
        priced = price_lines([
            {"description": "a", "unit_amount": 1000, "tax_rate": "0.14"},
            {"description": "b", "unit_amount": 1000, "tax_rate": "0.05"},
        ])
        _, _, tax, total = totals_of(priced, Decimal(0))
        assert tax == Decimal("190.00")
        assert total == Decimal("2190.00")

    def test_no_line_tax_behaves_exactly_as_before(self):
        """An invoice taxed as a whole goes through compute_tax unchanged."""
        priced = price_lines([
            {"description": "a", "quantity": 12, "unit_amount": 500},
        ])
        assert totals_of(priced, Decimal("0.14")) == (
            Decimal("6000.00"), Decimal("0.14"), *compute_tax(Decimal("6000"), Decimal("0.14")),
        )
        assert all(p.tax_rate == 0 and p.tax_amount == 0 for p in priced)

    def test_both_kinds_of_tax_at_once_are_refused(self):
        priced = price_lines([{"description": "a", "unit_amount": 100, "tax_rate": "0.14"}])
        with pytest.raises(ValueError):
            totals_of(priced, Decimal("0.14"))

    def test_a_percentage_on_a_line_is_refused(self):
        with pytest.raises(ValueError):
            price_lines([{"description": "a", "unit_amount": 100, "tax_rate": 14}])

    def test_an_empty_invoice_has_no_derived_rate(self):
        assert totals_of([], Decimal(0)) == (Decimal("0.00"), Decimal(0), Decimal("0.00"), Decimal("0.00"))


class TestMigrationTouchesNoExistingFigure:
    """0024 must not rewrite a single stored total. Checked on the SQL itself,
    since CI applies every migration before any row exists to compare."""

    def statements(self) -> str:
        sql = MIGRATION.read_text(encoding="utf-8")
        return "\n".join(line for line in sql.splitlines() if not line.lstrip().startswith("--"))

    def test_no_update_and_no_recompute(self):
        body = self.statements()
        assert not re.search(r"\bUPDATE\b", body, re.I)
        assert "total_amount" not in body
        assert "tax_amount" not in body.split("invoice_lines")[0]  # only on the lines table

    def test_every_new_column_has_a_default(self):
        body = self.statements()
        for column in ("notes", "tax_rate", "tax_amount"):
            assert re.search(rf"ADD COLUMN {column}\b[^;]*DEFAULT", body), column


# --- rendering, no database ---------------------------------------------------


class TestRendering:
    def labels(self):
        return {
            "invoice": "فاتورة رقم", "issued": "تاريخ الإصدار", "due": "تاريخ الاستحقاق",
            "billedTo": "الفاتورة إلى", "taxId": "البطاقة الضريبية", "matter": "القضية",
            "description": "البيان", "quantity": "الكمية", "unitPrice": "سعر الوحدة",
            "amount": "الإجمالي", "subtotal": "الإجمالي قبل الضريبة",
            "tax": "ضريبة القيمة المضافة", "total": "المستحق", "lineTax": "الضريبة",
            "notes": "ملاحظات", "footer": "شكرًا لثقتكم.",
        }

    def build(self, **overrides):
        from datetime import date

        body = dict(
            firm_name="السيد وشركاه", number="INV-2026-007",
            issued_date=date(2026, 3, 1), due_date=date(2026, 3, 31),
            client_name="شركة دلتا", client_tax_id=None, matter_name=None, currency="EGP",
            lines=[
                invoice_pdf.InvoiceLine("أتعاب", Decimal(1), Decimal(1000), Decimal(1000), Decimal("0.14"), Decimal(140)),
                invoice_pdf.InvoiceLine("رسوم", Decimal(1), Decimal(500), Decimal(500)),
            ],
            subtotal=Decimal(1500), tax_rate=Decimal("0.0933"), tax_amount=Decimal(140),
            total=Decimal(1640), status="draft",
        )
        body.update(overrides)
        return invoice_pdf.InvoiceDocument(**body)

    def test_line_tax_and_notes_render(self):
        pdf = invoice_pdf.render(self.build(notes="شروط السداد: خلال ٣٠ يومًا.\nحساب بنكي: 1234567890"), self.labels())
        assert pdf.startswith(b"%PDF-")

    def test_a_long_note_wraps_instead_of_running_off_the_page(self):
        page_width = invoice_pdf.RIGHT - invoice_pdf.LEFT
        long = " ".join(["كلمة"] * 200)
        lines = invoice_pdf.wrap(long, page_width, 9)
        assert len(lines) > 1
        for line in lines:
            from reportlab.pdfbase import pdfmetrics
            invoice_pdf._register_fonts()
            assert pdfmetrics.stringWidth(invoice_pdf.shape(line), invoice_pdf.REGULAR, 9) <= page_width

    def test_the_authors_line_breaks_are_kept(self):
        assert invoice_pdf.wrap("سطر أول\nسطر ثانٍ", 10_000, 9) == ["سطر أول", "سطر ثانٍ"]

    def test_a_word_wider_than_the_page_is_kept_not_dropped(self):
        assert invoice_pdf.wrap("1234567890" * 20, 50, 9) == ["1234567890" * 20]

    def test_a_very_long_note_paginates(self):
        note = "\n".join(f"بند {n} من الملاحظات" for n in range(120))
        pdf = invoice_pdf.render(self.build(notes=note), self.labels())
        assert pdf.count(b"/Type /Page\n") > 1 or pdf.count(b"/Type/Page") > 1


# --- the routes ---------------------------------------------------------------


@pytest.fixture(autouse=True)
def _fresh_limits():
    reset_limits()
    yield
    reset_limits()


@pytest.fixture
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    with connection.cursor() as cur:
        cur.execute("SELECT coalesce(max(id), 0) FROM organizations")
        mark = cur.fetchone()[0]
    yield connection
    drop_organizations_after(connection, mark)
    connection.close()


@pytest.fixture
def client(conn):
    app.dependency_overrides[get_current_user_id] = lambda: OWNER
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user_id, None)


@pytest.fixture
def org(client):
    return client.post("/api/orgs", json={"name": "Tax Firm"}).json()["id"]


@pytest.fixture
def client_id(client, org):
    return client.post(
        f"/api/orgs/{org}/clients", json={"name": "شركة دلتا", "client_type": "company"}
    ).json()["id"]


def post_invoice(client, org, client_id, **extra):
    body = {"client_id": client_id, "issued_date": "2026-03-01", "due_date": "2026-03-31", **extra}
    return client.post(f"/api/orgs/{org}/invoices", json=body)


class TestInvoiceRoutes:
    def test_line_tax_is_stored_per_line_and_summed(self, conn, client, org, client_id):
        response = post_invoice(client, org, client_id, lines=[
            {"description": "أتعاب", "unit_amount": 1000, "tax_rate": "0.14"},
            {"description": "رسوم", "unit_amount": 500},
        ])
        assert response.status_code == 201, response.text
        body = response.json()
        assert Decimal(str(body["amount"])) == Decimal("1500")
        assert Decimal(str(body["tax_amount"])) == Decimal("140")
        assert Decimal(str(body["total_amount"])) == Decimal("1640")
        assert [Decimal(str(line["tax_amount"])) for line in body["lines"]] == [Decimal("140"), Decimal("0")]
        # What the database holds is what the response said.
        with conn.cursor() as cur:
            cur.execute("SELECT amount, tax_amount, total_amount FROM invoices WHERE id = %s", (body["id"],))
            assert cur.fetchone() == (Decimal("1500.00"), Decimal("140.00"), Decimal("1640.00"))
            cur.execute("SELECT tax_rate, tax_amount FROM invoice_lines WHERE invoice_id = %s ORDER BY id", (body["id"],))
            assert cur.fetchall() == [(Decimal("0.1400"), Decimal("140.00")), (Decimal("0.0000"), Decimal("0.00"))]

    def test_an_invoice_taxed_as_a_whole_is_unchanged(self, client, org, client_id):
        body = post_invoice(client, org, client_id, tax_rate="0.14", lines=[
            {"description": "أتعاب", "quantity": 12, "unit_amount": 500},
        ]).json()
        assert Decimal(str(body["tax_amount"])) == Decimal("840")
        assert Decimal(str(body["total_amount"])) == Decimal("6840")
        assert all(Decimal(str(line["tax_rate"])) == 0 for line in body["lines"])

    def test_both_kinds_of_tax_is_a_422(self, client, org, client_id):
        response = post_invoice(client, org, client_id, tax_rate="0.14", lines=[
            {"description": "a", "unit_amount": 100, "tax_rate": "0.14"},
        ])
        assert response.status_code == 422

    def test_notes_round_trip_and_reach_the_pdf(self, client, org, client_id):
        created = post_invoice(client, org, client_id, notes="شروط السداد: ٣٠ يومًا\nحساب: 123").json()
        assert created["notes"] == "شروط السداد: ٣٠ يومًا\nحساب: 123"
        fetched = client.get(f"/api/orgs/{org}/invoices/{created['id']}").json()
        assert fetched["notes"] == created["notes"]
        pdf = client.get(f"/api/orgs/{org}/invoices/{created['id']}/pdf")
        assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF-")

    def test_notes_change_on_a_draft_only(self, client, org, client_id):
        created = post_invoice(client, org, client_id).json()
        assert created["notes"] == ""
        patched = client.patch(f"/api/orgs/{org}/invoices/{created['id']}", json={"notes": "بعد"})
        assert patched.status_code == 200 and patched.json()["notes"] == "بعد"
        assert client.patch(f"/api/orgs/{org}/invoices/{created['id']}", json={"status": "sent"}).status_code == 200
        refused = client.patch(f"/api/orgs/{org}/invoices/{created['id']}", json={"notes": "متأخر"})
        assert refused.status_code == 409
        assert client.get(f"/api/orgs/{org}/invoices/{created['id']}").json()["notes"] == "بعد"

    def test_numbers_are_generated_in_sequence_without_a_gap(self, client, org, client_id):
        first = post_invoice(client, org, client_id).json()["number"]
        second = post_invoice(client, org, client_id).json()["number"]
        assert first.endswith("-0001") and second.endswith("-0002")

    def test_generate_now_honours_the_tax_rate_it_accepted(self, client, org, client_id):
        matter = client.post(f"/api/orgs/{org}/matters", json={
            "client_id": client_id, "name": "m", "billing_type": "hourly",
            "responsible_user": OWNER, "opened_date": "2026-01-05", "matter_type": "corporate",
        }).json()
        client.post(f"/api/orgs/{org}/time-entries", json={
            "matter_id": matter["id"], "entry_date": "2026-02-01", "hours": "2", "rate": "500",
        })
        generated = client.post(f"/api/orgs/{org}/invoices/generate", json={
            "matter_id": matter["id"], "tax_rate": "0.14", "notes": "ملاحظة",
        })
        assert generated.status_code == 201, generated.text
        body = generated.json()
        assert Decimal(str(body["tax_amount"])) == Decimal("140")
        assert Decimal(str(body["total_amount"])) == Decimal("1140")
        assert body["notes"] == "ملاحظة"
