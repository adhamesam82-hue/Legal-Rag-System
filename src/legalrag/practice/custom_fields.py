"""Custom fields — the things a firm tracks that this schema cannot anticipate.

A referral source, a tax file number, a court circuit, an internal risk band.
Definitions belong to the firm; values hang off a matter.

Values are stored as text and interpreted against their definition's
field_type. One column per type would make "which column holds this field" a
second source of truth alongside field_type, and the two would drift. Parsing
therefore happens here, on the way in, so an unparseable value is rejected at
the point someone types it rather than discovered by a report months later.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

FIELD_TYPES = ("text", "number", "date", "checkbox", "select")
_TRUE = ("true", "yes", "1")
_FALSE = ("false", "no", "0")


@dataclass
class FieldDefinition:
    id: int
    organization_id: int
    field_key: str
    label: str
    field_type: str
    options: list[str]
    is_required: bool
    display_order: int
    matter_type: str | None
    created_at: datetime


@dataclass
class FieldValue:
    definition_id: int
    matter_id: int
    field_key: str
    label: str
    field_type: str
    options: list[str]
    is_required: bool
    display_order: int
    value: str | None
    updated_at: datetime | None


_DEFINITION_COLUMNS = """
    id, organization_id, field_key, label, field_type, options, is_required,
    display_order, matter_type, created_at
"""


def list_definitions(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_type: str | None = None,
) -> list[FieldDefinition]:
    sql = (
        f"SELECT {_DEFINITION_COLUMNS} FROM custom_field_definitions "
        "WHERE organization_id = %s"
    )
    params: list[object] = [organization_id]
    if matter_type:
        # A definition with no matter_type applies everywhere, so it belongs in
        # the result for every type rather than only the unfiltered list.
        sql += " AND (matter_type IS NULL OR matter_type = %s)"
        params.append(matter_type)
    sql += " ORDER BY display_order, id"
    return fetch_all(conn, FieldDefinition, sql, tuple(params))


def create_definition(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    field_key: str,
    label: str,
    field_type: str,
    options: list[str] | None = None,
    is_required: bool = False,
    display_order: int = 0,
    matter_type: str | None = None,
) -> FieldDefinition:
    if field_type not in FIELD_TYPES:
        raise ValueError(f"invalid field_type {field_type!r}")
    options = [o for o in (options or []) if o.strip()]
    if field_type == "select" and not options:
        raise ValueError("a select field needs at least one option")
    if field_type != "select" and options:
        raise ValueError(f"a {field_type} field cannot carry options")
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO custom_field_definitions (organization_id, field_key, "
            "label, field_type, options, is_required, display_order, matter_type) "
            f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING {_DEFINITION_COLUMNS}",
            (
                organization_id, field_key, label, field_type, options,
                is_required, display_order, matter_type,
            ),
        )
        row = cur.fetchone()
    conn.commit()
    return FieldDefinition(*row)


_DEFINITION_UPDATABLE = {
    "label", "options", "is_required", "display_order", "matter_type",
}


def update_definition(
    conn: psycopg.Connection, organization_id: int, definition_id: int, **changes
) -> FieldDefinition:
    """Edits a definition's presentation. field_type and field_key are fixed.

    Changing either would reinterpret values already stored against it — a
    date field turned into a checkbox does not have "true" in every row.
    """
    fields = {
        k: v for k, v in changes.items()
        if k in _DEFINITION_UPDATABLE and v is not None
    }
    if not fields:
        definition = _get_definition(conn, organization_id, definition_id)
        if definition is None:
            raise NotFoundError(f"custom field {definition_id}")
        return definition
    assignments = ", ".join(f"{name} = %s" for name in fields)
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE custom_field_definitions SET {assignments} "
            "WHERE organization_id = %s AND id = %s",
            (*fields.values(), organization_id, definition_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"custom field {definition_id}")
    conn.commit()
    definition = _get_definition(conn, organization_id, definition_id)
    assert definition is not None
    return definition


def _get_definition(
    conn: psycopg.Connection, organization_id: int, definition_id: int
) -> FieldDefinition | None:
    return fetch_one(
        conn,
        FieldDefinition,
        f"SELECT {_DEFINITION_COLUMNS} FROM custom_field_definitions "
        "WHERE organization_id = %s AND id = %s",
        (organization_id, definition_id),
    )


def delete_definition(
    conn: psycopg.Connection, organization_id: int, definition_id: int
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM custom_field_definitions "
            "WHERE organization_id = %s AND id = %s",
            (organization_id, definition_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"custom field {definition_id}")
    conn.commit()


# --- values on a matter -----------------------------------------------------


def list_matter_values(
    conn: psycopg.Connection, organization_id: int, matter_id: int
) -> list[FieldValue]:
    """Every definition that applies to this matter, with its value or None.

    A LEFT JOIN from definitions, not from values: a field the firm defined but
    nobody has filled in still has to appear, or it can never be filled in.
    """
    return fetch_all(
        conn,
        FieldValue,
        """
        SELECT d.id AS definition_id, %s AS matter_id, d.field_key, d.label,
               d.field_type, d.options, d.is_required, d.display_order,
               v.value, v.updated_at
          FROM custom_field_definitions d
          LEFT JOIN matter_custom_values v
                 ON v.definition_id = d.id AND v.matter_id = %s
          JOIN matters m ON m.id = %s AND m.organization_id = d.organization_id
         WHERE d.organization_id = %s
           AND (d.matter_type IS NULL OR d.matter_type = m.matter_type)
         ORDER BY d.display_order, d.id
        """,
        (matter_id, matter_id, matter_id, organization_id),
    )


def _normalize(field_type: str, options: list[str], value: str | None) -> str | None:
    """Validates a raw value against its definition and returns it canonically.

    Empty means "not set" for every type, which is why clearing a field is not
    a special case.
    """
    if value is None or value.strip() == "":
        return None
    value = value.strip()
    if field_type == "number":
        try:
            return str(Decimal(value))
        except InvalidOperation:
            raise ValueError(f"{value!r} is not a number")
    if field_type == "date":
        try:
            return date.fromisoformat(value).isoformat()
        except ValueError:
            raise ValueError(f"{value!r} is not a date in YYYY-MM-DD form")
    if field_type == "checkbox":
        lowered = value.lower()
        if lowered in _TRUE:
            return "true"
        if lowered in _FALSE:
            return "false"
        raise ValueError(f"{value!r} is not a yes/no value")
    if field_type == "select" and value not in options:
        raise ValueError(f"{value!r} is not one of the field's options")
    return value


def set_matter_value(
    conn: psycopg.Connection,
    organization_id: int,
    matter_id: int,
    definition_id: int,
    value: str | None,
) -> FieldValue:
    definition = _get_definition(conn, organization_id, definition_id)
    if definition is None:
        raise NotFoundError(f"custom field {definition_id}")
    normalized = _normalize(definition.field_type, definition.options, value)
    if normalized is None and definition.is_required:
        raise ValueError(f"{definition.label} is required")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")
        if normalized is None:
            # Clearing removes the row rather than storing an empty one, so
            # "never filled in" and "cleared" are the same state.
            cur.execute(
                "DELETE FROM matter_custom_values "
                "WHERE matter_id = %s AND definition_id = %s",
                (matter_id, definition_id),
            )
        else:
            cur.execute(
                "INSERT INTO matter_custom_values (matter_id, definition_id, value) "
                "VALUES (%s, %s, %s) ON CONFLICT (matter_id, definition_id) "
                "DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
                (matter_id, definition_id, normalized),
            )
    conn.commit()
    return FieldValue(
        definition_id=definition.id,
        matter_id=matter_id,
        field_key=definition.field_key,
        label=definition.label,
        field_type=definition.field_type,
        options=definition.options,
        is_required=definition.is_required,
        display_order=definition.display_order,
        value=normalized,
        updated_at=datetime.now() if normalized else None,
    )
