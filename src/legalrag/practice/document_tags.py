"""Document tags: a vocabulary each firm owns.

A tag is a row the firm creates, renames and deletes, not an entry in a list
the code ships. The eight seeded with a new firm are suggestions; nothing
here ever re-plants them, so a firm that deletes them all is simply a firm
with no tags.

Every query is scoped by organization_id. A tag id from another firm is a
404 on every route, never a read -- tags name a firm's own working state
("urgent", "final judgment") and that is nobody else's business.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import psycopg
from psycopg.errors import UniqueViolation

from legalrag.practice import NotFoundError, fetch_all, fetch_one

# Token names from the design system's Badge palette (the non-semantic set).
# Must stay in step with the CHECK in migration 0023.
COLORS = ("blue", "cyan", "green", "orange", "pink", "purple", "red", "teal", "yellow")

# What a new firm starts with. Arabic because that is what the screen shows;
# a firm renames them like any other tag.
DEFAULT_TAGS: tuple[tuple[str, str], ...] = (
    ("عاجل", "red"),
    ("للمراجعة", "orange"),
    ("تمت المراجعة", "green"),
    ("أولوية عالية", "pink"),
    ("أصل", "blue"),
    ("صورة", "cyan"),
    ("جلسة قادمة", "purple"),
    ("حكم نهائي", "teal"),
)

_COLUMNS = "t.id, t.organization_id, t.name, t.color, t.created_at"
# The list carries how many documents each tag is on, so the tree can show a
# count without loading the documents. One correlated subquery per row on a
# list of a few dozen tags is cheaper than a second request.
_LIST_COLUMNS = (
    _COLUMNS
    + ", (SELECT count(*) FROM document_tag_links l WHERE l.tag_id = t.id) AS document_count"
)


class DuplicateTagError(Exception):
    """A tag with that name already exists in this firm."""


@dataclass
class Tag:
    id: int
    organization_id: int
    name: str
    color: str
    created_at: datetime
    # Only filled by list_tags; single-tag reads leave it at 0.
    document_count: int = 0


def _validate(name: str | None, color: str | None) -> None:
    if name is not None and not name.strip():
        raise ValueError("tag name must not be empty")
    if color is not None and color not in COLORS:
        raise ValueError(f"invalid color {color!r}; one of {', '.join(COLORS)}")


def list_tags(conn: psycopg.Connection, organization_id: int) -> list[Tag]:
    return fetch_all(
        conn,
        Tag,
        f"SELECT {_LIST_COLUMNS} FROM document_tags t WHERE t.organization_id = %s "
        "ORDER BY t.name",
        (organization_id,),
    )


def get_tag(conn: psycopg.Connection, organization_id: int, tag_id: int) -> Tag | None:
    return fetch_one(
        conn,
        Tag,
        f"SELECT {_COLUMNS} FROM document_tags t "
        "WHERE t.organization_id = %s AND t.id = %s",
        (organization_id, tag_id),
    )


def create_tag(
    conn: psycopg.Connection, organization_id: int, *, name: str, color: str = "blue"
) -> Tag:
    _validate(name, color)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO document_tags (organization_id, name, color) "
                "VALUES (%s, %s, %s) RETURNING id",
                (organization_id, name.strip(), color),
            )
            tag_id = cur.fetchone()[0]
        conn.commit()
    except UniqueViolation:
        conn.rollback()
        raise DuplicateTagError(name)
    tag = get_tag(conn, organization_id, tag_id)
    assert tag is not None
    return tag


def update_tag(
    conn: psycopg.Connection,
    organization_id: int,
    tag_id: int,
    *,
    name: str | None = None,
    color: str | None = None,
) -> Tag:
    _validate(name, color)
    fields: dict[str, object] = {}
    if name is not None:
        fields["name"] = name.strip()
    if color is not None:
        fields["color"] = color
    if fields:
        assignments = ", ".join(f"{k} = %s" for k in fields)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE document_tags SET {assignments} "
                    "WHERE organization_id = %s AND id = %s",
                    (*fields.values(), organization_id, tag_id),
                )
                if cur.rowcount == 0:
                    raise NotFoundError(f"tag {tag_id}")
            conn.commit()
        except UniqueViolation:
            conn.rollback()
            raise DuplicateTagError(name or "")
    tag = get_tag(conn, organization_id, tag_id)
    if tag is None:
        raise NotFoundError(f"tag {tag_id}")
    return tag


def delete_tag(conn: psycopg.Connection, organization_id: int, tag_id: int) -> None:
    """Removes the tag and its links. The documents it was on are untouched."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM document_tags WHERE organization_id = %s AND id = %s",
            (organization_id, tag_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"tag {tag_id}")
    conn.commit()


def set_document_tags(
    conn: psycopg.Connection, organization_id: int, document_id: int, tag_ids: list[int]
) -> list[int]:
    """Replaces the document's tags with exactly `tag_ids`.

    Replace rather than add: the screen sends what is ticked, and "what is
    ticked" is the whole answer. Every id must belong to this firm, or the
    call is a 404 and nothing changes -- a foreign id is not skipped quietly.
    """
    wanted = list(dict.fromkeys(tag_ids))  # de-duplicated, order kept
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM documents WHERE organization_id = %s AND id = %s",
            (organization_id, document_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"document {document_id}")
        if wanted:
            cur.execute(
                "SELECT id FROM document_tags WHERE organization_id = %s AND id = ANY(%s)",
                (organization_id, wanted),
            )
            known = {row[0] for row in cur.fetchall()}
            missing = [t for t in wanted if t not in known]
            if missing:
                raise NotFoundError(f"tag {missing[0]}")
        cur.execute("DELETE FROM document_tag_links WHERE document_id = %s", (document_id,))
        for tag_id in wanted:
            cur.execute(
                "INSERT INTO document_tag_links (document_id, tag_id) VALUES (%s, %s)",
                (document_id, tag_id),
            )
    conn.commit()
    return wanted


def seed_default_tags(conn: psycopg.Connection, organization_id: int) -> None:
    """Plants the eight suggestions for a brand-new firm. Does not commit --
    it runs inside create_organization's transaction, so a firm is never
    created without them or left with them and no firm."""
    with conn.cursor() as cur:
        for name, color in DEFAULT_TAGS:
            cur.execute(
                "INSERT INTO document_tags (organization_id, name, color) "
                "VALUES (%s, %s, %s) ON CONFLICT (organization_id, name) DO NOTHING",
                (organization_id, name, color),
            )
