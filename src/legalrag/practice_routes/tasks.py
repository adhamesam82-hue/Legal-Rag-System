"""Routes for tasks."""
from __future__ import annotations

from legalrag.practice_routes._shared import *  # noqa: F401,F403
from legalrag.practice_routes._shared import router


# --- tasks ------------------------------------------------------------------


@router.get("/tasks")
def get_tasks(
    organization_id: int,
    matter_id: int | None = None,
    assignee: str | None = None,
    status: str | None = None,
    due_before: date | None = None,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return tasks.list_tasks(
        conn,
        organization_id,
        matter_id=matter_id,
        assignee=assignee,
        status=status,
        due_before=due_before,
    )


@router.post("/tasks", status_code=201)
def post_task(
    organization_id: int,
    body: TaskIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return tasks.create_task(conn, organization_id, **body.model_dump())
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Matter not found")


@router.patch("/tasks/{task_id}")
def patch_task(
    organization_id: int,
    task_id: int,
    body: TaskPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return tasks.update_task(
            conn, organization_id, task_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Task not found")


@router.delete("/tasks/{task_id}", status_code=204)
def remove_task(
    organization_id: int,
    task_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        tasks.delete_task(conn, organization_id, task_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Task not found")
    return Response(status_code=204)
