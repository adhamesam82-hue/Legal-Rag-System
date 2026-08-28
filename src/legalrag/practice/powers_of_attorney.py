"""Powers of attorney — the توكيل a firm acts under.

An Egyptian lawyer does not take a step for a client without one. It is
authenticated at the شهر عقاري, it carries a number and a date, and its type
decides what may be done under it:

    general      عام            broad authority
    special      خاص            one defined matter
    litigation   توكيل قضايا     appear and plead in court

Held against the client rather than the matter, because one توكيل commonly
covers several matters for the same client. A matter points at whichever one
authorises it, and may point at none: matters get opened before the توكيل is
signed, and advisory work may never need one.

Same house style as the rest of legalrag.practice: every function takes an
organization_id and filters on it in SQL.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

TYPES = ("general", "special", "litigation")

_COLUMNS = """
    p.id, p.organization_id, p.client_id, c.name AS client_name,
    p.poa_number, p.poa_type, p.issued_on, p.notary_office, p.expires_on,
    p.scan_document_id, p.notes, p.created_at
"""


@dataclass
class PowerOfAttorney:
    id: int
    organization_id: int
    client_id: int
    client_name: str
    poa_number: str
    poa_type: str
    issued_on: date
    notary_office: str
    expires_on: date | None
    scan_document_id: int | None
    notes: str
    created_at: datetime

    def is_expired(self, on: date | None = None) -> bool:
        """Most توكيلات never expire; the ones that do, do."""
        if self.expires_on is None:
            return False
        return self.expires_on < (on or date.today())


def list_powers_of_attorney(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    client_id: int | None = None,
    include_expired: bool = True,
) -> list[PowerOfAttorney]:
    sql = (
        f"SELECT {_COLUMNS} FROM powers_of_attorney p "
        "JOIN clients c ON c.id = p.client_id "
        "WHERE p.organization_id = %s"
    )
    params: list[object] = [organization_id]
    if client_id is not None:
        sql += " AND p.client_id = %s"
        params.append(client_id)
    if not include_expired:
        sql += " AND (p.expires_on IS NULL OR p.expires_on >= CURRENT_DATE)"
    sql += " ORDER BY p.issued_on DESC, p.id DESC"
    return fetch_all(conn, PowerOfAttorney, sql, tuple(params))


def get_power_of_attorney(
    conn: psycopg.Connection, organization_id: int, poa_id: int
) -> PowerOfAttorney | None:
    return fetch_one(
        conn,
        PowerOfAttorney,
        f"SELECT {_COLUMNS} FROM powers_of_attorney p "
        "JOIN clients c ON c.id = p.client_id "
        "WHERE p.organization_id = %s AND p.id = %s",
        (organization_id, poa_id),
    )


def create_power_of_attorney(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    client_id: int,
    poa_number: str,
    poa_type: str,
    issued_on: date,
    notary_office: str = "",
    expires_on: date | None = None,
    scan_document_id: int | None = None,
    notes: str = "",
) -> PowerOfAttorney:
    if poa_type not in TYPES:
        raise ValueError(f"invalid power-of-attorney type {poa_type!r}")
    if expires_on is not None and expires_on < issued_on:
        raise ValueError("a power of attorney cannot expire before it was issued")

    with conn.cursor() as cur:
        # The client has to belong to this firm. Checked here rather than left
        # to the foreign key, which only proves the client exists somewhere.
        cur.execute(
            "SELECT 1 FROM clients WHERE organization_id = %s AND id = %s",
            (organization_id, client_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"client {client_id}")

        cur.execute(
            "INSERT INTO powers_of_attorney (organization_id, client_id, poa_number, "
            "poa_type, issued_on, notary_office, expires_on, scan_document_id, notes) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                organization_id, client_id, poa_number, poa_type, issued_on,
                notary_office, expires_on, scan_document_id, notes,
            ),
        )
        poa_id = cur.fetchone()[0]
    conn.commit()

    created = get_power_of_attorney(conn, organization_id, poa_id)
    assert created is not None
    return created


_UPDATABLE = {
    "poa_number", "poa_type", "issued_on", "notary_office", "expires_on",
    "scan_document_id", "notes",
}


def update_power_of_attorney(
    conn: psycopg.Connection, organization_id: int, poa_id: int, **changes
) -> PowerOfAttorney:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    if "poa_type" in fields and fields["poa_type"] not in TYPES:
        raise ValueError(f"invalid power-of-attorney type {fields['poa_type']!r}")
    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE powers_of_attorney SET {assignments} "
                "WHERE organization_id = %s AND id = %s",
                (*fields.values(), organization_id, poa_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"power of attorney {poa_id}")
        conn.commit()
    updated = get_power_of_attorney(conn, organization_id, poa_id)
    if updated is None:
        raise NotFoundError(f"power of attorney {poa_id}")
    return updated


def delete_power_of_attorney(
    conn: psycopg.Connection, organization_id: int, poa_id: int
) -> None:
    """Deletes the record. Matters pointing at it are left, pointing at nothing.

    That is the schema's ON DELETE SET NULL, and it is the right way round: a
    matter must not vanish because the authority behind it was tidied away.
    """
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM powers_of_attorney WHERE organization_id = %s AND id = %s",
            (organization_id, poa_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"power of attorney {poa_id}")
    conn.commit()


def attach_to_matter(
    conn: psycopg.Connection, organization_id: int, matter_id: int, poa_id: int | None
) -> None:
    """Records which توكيل a matter is being run under, or clears it.

    Both rows are checked against this organization before anything is written,
    so a matter cannot be pointed at another firm's authority.
    """
    with conn.cursor() as cur:
        if poa_id is not None:
            cur.execute(
                "SELECT 1 FROM powers_of_attorney WHERE organization_id = %s AND id = %s",
                (organization_id, poa_id),
            )
            if cur.fetchone() is None:
                raise NotFoundError(f"power of attorney {poa_id}")

        cur.execute(
            "UPDATE matters SET power_of_attorney_id = %s "
            "WHERE organization_id = %s AND id = %s",
            (poa_id, organization_id, matter_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"matter {matter_id}")
    conn.commit()


def expiring_soon(
    conn: psycopg.Connection, organization_id: int, within_days: int = 30
) -> list[PowerOfAttorney]:
    """Authorities about to lapse.

    A توكيل expiring under a live matter stops the firm acting on it, and the
    firm finds out at the counter unless something says so first.
    """
    return fetch_all(
        conn,
        PowerOfAttorney,
        f"SELECT {_COLUMNS} FROM powers_of_attorney p "
        "JOIN clients c ON c.id = p.client_id "
        "WHERE p.organization_id = %s "
        "  AND p.expires_on IS NOT NULL "
        "  AND p.expires_on >= CURRENT_DATE "
        "  AND p.expires_on <= CURRENT_DATE + make_interval(days => %s) "
        "ORDER BY p.expires_on",
        (organization_id, within_days),
    )
