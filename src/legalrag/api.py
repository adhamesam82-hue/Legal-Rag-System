"""HTTP API. Run: uv run uvicorn legalrag.api:app --reload --port 8000

Note on streaming: /api/ask does not stream, and returns a verdict on completed
text. /api/ask/stream does stream, but only text that has already cleared the
same enforcement -- answer.stream_answer withholds every token that could still
belong to an answer the check would discard. The rule both endpoints keep is
that nothing unverified reaches a screen; the streaming one just releases the
verified part earlier. See answer.py for the one reversal that survives it and
the contract that obliges clients to honour it.
"""
from __future__ import annotations

import json
import logging
import os
import re
import uuid
from pathlib import Path

import httpx
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from openai import OpenAIError
from pydantic import BaseModel, Field

from legalrag.answer import Answer, Completed, TextDelta
from legalrag.auth import get_current_subject
from legalrag.clerk import (
    get_current_membership,
    get_current_user_id,
    get_user_primary_email,
    require_owner,
)
from legalrag.config import (
    email_is_configured,
    get_app_base_url,
    get_cors_origins,
    get_dev_auth_user,
    get_document_root,
)
from legalrag.practice import uploads
from legalrag.conversations import (
    Conversation,
    Message,
    append_answer,
    append_user_message,
    create_conversation,
    delete_conversation,
    get_conversation,
    list_conversations,
    list_messages,
    rename_conversation,
    title_from_question,
)
from legalrag.db import close_pool, get_pool, request_connection
from legalrag.email import EmailError, send_invite_email
from legalrag.explain import explain_article
from legalrag.invites import (
    InvitationError,
    accept_invitation,
    create_invitation,
    effective_status,
    get_invitation_by_token,
    list_invitations,
)
from legalrag import currency
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
    set_matter_scope,
    Membership,
    add_membership,
    create_organization,
    get_membership,
    get_organization,
    list_memberships_for_user,
    list_org_members,
    remove_membership,
    update_organization,
)
from legalrag.pipeline import ask, ask_stream, retrieve_for
from legalrag.ratelimit import RateLimitMiddleware
from legalrag.portal_api import router as portal_router
from legalrag.practice_api import router as practice_router
from legalrag.retrieve import Candidate

# Error reporting, opt-in by configuration: without SENTRY_DSN this is inert,
# which is what keeps local runs and tests from reporting anything.
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=_sentry_dsn,
        # Errors only. Performance tracing on a 2 vCPU box costs more than the
        # data is worth at this stage.
        traces_sample_rate=0.0,
        # Legal questions are privileged. Never ship request bodies.
        send_default_pii=False,
    )


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Opens the connection pool before the first request and closes it after
    the last.

    Warming it up front matters: the pool is otherwise built lazily, so the
    first caller after a deploy pays the connection handshakes that every
    other caller is spared. Closing it matters too -- left to the garbage
    collector at interpreter shutdown, psycopg_pool cannot join its worker
    threads and raises PythonFinalizationError into the logs on every restart.

    Failure to reach Postgres here is deliberately not fatal: the API should
    still start and report the fault per-request, rather than crash-loop and
    take the health endpoint down with it.
    """
    try:
        get_pool()
    except Exception:
        logging.getLogger("uvicorn.error").exception(
            "Could not open the database connection pool at startup; "
            "requests will retry and report the error individually."
        )
    try:
        yield
    finally:
        close_pool()


app = FastAPI(title="LegalOS API", version="0.3.0", lifespan=lifespan)

# The frontend is always a separate origin from this API -- the Next.js dev
# server locally, a deployed domain in production. Extra origins come from
# LEGALOS_CORS_ORIGINS (comma-separated) so a deploy does not need a code change.
# Outermost of the three, so a flood is turned away before it costs a JWT
# verification or a gzip pass. Raw ASGI -- see legalrag.ratelimit for why it
# must not be BaseHTTPMiddleware while /api/ask/stream exists.
app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The list endpoints behind the practice screens return JSON in the tens to
# hundreds of kilobytes, and Arabic text is three bytes per character in UTF-8,
# so it compresses hard. On localhost this buys nothing; over a real
# connection to a real firm it is most of the wait.
#
# Safe for the SSE answer stream: this Starlette excludes text/event-stream
# from compression by default, so tokens are not held in a zlib buffer waiting
# for a block to fill.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Practice management (clients, matters, cases, documents, tasks, time,
# billing) lives in its own module; the corpus and answering routes below are
# a separate concern that happens to share an app.
app.include_router(practice_router)
# The client-facing surface. Mounted separately and depending on none of the
# firm dependencies -- a client is not a member, and the guarantee that they
# cannot reach firm data is that these routes have no path that could.
app.include_router(portal_router)

@app.exception_handler(Exception)
def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    """Turns a crash into a 500 the browser is allowed to read.

    Starlette's own last-resort handler runs OUTSIDE CORSMiddleware, so an
    unhandled exception produced a response with no Access-Control-Allow-Origin
    header. The browser then refused to expose it and the fetch rejected as a
    network error -- which is why three separate server bugs all reached the
    screen as "Could not reach the API", accusing the connection while the
    server was the thing that broke. The headers are therefore attached here,
    where the origin is still in hand, rather than left to a middleware this
    response never passes back through.

    The detail is the exception's type and message: this is an API consumed by
    the firm's own staff, and a 500 that says nothing costs more in support
    than it saves in secrecy. Full tracebacks stay in the log (and in Sentry
    where it is configured).
    """
    logging.getLogger("uvicorn.error").exception(
        "unhandled error on %s %s", request.method, request.url.path
    )
    origin = request.headers.get("origin")
    headers = {}
    if origin and origin in get_cors_origins():
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
        headers=headers,
    )


if get_dev_auth_user():
    # Loud on purpose: this disables JWT verification for every route.
    logging.getLogger("uvicorn.error").warning(
        "LEGALOS_DEV_AUTH is set to %r -- authentication is DISABLED and every "
        "request is treated as that user. Never set this outside local development.",
        get_dev_auth_user(),
    )

Jurisdiction = Literal["EG", "SA"]


# The corpus, research and conversation routes below borrow from the same pool
# as the practice API. They used to open a connection each: ~12ms against the
# local Postgres and a TLS handshake against Neon, for queries that answer in
# single digits. Still named `db` because twenty-one routes say `with db()`.
#
# Safe on write semantics: the pool commits on clean exit where this used to
# close without committing, but every write reached from here (conversations.py)
# already commits explicitly, so there is never an open transaction relying on
# that rollback. Committing a read-only transaction is a no-op.
db = request_connection


def upstream_error(exc: Exception) -> tuple[int, str]:
    """Classify a model-provider failure into (status, message).

    Running out of OpenRouter credits is the failure this project actually hits,
    and it needs to reach the UI as a distinct, actionable message.

    Split out from upstream_guard because a streaming response cannot raise:
    by the time the model call fails the response has already started, so the
    same classification has to be deliverable as an SSE error event too.
    """
    detail = str(exc)
    status = getattr(exc, "status_code", None)
    if status == 402 or "credits" in detail.lower():
        return (
            402,
            "The model provider rejected the request for insufficient credits. "
            "Browsing and search still work; chat and explanations need credits.",
        )
    return 502, f"Model provider error: {detail}"


def upstream_guard(exc: Exception) -> HTTPException:
    """Surface model-provider failures as themselves, not as a generic 500."""
    status, detail = upstream_error(exc)
    return HTTPException(status_code=status, detail=detail)


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


class AskStreamRequest(AskRequest):
    """An ask that is persisted as a conversation turn.

    conversation_id is optional: omitting it starts a new conversation titled
    from this question, which is what a phone's "new chat" does. Supplying one
    appends to it, and a conversation that is not the caller's 404s.
    """

    conversation_id: int | None = None


class MessageOut(BaseModel):
    id: int
    role: str
    text: str
    created_at: datetime
    status: str | None = None
    citations: list[str] = []
    blocked_citations: list[str] = []
    articles: list[ArticleOut] = []

    @classmethod
    def of(cls, message: Message) -> "MessageOut":
        return cls(
            id=message.id,
            role=message.role,
            text=message.text,
            created_at=message.created_at,
            status=message.status,
            citations=message.citations,
            blocked_citations=message.blocked_citations,
            articles=[ArticleOut.of(c) for c in message.articles],
        )


class ConversationOut(BaseModel):
    id: int
    title: str
    jurisdiction: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    @classmethod
    def of(cls, conversation: Conversation) -> "ConversationOut":
        return cls(
            id=conversation.id,
            title=conversation.title,
            jurisdiction=conversation.jurisdiction,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            message_count=conversation.message_count,
        )


class ConversationDetail(BaseModel):
    conversation: ConversationOut
    messages: list[MessageOut]


class CreateConversationRequest(BaseModel):
    title: str = Field(default="New conversation", min_length=1, max_length=200)
    jurisdiction: Jurisdiction = "EG"


class RenameConversationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


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
    # When this text was fetched, and whether a later law replaced the one it
    # belongs to. Not optional: the whole point is that a reader cannot be
    # allowed to mistake a superseded article for a current one, and a field
    # present only on the bad cases is one a client forgets to render.
    currency: dict


class ExplainRequest(BaseModel):
    # Arabic by default: the corpus is Egyptian statute text in Arabic, so a
    # caller that does not say otherwise wants the explanation in the language
    # the article is written in. The web client sends the UI locale explicitly;
    # this covers everything else.
    language: Literal["en", "ar"] = "ar"


class OrganizationOut(BaseModel):
    id: int
    name: str
    # The firm's own details. Absent on the create response, which knows only
    # the name it was given.
    registration_number: str | None = None
    phone: str | None = None
    address: str | None = None
    logo_url: str | None = None
    # Values from the shared matter-type list (practice.matters.MATTER_TYPES).
    specialties: list[str] = Field(default_factory=list)


class CreateOrganizationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    # Optional at creation; the rest of the firm's details live in Settings.
    # Validated against MATTER_TYPES in orgs.py, same as the PATCH.
    specialties: list[str] = Field(default_factory=list)


class UpdateOrganizationRequest(BaseModel):
    """A PATCH: every field is optional and only what is sent is written.

    An empty string clears a field; omitting it (or null) leaves it alone --
    so a client that renders four inputs and sends all four cannot wipe the
    two it never showed.
    """

    name: str | None = Field(default=None, min_length=1, max_length=200)
    registration_number: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=60)
    address: str | None = Field(default=None, max_length=500)
    logo_url: str | None = Field(default=None, max_length=1000)
    # The whole list, replaced as one: a firm with three specialties that
    # unticks one sends two. Validated against MATTER_TYPES in orgs.py.
    specialties: list[str] | None = None


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
    # Whether this member sees the whole practice or only their own cases.
    # On the roster because the roster is where an owner changes it.
    matter_scope: str = "all"
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
    # Returned so the caller can always fall back to passing the link on by
    # hand -- and so it can say WHICH happened. An invitation that reports
    # success while no mail was sent is the failure worth avoiding here: the
    # owner waits for a colleague who was never told.
    accept_url: str
    email_sent: bool


class InvitationPreview(BaseModel):
    organization_name: str
    role: str
    status: str


class PendingInviteOut(BaseModel):
    """One issued invitation, as the firm's own roster screen shows it.

    No token: this list is a record of who was invited, not a way to re-read
    somebody else's acceptance link out of the API. The id is carried because
    a firm can invite the same address more than once, so the address alone
    does not identify a row.
    """

    id: int
    email: str
    role: str
    status: str
    expires_at: datetime


# --- endpoints --------------------------------------------------------------


@app.get("/api/health")
def health():
    with db() as conn:
        return {"status": "ok", "corpus": corpus_stats(conn)}


@app.post("/api/ask", response_model=AskResponse)
def post_ask(
    request: AskRequest,
    subject: str = Depends(get_current_subject),
):
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


def _sse(event: str, payload: dict) -> str:
    # ensure_ascii=False keeps Arabic readable on the wire; json.dumps still
    # escapes newlines inside strings, which SSE's line-based framing requires.
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/api/ask/stream")
def post_ask_stream(
    request: AskStreamRequest,
    subject: str = Depends(get_current_subject),
):
    """Ask, streaming the answer as it clears enforcement, and save the turn.

    Needs a *named* caller, not just any authenticated one: the turn is written
    to a subject's history, so there has to be a subject to write it under.
    Every route that reaches a paid model is authenticated now -- /api/ask,
    /api/search and the explain route included -- so this one is no longer the
    exception that keeps the spend off the open internet.

    Event sequence: `articles` (the retrieved sources and the ids to write
    back to), then zero or more `delta`, then exactly one of `done` or `error`.
    """
    with db() as conn:
        conversation = _resolve_conversation(conn, request, subject)
        try:
            retrieval, events = ask_stream(
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

        # Retrieval is done, so the question is a real turn now and is recorded
        # before the answer starts. A stream the client abandons half way still
        # leaves the conversation coherent: a question with no answer yet, not
        # an answer with no question.
        user_message = append_user_message(conn, conversation.id, request.question)

    return StreamingResponse(
        _ask_event_stream(conversation, user_message, retrieval, events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Nginx buffers proxied responses by default, which holds the whole
            # stream back until it completes and silently undoes the streaming.
            "X-Accel-Buffering": "no",
        },
    )


def _resolve_conversation(conn, request: AskStreamRequest, subject: str) -> Conversation:
    if request.conversation_id is None:
        return create_conversation(
            conn,
            subject,
            title=title_from_question(request.question),
            jurisdiction=request.jurisdiction,
        )
    conversation = get_conversation(conn, request.conversation_id, subject)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def _ask_event_stream(
    conversation: Conversation,
    user_message: Message,
    retrieval,
    events: Iterator,
) -> Iterator[str]:
    yield _sse(
        "articles",
        {
            "conversation_id": conversation.id,
            "conversation_title": conversation.title,
            "user_message_id": user_message.id,
            "strategy": retrieval.strategy,
            "degraded": retrieval.debug.get("degraded", []),
            "articles": [
                ArticleOut.of(c).model_dump() for c in retrieval.candidates
            ],
        },
    )

    try:
        for event in events:
            if isinstance(event, TextDelta):
                yield _sse("delta", {"text": event.text})
                continue

            assert isinstance(event, Completed)  # the only other event type
            answer = event.answer
            with db() as conn:
                message = append_answer(conn, conversation.id, answer)
            yield _sse(
                "done",
                {
                    "message_id": message.id,
                    "text": answer.text,
                    "citations": answer.citations,
                    "refused": answer.refused,
                    "blocked": answer.blocked,
                    "blocked_citations": list(answer.blocked_citations),
                    "status": message.status,
                },
            )
    except OpenAIError as exc:
        # Too late to raise: the response is already open. The client gets the
        # same classification an HTTP error would have carried.
        status, detail = upstream_error(exc)
        yield _sse("error", {"status": status, "detail": detail})
    except Exception as exc:  # noqa: BLE001 - a dropped stream must still terminate
        logging.getLogger("uvicorn.error").exception("ask stream failed")
        yield _sse("error", {"status": 500, "detail": f"{type(exc).__name__}: {exc}"})


@app.post("/api/search", response_model=SearchResponse)
def post_search(
    request: SearchRequest,
    subject: str = Depends(get_current_subject),
):
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
        # How old this text is, and whether a later law replaced it. Always
        # present, never conditional -- a field that appears only when there
        # is a problem is one the frontend forgets to render, and this one
        # must be impossible to forget. See legalrag.currency.
        how_current = currency.as_dict(currency.for_instrument(conn, instrument_id))
    return {
        "currency": how_current,
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
        how_current = currency.as_dict(currency.for_article(conn, article_id))

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
        currency=how_current,
    )


@app.post("/api/articles/{article_id}/explain")
def post_explain(
    article_id: int,
    request: ExplainRequest,
    subject: str = Depends(get_current_subject),
):
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


# --- conversations ----------------------------------------------------------
#
# Every route here scopes on the calling user in SQL rather than checking
# ownership after loading; see conversations.py for why.


@app.post("/api/conversations", response_model=ConversationOut)
def post_create_conversation(
    request: CreateConversationRequest,
    subject: str = Depends(get_current_subject),
):
    with db() as conn:
        conversation = create_conversation(
            conn, subject, request.title, request.jurisdiction
        )
    return ConversationOut.of(conversation)


@app.get("/api/conversations", response_model=list[ConversationOut])
def get_conversations(
    subject: str = Depends(get_current_subject),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    with db() as conn:
        return [
            ConversationOut.of(c)
            for c in list_conversations(conn, subject, limit=limit, offset=offset)
        ]


@app.get("/api/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation_detail(
    conversation_id: int,
    subject: str = Depends(get_current_subject),
):
    with db() as conn:
        conversation = get_conversation(conn, conversation_id, subject)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        messages = list_messages(conn, conversation_id)
    return ConversationDetail(
        conversation=ConversationOut.of(conversation),
        messages=[MessageOut.of(m) for m in messages],
    )


@app.patch("/api/conversations/{conversation_id}", response_model=ConversationOut)
def patch_conversation(
    conversation_id: int,
    request: RenameConversationRequest,
    subject: str = Depends(get_current_subject),
):
    with db() as conn:
        conversation = rename_conversation(
            conn, conversation_id, subject, request.title
        )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationOut.of(conversation)


@app.delete("/api/conversations/{conversation_id}", status_code=204)
def delete_conversation_route(
    conversation_id: int,
    subject: str = Depends(get_current_subject),
):
    with db() as conn:
        if not delete_conversation(conn, conversation_id, subject):
            raise HTTPException(status_code=404, detail="Conversation not found")


# --- organizations, invites, team management --------------------------------


@app.post("/api/orgs", response_model=OrganizationOut)
def post_create_organization(
    request: CreateOrganizationRequest,
    clerk_user_id: str = Depends(get_current_user_id),
):
    try:
        with db() as conn:
            org = create_organization(
                conn, request.name, clerk_user_id, specialties=request.specialties
            )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
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


@app.get("/api/orgs/{organization_id}", response_model=OrganizationOut)
def get_organization_detail(
    organization_id: int,
    membership: Membership = Depends(get_current_membership),
):
    """The firm's own details. Any member may read them -- they are printed on
    the invoices and letterheads everyone in the firm already sends."""
    with db() as conn:
        org = get_organization(conn, organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationOut(
        id=org.id,
        name=org.name,
        registration_number=org.registration_number,
        phone=org.phone,
        address=org.address,
        logo_url=org.logo_url,
        specialties=list(org.specialties),
    )


@app.patch("/api/orgs/{organization_id}", response_model=OrganizationOut)
def patch_organization(
    organization_id: int,
    request: UpdateOrganizationRequest,
    owner: Membership = Depends(require_owner),
):
    """Edits the firm's details. Owner only -- the firm name reaches every
    client on every invoice, so it is not a per-lawyer preference."""
    try:
        with db() as conn:
            org = update_organization(
                conn, organization_id, **request.model_dump(exclude_unset=True)
            )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationOut(
        id=org.id,
        name=org.name,
        registration_number=org.registration_number,
        phone=org.phone,
        address=org.address,
        logo_url=org.logo_url,
        specialties=list(org.specialties),
    )


# --- firm logo ----------------------------------------------------------------
#
# Stored under <document root>/logos/ as <org>-<uuid><ext>, and served from a
# public route by that name. Public because the browser loads it with a plain
# <img src>, which carries no bearer token -- and a logo is not a secret: it is
# printed on every invoice the firm sends. The uuid keeps the name unguessable
# all the same, and the route serves nothing outside that one directory.

_LOGO_DIR = "logos"
_LOGO_NAME = re.compile(r"^[0-9]+-[0-9a-f]{32}\.(png|jpg|webp)$")
_LOGO_MEDIA = {".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}


def _logo_dir() -> Path:
    path = get_document_root() / _LOGO_DIR
    path.mkdir(parents=True, exist_ok=True)
    return path


@app.post("/api/orgs/{organization_id}/logo", response_model=OrganizationOut)
async def post_organization_logo(
    organization_id: int,
    file: UploadFile,
    owner: Membership = Depends(require_owner),
):
    """Replaces the firm's logo. Owner only, like the rest of the firm's
    details. The type comes from the bytes, never from the name or the
    client's header; see uploads.sniff_image."""
    try:
        content = await uploads.read_capped(file, uploads.LOGO_MAX_BYTES)
    except uploads.UploadTooLarge:
        raise HTTPException(
            status_code=413,
            detail=f"Logo is larger than the {uploads.LOGO_MAX_BYTES // (1024 * 1024)}MB limit",
        )
    try:
        _content_type, suffix = uploads.sniff_image(content)
    except uploads.LogoRejected as exc:
        raise HTTPException(status_code=415, detail=str(exc))

    filename = f"{organization_id}-{uuid.uuid4().hex}{suffix}"
    (_logo_dir() / filename).write_bytes(content)

    with db() as conn:
        previous = get_organization(conn, organization_id)
        org = update_organization(conn, organization_id, logo_url=f"/api/logos/{filename}")
    if org is None:
        (_logo_dir() / filename).unlink(missing_ok=True)
        raise HTTPException(status_code=404, detail="Organization not found")

    # The old file goes only after the row points at the new one, so a failed
    # write never leaves the firm with a logo_url and no bytes behind it.
    if previous and previous.logo_url and previous.logo_url.startswith("/api/logos/"):
        old_name = previous.logo_url.removeprefix("/api/logos/")
        if _LOGO_NAME.match(old_name) and old_name != filename:
            (_logo_dir() / old_name).unlink(missing_ok=True)

    return OrganizationOut(
        id=org.id,
        name=org.name,
        registration_number=org.registration_number,
        phone=org.phone,
        address=org.address,
        logo_url=org.logo_url,
        specialties=list(org.specialties),
    )


@app.get("/api/logos/{filename}")
def get_logo(filename: str):
    # The pattern is the whole access control: it admits exactly the names
    # this server generates, so ".." and friends never reach the filesystem.
    if not _LOGO_NAME.match(filename):
        raise HTTPException(status_code=404, detail="Not found")
    path = _logo_dir() / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return Response(
        content=path.read_bytes(),
        media_type=_LOGO_MEDIA[path.suffix],
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=86400",
        },
    )


@app.get(
    "/api/orgs/{organization_id}/invites", response_model=list[PendingInviteOut]
)
def get_org_invites(
    organization_id: int,
    owner: Membership = Depends(require_owner),
):
    """Invitations this firm has issued. Owner only, matching who may create
    them -- an invitation names somebody's email address."""
    with db() as conn:
        invitations = list_invitations(conn, organization_id)
    return [
        PendingInviteOut(
            id=invite.id,
            email=invite.email,
            role=invite.role,
            # Same reading as the public preview: a pending row whose window
            # has closed is expired, whatever the column still says.
            status=effective_status(invite),
            expires_at=invite.expires_at,
        )
        for invite in invitations
    ]


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
    accept_url = f"{get_app_base_url()}/invite/{invite.token}"

    # The invitation is already committed above, and it is the durable half of
    # this operation: the token works whether or not a mail goes out. So a mail
    # failure must not 500 the request, which would tell the owner nothing was
    # created while a usable invitation sits in the table.
    #
    # Not a blanket except: an unconfigured mailer is a known, supported state
    # and is asked about first, while a send that fails for any other reason is
    # reported as itself rather than being flattened into "no email configured".
    email_sent = False
    if email_is_configured():
        try:
            send_invite_email(
                to_email=invite.email,
                organization_name=org_name,
                accept_url=accept_url,
            )
            email_sent = True
        except (EmailError, httpx.HTTPError) as exc:
            logging.getLogger("uvicorn.error").warning(
                "invitation %s created but its email failed to send: %s",
                invite.token[:8],
                exc,
            )

    return InvitationOut(
        token=invite.token,
        email=invite.email,
        role=invite.role,
        organization_name=org_name,
        accept_url=accept_url,
        email_sent=email_sent,
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
        organization_name=org_name,
        role=invitation.role,
        # Not invitation.status: that column lags expiry until somebody tries
        # to accept, so reading it raw offers an Accept button on a dead link.
        status=effective_status(invitation),
    )


@app.post("/api/invites/{token}/accept", response_model=MembershipOut)
def post_accept_invite(token: str, clerk_user_id: str = Depends(get_current_user_id)):
    # The email-match inside accept_invitation is a real security check, and
    # in production the address it checks must come from Clerk's Backend API,
    # never from the caller. The dev escape hatch has no Clerk to ask -- the
    # lookup would raise over the missing CLERK_SECRET_KEY and kill the whole
    # local invite flow at its last step -- and the check is moot in a mode
    # that already impersonates whoever LEGALOS_DEV_AUTH names, so accept as
    # the address the invitation was sent to.
    dev_mode = get_dev_auth_user() is not None
    if not dev_mode:
        # Before the connection is opened: a network call to Clerk must not
        # hold a pooled connection hostage while it waits.
        email = get_user_primary_email(clerk_user_id)
    with db() as conn:
        if dev_mode:
            found = get_invitation_by_token(conn, token)
            if found is None:
                raise HTTPException(status_code=404, detail="Invitation not found")
            email = found.email
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
            # Read from the row rather than left to the field default, which
            # reported every restricted member as seeing the whole practice.
            matter_scope=m.matter_scope,
            display_name=m.display_name,
            title=m.title,
        )
        for m in members
    ]


class MatterScopeIn(BaseModel):
    """'all' sees the whole practice; 'assigned' sees only their own cases."""

    matter_scope: Literal["all", "assigned"]


@app.put("/api/orgs/{organization_id}/members/{clerk_user_id}/matter-scope")
def put_member_matter_scope(
    organization_id: int,
    clerk_user_id: str,
    request: MatterScopeIn,
    owner: Membership = Depends(require_owner),
):
    """Opens or closes what one member can see. Owner only.

    Deciding who reads which client's file is the firm's call to make, not a
    lawyer's own -- so this is the narrower gate, not get_current_membership.
    """
    with request_connection() as conn:
        try:
            membership = set_matter_scope(
                conn, organization_id, clerk_user_id, request.matter_scope
            )
        except LookupError:
            raise HTTPException(status_code=404, detail="Member not found")
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
    return {
        "clerk_user_id": membership.clerk_user_id,
        "role": membership.role,
        "matter_scope": membership.matter_scope,
    }


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
