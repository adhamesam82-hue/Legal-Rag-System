"""Matter documents: metadata rows plus the uploaded bytes on disk.

Files live under get_document_root() at <organization_id>/<uuid><suffix>. The
organization prefix means a path traversal in a stored key still cannot escape
into another tenant's directory, and the uuid means two uploads of the same
filename do not collide.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import psycopg

from legalrag.config import get_document_root
from legalrag.practice import NotFoundError, fetch_all, fetch_one

STATUSES = ("draft", "under_review", "signed", "filed", "final")

_COLUMNS = """
    d.id, d.organization_id, d.matter_id, m.name AS matter_name, d.name,
    d.doc_type, d.status, d.size_bytes, d.content_type, d.storage_key,
    d.uploaded_by, d.uploaded_at
"""


@dataclass
class Document:
    id: int
    organization_id: int
    matter_id: int | None
    matter_name: str | None
    name: str
    doc_type: str
    status: str
    size_bytes: int
    content_type: str
    storage_key: str | None
    uploaded_by: str
    uploaded_at: datetime

    @property
    def has_file(self) -> bool:
        return self.storage_key is not None


def list_documents(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    status: str | None = None,
    query: str | None = None,
) -> list[Document]:
    sql = (
        f"SELECT {_COLUMNS} FROM documents d LEFT JOIN matters m ON m.id = d.matter_id "
        "WHERE d.organization_id = %s"
    )
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND d.matter_id = %s"
        params.append(matter_id)
    if status:
        sql += " AND d.status = %s"
        params.append(status)
    if query:
        sql += " AND d.name ILIKE %s"
        params.append(f"%{query}%")
    sql += " ORDER BY d.uploaded_at DESC, d.id DESC"
    return fetch_all(conn, Document, sql, tuple(params))


def get_document(
    conn: psycopg.Connection, organization_id: int, document_id: int
) -> Document | None:
    return fetch_one(
        conn,
        Document,
        f"SELECT {_COLUMNS} FROM documents d LEFT JOIN matters m ON m.id = d.matter_id "
        "WHERE d.organization_id = %s AND d.id = %s",
        (organization_id, document_id),
    )


def create_document(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    name: str,
    uploaded_by: str,
    matter_id: int | None = None,
    doc_type: str = "",
    status: str = "draft",
    content: bytes | None = None,
    content_type: str = "application/octet-stream",
) -> Document:
    """Creates a document row, writing `content` to disk when bytes are given."""
    if status not in STATUSES:
        raise ValueError(f"invalid status {status!r}")

    storage_key: str | None = None
    size_bytes = 0
    if content is not None:
        suffix = Path(name).suffix
        storage_key = f"{organization_id}/{uuid.uuid4().hex}{suffix}"
        destination = get_document_root() / storage_key
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        size_bytes = len(content)

    try:
        with conn.cursor() as cur:
            if matter_id is not None:
                cur.execute(
                    "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
                    (organization_id, matter_id),
                )
                if cur.fetchone() is None:
                    raise NotFoundError(f"matter {matter_id}")
            cur.execute(
                "INSERT INTO documents (organization_id, matter_id, name, doc_type, "
                "status, size_bytes, content_type, storage_key, uploaded_by) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (
                    organization_id, matter_id, name, doc_type, status, size_bytes,
                    content_type, storage_key, uploaded_by,
                ),
            )
            document_id = cur.fetchone()[0]
        conn.commit()
    except Exception:
        # Do not leave bytes on disk that no row points at.
        if storage_key:
            (get_document_root() / storage_key).unlink(missing_ok=True)
        conn.rollback()
        raise

    document = get_document(conn, organization_id, document_id)
    assert document is not None
    return document


def read_document_bytes(document: Document) -> bytes:
    if document.storage_key is None:
        raise NotFoundError(f"document {document.id} has no stored file")
    path = get_document_root() / document.storage_key
    if not path.is_file():
        raise NotFoundError(f"document {document.id} file is missing from storage")
    return path.read_bytes()


_UPDATABLE = {"name", "doc_type", "status", "matter_id"}


def update_document(
    conn: psycopg.Connection, organization_id: int, document_id: int, **changes
) -> Document:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    if "status" in fields and fields["status"] not in STATUSES:
        raise ValueError(f"invalid status {fields['status']!r}")
    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE documents SET {assignments} "
                "WHERE organization_id = %s AND id = %s",
                (*fields.values(), organization_id, document_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"document {document_id}")
        conn.commit()
    document = get_document(conn, organization_id, document_id)
    if document is None:
        raise NotFoundError(f"document {document_id}")
    return document


def delete_document(
    conn: psycopg.Connection, organization_id: int, document_id: int
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM documents WHERE organization_id = %s AND id = %s "
            "RETURNING storage_key",
            (organization_id, document_id),
        )
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(f"document {document_id}")
    conn.commit()
    # After the commit: a file left behind by a failed delete is recoverable,
    # a row pointing at bytes already unlinked is not.
    if row[0]:
        (get_document_root() / row[0]).unlink(missing_ok=True)
