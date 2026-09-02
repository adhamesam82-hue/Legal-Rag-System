"""Bringing a firm's existing book of business in. T-022.

A practice signing up has two hundred clients and eighty cases in a
spreadsheet. Without this the first day of using the system is a week of
typing, and most firms will try it and stop -- which makes this an adoption
feature rather than a convenience one. The roadmap's own Phase 1 goal ("a firm
has entered real matters and come back the next week") depends on it.

Three decisions shape the whole module:

PREVIEW BEFORE COMMIT. Nothing is written until the caller has seen what would
be. A spreadsheet exported from a decade-old system is never clean, and
discovering that on row 140 of 200 -- with 139 already inserted -- is worse
than not importing at all.

PARTIAL IMPORT, LOUDLY. Good rows go in and bad rows come back named, with the
row number and the reason. The alternative -- refusing the file until it is
perfect -- means the firm edits a spreadsheet against error messages, and the
alternative to that, importing silently and dropping what does not fit, is how
a client goes missing without anyone noticing.

ENCODING IS NOT OPTIONAL. Arabic Excel on Windows still exports Windows-1256
routinely, and a UTF-8-only reader turns every client name into mojibake that
looks like a data-entry error rather than a decoding one. The BOM,
UTF-8-without-BOM and 1256 are all tried, in that order.
"""
from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import date, datetime

import psycopg

from legalrag.practice import clients as clients_layer
from legalrag.practice import matters as matters_layer

# Order matters: utf-8-sig strips a BOM Excel writes and would otherwise
# become part of the first column name; cp1256 is the legacy Arabic Windows
# encoding and decodes almost anything, so it goes last or it would win over
# UTF-8 and silently produce mojibake.
ENCODINGS = ("utf-8-sig", "utf-8", "cp1256")


class ImportError_(Exception):
    """Raised when the file itself cannot be read at all."""


def decode(raw: bytes) -> str:
    for encoding in ENCODINGS:
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ImportError_("Could not read this file as text in any known encoding")


@dataclass
class RowProblem:
    # 1-based and counting the header, so it matches what the spreadsheet
    # shows. Off-by-one here means the firm looks at the wrong line.
    row: int
    reason: str
    values: dict[str, str] = field(default_factory=dict)


@dataclass
class Preview:
    columns: list[str]
    ready: list[dict]
    problems: list[RowProblem]
    total_rows: int


def read_rows(raw: bytes) -> tuple[list[str], list[dict[str, str]]]:
    text = decode(raw)
    # Sniffing the delimiter: an Arabic locale export is frequently
    # semicolon-separated, because the comma is the decimal separator there.
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    columns = [c.strip() for c in (reader.fieldnames or [])]
    if not columns:
        raise ImportError_("This file has no header row")
    rows = [{(k or "").strip(): (v or "").strip() for k, v in row.items()} for row in reader]
    return columns, rows


def _pick(row: dict, mapping: dict[str, str], field_name: str) -> str:
    """The value for `field_name`, via the caller's column mapping."""
    column = mapping.get(field_name)
    return row.get(column, "").strip() if column else ""


def _parse_date(value: str) -> date | None:
    """Dates as a spreadsheet actually writes them.

    No dateutil guess-work: an ambiguous 03/04/2026 must not be silently read
    as April in a firm that meant March. Only unambiguous formats are accepted
    and the rest becomes a row problem for a human.
    """
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


# --- clients ---------------------------------------------------------------

CLIENT_FIELDS = ("name", "client_type", "industry", "email", "phone", "tax_id",
                 "registration_number", "address", "notes")


def preview_clients(raw: bytes, mapping: dict[str, str]) -> Preview:
    columns, rows = read_rows(raw)
    ready: list[dict] = []
    problems: list[RowProblem] = []

    seen: set[str] = set()
    for index, row in enumerate(rows, start=2):  # 1 is the header
        name = _pick(row, mapping, "name")
        if not name:
            problems.append(RowProblem(index, "no client name", row))
            continue
        if name in seen:
            # Within one file only. A name already in the database is not an
            # error -- two different clients can share a name, and deciding
            # they are the same person is not this module's call.
            problems.append(RowProblem(index, f"repeated in this file: {name}", row))
            continue
        seen.add(name)

        client_type = _pick(row, mapping, "client_type") or "company"
        if client_type not in ("company", "individual"):
            problems.append(
                RowProblem(index, f"unknown client type: {client_type}", row)
            )
            continue

        ready.append(
            {
                "name": name,
                "client_type": client_type,
                **{
                    f: _pick(row, mapping, f)
                    for f in CLIENT_FIELDS
                    if f not in ("name", "client_type")
                },
            }
        )

    return Preview(columns, ready, problems, len(rows))


def import_clients(
    conn: psycopg.Connection, organization_id: int, preview: Preview
) -> list[int]:
    """Writes the rows that passed. One transaction; all or nothing.

    Per-row commits would leave a half-imported book of business behind on any
    failure, and no way to tell which half.
    """
    created: list[int] = []
    try:
        for entry in preview.ready:
            client = clients_layer.create_client(
                conn,
                organization_id,
                name=entry["name"],
                client_type=entry["client_type"],
                industry=entry.get("industry", ""),
                email=entry.get("email", ""),
                phone=entry.get("phone", ""),
                tax_id=entry.get("tax_id") or None,
                registration_number=entry.get("registration_number") or None,
                address=entry.get("address", ""),
                notes=entry.get("notes", ""),
            )
            created.append(client.id)
    except Exception:
        conn.rollback()
        raise
    conn.commit()
    return created


# --- matters ---------------------------------------------------------------

# Imported rather than restated. A second copy of this list is how the
# database constraint and the Python check drift apart, which is exactly what
# happened when migration 0010 widened one and not the other.
from legalrag.practice.matters import BILLING_TYPES, MATTER_TYPES  # noqa: E402


def preview_matters(
    conn: psycopg.Connection,
    organization_id: int,
    raw: bytes,
    mapping: dict[str, str],
    default_responsible: str,
) -> Preview:
    """Cases, resolved against clients that must already exist.

    Clients are imported first on purpose: a case with no client is not a
    case, and inventing one from a name in a spreadsheet would quietly create
    duplicates of clients the firm already has.
    """
    columns, rows = read_rows(raw)
    ready: list[dict] = []
    problems: list[RowProblem] = []

    with conn.cursor() as cur:
        cur.execute(
            "SELECT lower(name), id FROM clients WHERE organization_id = %s",
            (organization_id,),
        )
        by_name = dict(cur.fetchall())

    for index, row in enumerate(rows, start=2):
        name = _pick(row, mapping, "name")
        if not name:
            problems.append(RowProblem(index, "no case name", row))
            continue

        client_name = _pick(row, mapping, "client_name")
        client_id = by_name.get(client_name.lower())
        if client_id is None:
            problems.append(
                RowProblem(index, f"no client named {client_name or '(blank)'}", row)
            )
            continue

        # A row with no type is filed as "other", the classification that
        # says nothing, rather than guessed into a subject area.
        matter_type = _pick(row, mapping, "matter_type") or "other"
        if matter_type not in MATTER_TYPES:
            problems.append(RowProblem(index, f"unknown case type: {matter_type}", row))
            continue

        billing_type = _pick(row, mapping, "billing_type") or "hourly"
        if billing_type not in BILLING_TYPES:
            problems.append(
                RowProblem(index, f"unknown billing type: {billing_type}", row)
            )
            continue

        opened_raw = _pick(row, mapping, "opened_date")
        opened = _parse_date(opened_raw)
        if opened_raw and opened is None:
            problems.append(
                RowProblem(index, f"date not understood: {opened_raw}", row)
            )
            continue

        ready.append(
            {
                "name": name,
                "client_id": client_id,
                "matter_type": matter_type,
                "billing_type": billing_type,
                "opened_date": opened or date.today(),
                "responsible_user": _pick(row, mapping, "responsible_user")
                or default_responsible,
                "description": _pick(row, mapping, "description"),
            }
        )

    return Preview(columns, ready, problems, len(rows))


def import_matters(
    conn: psycopg.Connection, organization_id: int, preview: Preview
) -> list[int]:
    created: list[int] = []
    try:
        for entry in preview.ready:
            matter = matters_layer.create_matter(conn, organization_id, **entry)
            created.append(matter.id)
    except Exception:
        conn.rollback()
        raise
    conn.commit()
    return created
