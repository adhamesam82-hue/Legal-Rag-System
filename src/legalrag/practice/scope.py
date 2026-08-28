"""Which cases a member may see, expressed as SQL rather than as a check.

The firm decides per person: an owner and a senior lawyer see the whole
practice, an associate brought in on one case should not be reading the rest
of it. `memberships.matter_scope` holds that choice and `matter_staff` holds
the assignments; nothing here invents a second mechanism.

WHY THIS IS A PREDICATE AND NOT A GUARD
---------------------------------------
The obvious implementation is to filter the list of cases and be done. It does
not work, and the way it fails is quiet: roughly fifteen tables hang off a
matter -- cases, hearings, documents, tasks, time entries, invoices, expenses,
communications, notes, deadlines, evidence, court documents, contacts, custom
values, portals. Filtering the list leaves every one of them reachable by its
own id. A lawyer who cannot see case 7 in their list can still open
/documents/412 and read what is filed on it.

So the restriction travels as a SQL fragment that goes into the same WHERE
clause as the organization filter, in the same layer, for the same reason: a
route that forgets it still cannot read rows it should not.

    sql, params = matter_visibility("m.id", membership)
    cur.execute(f"... WHERE d.organization_id = %s AND {sql}", (org_id, *params))

`sql` is "TRUE" for an unrestricted member, so the caller never branches.

The subquery is deliberate rather than a join: it cannot duplicate rows the way
a join to matter_staff would when several people are on one matter, and
matter_staff_by_user_idx (migration 0011) serves it directly.
"""
from __future__ import annotations

from legalrag.orgs import Membership

UNRESTRICTED = ("TRUE", ())


def sees_every_matter(membership: Membership) -> bool:
    """An owner always does, whatever the column says.

    Belt and braces with the check in orgs.set_matter_scope: someone who can
    change everyone's access can lift their own, so a restricted owner would
    be a false sense of security rather than a control.
    """
    return membership.role == "owner" or membership.matter_scope == "all"


def matter_visibility(
    matter_id_expression: str, membership: Membership
) -> tuple[str, tuple]:
    """A WHERE fragment limiting `matter_id_expression` to what this member sees.

    `matter_id_expression` is whatever names the matter in the caller's query
    -- "m.id" where matters is joined, "d.matter_id" where it is not.

    Returns ("TRUE", ()) when unrestricted, so callers interpolate the fragment
    unconditionally instead of building two versions of every statement.
    """
    if sees_every_matter(membership):
        return UNRESTRICTED
    return (
        f"{matter_id_expression} IN "
        "(SELECT matter_id FROM matter_staff WHERE clerk_user_id = %s)",
        (membership.clerk_user_id,),
    )


def nullable_matter_visibility(
    matter_id_expression: str, membership: Membership
) -> tuple[str, tuple]:
    """As above, for rows whose matter_id may be NULL.

    A task or a document can sit outside any matter. Those belong to the firm
    rather than to a case, so a scoped member keeps seeing them -- the
    restriction is on cases, not on everything.
    """
    if sees_every_matter(membership):
        return UNRESTRICTED
    fragment, params = matter_visibility(matter_id_expression, membership)
    return f"({matter_id_expression} IS NULL OR {fragment})", params


def visible_matter_ids(conn, organization_id: int, membership: Membership) -> list[int]:
    """The ids themselves, for the few callers that need a list rather than SQL.

    Prefer matter_visibility(). This exists for aggregate paths that build
    their own statements and cannot take a fragment.
    """
    with conn.cursor() as cur:
        if sees_every_matter(membership):
            cur.execute(
                "SELECT id FROM matters WHERE organization_id = %s", (organization_id,)
            )
        else:
            cur.execute(
                "SELECT m.id FROM matters m "
                "JOIN matter_staff s ON s.matter_id = m.id "
                "WHERE m.organization_id = %s AND s.clerk_user_id = %s",
                (organization_id, membership.clerk_user_id),
            )
        return [row[0] for row in cur.fetchall()]
