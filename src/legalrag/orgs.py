"""Organizations and memberships.

Clerk owns identity (see clerk.py). This module owns who belongs to which
firm and in what role -- the one piece of tenant state everything else in
the SaaS phase (matters, clients, documents, billing) will hang off later.
"""
from __future__ import annotations

from dataclasses import dataclass

import psycopg

ROLES = ("owner", "lawyer", "staff")


class LastOwnerError(Exception):
    """Raised when an operation would leave an organization with no Owner."""


@dataclass(frozen=True)
class Organization:
    id: int
    name: str
    created_by: str
    # The firm's own details, as shown on /settings and printed on invoices.
    # All optional: an organization is created with a name and nothing else.
    registration_number: str | None = None
    phone: str | None = None
    address: str | None = None
    logo_url: str | None = None


_ORG_COLUMNS = (
    "id, name, created_by, registration_number, phone, address, logo_url"
)


@dataclass(frozen=True)
class Membership:
    id: int
    organization_id: int
    clerk_user_id: str
    role: str
    # Firm-side display identity. Clerk knows a user's name but not their
    # title here, and every practice screen that shows "who is responsible"
    # needs both without a Clerk API call per row. Optional because a
    # membership created by accepting an invite has neither set yet.
    display_name: str | None = None
    title: str | None = None
    # Whether this person sees every case in the firm, or only the ones
    # matter_staff puts them on. Defaults to the open setting here so that a
    # Membership built without it -- in a test, or by older code -- never
    # accidentally hides rows; the database default is the closed one, which
    # is where it matters. See legalrag.practice.scope.
    matter_scope: str = "all"


def create_organization(
    conn: psycopg.Connection, name: str, creator_clerk_user_id: str
) -> Organization:
    """Creates an organization and makes its creator the Owner, atomically."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO organizations (name, created_by) VALUES (%s, %s) RETURNING id",
            (name, creator_clerk_user_id),
        )
        org_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO memberships (organization_id, clerk_user_id, role) "
            "VALUES (%s, %s, 'owner')",
            (org_id, creator_clerk_user_id),
        )
    conn.commit()
    return Organization(id=org_id, name=name, created_by=creator_clerk_user_id)


def get_organization(
    conn: psycopg.Connection, organization_id: int
) -> Organization | None:
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT {_ORG_COLUMNS} FROM organizations WHERE id = %s",
            (organization_id,),
        )
        row = cur.fetchone()
        return Organization(*row) if row else None


_ORG_UPDATABLE = ("name", "registration_number", "phone", "address", "logo_url")


def update_organization(
    conn: psycopg.Connection, organization_id: int, **changes
) -> Organization | None:
    """Edits the firm's own details. Unmentioned fields are left alone.

    None means "not supplied" rather than "clear it", matching the other
    PATCH-shaped updates in this codebase; an empty string is how a field is
    emptied, so a firm that deletes its phone number can actually do so.
    """
    fields = {
        key: value
        for key, value in changes.items()
        if key in _ORG_UPDATABLE and value is not None
    }
    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE organizations SET {assignments}, updated_at = now() "
                "WHERE id = %s",
                (*fields.values(), organization_id),
            )
            if cur.rowcount == 0:
                return None
        conn.commit()
    return get_organization(conn, organization_id)


def list_memberships_for_user(
    conn: psycopg.Connection, clerk_user_id: str
) -> list[Membership]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role "
            "FROM memberships WHERE clerk_user_id = %s",
            (clerk_user_id,),
        )
        return [Membership(*row) for row in cur.fetchall()]


def get_membership(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str
) -> Membership | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role, display_name, "
            "title, matter_scope FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
        row = cur.fetchone()
        return Membership(*row) if row else None


def list_org_members(
    conn: psycopg.Connection, organization_id: int
) -> list[Membership]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role, display_name, title, "
            "matter_scope "
            "FROM memberships WHERE organization_id = %s ORDER BY created_at",
            (organization_id,),
        )
        return [Membership(*row) for row in cur.fetchall()]


def set_member_profile(
    conn: psycopg.Connection,
    organization_id: int,
    clerk_user_id: str,
    *,
    display_name: str | None = None,
    title: str | None = None,
) -> Membership | None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE memberships SET display_name = coalesce(%s, display_name), "
            "title = coalesce(%s, title) "
            "WHERE organization_id = %s AND clerk_user_id = %s "
            "RETURNING id, organization_id, clerk_user_id, role, display_name, title",
            (display_name, title, organization_id, clerk_user_id),
        )
        row = cur.fetchone()
    conn.commit()
    return Membership(*row) if row else None


def add_membership(
    conn: psycopg.Connection,
    organization_id: int,
    clerk_user_id: str,
    role: str,
    email: str | None = None,
) -> Membership:
    """Adds someone to a firm.

    `email` is where the reminder sweep writes to, and it is optional only
    because a membership can be created without one being known. Whoever DOES
    know it must pass it: a member with no address is silently reported as
    undeliverable by the sweep every morning, forever.
    """
    if role not in ROLES:
        raise ValueError(f"invalid role {role!r}; expected one of {ROLES}")
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO memberships (organization_id, clerk_user_id, role, email) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (organization_id, clerk_user_id, role, email),
        )
        membership_id = cur.fetchone()[0]
    conn.commit()
    return Membership(
        id=membership_id,
        organization_id=organization_id,
        clerk_user_id=clerk_user_id,
        role=role,
    )


def remove_membership(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str
) -> None:
    """Removes a member. A no-op if they weren't a member.

    Raises LastOwnerError, and leaves the row in place, rather than ever
    letting an organization end up with zero Owners.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT role FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
        row = cur.fetchone()
        if row is None:
            return
        role = row[0]

        if role == "owner":
            # Lock the org's owner-role rows before counting them, so a
            # concurrent remove_membership call for another owner of the
            # same organization blocks here until this transaction commits
            # or rolls back -- otherwise both could read the same
            # pre-removal owner count under READ COMMITTED and both pass
            # the "at least one Owner" check. (Postgres disallows FOR
            # UPDATE directly on an aggregate query, so lock the rows and
            # count them in Python instead of using SELECT count(*).)
            cur.execute(
                "SELECT id FROM memberships "
                "WHERE organization_id = %s AND role = 'owner' "
                "FOR UPDATE",
                (organization_id,),
            )
            if len(cur.fetchall()) <= 1:
                raise LastOwnerError(
                    "cannot remove the only Owner of an organization"
                )

        cur.execute(
            "DELETE FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
    conn.commit()


SCOPES = ("all", "assigned")


def set_matter_scope(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str, scope: str
) -> Membership:
    """Opens or closes what one member can see.

    An owner is not scopeable. Someone who can change everyone's access can
    lift their own in one click, so a restricted owner is a false sense of
    security rather than a control -- better to refuse it and say why.
    """
    if scope not in SCOPES:
        raise ValueError(f"invalid matter scope {scope!r}")

    membership = get_membership(conn, organization_id, clerk_user_id)
    if membership is None:
        raise LookupError(f"no membership for {clerk_user_id}")
    if membership.role == "owner" and scope != "all":
        raise ValueError("an owner always sees every case")

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE memberships SET matter_scope = %s "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (scope, organization_id, clerk_user_id),
        )
    conn.commit()
    updated = get_membership(conn, organization_id, clerk_user_id)
    assert updated is not None
    return updated
