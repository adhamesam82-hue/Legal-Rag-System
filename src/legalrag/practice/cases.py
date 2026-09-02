"""Cases — the litigation record a matter can hold.

Per PRODUCT.md, a case is not a synonym for a matter: it carries the court,
judge, case number and opposing party for matters that are actually in
litigation. At most one case per matter, enforced by a UNIQUE constraint.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime

import psycopg

from legalrag.orgs import Membership
from legalrag.practice import NotFoundError, fetch_all, fetch_one
from legalrag.practice.scope import UNRESTRICTED, matter_visibility

SUBMITTED_BY = ("us", "opposing_party", "court")

DEGREES = ("first_instance", "appeal", "cassation")

# The six narrative fields (0022). Free text the lawyer writes; the screen
# shows each as its own collapsible section.
NARRATIVE_FIELDS = (
    "summary",
    "facts",
    "legal_basis",
    "defences",
    "procedural_posture",
    "client_narrative",
)

_COLUMNS = """
    c.id, c.organization_id, c.matter_id, m.name AS matter_name, c.court,
    c.judge, c.case_number, c.judicial_year, c.case_category,
    c.litigation_degree, c.status, c.opposing_party, c.opposing_counsel,
    c.filed_date, c.ai_summary, c.created_at,
    c.summary, c.facts, c.legal_basis, c.defences, c.procedural_posture,
    c.client_narrative, c.parent_case_id
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
    matter_name: str | None
    hearing_date: date
    hearing_time: str
    court: str
    judge: str | None
    purpose: str
    # One of HEARING_OUTCOMES, or None while the sitting has not happened yet.
    outcome: str | None
    # What the bench actually said, in the clerk's words. Kept alongside the
    # code rather than replaced by it: the code says a hearing was adjourned,
    # the note says what it was adjourned for, and only the second one tells a
    # lawyer what to prepare.
    outcome_note: str | None
    # Where an adjournment sends it -- the single most useful fact on the
    # record, and there was nowhere to put it before.
    next_hearing_date: date | None


@dataclass
class CaseRef:
    """Enough of a related case to name it on screen and link to it."""

    id: int
    case_number: str
    court: str
    litigation_degree: str


@dataclass
class Case:
    id: int
    organization_id: int
    matter_id: int
    matter_name: str
    court: str
    # Courts of first instance and appeal sit as circuits of three, so this is
    # usually the دائرة rather than one named judge.
    judge: str
    # The number alone. "رقم 1234 لسنة 2025 مدني كلي" is three facts, and
    # holding them in one string made "this year's cases" unaskable.
    case_number: str
    # NOT the filing year: a case filed in December 2024 can be registered in
    # the 2025 judicial year, so it is recorded rather than derived.
    judicial_year: int | None
    case_category: str
    litigation_degree: str
    status: str
    opposing_party: str
    opposing_counsel: str | None
    filed_date: date
    ai_summary: str | None
    created_at: datetime
    # The case file proper (0022): what it is about, in the lawyer's words.
    # Empty strings, never None -- "nothing written yet" is one state.
    summary: str = ""
    facts: str = ""
    legal_basis: str = ""
    defences: str = ""
    procedural_posture: str = ""
    client_narrative: str = ""
    # The same dispute before another court. See migration 0022.
    parent_case_id: int | None = None
    parent: CaseRef | None = None
    children: list[CaseRef] = field(default_factory=list)
    timeline: list[TimelineEvent] = field(default_factory=list)
    deadlines: list[CaseDeadline] = field(default_factory=list)
    evidence: list[Evidence] = field(default_factory=list)
    court_documents: list[CourtDocument] = field(default_factory=list)
    next_hearing: Hearing | None = None


_REF_COLUMNS = "c.id, c.case_number, c.court, c.litigation_degree"


def _load_children(conn: psycopg.Connection, case: Case) -> Case:
    # Related suits. Scoped to the organization even though the foreign key
    # already is: a parent from another firm cannot be set (see
    # _check_parent), and this keeps that true on the read side too.
    if case.parent_case_id is not None:
        case.parent = fetch_one(
            conn,
            CaseRef,
            f"SELECT {_REF_COLUMNS} FROM cases c WHERE c.organization_id = %s AND c.id = %s",
            (case.organization_id, case.parent_case_id),
        )
    case.children = fetch_all(
        conn,
        CaseRef,
        f"SELECT {_REF_COLUMNS} FROM cases c "
        "WHERE c.organization_id = %s AND c.parent_case_id = %s ORDER BY c.filed_date, c.id",
        (case.organization_id, case.id),
    )
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
    # The same column list every other hearing query uses. It was a shorter,
    # hand-written one, missing four of the model's fields -- which raised a
    # TypeError only once a matter had a hearing that had not happened yet, so
    # a seeded database full of past sittings never reached it and the first
    # future hearing a real firm scheduled took down the case screen and the
    # calendar with it.
    case.next_hearing = fetch_one(
        conn,
        Hearing,
        f"SELECT {_HEARING_COLUMNS} FROM hearings h "
        "JOIN matters m ON m.id = h.matter_id "
        "LEFT JOIN cases c ON c.matter_id = h.matter_id "
        "WHERE h.matter_id = %s AND h.hearing_date >= CURRENT_DATE "
        "ORDER BY h.hearing_date, h.hearing_time LIMIT 1",
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
    judicial_year: int | None = None,
    case_category: str = "",
    litigation_degree: str = "first_instance",
    judge: str = "",
    status: str = "",
    opposing_party: str = "",
    opposing_counsel: str | None = None,
    ai_summary: str | None = None,
) -> Case:
    if litigation_degree not in DEGREES:
        raise ValueError(f"invalid litigation degree {litigation_degree!r}")
    # Checked here rather than left to the column type, so a typo comes back
    # naming the field instead of as a database error.
    if judicial_year is not None and not (1900 <= judicial_year <= 2100):
        raise ValueError(f"implausible judicial year {judicial_year!r}")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")
        cur.execute(
            "INSERT INTO cases (organization_id, matter_id, court, judge, "
            "case_number, judicial_year, case_category, litigation_degree, "
            "status, opposing_party, opposing_counsel, filed_date, ai_summary) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
            "RETURNING id",
            (
                organization_id, matter_id, court, judge, case_number,
                judicial_year, case_category, litigation_degree, status,
                opposing_party, opposing_counsel, filed_date, ai_summary,
            ),
        )
        case_id = cur.fetchone()[0]
    conn.commit()
    case = get_case(conn, organization_id, case_id)
    assert case is not None
    return case


_UPDATABLE = {
    "court", "judge", "case_number", "judicial_year", "case_category",
    "litigation_degree", "status", "opposing_party", "opposing_counsel",
    "filed_date", "ai_summary", *NARRATIVE_FIELDS,
}


class ParentCaseError(ValueError):
    """The requested parent link is not allowed. The message says why."""


def _check_parent(
    cur: psycopg.Cursor, organization_id: int, case_id: int, parent_id: int
) -> None:
    """The rules a parent link must satisfy, checked in one place.

    Same organization and existence come back as NotFoundError -- a parent
    from another firm is not a case this caller can see, so it is "not
    found", never a hint that it exists. The two structural rules are
    ParentCaseError: not itself, and one level only. A case that already has
    a parent cannot be a parent, and a case that already has children cannot
    be given a parent; between them that rules out cycles without a walk.
    """
    if parent_id == case_id:
        raise ParentCaseError("a case cannot be a sub-case of itself")
    cur.execute(
        "SELECT parent_case_id FROM cases WHERE organization_id = %s AND id = %s",
        (organization_id, parent_id),
    )
    row = cur.fetchone()
    if row is None:
        raise NotFoundError(f"case {parent_id}")
    if row[0] is not None:
        raise ParentCaseError(
            f"case {parent_id} is itself a sub-case; sub-cases go one level deep"
        )
    cur.execute(
        "SELECT 1 FROM cases WHERE organization_id = %s AND parent_case_id = %s LIMIT 1",
        (organization_id, case_id),
    )
    if cur.fetchone() is not None:
        raise ParentCaseError(
            f"case {case_id} has sub-cases of its own and cannot become one"
        )


def update_case(
    conn: psycopg.Connection, organization_id: int, case_id: int, **changes
) -> Case:
    fields = {k: v for k, v in changes.items() if k in _UPDATABLE and v is not None}
    # parent_case_id is the one field where None means "clear it", so it is
    # handled outside the None-means-unset rule the others follow.
    if "parent_case_id" in changes:
        parent_id = changes["parent_case_id"]
        if parent_id is not None:
            with conn.cursor() as cur:
                _check_parent(cur, organization_id, case_id, parent_id)
        fields["parent_case_id"] = parent_id
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
#
# Outcomes are the short list an Egyptian court actually produces, not free
# prose. As TEXT none of it could be filtered, counted, or made to drive a
# reminder -- and per-column filtering on the hearings screen is precisely
# what it was blocking.
HEARING_OUTCOMES = (
    "adjourned",   # تأجيل
    "reserved",    # حجز للحكم
    "judgment",    # النطق بالحكم
    "struck_out",  # شطب
    "joined",      # ضم
    "other",
)

# The judge/circuit lives on the case, not the hearing, so the join is LEFT:
# a matter can hold hearings before its litigation record exists.
_HEARING_COLUMNS = """
    h.id, h.matter_id, m.name AS matter_name, h.hearing_date, h.hearing_time,
    h.court, c.judge, h.purpose, h.outcome, h.outcome_note, h.next_hearing_date
"""


def list_hearings(
    conn: psycopg.Connection,
    organization_id: int,
    *,
    matter_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
    court: str | None = None,
    judge: str | None = None,
    outcome: str | None = None,
    undecided: bool = False,
    query: str | None = None,
    viewer: Membership | None = None,
) -> list[Hearing]:
    """Hearings, filterable per column and searchable across all of them.

    `query` is the one search box, and it matches every text column at once:
    a lawyer looking for a hearing types the court, or the case, or the
    opposing party's name, and does not first decide which field that is.

    `undecided` is deliberately not a value of `outcome`. "Not ruled on yet"
    is the question asked most often, and it is the *absence* of an outcome
    rather than one of them.
    """
    visible, visible_params = (
        matter_visibility("h.matter_id", viewer) if viewer else UNRESTRICTED
    )
    sql = (
        f"SELECT {_HEARING_COLUMNS} FROM hearings h "
        "JOIN matters m ON m.id = h.matter_id "
        "LEFT JOIN cases c ON c.matter_id = h.matter_id "
        f"WHERE h.organization_id = %s AND {visible}"
    )
    params: list[object] = [organization_id, *visible_params]
    if matter_id is not None:
        sql += " AND h.matter_id = %s"
        params.append(matter_id)
    if since:
        sql += " AND h.hearing_date >= %s"
        params.append(since)
    if until:
        sql += " AND h.hearing_date <= %s"
        params.append(until)
    if court:
        sql += " AND h.court ILIKE %s"
        params.append(f"%{court}%")
    if judge:
        sql += " AND c.judge ILIKE %s"
        params.append(f"%{judge}%")
    if outcome:
        sql += " AND h.outcome = %s"
        params.append(outcome)
    if undecided:
        sql += " AND h.outcome IS NULL"
    if query:
        sql += (
            " AND (h.court ILIKE %s OR h.purpose ILIKE %s OR h.outcome_note ILIKE %s"
            " OR m.name ILIKE %s OR c.judge ILIKE %s OR c.case_number ILIKE %s"
            " OR c.case_category ILIKE %s)"
        )
        params.extend([f"%{query}%"] * 7)
    sql += " ORDER BY h.hearing_date DESC, h.hearing_time, h.id"
    return fetch_all(conn, Hearing, sql, tuple(params))


def get_hearing(
    conn: psycopg.Connection,
    organization_id: int,
    hearing_id: int,
    viewer: Membership | None = None,
) -> Hearing | None:
    visible, visible_params = (
        matter_visibility("h.matter_id", viewer) if viewer else UNRESTRICTED
    )
    return fetch_one(
        conn,
        Hearing,
        f"SELECT {_HEARING_COLUMNS} FROM hearings h "
        "JOIN matters m ON m.id = h.matter_id "
        "LEFT JOIN cases c ON c.matter_id = h.matter_id "
        f"WHERE h.organization_id = %s AND h.id = %s AND {visible}",
        (organization_id, hearing_id, *visible_params),
    )


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
    outcome_note: str | None = None,
    next_hearing_date: date | None = None,
) -> Hearing:
    if outcome is not None and outcome not in HEARING_OUTCOMES:
        raise ValueError(f"invalid hearing outcome {outcome!r}")
    # An adjournment pointing backwards is a typo every time, and it is the one
    # shape of this record that leaves a lawyer worse off than a paper diary.
    if next_hearing_date is not None and next_hearing_date < hearing_date:
        raise ValueError("the next hearing cannot precede this one")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM matters WHERE organization_id = %s AND id = %s",
            (organization_id, matter_id),
        )
        if cur.fetchone() is None:
            raise NotFoundError(f"matter {matter_id}")
        # A sitting left without a court inherits the one its case is filed
        # in. The circuit was already inherited through the join on read, so a
        # blank court next to a filled-in circuit was the record contradicting
        # itself -- either both come from the case or neither does.
        if not court:
            cur.execute(
                "SELECT court FROM cases WHERE organization_id = %s AND matter_id = %s",
                (organization_id, matter_id),
            )
            row = cur.fetchone()
            if row is not None:
                court = row[0] or ""
        cur.execute(
            "INSERT INTO hearings (organization_id, matter_id, hearing_date, "
            "hearing_time, court, purpose, outcome, outcome_note, next_hearing_date) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                organization_id, matter_id, hearing_date, hearing_time, court,
                purpose, outcome, outcome_note, next_hearing_date,
            ),
        )
        hearing_id = cur.fetchone()[0]
    conn.commit()
    created = get_hearing(conn, organization_id, hearing_id)
    assert created is not None
    return created


_HEARING_UPDATABLE = {
    "hearing_date", "hearing_time", "court", "purpose", "outcome",
    "outcome_note", "next_hearing_date",
}


def update_hearing(
    conn: psycopg.Connection, organization_id: int, hearing_id: int, **changes
) -> Hearing:
    """Records what the sitting produced -- the write a clerk makes afterwards."""
    fields = {
        k: v for k, v in changes.items() if k in _HEARING_UPDATABLE and v is not None
    }
    if "outcome" in fields and fields["outcome"] not in HEARING_OUTCOMES:
        raise ValueError(f"invalid hearing outcome {fields['outcome']!r}")
    if fields:
        assignments = ", ".join(f"{name} = %s" for name in fields)
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE hearings SET {assignments} "
                "WHERE organization_id = %s AND id = %s",
                (*fields.values(), organization_id, hearing_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError(f"hearing {hearing_id}")
        conn.commit()
    updated = get_hearing(conn, organization_id, hearing_id)
    if updated is None:
        raise NotFoundError(f"hearing {hearing_id}")
    return updated
