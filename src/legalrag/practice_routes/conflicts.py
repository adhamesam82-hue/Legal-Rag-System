"""Routes for conflict checks."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- conflict checks --------------------------------------------------------


@router.get("/matters/{matter_id}/conflict-checks")
def get_conflict_checks(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return conflicts.list_checks(conn, organization_id, matter_id)


@router.post("/matters/{matter_id}/conflict-checks", status_code=201)
def post_conflict_check(
    organization_id: int,
    matter_id: int,
    body: ConflictCheckIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        check, hits = conflicts.run_check(
            conn,
            organization_id,
            matter_id,
            terms=body.terms,
            run_by=membership.clerk_user_id,
            notes=body.notes,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    # The hits are returned alongside the stored check so the caller can show
    # what was matched; only the summary is persisted.
    return {"check": check, "hits": hits}


@router.post("/conflict-checks/{check_id}/resolve")
def post_resolve_conflict_check(
    organization_id: int,
    check_id: int,
    body: ConflictResolveIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return conflicts.resolve_check(
            conn,
            organization_id,
            check_id,
            result=body.result,
            cleared_by=membership.clerk_user_id,
            notes=body.notes,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Conflict check not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
