"""Clients and their contacts."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

CLIENT_TYPES = ("company", "individual")
CLIENT_STATUSES = ("active", "inactive")

_CLIENT_COLUMNS = """
    id, organization_id, name, client_type, industry, status, client_since,
    registration_number, tax_id, address, phone, email, notes, created_at
"""


@dataclass
class Contact:
    id: int
    name: str
    title: str
    email: str
    phone: str
    is_primary: bool


@dataclass
class Client:
    id: int
    organization_id: int
    name: str
    client_type: str
    industry: str
    status: str
    client_since: date | None
    registration_number: str | None
    tax_id: str | None
    address: str
    phone: str
    email: str
    notes: str | None
    created_at: datetime
    contacts: list[Contact] = field(default_factory=list)


def _attach_contacts(conn: psycopg.Connection, clients: list[Client]) -> list[Client]:
    """Loads contacts for many clients in one query rather than one per client."""
    if not clients:
        return clients
    by_id = {c.id: c for c in clients}
    with conn.cursor() as cur:
        cur.execute(
            "SELECT client_id, id, name, title, email, phone, is_primary "
            "FROM client_contacts WHERE client_id = ANY(%s) "
            "ORDER BY is_primary DESC, name",
            (list(by_id),),
        )
        for client_id, *values in cur.fetchall():
            by_id[client_id].contacts.append(Contact(*values))
    return clients


def list_clients(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    status: str | None = None,
    query: str | None = None,
) -> list[Client]:
    sql = f"SELECT {_CLIENT_COLUMNS} FROM clients WHERE organization_id = %s"
    params: list[object] = [organization_id]
    if status:
        sql += " AND status = %s"
        params.append(status)
    if query:
        sql += " AND (name ILIKE %s OR industry ILIKE %s)"
        params += [f"%{query}%", f"%{query}%"]
    sql += " ORDER BY name"
    return _attach_contacts(conn, fetch_all(conn, Client, sql, tuple(params)))


def get_client(
    conn: psycopg.Connection, organization_id: int, client_id: int
) -> Client | None:
    client = fetch_one(
        conn,
        Client,
        f"SELECT {_CLIENT_COLUMNS} FROM clients "
        "WHERE organization_id = %s AND id = %s",
        (organization_id, client_id),
    )
    if client is None:
        return None
    return _attach_contacts(conn, [client])[0]


def create_client(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    name: str,
    client_type: str,
    industry: str = "",
    status: str = "active",
    client_since: date | None = None,
    registration_number: str | None = None,
    tax_id: str | None = None,
    address: str = "",
    phone: str = "",
    email: str = "",
    notes: str | None = None,
) -> Client:
    if client_type not in CLIENT_TYPES:
        raise ValueError(f"invalid client_type {client_type!r}")
    if status not in CLIENT_STATUSES:
        raise ValueError(f"invalid status {status!r}")
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO clients (organization_id, name, client_type, industry, "
            "status, client_since, registration_number, tax_id, address, phone, "
            "email, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
            "RETURNING id",
            (
                organization_id, name, client_type, industry, status, client_since,
                registration_number, tax_id, address, phone, email, notes,
            ),
        )
        client_id = cur.fetchone()[0]
    conn.commit()
    client = get_client(conn, organization_id, client_id)
    assert client is not None  # just inserted, in this transaction's view
    return client


_UPDATABLE = {
    "name", "client_type", "industry", "status", "client_since",
    "registration_number", "tax_id", "address", "phone", "email", "notes",
}


def update_client(
    conn: psycopg.Connection, organization_id: int, client_id: int, **changes
) -> Client:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    if not fields:
        client = get_client(conn, organization_id, client_id)
        if client is None:
            raise NotFoundError(f"client {client_id}")
        return client
    if "client_type" in fields and fields["client_type"] not in CLIENT_TYPES:
        raise ValueError(f"invalid client_type {fields['client_type']!r}")
    if "status" in fields and fields["status"] not in CLIENT_STATUSES:
        raise ValueError(f"invalid status {fields['status']!r}")

    assignments = ", ".join(f"{name} = %s" for name in fields)
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE clients SET {assignments}, updated_at = now() "
            "WHERE organization_id = %s AND id = %s",
            (*fields.values(), organization_id, client_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"client {client_id}")
    conn.commit()
    client = get_client(conn, organization_id, client_id)
    assert client is not None
    return client


def delete_client(
    conn: psycopg.Connection, organization_id: int, client_id: int
) -> None:
    """Deletes a client that has no matters.

    Matters reference clients ON DELETE RESTRICT, so a client with history
    cannot be deleted out from under it; that surfaces here as an IntegrityError
    for the route layer to turn into a 409.
    """
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM clients WHERE organization_id = %s AND id = %s",
            (organization_id, client_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"client {client_id}")
    conn.commit()


# --- contacts ---------------------------------------------------------------


def _assert_client(
    conn: psycopg.Connection, organization_id: int, client_id: int
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM clients WHERE organization_id = %s AND id = %s",
            (organization_id, client_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"client {client_id}")


def add_contact(
    conn: psycopg.Connection,
    organization_id: int,
    client_id: int,
    *,
    name: str,
    title: str = "",
    email: str = "",
    phone: str = "",
    is_primary: bool = False,
) -> Contact:
    _assert_client(conn, organization_id, client_id)
    with conn.cursor() as cur:
        if is_primary:
            # A partial unique index allows only one primary per client, so
            # demote the incumbent in the same transaction rather than letting
            # the insert fail.
            cur.execute(
                "UPDATE client_contacts SET is_primary = FALSE "
                "WHERE client_id = %s AND is_primary",
                (client_id,),
            )
        cur.execute(
            "INSERT INTO client_contacts (client_id, name, title, email, phone, "
            "is_primary) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (client_id, name, title, email, phone, is_primary),
        )
        contact_id = cur.fetchone()[0]
    conn.commit()
    return Contact(contact_id, name, title, email, phone, is_primary)


def delete_contact(
    conn: psycopg.Connection, organization_id: int, client_id: int, contact_id: int
) -> None:
    _assert_client(conn, organization_id, client_id)
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM client_contacts WHERE client_id = %s AND id = %s",
            (client_id, contact_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"contact {contact_id}")
    conn.commit()
