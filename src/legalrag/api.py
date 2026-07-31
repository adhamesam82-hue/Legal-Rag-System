"""HTTP API. Run: uv run uvicorn legalrag.api:app --reload --port 8000

Note on streaming: /api/ask deliberately does not stream. Citation enforcement
runs on the completed text, and an answer is blocked when it cites an article
that was not retrieved. Streaming tokens would put the unverified text on screen
before the check that decides whether it may be shown at all.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAIError
from pydantic import BaseModel, Field

from legalrag.answer import Answer
from legalrag.db import get_connection
from legalrag.explain import explain_article
from legalrag.library import (
    article_neighbours,
    corpus_stats,
    get_article,
    get_instrument,
    list_articles,
    list_instruments,
)
from legalrag.pipeline import ask, retrieve_for
from legalrag.retrieve import Candidate

app = FastAPI(title="Legal RAG API", version="0.2.0")

# The Next.js dev server is a separate origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
