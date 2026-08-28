"""Routes for hearings / calendar."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- hearings / calendar ----------------------------------------------------


@router.get("/hearings")
def get_hearings(
    organization_id: int,
    matter_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
    court: str | None = None,
    judge: str | None = None,
    outcome: HearingOutcome | None = None,
    undecided: bool = False,
    q: str | None = Query(default=None, max_length=200),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """The hearings list, filtered per column or searched across all of them.

    `undecided` is separate from `outcome` on purpose: "which sittings have not
    been ruled on" is the commonest question and it is the absence of a value,
    not one of them.
    """
    return cases.list_hearings(
        conn,
        organization_id,
        viewer=membership,
        matter_id=matter_id,
        since=since,
        until=until,
        court=court,
        judge=judge,
        outcome=outcome,
        undecided=undecided,
        query=q,
    )


@router.get("/hearings/{hearing_id}")
def get_hearing(
    organization_id: int,
    hearing_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return found(
        cases.get_hearing(conn, organization_id, hearing_id, viewer=membership),
        "Hearing",
    )


@router.patch("/hearings/{hearing_id}")
def patch_hearing(
    organization_id: int,
    hearing_id: int,
    body: HearingUpdate,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return cases.update_hearing(
            conn, organization_id, hearing_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Hearing not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/hearings", status_code=201)
def post_hearing(
    organization_id: int,
    body: HearingIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return cases.create_hearing(conn, organization_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
