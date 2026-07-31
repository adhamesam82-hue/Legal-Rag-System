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


@dataclass(frozen=True)
class Membership:
    id: int
    organization_id: int
    clerk_user_id: str
    role: str


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
            "SELECT id, organization_id, clerk_user_id, role FROM memberships "
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
            "SELECT id, organization_id, clerk_user_id, role FROM memberships "
            "WHERE organization_id = %s ORDER BY created_at",
            (organization_id,),
        )
        return [Membership(*row) for row in cur.fetchall()]


def add_membership(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str, role: str
) -> Membership:
    if role not in ROLES:
        raise ValueError(f"invalid role {role!r}; expected one of {ROLES}")
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO memberships (organization_id, clerk_user_id, role) "
            "VALUES (%s, %s, %s) RETURNING id",
            (organization_id, clerk_user_id, role),
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
