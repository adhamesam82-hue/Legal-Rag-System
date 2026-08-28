"""Routes for client funds."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- client funds -----------------------------------------------------------


@router.get("/trust-accounts")
def get_trust_accounts(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return trust.list_accounts(conn, organization_id)


@router.post("/trust-accounts", status_code=201)
def post_trust_account(
    organization_id: int,
    body: TrustAccountIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    if membership.role != "owner":
        raise HTTPException(
            status_code=403, detail="Only an owner can open a client-funds account"
        )
    return trust.create_account(conn, organization_id, **body.model_dump())


@router.get("/trust-transactions")
def get_trust_transactions(
    organization_id: int,
    matter_id: int | None = None,
    client_id: int | None = None,
    trust_account_id: int | None = None,
    since: date | None = None,
    until: date | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return trust.list_transactions(
        conn,
        organization_id,
        matter_id=matter_id,
        client_id=client_id,
        trust_account_id=trust_account_id,
        since=since,
        until=until,
    )


@router.get("/matters/{matter_id}/trust-balance")
def get_trust_balance(
    organization_id: int,
    matter_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return trust.matter_balance(conn, organization_id, matter_id)


@router.post("/trust-transactions", status_code=201)
def post_trust_transaction(
    organization_id: int,
    body: TrustTransactionIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    if membership.role == "lawyer":
        raise HTTPException(
            status_code=403, detail="Only an owner or staff can move client funds"
        )
    try:
        entry = trust.record_transaction(
            conn,
            organization_id,
            recorded_by=membership.clerk_user_id,
            **body.model_dump(),
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        conn.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    activity.record(
        conn,
        organization_id,
        actor=membership.clerk_user_id,
        action=f"recorded a client-funds {entry.kind.replace('_', ' ')} of "
        f"{entry.currency} {entry.amount}",
        matter_id=entry.matter_id,
        client_id=entry.client_id,
    )
    conn.commit()
    return entry
