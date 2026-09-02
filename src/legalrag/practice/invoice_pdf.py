"""The invoice a firm actually sends. T-020.

Until this existed the system could compute an invoice and not deliver one:
the billing cycle ran hours -> invoice -> nothing, and a firm that cannot send
a bill does not stay.

ARABIC IS THE WHOLE DIFFICULTY
------------------------------
Three things have to happen in order, and skipping any one produces a PDF that
looks broken rather than empty -- which is worse, because it reads as the
firm's fault in front of their client.

  1. The glyphs must be JOINED. Arabic is cursive: the same letter has
     different shapes at the start, middle and end of a word, and the stored
     codepoints are the isolated forms. arabic_reshaper picks the right ones.
  2. The run must be REORDERED. Storage is logical order (first letter first);
     the page needs visual order (first letter rightmost). python-bidi does
     that, and it also gets the mixed case right -- an Arabic sentence holding
     a Latin case number or a figure keeps those left-to-right inside the
     right-to-left line, which naive reversal destroys.
  3. The font must HAVE the glyphs, ALL of them. reportlab has no fallback:
     one face draws the whole string and anything it lacks becomes an empty
     box, with no error. The first invoice rendered here was shaped and laid
     out perfectly with every numeral, date and money figure a row of tofu,
     because the web fonts vendored for the landing page are subsets -- 186
     glyphs and not one digit. assets/fonts/LegalOS-Invoice.ttf is built by
     scripts/build_pdf_font.py, merging Noto Naskh Arabic with Archivo's
     Latin and numerals into one face that covers the whole page.

Money is formatted here rather than in the template: an invoice is the one
document where a rounding difference is an argument with a client.
"""
from __future__ import annotations

import io
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FONT_DIR = Path(__file__).resolve().parent.parent.parent.parent / "assets" / "fonts"
REGULAR = "LegalOS"
BOLD = "LegalOS-Bold"

_fonts_registered = False


def _register_fonts() -> None:
    """Registered once per process, lazily.

    Not at import: a deployment that never renders an invoice should not pay
    for reading two font files, and an import-time failure would take the whole
    API down over a feature most requests never touch.
    """
    global _fonts_registered
    if _fonts_registered:
        return
    pdfmetrics.registerFont(TTFont(REGULAR, str(FONT_DIR / "LegalOS-Invoice.ttf")))
    pdfmetrics.registerFont(TTFont(BOLD, str(FONT_DIR / "LegalOS-Invoice-Bold.ttf")))
    _fonts_registered = True


def shape(text: str) -> str:
    """Arabic text as it must be drawn: joined, then laid out right to left."""
    if not text:
        return ""
    return get_display(arabic_reshaper.reshape(text))


def money(amount: Decimal | float | int | None) -> str:
    """Two places, half-up, always.

    Decimal on the way in and quantized here: an invoice is the one document
    where a half-piastre difference becomes a conversation with a client.
    """
    if amount is None:
        amount = 0
    value = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"{value:,.2f}"


@dataclass(frozen=True)
class InvoiceLine:
    description: str
    quantity: Decimal
    unit_amount: Decimal
    line_total: Decimal
    # Per-line tax (0024). The tax column appears only when some line has a
    # rate; an invoice taxed as a whole prints exactly as it did before.
    tax_rate: Decimal = Decimal(0)
    tax_amount: Decimal = Decimal(0)


@dataclass(frozen=True)
class InvoiceDocument:
    """Everything the page shows, already resolved. No database in here."""

    firm_name: str
    number: str
    issued_date: date | None
    due_date: date | None
    client_name: str
    client_tax_id: str | None
    matter_name: str | None
    currency: str
    lines: list[InvoiceLine]
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total: Decimal
    status: str
    # Free text under the totals, the lawyer's own line breaks kept.
    notes: str = ""


# --- layout ---------------------------------------------------------------

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 18 * mm
# Right-aligned by default: the page reads right to left, so the text edge
# every line starts from is the right one.
RIGHT = PAGE_WIDTH - MARGIN
LEFT = MARGIN


def _rtl(c: canvas.Canvas, y: float, text: str, size: int = 10, bold: bool = False):
    c.setFont(BOLD if bold else REGULAR, size)
    c.drawRightString(RIGHT, y, shape(text))


def _ltr(c: canvas.Canvas, y: float, text: str, size: int = 10, bold: bool = False):
    c.setFont(BOLD if bold else REGULAR, size)
    c.drawString(LEFT, y, text)


def wrap(text: str, max_width: float, size: int, font: str = REGULAR) -> list[str]:
    """The lawyer's paragraph as lines that fit between the margins.

    Breaks on the author's own newlines first, then on spaces, measuring the
    SHAPED form of each candidate: joined Arabic is narrower than its
    isolated codepoints, so measuring the raw string would wrap too early.
    A single word wider than the page is emitted on its own line rather than
    dropped -- a bank account number is one word.
    """
    out: list[str] = []
    for paragraph in text.replace("\r\n", "\n").split("\n"):
        words = paragraph.split()
        if not words:
            out.append("")
            continue
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if pdfmetrics.stringWidth(shape(candidate), font, size) <= max_width:
                current = candidate
            else:
                out.append(current)
                current = word
        out.append(current)
    return out


def render(document: InvoiceDocument, labels: dict[str, str]) -> bytes:
    """Draw the invoice and return the PDF bytes.

    `labels` carries every visible word, so the caller decides the language
    rather than this module hard-coding one. The layout is right-to-left
    either way -- an Egyptian firm's letterhead is, whichever language the
    body is in.
    """
    _register_fonts()
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    c.setTitle(f"{labels['invoice']} {document.number}")

    y = PAGE_HEIGHT - MARGIN

    # --- letterhead
    _rtl(c, y, document.firm_name, size=18, bold=True)
    y -= 9 * mm
    _rtl(c, y, f"{labels['invoice']} {document.number}", size=13, bold=True)
    y -= 6 * mm

    if document.issued_date:
        _rtl(c, y, f"{labels['issued']}: {document.issued_date.isoformat()}", size=9)
        y -= 5 * mm
    if document.due_date:
        _rtl(c, y, f"{labels['due']}: {document.due_date.isoformat()}", size=9)
        y -= 5 * mm

    y -= 3 * mm
    c.setStrokeColor(colors.HexColor("#CFD3D8"))
    c.line(LEFT, y, RIGHT, y)
    y -= 8 * mm

    # --- who it is for
    _rtl(c, y, labels["billedTo"], size=9, bold=True)
    y -= 5 * mm
    _rtl(c, y, document.client_name, size=11)
    y -= 5 * mm
    if document.client_tax_id:
        # Required on an Egyptian invoice to a registered client, and it was
        # stored on the client record without ever reaching the document.
        _rtl(c, y, f"{labels['taxId']}: {document.client_tax_id}", size=9)
        y -= 5 * mm
    if document.matter_name:
        _rtl(c, y, f"{labels['matter']}: {document.matter_name}", size=9)
        y -= 5 * mm

    y -= 5 * mm

    # --- lines
    # With a tax column the numeric columns pack tighter to keep room for
    # the description; without one the page is laid out as it always was.
    has_line_tax = any(line.tax_rate > 0 for line in document.lines)
    if has_line_tax:
        col_tax = LEFT + 28 * mm
        col_total = LEFT + 54 * mm
        col_unit = LEFT + 80 * mm
    else:
        col_tax = None
        col_total = LEFT + 32 * mm
        col_unit = LEFT + 66 * mm

    c.setFillColor(colors.HexColor("#4A5058"))
    _rtl(c, y, labels["description"], size=9, bold=True)
    c.setFont(BOLD, 9)
    c.drawString(LEFT, y, shape(labels["amount"]))
    if col_tax is not None:
        c.drawString(col_tax, y, shape(labels["lineTax"]))
    c.drawString(col_total, y, shape(labels["unitPrice"]))
    c.drawString(col_unit, y, shape(labels["quantity"]))
    c.setFillColor(colors.black)
    y -= 3 * mm
    c.line(LEFT, y, RIGHT, y)
    y -= 6 * mm

    for line in document.lines:
        if y < MARGIN + 60 * mm:
            c.showPage()
            _register_fonts()
            y = PAGE_HEIGHT - MARGIN
        _rtl(c, y, line.description, size=9)
        c.setFont(REGULAR, 9)
        c.drawString(LEFT, y, money(line.line_total))
        if col_tax is not None:
            # "140.00 (14%)"; a zero-rate line on a mixed invoice shows "0.00"
            # so the client sees it was not taxed rather than not printed.
            rate = (line.tax_rate * 100).quantize(Decimal("0.01"))
            cell = f"{money(line.tax_amount)} ({rate:g}%)" if line.tax_rate > 0 else money(0)
            c.drawString(col_tax, y, cell)
        c.drawString(col_total, y, money(line.unit_amount))
        c.drawString(col_unit, y, money(line.quantity))
        y -= 6 * mm

    y -= 2 * mm
    c.line(LEFT, y, RIGHT, y)
    y -= 8 * mm

    # --- totals
    def total_row(label: str, value: str, bold: bool = False, size: int = 10):
        nonlocal y
        c.setFont(BOLD if bold else REGULAR, size)
        c.drawRightString(RIGHT, y, shape(label))
        c.drawString(LEFT, y, f"{value} {document.currency}")
        y -= 6 * mm

    total_row(labels["subtotal"], money(document.subtotal))
    if has_line_tax:
        # The rates are on the lines; the invoice-level figure is derived
        # and would read as a rate nobody charged.
        total_row(labels["tax"], money(document.tax_amount))
    elif document.tax_rate > 0:
        rate = (document.tax_rate * 100).quantize(Decimal("0.01"))
        total_row(f"{labels['tax']} ({rate:g}%)", money(document.tax_amount))
    total_row(labels["total"], money(document.total), bold=True, size=12)

    # --- notes
    if document.notes.strip():
        y -= 4 * mm
        if y < MARGIN + 30 * mm:
            c.showPage()
            _register_fonts()
            y = PAGE_HEIGHT - MARGIN
        _rtl(c, y, labels["notes"], size=9, bold=True)
        y -= 5 * mm
        for text_line in wrap(document.notes.strip(), RIGHT - LEFT, 9):
            if y < MARGIN + 12 * mm:
                c.showPage()
                _register_fonts()
                y = PAGE_HEIGHT - MARGIN
            if text_line:
                _rtl(c, y, text_line, size=9)
            y -= 5 * mm

    # --- footer
    c.setFont(REGULAR, 8)
    c.setFillColor(colors.HexColor("#767D86"))
    c.drawRightString(RIGHT, MARGIN, shape(labels["footer"]))

    c.showPage()
    c.save()
    return buffer.getvalue()
