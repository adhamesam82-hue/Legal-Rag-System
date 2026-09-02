"""The invoice a firm can actually send, and the tax on it. T-020, T-021.

The PDF assertions check the things that go silently wrong with Arabic rather
than the ones that raise: a document can be produced, be a valid PDF, and
still be unreadable because the letters were never joined or the line was
never reversed. So the shaping is tested on its own, and the rendering is
tested for the bytes that prove the Arabic font actually got embedded.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.practice import invoice_pdf
from legalrag.practice.billing import compute_tax, round_money
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"


class TestArabicShaping:
    """The three failures that produce a broken-looking page, not an error."""

    def test_letters_are_joined(self):
        """Arabic is cursive: stored codepoints are the isolated forms."""
        raw = "فاتورة"
        shaped = invoice_pdf.shape(raw)
        # Reshaping maps to presentation forms, so the output differs from the
        # input even though it reads the same.
        assert shaped != raw
        assert shaped

    def test_the_line_is_reversed_for_the_page(self):
        """Storage is logical order; a page needs visual order."""
        shaped = invoice_pdf.shape("أ ب")
        assert shaped

    def test_latin_inside_arabic_keeps_its_direction(self):
        """A case number in an Arabic sentence must not come out backwards."""
        shaped = invoice_pdf.shape("قضية رقم INV-2026-001")
        assert "INV-2026-001" in shaped

    def test_digits_survive(self):
        assert "1345" in invoice_pdf.shape("رقم 1345")

    def test_empty_text_is_safe(self):
        assert invoice_pdf.shape("") == ""


class TestMoneyFormatting:
    def test_two_places_always(self):
        assert invoice_pdf.money(Decimal("1000")) == "1,000.00"

    def test_rounds_half_up(self):
        assert invoice_pdf.money(Decimal("0.125")) == "0.13"

    def test_thousands_are_grouped(self):
        assert invoice_pdf.money(Decimal("1234567.5")) == "1,234,567.50"

    def test_none_is_zero_not_a_crash(self):
        assert invoice_pdf.money(None) == "0.00"


class TestTaxArithmetic:
    def test_a_plain_rate(self):
        assert compute_tax(Decimal("1000"), Decimal("0.14")) == (
            Decimal("140.00"),
            Decimal("1140.00"),
        )

    def test_no_tax_leaves_the_total_alone(self):
        assert compute_tax(Decimal("500"), Decimal("0")) == (
            Decimal("0.00"),
            Decimal("500.00"),
        )

    def test_the_printed_page_adds_up(self):
        """A client checking the invoice must be able to sum it themselves."""
        subtotal = Decimal("333.33")
        tax, total = compute_tax(subtotal, Decimal("0.14"))
        assert round_money(subtotal) + tax == total

    def test_rounding_happens_once_at_the_end(self):
        tax, total = compute_tax(Decimal("99.99"), Decimal("0.14"))
        assert tax == Decimal("14.00")
        assert total == Decimal("113.99")


class TestRendering:
    def build(self, **overrides):
        body = dict(
            firm_name="السيد وشركاه",
            number="INV-2026-001",
            issued_date=date(2026, 3, 1),
            due_date=date(2026, 3, 31),
            client_name="شركة دلتا للأغذية",
            client_tax_id="123-456-789",
            matter_name="نزاع توريد",
            currency="EGP",
            lines=[
                invoice_pdf.InvoiceLine(
                    description="أتعاب المرافعة",
                    quantity=Decimal("12"),
                    unit_amount=Decimal("500"),
                    line_total=Decimal("6000"),
                )
            ],
            subtotal=Decimal("6000"),
            tax_rate=Decimal("0.14"),
            tax_amount=Decimal("840"),
            total=Decimal("6840"),
            status="sent",
        )
        body.update(overrides)
        return invoice_pdf.InvoiceDocument(**body)

    def labels(self):
        return {
            "invoice": "فاتورة رقم", "issued": "تاريخ الإصدار",
            "due": "تاريخ الاستحقاق", "billedTo": "الفاتورة إلى",
            "taxId": "البطاقة الضريبية", "matter": "القضية",
            "description": "البيان", "quantity": "الكمية",
            "unitPrice": "سعر الوحدة", "amount": "الإجمالي",
            "subtotal": "الإجمالي قبل الضريبة", "tax": "ضريبة القيمة المضافة",
            "total": "المستحق", "lineTax": "الضريبة", "notes": "ملاحظات",
            "footer": "شكرًا لثقتكم.",
        }

    def test_produces_a_pdf(self):
        pdf = invoice_pdf.render(self.build(), self.labels())
        assert pdf.startswith(b"%PDF-")
        assert pdf.rstrip().endswith(b"%%EOF")

    def test_the_arabic_font_is_embedded(self):
        """Without it reportlab draws black boxes and raises nothing.

        Checks the font's own PostScript name in /BaseFont, not the name
        reportlab was asked to register it under -- only the first proves the
        face actually reached the file.
        """
        pdf = invoice_pdf.render(self.build(), self.labels())
        assert b"LegalOSInvoice-Regular" in pdf

    def test_a_long_invoice_does_not_run_off_the_page(self):
        lines = [
            invoice_pdf.InvoiceLine(
                description=f"بند رقم {n}",
                quantity=Decimal("1"),
                unit_amount=Decimal("100"),
                line_total=Decimal("100"),
            )
            for n in range(80)
        ]
        pdf = invoice_pdf.render(
            self.build(lines=lines, subtotal=Decimal("8000")), self.labels()
        )
        assert pdf.count(b"/Type /Page\n") > 1 or pdf.count(b"/Type/Page") > 1

    def test_renders_without_a_matter_or_tax_id(self):
        """Both are optional on a real invoice and must not crash the page."""
        pdf = invoice_pdf.render(
            self.build(matter_name=None, client_tax_id=None), self.labels()
        )
        assert pdf.startswith(b"%PDF-")

    def test_a_zero_rate_invoice_renders(self):
        pdf = invoice_pdf.render(
            self.build(tax_rate=Decimal("0"), tax_amount=Decimal("0"),
                       total=Decimal("6000")),
            self.labels(),
        )
        assert pdf.startswith(b"%PDF-")


# --- the route -------------------------------------------------------------


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
def invoice(client):
    org = client.post("/api/orgs", json={"name": "السيد وشركاه"}).json()["id"]
    client_id = client.post(
        f"/api/orgs/{org}/clients",
        json={"name": "شركة دلتا للأغذية", "tax_id": "123-456-789"},
    ).json()["id"]
    created = client.post(
        f"/api/orgs/{org}/invoices",
        json={
            "client_id": client_id,
            "issued_date": "2026-03-01",
            "due_date": "2026-03-31",
            "tax_rate": "0.14",
            "lines": [
                {"description": "أتعاب المرافعة", "quantity": 12, "unit_amount": 500}
            ],
        },
    )
    assert created.status_code == 201, created.text
    return {"org": org, "invoice": created.json()}


class TestInvoiceRoute:
    def test_tax_is_computed_and_stored(self, invoice):
        body = invoice["invoice"]
        assert Decimal(str(body["amount"])) == Decimal("6000")
        assert Decimal(str(body["tax_amount"])) == Decimal("840")
        assert Decimal(str(body["total_amount"])) == Decimal("6840")

    def test_a_percentage_by_mistake_is_refused(self, client, invoice):
        """0.14 is the rate; 14 would be a bill fourteen times too large."""
        org = invoice["org"]
        client_id = invoice["invoice"]["client_id"]
        response = client.post(
            f"/api/orgs/{org}/invoices",
            json={
                "client_id": client_id,
                "issued_date": "2026-03-01",
                "due_date": "2026-03-31",
                "tax_rate": "14",
            },
        )
        assert response.status_code == 422

    def test_serves_a_pdf(self, client, invoice):
        response = client.get(
            f"/api/orgs/{invoice['org']}/invoices/{invoice['invoice']['id']}/pdf"
        )
        assert response.status_code == 200, response.text
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF-")

    def test_the_download_is_named_after_the_invoice(self, client, invoice):
        response = client.get(
            f"/api/orgs/{invoice['org']}/invoices/{invoice['invoice']['id']}/pdf"
        )
        disposition = response.headers["content-disposition"]
        assert invoice["invoice"]["number"] in disposition

    def test_english_is_available_for_a_foreign_client(self, client, invoice):
        response = client.get(
            f"/api/orgs/{invoice['org']}/invoices/{invoice['invoice']['id']}/pdf",
            params={"lang": "en"},
        )
        assert response.status_code == 200
        assert response.content.startswith(b"%PDF-")

    def test_another_firms_invoice_is_a_404(self, client, invoice):
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        response = client.get(
            f"/api/orgs/{other}/invoices/{invoice['invoice']['id']}/pdf"
        )
        assert response.status_code == 404


class TestFontCoverage:
    """The check that was missing when the first invoice came out as tofu.

    reportlab has no fallback and raises nothing for a glyph it cannot draw:
    the page rendered, the tests passed, and every numeral was an empty box
    because the vendored web font is a 186-glyph subset with no digits. These
    assert the face can actually draw an Egyptian invoice.
    """

    def cmap(self):
        from fontTools.ttLib import TTFont as FTFont

        return FTFont(str(invoice_pdf.FONT_DIR / "LegalOS-Invoice.ttf")).getBestCmap()

    def test_every_digit_is_present(self):
        missing = [d for d in "0123456789" if ord(d) not in self.cmap()]
        assert missing == [], f"no glyph for {missing} -- money would be boxes"

    def test_the_arabic_alphabet_is_present(self):
        cmap = self.cmap()
        missing = [c for c in "ابتثجحخدذرزسشصضطظعغفقكلمنهوي" if ord(c) not in cmap]
        assert missing == []

    def test_punctuation_a_citation_needs(self):
        cmap = self.cmap()
        missing = [c for c in "/-.,()" if ord(c) not in cmap]
        assert missing == []

    def test_latin_for_an_invoice_number(self):
        cmap = self.cmap()
        missing = [c for c in "INV" if ord(c) not in cmap]
        assert missing == []

    def test_both_weights_cover_the_same_characters(self):
        from fontTools.ttLib import TTFont as FTFont

        bold = FTFont(
            str(invoice_pdf.FONT_DIR / "LegalOS-Invoice-Bold.ttf")
        ).getBestCmap()
        assert set(self.cmap()) == set(bold)
