"""Cases — the litigation record a matter can hold.

Per PRODUCT.md, a case is not a synonym for a matter: it carries the court,
judge, case number and opposing party for matters that are actually in
litigation. At most one case per matter, enforced by a UNIQUE constraint.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime

import psycopg

from legalrag.practice import NotFoundError, fetch_all, fetch_one

SUBMITTED_BY = ("us", "opposing_party", "court")

_COLUMNS = """
    c.id, c.organization_id, c.matter_id, m.name AS matter_name, c.court,
    c.judge, c.case_number, c.status, c.opposing_party, c.opposing_counsel,
    c.filed_date, c.ai_summary, c.created_at
"""


@dataclass
class TimelineEvent:
    id: int
    event_date: date
    label: str
    detail: str | None


@dataclass
class CaseDeadline:
    id: int
    label: str
    due_date: date
    completed: bool


@dataclass
class Evidence:
    id: int
    name: str
    evidence_type: str
    submitted_by: str
    submitted_date: date


@dataclass
class CourtDocument:
    id: int
    name: str
    doc_type: str
    doc_date: date


@dataclass
class Hearing:
    id: int
    matter_id: int
    hearing_date: date
    hearing_time: str
    court: str
    purpose: str
    outcome: str | None


@dataclass
class Case:
    id: int
    organization_id: int
    matter_id: int
    matter_name: str
    court: str
    judge: str
    case_number: str
    status: str
    opposing_party: str
    opposing_counsel: str | None
    filed_date: date
    ai_summary: str | None
    created_at: datetime
    timeline: list[TimelineEvent] = field(default_factory=list)
    deadlines: list[CaseDeadline] = field(default_factory=list)
    evidence: list[Evidence] = field(default_factory=list)
    court_documents: list[CourtDocument] = field(default_factory=list)
    next_hearing: Hearing | None = None


def _load_children(conn: psycopg.Connection, case: Case) -> Case:
    case.timeline = fetch_all(
        conn,
        TimelineEvent,
        "SELECT id, event_date, label, detail FROM case_timeline_events "
        "WHERE case_id = %s ORDER BY event_date",
        (case.id,),
    )
    case.deadlines = fetch_all(
        conn,
        CaseDeadline,
        "SELECT id, label, due_date, completed FROM case_deadlines "
        "WHERE case_id = %s ORDER BY due_date",
        (case.id,),
    )
    case.evidence = fetch_all(
        conn,
        Evidence,
        "SELECT id, name, evidence_type, submitted_by, submitted_date "
        "FROM case_evidence WHERE case_id = %s ORDER BY submitted_date",
        (case.id,),
    )
    case.court_documents = fetch_all(
        conn,
        CourtDocument,
        "SELECT id, name, doc_type, doc_date FROM court_documents "
        "WHERE case_id = %s ORDER BY doc_date",
        (case.id,),
    )
    case.next_hearing = fetch_one(
        conn,
        Hearing,
        "SELECT id, matter_id, hearing_date, hearing_time, court, purpose, outcome "
        "FROM hearings WHERE matter_id = %s AND hearing_date >= CURRENT_DATE "
        "ORDER BY hearing_date LIMIT 1",
        (case.matter_id,),
    )
    return case


def list_cases(conn: psycopg.Connection, organization_id: int) -> list[Case]:
    """Case summaries. Child collections are left empty; use get_case for those."""
    return fetch_all(
        conn,
        Case,
        f"SELECT {_COLUMNS} FROM cases c JOIN matters m ON m.id = c.matter_id "
        "WHERE c.organization_id = %s ORDER BY c.filed_date DESC",
        (organization_id,),
    )


def get_case(
    conn: psycopg.Connection, organization_id: int, case_id: int
) -> Case | None:
    case = fetch_one(
        conn,
        Case,
        f"SELECT {_COLUMNS} FROM cases c JOIN matters m ON m.id = c.matter_id "
        "WHERE c.organization_id = %s AND c.id = %s",
        (organization_id, case_id),
    )
    return _load_children(conn, case) if case else None


def get_case_for_matter(
    conn: psycopg.Connection, organization_id: int, matter_id: int
) -> Case | None:
    case = fetch_one(
        conn,
        Case,
        f"SELECT {_COLUMNS} FROM cases c JOIN matters m ON m.id = c.matter_id "
        "WHERE c.organization_id = %s AND c.matter_id = %s",
        (organization_id, matter_id),
    )
    return _load_children(conn, case) if case else None


def create_case(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int,
    court: str,
    case_number: str,
    filed_date: date,
    judge: str = "",
    status: str = "",
    opposing_party: str = "",
    opposing_counsel: str | None = None,
    ai_summary: str | None = None,
) -> Case:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")
        cur.execute(
            "INSERT INTO cases (organization_id, matter_id, court, judge, "
            "case_number, status, opposing_party, opposing_counsel, filed_date, "
            "ai_summary) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
            "RETURNING id",
            (
                organization_id, matter_id, court, judge, case_number, status,
                opposing_party, opposing_counsel, filed_date, ai_summary,
            ),
        )
        case_id = cur.fetchone()[0]
    conn.commit()
    case = get_case(conn, organization_id, case_id)
    assert case is not None
    return case


_UPDATABLE = {
    "court", "judge", "case_number", "status", "opposing_party",
    "opposing_counsel", "filed_date", "ai_summary",
}


def update_case(
    conn: psycopg.Connection, organization_id: int, case_id: int, **changes
) -> Case:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE cases SET {assignments}, updated_at = now() "
                "WHERE organization_id = %s AND id = %s",
                (*fields.values(), organization_id, case_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"case {case_id}")
        conn.commit()
    case = get_case(conn, organization_id, case_id)
    if case is None:
        raise NotFoundError(f"case {case_id}")
    return case


def _assert_case(conn: psycopg.Connection, organization_id: int, case_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM cases WHERE organization_id = %s AND id = %s",
            (organization_id, case_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"case {case_id}")


def add_timeline_event(
    conn: psycopg.Connection,
    organization_id: int,
    case_id: int,
    *,
    event_date: date,
    label: str,
    detail: str | None = None,
) -> TimelineEvent:
    _assert_case(conn, organization_id, case_id)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO case_timeline_events (case_id, event_date, label, detail) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (case_id, event_date, label, detail),
        )
        event_id = cur.fetchone()[0]
    conn.commit()
    return TimelineEvent(event_id, event_date, label, detail)


def add_deadline(
    conn: psycopg.Connection,
    organization_id: int,
    case_id: int,
    *,
    label: str,
    due_date: date,
) -> CaseDeadline:
    _assert_case(conn, organization_id, case_id)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO case_deadlines (case_id, label, due_date) "
            "VALUES (%s, %s, %s) RETURNING id",
            (case_id, label, due_date),
        )
        deadline_id = cur.fetchone()[0]
    conn.commit()
    return CaseDeadline(deadline_id, label, due_date, False)


def complete_deadline(
    conn: psycopg.Connection, organization_id: int, case_id: int, deadline_id: int
) -> None:
    _assert_case(conn, organization_id, case_id)
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE case_deadlines SET completed = TRUE "
            "WHERE case_id = %s AND id = %s",
            (case_id, deadline_id),
        )
        if cur.rowcount == 0:
            raise NotFoundError(f"deadline {deadline_id}")
    conn.commit()


def add_evidence(
    conn: psycopg.Connection,
    organization_id: int,
    case_id: int,
    *,
    name: str,
    submitted_by: str,
    submitted_date: date,
    evidence_type: str = "",
) -> Evidence:
    if submitted_by not in SUBMITTED_BY:
        raise ValueError(f"invalid submitted_by {submitted_by!r}")
    _assert_case(conn, organization_id, case_id)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO case_evidence (case_id, name, evidence_type, "
            "submitted_by, submitted_date) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (case_id, name, evidence_type, submitted_by, submitted_date),
        )
        evidence_id = cur.fetchone()[0]
    conn.commit()
    return Evidence(evidence_id, name, evidence_type, submitted_by, submitted_date)


def add_court_document(
    conn: psycopg.Connection,
    organization_id: int,
    case_id: int,
    *,
    name: str,
    doc_date: date,
    doc_type: str = "",
) -> CourtDocument:
    _assert_case(conn, organization_id, case_id)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO court_documents (case_id, name, doc_type, doc_date) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (case_id, name, doc_type, doc_date),
        )
        doc_id = cur.fetchone()[0]
    conn.commit()
    return CourtDocument(doc_id, name, doc_type, doc_date)


# --- hearings (calendar side of a case) -------------------------------------


def list_hearings(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
) -> list[Hearing]:
    sql = (
        "SELECT id, matter_id, hearing_date, hearing_time, court, purpose, outcome "
        "FROM hearings WHERE organization_id = %s"
    )
    params: list[object] = [organization_id]
    if matter_id is not None:
        sql += " AND matter_id = %s"
        params.append(matter_id)
    if since:
        sql += " AND hearing_date >= %s"
        params.append(since)
    if until:
        sql += " AND hearing_date <= %s"
        params.append(until)
    sql += " ORDER BY hearing_date, hearing_time"
    return fetch_all(conn, Hearing, sql, tuple(params))


def create_hearing(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int,
    hearing_date: date,
    hearing_time: str = "",
    court: str = "",
    purpose: str = "",
    outcome: str | None = None,
) -> Hearing:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")
        cur.execute(
            "INSERT INTO hearings (organization_id, matter_id, hearing_date, "
            "hearing_time, court, purpose, outcome) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                organization_id, matter_id, hearing_date, hearing_time, court,
                purpose, outcome,
            ),
        )
        hearing_id = cur.fetchone()[0]
    conn.commit()
    return Hearing(
        hearing_id, matter_id, hearing_date, hearing_time, court, purpose, outcome
    )
