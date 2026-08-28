"""Routes for expenses."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- expenses ---------------------------------------------------------------


@router.get("/expenses")
def get_expenses(
    organization_id: int,
    matter_id: int | None = None,
    clerk_user_id: str | None = None,
    since: date | None = None,
    until: date | None = None,
    unbilled_only: bool = False,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return expenses.list_expenses(
        conn,
        organization_id,
        matter_id=matter_id,
        clerk_user_id=clerk_user_id,
        since=since,
        until=until,
        unbilled_only=unbilled_only,
    )


@router.get("/expenses/summary")
def get_expense_summary(
    organization_id: int,
    matter_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return expenses.summarize(
        conn, organization_id, matter_id=matter_id, since=since, until=until
    )


@router.post("/expenses", status_code=201)
def post_expense(
    organization_id: int,
    body: ExpenseIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    payload = body.model_dump()
    # Same rule as time: recording someone else's disbursement is a
    # Staff/Owner action, and the caller is the default either way.
    requested = payload.pop("clerk_user_id", None)
    if requested and requested != membership.clerk_user_id and membership.role == "lawyer":
        raise HTTPException(
            status_code=403, detail="Lawyers can only record their own expenses"
        )
    try:
        return expenses.create_expense(
            conn,
            organization_id,
            clerk_user_id=requested or membership.clerk_user_id,
            **payload,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.patch("/expenses/{expense_id}")
def patch_expense(
    organization_id: int,
    expense_id: int,
    body: ExpensePatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return expenses.update_expense(
            conn, organization_id, expense_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Expense not found, or already billed on an invoice",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/expenses/{expense_id}", status_code=204)
def remove_expense(
    organization_id: int,
    expense_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        expenses.delete_expense(conn, organization_id, expense_id)
    except NotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Expense not found, or already billed on an invoice",
        )
    return Response(status_code=204)
