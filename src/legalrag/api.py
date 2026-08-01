"""HTTP API. Run: uv run uvicorn legalrag.api:app --reload --port 8000

Note on streaming: /api/ask deliberately does not stream. Citation enforcement
runs on the completed text, and an answer is blocked when it cites an article
that was not retrieved. Streaming tokens would put the unverified text on screen
before the check that decides whether it may be shown at all.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAIError
from pydantic import BaseModel, Field

from legalrag.answer import Answer
from legalrag.clerk import (
    get_current_membership,
    get_current_user_id,
    get_user_primary_email,
    require_owner,
)
from legalrag.db import get_connection
from legalrag.email import send_invite_email
from legalrag.explain import explain_article
from legalrag.invites import (
    InvitationError,
    accept_invitation,
    create_invitation,
    get_invitation_by_token,
)
from legalrag.library import (
    article_neighbours,
    corpus_stats,
    get_article,
    get_instrument,
    list_articles,
    list_instruments,
)
from legalrag.orgs import (
    LastOwnerError,
    Membership,
    add_membership,
    create_organization,
    get_membership,
    list_memberships_for_user,
    list_org_members,
    remove_membership,
)
from legalrag.pipeline import ask, retrieve_for
from legalrag.practice_api import router as practice_router
from legalrag.retrieve import Candidate

app = FastAPI(title="LegalOS API", version="0.3.0")

# The Next.js dev server is a separate origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Practice management (clients, matters, cases, documents, tasks, time,
# billing) lives in its own module; the corpus and answering routes below are
# a separate concern that happens to share an app.
app.include_router(practice_router)

Jurisdiction = Literal["EG", "SA"]


@contextmanager
def db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def upstream_guard(exc: Exception) -> HTTPException:
    """Surface model-provider failures as themselves, not as a generic 500.

    Running out of OpenRouter credits is the failure this project actually hits,
    and it needs to reach the UI as a distinct, actionable message.
    """
    detail = str(exc)
    status = getattr(exc, "status_code", None)
    if status == 402 or "credits" in detail.lower():
        return HTTPException(
            status_code=402,
            detail="The model provider rejected the request for insufficient credits. "
            "Browsing and search still work; chat and explanations need credits.",
        )
    return HTTPException(status_code=502, detail=f"Model provider error: {detail}")


# --- response models --------------------------------------------------------


class ArticleOut(BaseModel):
    id: int
    citation: str
    instrument_id: int | None = None
    instrument_number: str
    instrument_year: int
    instrument_title: str
    article_number: str
    text: str
    score: float = 0.0

    @classmethod
    def of(cls, c: Candidate) -> "ArticleOut":
        return cls(
            id=c.article_id,
            citation=c.citation,
            instrument_number=c.instrument_number,
            instrument_year=c.instrument_year,
            instrument_title=c.instrument_title,
            article_number=c.article_number,
            text=c.article_text,
            score=c.score,
        )


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    jurisdiction: Jurisdiction = "EG"
    limit: int = Field(default=8, ge=1, le=15)
    # See pipeline.retrieve_for: measured to add nothing over vector search
    # alone on this corpus, at the cost of two LLM calls per query.
    expand: bool = False
    rerank: bool = False


class AskResponse(BaseModel):
    text: str
    citations: list[str]
    refused: bool
    blocked: bool
    blocked_citations: list[str]
    strategy: str
    degraded: list[str]
    articles: list[ArticleOut]

    @classmethod
    def of(cls, answer: Answer) -> "AskResponse":
        retrieval = answer.retrieval
        return cls(
            text=answer.text,
            citations=answer.citations,
            refused=answer.refused,
            blocked=answer.blocked,
            blocked_citations=list(answer.blocked_citations),
            strategy=retrieval.strategy,
            degraded=retrieval.debug.get("degraded", []),
            articles=[ArticleOut.of(c) for c in retrieval.candidates],
        )


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    jurisdiction: Jurisdiction = "EG"
    limit: int = Field(default=10, ge=1, le=30)
    expand: bool = False
    rerank: bool = False


class SearchResponse(BaseModel):
    strategy: str
    expanded_terms: str | None
    law_hint: str | None
    degraded: list[str]
    articles: list[ArticleOut]


class InstrumentOut(BaseModel):
    id: int
    jurisdiction: str
    instrument_type: str
    number: str
    year: int
    title: str
    reference: str
    article_count: int


class ArticleDetail(BaseModel):
    article: ArticleOut
    instrument: InstrumentOut | None
    previous_id: int | None
    next_id: int | None


class ExplainRequest(BaseModel):
    language: Literal["en", "ar"] = "en"


class OrganizationOut(BaseModel):
    id: int
    name: str


class CreateOrganizationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class MembershipOut(BaseModel):
    organization_id: int
    organization_name: str
    role: str


class OrgMemberOut(BaseModel):
    """One row of an organization's member roster.

    Unlike MembershipOut (shaped for "orgs I belong to," where the member is
    implicitly "me"), a roster lists other people, so each row must say
    *which* member it is.
    """

    clerk_user_id: str
    role: str
    display_name: str | None = None
    title: str | None = None


class CreateInviteRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: Literal["lawyer", "staff"]


class InvitationOut(BaseModel):
    token: str
    email: str
    role: str
    organization_name: str


class InvitationPreview(BaseModel):
    organization_name: str
    role: str
    status: str


# --- endpoints --------------------------------------------------------------


@app.get("/api/health")
def health():
    with db() as conn:
        return {"status": "ok", "corpus": corpus_stats(conn)}


@app.post("/api/ask", response_model=AskResponse)
def post_ask(request: AskRequest):
    try:
        with db() as conn:
            answer = ask(
                conn,
                request.question,
                request.jurisdiction,
                limit=request.limit,
                expand=request.expand,
                do_rerank=request.rerank,
            )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenAIError as exc:
        raise upstream_guard(exc) from exc
    return AskResponse.of(answer)


@app.post("/api/search", response_model=SearchResponse)
def post_search(request: SearchRequest):
    # Search degrades to lexical-only rather than failing when a provider is
    # unavailable, so it stays usable with a dry API key.
    with db() as conn:
        retrieval = retrieve_for(
            conn,
            request.query,
            request.jurisdiction,
            limit=request.limit,
            expand=request.expand,
            do_rerank=request.rerank,
        )
    return SearchResponse(
        strategy=retrieval.strategy,
        expanded_terms=retrieval.expansion.terms if retrieval.expansion else None,
        law_hint=retrieval.expansion.law_hint if retrieval.expansion else None,
        degraded=retrieval.debug.get("degraded", []),
        articles=[ArticleOut.of(c) for c in retrieval.candidates],
    )


@app.get("/api/instruments", response_model=list[InstrumentOut])
def get_instruments(
    jurisdiction: Jurisdiction = "EG",
    q: str | None = Query(default=None, max_length=200),
):
    with db() as conn:
        return [
            InstrumentOut(**{**vars(i), "reference": i.reference})
            for i in list_instruments(conn, jurisdiction, query=q)
        ]


@app.get("/api/instruments/{instrument_id}")
def get_instrument_detail(
    instrument_id: int,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    with db() as conn:
        instrument = get_instrument(conn, instrument_id)
        if instrument is None:
            raise HTTPException(status_code=404, detail="Instrument not found")
        articles = list_articles(conn, instrument_id, offset=offset, limit=limit)
    return {
        "instrument": InstrumentOut(
            **{**vars(instrument), "reference": instrument.reference}
        ),
        "articles": [ArticleOut.of(c) for c in articles],
        "offset": offset,
        "limit": limit,
    }


@app.get("/api/articles/{article_id}", response_model=ArticleDetail)
def get_article_detail(article_id: int):
    with db() as conn:
        article = get_article(conn, article_id)
        if article is None:
            raise HTTPException(status_code=404, detail="Article not found")
        neighbours = article_neighbours(conn, article)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT instrument_id FROM articles WHERE id = %s", (article_id,)
            )
            instrument_id = cur.fetchone()[0]
        instrument = get_instrument(conn, instrument_id)

    out = ArticleOut.of(article)
    out.instrument_id = instrument_id
    return ArticleDetail(
        article=out,
        instrument=InstrumentOut(
            **{**vars(instrument), "reference": instrument.reference}
        )
        if instrument
        else None,
        previous_id=neighbours["previous"],
        next_id=neighbours["next"],
    )


@app.post("/api/articles/{article_id}/explain")
def post_explain(article_id: int, request: ExplainRequest):
    with db() as conn:
        article = get_article(conn, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    try:
        explanation = explain_article(article, language=request.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenAIError as exc:
        raise upstream_guard(exc) from exc
    return {
        "article_id": explanation.article_id,
        "citation": explanation.citation,
        "language": explanation.language,
        "text": explanation.text,
    }


# --- organizations, invites, team management --------------------------------


@app.post("/api/orgs", response_model=OrganizationOut)
def post_create_organization(
    request: CreateOrganizationRequest,
    clerk_user_id: str = Depends(get_current_user_id),
):
    with db() as conn:
        org = create_organization(conn, request.name, clerk_user_id)
    return OrganizationOut(id=org.id, name=org.name)


@app.get("/api/orgs/me", response_model=list[MembershipOut])
def get_my_organizations(clerk_user_id: str = Depends(get_current_user_id)):
    with db() as conn:
        memberships = list_memberships_for_user(conn, clerk_user_id)
        result = []
        for m in memberships:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT name FROM organizations WHERE id = %s", (m.organization_id,)
                )
                org_name = cur.fetchone()[0]
            result.append(
                MembershipOut(
                    organization_id=m.organization_id,
                    organization_name=org_name,
                    role=m.role,
                )
            )
    return result


@app.post("/api/orgs/{organization_id}/invites", response_model=InvitationOut)
def post_create_invite(
    organization_id: int,
    request: CreateInviteRequest,
    owner: Membership = Depends(require_owner),
):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name FROM organizations WHERE id = %s", (organization_id,)
            )
            org_name = cur.fetchone()[0]
        invite = create_invitation(
            conn, organization_id, request.email, request.role, owner.clerk_user_id
        )
    accept_url = f"https://app.legalrag.example/invite/{invite.token}"
    send_invite_email(
        to_email=invite.email, organization_name=org_name, accept_url=accept_url
    )
    return InvitationOut(
        token=invite.token,
        email=invite.email,
        role=invite.role,
        organization_name=org_name,
    )


@app.get("/api/invites/{token}", response_model=InvitationPreview)
def get_invite_preview(token: str):
    with db() as conn:
        invitation = get_invitation_by_token(conn, token)
        if invitation is None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name FROM organizations WHERE id = %s",
                (invitation.organization_id,),
            )
            org_name = cur.fetchone()[0]
    return InvitationPreview(
        organization_name=org_name, role=invitation.role, status=invitation.status
    )


@app.post("/api/invites/{token}/accept", response_model=MembershipOut)
def post_accept_invite(token: str, clerk_user_id: str = Depends(get_current_user_id)):
    email = get_user_primary_email(clerk_user_id)
    with db() as conn:
        try:
            invitation = accept_invitation(conn, token, clerk_user_id, email)
        except InvitationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name FROM organizations WHERE id = %s",
                (invitation.organization_id,),
            )
            org_name = cur.fetchone()[0]
    return MembershipOut(
        organization_id=invitation.organization_id,
        organization_name=org_name,
        role=invitation.role,
    )


@app.get("/api/orgs/{organization_id}/members", response_model=list[OrgMemberOut])
def get_org_members(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
):
    """The organization's member roster. Any member may view it -- viewing
    who's on your team is not the sensitive operation; inviting and removing
    people are, and those already require require_owner below.

    No separate 404-for-missing-org check: get_current_membership already
    403s when the caller has no membership row for this organization_id, and
    that's indistinguishable from the organization not existing at all (same
    as require_owner-gated routes elsewhere in this file). Reaching this
    handler means the caller passed that gate, so the org exists and the
    roster is non-empty by construction.
    """
    with db() as conn:
        members = list_org_members(conn, organization_id)
    return [
        OrgMemberOut(
            clerk_user_id=m.clerk_user_id,
            role=m.role,
            display_name=m.display_name,
            title=m.title,
        )
        for m in members
    ]


@app.delete("/api/orgs/{organization_id}/members/{clerk_user_id}", status_code=204)
def delete_member(
    organization_id: int,
    clerk_user_id: str,
    owner: Membership = Depends(require_owner),
):
    with db() as conn:
        try:
            remove_membership(conn, organization_id, clerk_user_id)
        except LastOwnerError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
