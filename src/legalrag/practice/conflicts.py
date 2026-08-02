"""Conflict checks — searching the firm's own records before taking a matter on.

Running the check is a professional obligation. Recording that it was run,
against which names, by whom and what it turned up is what makes it defensible
a year later when someone asks.

The search is deliberately over the firm's own data only: clients, the parties
named on matters, opposing parties and counsel on cases. A conflict is a fact
about who this firm already acts for, not something to be inferred.

The search proposes a result; it does not decide one. A hit is a name that
resembles a name — whether it is the same person is a judgement a lawyer
makes, which is why `result` is stored as recorded and `cleared_by` exists.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import psycopg

from legalrag.practice import NotFoundError, fetch_all

RESULTS = ("clear", "potential_conflict", "conflict")


@dataclass
class ConflictHit:
    kind: str  # 'client' | 'matter_party' | 'opposing_party' | 'opposing_counsel'
    name: str
    matched_term: str
    matter_id: int | None
    matter_name: str | None
    detail: str


@dataclass
class ConflictCheck:
    id: int
    organization_id: int
    matter_id: int
    search_terms: list[str]
    result: str
    hit_summary: str
    notes: str
    run_by: str
    run_at: datetime
    cleared_by: str | None
    cleared_at: datetime | None


def search(
    conn: psycopg.Connection,
    organization_id: int,
    terms: list[str],
    *,
    exclude_matter_id: int | None = None,
) -> list[ConflictHit]:
    """Finds every record in the firm whose name resembles one of `terms`.

    Substring matching, case-insensitive. Deliberately loose: a check that
    misses a near-match is worse than one that returns a name to be dismissed
    by eye.
    """
    cleaned = [t.strip() for t in terms if t.strip()]
    if not cleaned:
        return []
    patterns = [f"%{t}%" for t in cleaned]

    hits: list[ConflictHit] = []
    with conn.cursor() as cur:
        # Clients the firm already acts for.
        cur.execute(
            "SELECT c.id, c.name, c.status FROM clients c "
            "WHERE c.organization_id = %s AND c.name ILIKE ANY(%s)",
            (organization_id, patterns),
        )
        for _, name, status in cur.fetchall():
            hits.append(
                ConflictHit(
                    kind="client",
                    name=name,
                    matched_term=_which(cleaned, name),
                    matter_id=None,
                    matter_name=None,
                    detail=f"existing {status} client",
                )
            )

        # Parties named on a matter: the linked contact's name where there is
        # one, the inline name where the party exists only on that matter.
        sql = (
            "SELECT m.id, m.name, coalesce(nullif(cc.name, ''), mc.name), "
            "mc.relationship FROM matter_contacts mc "
            "JOIN matters m ON m.id = mc.matter_id "
            "LEFT JOIN client_contacts cc ON cc.id = mc.contact_id "
            "WHERE m.organization_id = %s "
            "AND coalesce(nullif(cc.name, ''), mc.name) ILIKE ANY(%s)"
        )
        params: list[object] = [organization_id, patterns]
        if exclude_matter_id is not None:
            # A matter's own parties are not a conflict with itself.
            sql += " AND m.id <> %s"
            params.append(exclude_matter_id)
        cur.execute(sql, tuple(params))
        for matter_id, matter_name, name, relationship in cur.fetchall():
            hits.append(
                ConflictHit(
                    kind="matter_party",
                    name=name,
                    matched_term=_which(cleaned, name),
                    matter_id=matter_id,
                    matter_name=matter_name,
                    detail=relationship or "party on a matter",
                )
            )

        # Opposing parties and counsel on litigation. Acting against someone
        # the firm previously acted against is fine; acting for them may not
        # be, so these surface as hits either way.
        sql = (
            "SELECT m.id, m.name, cs.opposing_party, cs.opposing_counsel "
            "FROM cases cs JOIN matters m ON m.id = cs.matter_id "
            "WHERE cs.organization_id = %s AND (cs.opposing_party ILIKE ANY(%s) "
            "OR cs.opposing_counsel ILIKE ANY(%s))"
        )
        params = [organization_id, patterns, patterns]
        if exclude_matter_id is not None:
            sql += " AND m.id <> %s"
            params.append(exclude_matter_id)
        cur.execute(sql, tuple(params))
        for matter_id, matter_name, opposing_party, opposing_counsel in cur.fetchall():
            for kind, name in (
                ("opposing_party", opposing_party),
                ("opposing_counsel", opposing_counsel),
            ):
                if name and _which(cleaned, name):
                    hits.append(
                        ConflictHit(
                            kind=kind,
                            name=name,
                            matched_term=_which(cleaned, name),
                            matter_id=matter_id,
                            matter_name=matter_name,
                            detail=f"on matter {matter_name}",
                        )
                    )
    return hits


def _which(terms: list[str], value: str) -> str:
    """The first search term this value matched, for showing why it is a hit."""
    lowered = value.lower()
    return next((t for t in terms if t.lower() in lowered), "")


def run_check(
    conn: psycopg.Connection,
    organization_id: int,
    matter_id: int,
    *,
    terms: list[str],
    run_by: str,
    notes: str = "",
) -> tuple[ConflictCheck, list[ConflictHit]]:
    """Searches, then records what the search found against the matter."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")

    cleaned = [t.strip() for t in terms if t.strip()]
    if not cleaned:
        raise ValueError("a conflict check needs at least one name to search for")

    hits = search(conn, organization_id, cleaned, exclude_matter_id=matter_id)
    # The search never returns 'conflict' on its own: whether a name match is
    # the same person, and whether that bars the engagement, is a judgement.
    result = "potential_conflict" if hits else "clear"
    summary = (
        "; ".join(f"{h.name} ({h.kind.replace('_', ' ')})" for h in hits[:10])
        or "no matching records"
    )
    if len(hits) > 10:
        summary += f"; and {len(hits) - 10} more"

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO conflict_checks (organization_id, matter_id, search_terms, "
            "result, hit_summary, notes, run_by) VALUES (%s, %s, %s, %s, %s, %s, %s) "
            "RETURNING id, organization_id, matter_id, search_terms, result, "
            "hit_summary, notes, run_by, run_at, cleared_by, cleared_at",
            (organization_id, matter_id, cleaned, result, summary, notes, run_by),
        )
        row = cur.fetchone()
    conn.commit()
    return ConflictCheck(*row), hits


def list_checks(
    conn: psycopg.Connection, organization_id: int, matter_id: int
) -> list[ConflictCheck]:
    return fetch_all(
        conn,
        ConflictCheck,
        "SELECT id, organization_id, matter_id, search_terms, result, hit_summary, "
        "notes, run_by, run_at, cleared_by, cleared_at FROM conflict_checks "
        "WHERE organization_id = %s AND matter_id = %s ORDER BY run_at DESC",
        (organization_id, matter_id),
    )


def resolve_check(
    conn: psycopg.Connection,
    organization_id: int,
    check_id: int,
    *,
    result: str,
    cleared_by: str,
    notes: str | None = None,
) -> ConflictCheck:
    """Records a lawyer's judgement on a check the search only flagged.

    The search's own finding is overwritten deliberately: the professional
    record is what a person concluded, not what a substring match suggested.
    """
    if result not in RESULTS:
        raise ValueError(f"invalid result {result!r}")
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE conflict_checks SET result = %s, cleared_by = %s, "
            "cleared_at = now(), notes = coalesce(%s, notes) "
            "WHERE organization_id = %s AND id = %s "
            "RETURNING id, organization_id, matter_id, search_terms, result, "
            "hit_summary, notes, run_by, run_at, cleared_by, cleared_at",
            (result, cleared_by, notes, organization_id, check_id),
        )
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(f"conflict check {check_id}")
    conn.commit()
    return ConflictCheck(*row)
