"""Routes for cases."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- cases ------------------------------------------------------------------


@router.get("/cases")
def get_cases(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return cases.list_cases(conn, organization_id)


@router.post("/cases", status_code=201)
def post_case(
    organization_id: int,
    body: CaseIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return cases.create_case(conn, organization_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=409, detail="This matter already has a case record."
        )


@router.get("/cases/{case_id}")
def get_case(
    organization_id: int,
    case_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(cases.get_case(conn, organization_id, case_id), "Case")


@router.get("/matters/{matter_id}/case")
def get_case_for_matter(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(
        cases.get_case_for_matter(conn, organization_id, matter_id), "Case"
    )


@router.patch("/cases/{case_id}")
def patch_case(
    organization_id: int,
    case_id: int,
    body: CasePatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return cases.update_case(
            conn, organization_id, case_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError as exc:
        # The case itself, or a parent_case_id that is not one of this
        # firm's cases. Both are "not found"; the message says which.
        raise HTTPException(status_code=404, detail=f"{exc} not found")
    except cases.ParentCaseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


def _case_child(fn, conn, organization_id: int, case_id: int, **kwargs):
    try:
        return fn(conn, organization_id, case_id, **kwargs)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")


@router.post("/cases/{case_id}/timeline", status_code=201)
def post_case_timeline(
    organization_id: int,
    case_id: int,
    body: CaseTimelineIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return _case_child(
        cases.add_timeline_event, conn, organization_id, case_id, **body.model_dump()
    )


@router.post("/cases/{case_id}/deadlines", status_code=201)
def post_case_deadline(
    organization_id: int,
    case_id: int,
    body: DeadlineIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return _case_child(
        cases.add_deadline, conn, organization_id, case_id, **body.model_dump()
    )


@router.post("/cases/{case_id}/deadlines/{deadline_id}/complete", status_code=204)
def complete_case_deadline(
    organization_id: int,
    case_id: int,
    deadline_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        cases.complete_deadline(conn, organization_id, case_id, deadline_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return Response(status_code=204)


@router.post("/cases/{case_id}/evidence", status_code=201)
def post_case_evidence(
    organization_id: int,
    case_id: int,
    body: EvidenceIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return _case_child(
        cases.add_evidence, conn, organization_id, case_id, **body.model_dump()
    )


@router.post("/cases/{case_id}/court-documents", status_code=201)
def post_court_document(
    organization_id: int,
    case_id: int,
    body: CourtDocumentIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return _case_child(
        cases.add_court_document, conn, organization_id, case_id, **body.model_dump()
    )
