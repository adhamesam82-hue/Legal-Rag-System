"""Routes for activity and dashboard."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router
from legalrag.practice import agenda as agenda_layer


# --- activity and dashboard -------------------------------------------------


@router.get("/activity")
def get_activity(
    organization_id: int,
    matter_id: int | None = None,
    client_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return activity.list_activity(
        conn, organization_id, matter_id=matter_id, client_id=client_id, limit=limit
    )


@router.get("/dashboard")
def get_dashboard(
    organization_id: int,
    upcoming_days: int = Query(default=30, ge=1, le=365),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return activity.dashboard(conn, organization_id, upcoming_days=upcoming_days)


@router.get("/dashboard/insights")
def get_dashboard_insights(
    organization_id: int,
    limit: int = Query(default=5, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    scope: Literal["all", "my"] = Query(default="all"),
    membership: Membership = Depends(get_current_membership),
    clerk_user_id: str = Depends(get_current_user_id),
    conn=Depends(db),
):
    return activity.dashboard_insights(
        conn,
        organization_id,
        clerk_user_id=clerk_user_id,
        membership=membership,
        limit=limit,
        offset=offset,
        scope=scope,
    )


@router.get("/dashboard/export/recent-matters")
def export_recent_matters_csv(
    organization_id: int,
    scope: Literal["all", "my"] = Query(default="all"),
    membership: Membership = Depends(get_current_membership),
    clerk_user_id: str = Depends(get_current_user_id),
    conn=Depends(db),
):
    """تصدير جدول القضايا الأخيرة بصيغة CSV المتوافقة مع إكسيل (T-059)."""
    csv_bytes = activity.export_recent_matters_csv(
        conn,
        organization_id,
        clerk_user_id=clerk_user_id,
        membership=membership,
        scope=scope,
    )
    today_str = datetime.now().strftime("%Y-%m-%d")
    filename = f"recent-matters-{today_str}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/me")
def get_me(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    clerk_user_id: str = Depends(get_current_user_id),
):
    """The caller's own membership, so the UI knows its role before rendering."""
    return {
        "clerk_user_id": clerk_user_id,
        "organization_id": organization_id,
        "role": membership.role,
        "display_name": membership.display_name,
        "title": membership.title,
    }


# --- one lawyer's day -------------------------------------------------------
#
# Distinct from /dashboard, which answers "how is the firm doing". This answers
# "what is mine and what is now", which is the only question worth asking on a
# phone in a corridor. It is the screen the mobile app opens to.


@router.get("/my-day")
def get_my_day(
    organization_id: int,
    horizon_days: int = Query(default=7, ge=1, le=90),
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Hearings, procedural dates and tasks belonging to the caller.

    Overdue items are returned in full and separately: a deadline missed last
    week is the most important thing on the screen, and a horizon that starts
    today would drop it.

    Matter scoping applies here like everywhere else -- an agenda would be a
    silly place to reopen the hole T-019 closed.
    """
    return agenda_layer.my_day(
        conn, organization_id, membership, horizon_days=horizon_days
    )


# --- push devices -----------------------------------------------------------
#
# The reminder sweep already decides who to tell and when; this is the second
# channel's address book. It exists before the app does because it is the part
# the app cannot build for itself.


class DeviceTokenIn(BaseModel):
    token: str = Field(min_length=8, max_length=512)
    platform: Literal["ios", "android", "web"]
    device_label: str = Field(default="", max_length=120)


@router.put("/devices")
def put_device_token(
    organization_id: int,
    body: DeviceTokenIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Registers this device for push, or re-registers it.

    Idempotent by token, and re-registration REASSIGNS rather than duplicates:
    the same handset can change hands inside a firm, and a stale owner would
    put one lawyer's hearing on another's lock screen.
    """
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO device_tokens (organization_id, subject, token, platform, "
            "device_label) VALUES (%s, %s, %s, %s, %s) "
            "ON CONFLICT (token) DO UPDATE SET "
            "  organization_id = EXCLUDED.organization_id, "
            "  subject = EXCLUDED.subject, "
            "  platform = EXCLUDED.platform, "
            "  device_label = EXCLUDED.device_label, "
            "  last_seen_at = now() "
            "RETURNING id, platform, device_label, last_seen_at",
            (
                organization_id, membership.clerk_user_id, body.token,
                body.platform, body.device_label,
            ),
        )
        row = cur.fetchone()
    conn.commit()
    return {
        "id": row[0],
        "platform": row[1],
        "device_label": row[2],
        "last_seen_at": row[3],
    }


@router.get("/devices")
def get_device_tokens(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """The caller's own devices. Never anyone else's.

    The token itself is not returned -- it is a push credential, and a "your
    devices" list has no use for it.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, platform, device_label, registered_at, last_seen_at "
            "  FROM device_tokens WHERE organization_id = %s AND subject = %s "
            " ORDER BY last_seen_at DESC",
            (organization_id, membership.clerk_user_id),
        )
        return [
            {
                "id": r[0], "platform": r[1], "device_label": r[2],
                "registered_at": r[3], "last_seen_at": r[4],
            }
            for r in cur.fetchall()
        ]


@router.delete("/devices/{device_id}", status_code=204)
def delete_device_token(
    organization_id: int,
    device_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    """Signing out a device. Scoped to the caller's own, by subject."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM device_tokens "
            " WHERE organization_id = %s AND subject = %s AND id = %s",
            (organization_id, membership.clerk_user_id, device_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Device not found")
    conn.commit()
    return Response(status_code=204)
