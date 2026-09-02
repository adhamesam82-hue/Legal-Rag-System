"""Routes for document tags (T-025).

The request models live here rather than in _shared.py: they are used by
these routes alone, and keeping them local means this file can land without
touching the module every other pillar imports from.
"""
from __future__ import annotations

from typing import Literal

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

from legalrag.clerk import get_current_membership
from legalrag.db import db
from legalrag.orgs import Membership
from legalrag.practice import NotFoundError
from legalrag.practice import document_tags as tags
from legalrag.practice_routes._shared import router

Color = Literal["blue", "cyan", "green", "orange", "pink", "purple", "red", "teal", "yellow"]


class TagIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: Color = "blue"


class TagPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: Color | None = None


class DocumentTagsIn(BaseModel):
    """The whole set, replaced as one."""

    tag_ids: list[int] = Field(default_factory=list, max_length=100)


def _duplicate(name: str) -> HTTPException:
    return HTTPException(
        status_code=409, detail=f"A tag named {name!r} already exists in this firm."
    )


# --- tags -------------------------------------------------------------------


@router.get("/document-tags")
def get_document_tags(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    return tags.list_tags(conn, organization_id)


@router.post("/document-tags", status_code=201)
def post_document_tag(
    organization_id: int,
    body: TagIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return tags.create_tag(conn, organization_id, name=body.name, color=body.color)
    except tags.DuplicateTagError:
        raise _duplicate(body.name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.patch("/document-tags/{tag_id}")
def patch_document_tag(
    organization_id: int,
    tag_id: int,
    body: TagPatch,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        return tags.update_tag(
            conn, organization_id, tag_id, **body.model_dump(exclude_unset=True)
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Tag not found")
    except tags.DuplicateTagError:
        raise _duplicate(body.name or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.delete("/document-tags/{tag_id}", status_code=204)
def delete_document_tag(
    organization_id: int,
    tag_id: int,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        tags.delete_tag(conn, organization_id, tag_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Tag not found")
    return None


# --- a document's tags ------------------------------------------------------


@router.put("/documents/{document_id}/tags")
def put_document_tags(
    organization_id: int,
    document_id: int,
    body: DocumentTagsIn,
    membership: Membership = Depends(get_current_membership),
    conn=Depends(db),
):
    try:
        tag_ids = tags.set_document_tags(conn, organization_id, document_id, body.tag_ids)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"{exc} not found")
    return {"document_id": document_id, "tag_ids": tag_ids}
