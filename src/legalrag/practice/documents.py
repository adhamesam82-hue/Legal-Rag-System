"""Matter documents: metadata rows plus the uploaded bytes on disk.

Files live under get_document_root() at <organization_id>/<uuid><suffix>. The
organization prefix means a path traversal in a stored key still cannot escape
into another tenant's directory, and the uuid means two uploads of the same
filename do not collide.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import psycopg

from legalrag.config import get_document_root
from legalrag.orgs import Membership
from legalrag.practice import NotFoundError, fetch_all, fetch_one
from legalrag.practice.scope import UNRESTRICTED, nullable_matter_visibility

STATUSES = ("draft", "under_review", "signed", "filed", "final")

# What a document IS, not what format it is in -- content_type holds that.
# Must stay in step with the CHECK in migration 0023. Anything a firm typed
# before 0023 is in doc_type_legacy.
DOC_TYPES = (
    "brief",
    "judgment",
    "contract",
    "poa",
    "evidence",
    "police_report",
    "identity",
    "receipt",
    "correspondence",
    "form",
    "other",
)

_COLUMNS = """
    d.id, d.organization_id, d.matter_id, m.name AS matter_name, d.name,
    d.doc_type, d.status, d.size_bytes, d.content_type, d.storage_key,
    d.uploaded_by, d.uploaded_at, d.visible_to_client, d.doc_type_legacy,
    coalesce((SELECT array_agg(l.tag_id ORDER BY l.tag_id)
                FROM document_tag_links l WHERE l.document_id = d.id), '{}') AS tag_ids
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
    # Whether the client on this matter may see it through their portal.
    # Read here as well as written by the portal route, because a firm that
    # cannot see which documents it has shared cannot tell that it shared one.
    visible_to_client: bool = False
    # What the firm had typed into doc_type before 0023 made it a list.
    # Empty for anything created since.
    doc_type_legacy: str = ""
    # Ids from document_tags, ascending. Read with the row so a list of a
    # hundred documents does not become a hundred more queries.
    tag_ids: list[int] = field(default_factory=list)

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
    doc_type: str | None = None,
    client_id: int | None = None,
    tag_ids: list[int] | None = None,
    viewer: Membership | None = None,
) -> list[Document]:
    visible, visible_params = (
        nullable_matter_visibility("d.matter_id", viewer) if viewer else UNRESTRICTED
    )
    sql = (
        f"SELECT {_COLUMNS} FROM documents d LEFT JOIN matters m ON m.id = d.matter_id "
        f"WHERE d.organization_id = %s AND {visible}"
    )
    params: list[object] = [organization_id, *visible_params]
    if matter_id is not None:
        sql += " AND d.matter_id = %s"
        params.append(matter_id)
    if client_id is not None:
        # Documents reach a client through the matter they are filed on.
        sql += " AND m.client_id = %s"
        params.append(client_id)
    if status:
        sql += " AND d.status = %s"
        params.append(status)
    if doc_type:
        sql += " AND d.doc_type = %s"
        params.append(doc_type)
    if tag_ids:
        # Every tag, not any: "urgent AND for review" is the question a lawyer
        # asks; a document must carry each id in the list.
        wanted = sorted(set(tag_ids))
        sql += (
            " AND (SELECT count(*) FROM document_tag_links l "
            "WHERE l.document_id = d.id AND l.tag_id = ANY(%s)) = %s"
        )
        params.extend([wanted, len(wanted)])
    if query:
        sql += " AND d.name ILIKE %s"
        params.append(f"%{query}%")
    sql += " ORDER BY d.uploaded_at DESC, d.id DESC"
    return fetch_all(conn, Document, sql, tuple(params))


def get_document(
    conn: psycopg.Connection,
    organization_id: int,
    document_id: int,
    viewer: Membership | None = None,
) -> Document | None:
    """One document, or None -- including when it is filed on a case the
    viewer is not on. This is the id-guessing route the scope exists to close:
    filtering the case list alone leaves every document reachable directly."""
    visible, visible_params = (
        nullable_matter_visibility("d.matter_id", viewer) if viewer else UNRESTRICTED
    )
    return fetch_one(
        conn,
        Document,
        f"SELECT {_COLUMNS} FROM documents d LEFT JOIN matters m ON m.id = d.matter_id "
        f"WHERE d.organization_id = %s AND d.id = %s AND {visible}",
        (organization_id, document_id, *visible_params),
    )


def create_document(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    name: str,
    uploaded_by: str,
    matter_id: int | None = None,
    doc_type: str = "other",
    status: str = "draft",
    content: bytes | None = None,
    content_type: str = "application/octet-stream",
) -> Document:
    """Creates a document row, writing `content` to disk when bytes are given."""
    if status not in STATUSES:
        raise ValueError(f"invalid status {status!r}")
    if doc_type not in DOC_TYPES:
        raise ValueError(f"invalid doc_type {doc_type!r}; one of {', '.join(DOC_TYPES)}")

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
    if "doc_type" in fields and fields["doc_type"] not in DOC_TYPES:
        raise ValueError(f"invalid doc_type {fields['doc_type']!r}")
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
