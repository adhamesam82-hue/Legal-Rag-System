"""Saved chat history for the assistant.

A conversation is owned by exactly one *subject*, and every function here that
touches one takes that subject and filters on it in SQL. There is deliberately
no "fetch by id" that trusts the caller to have checked ownership first:
conversation ids are sequential BIGSERIALs, so an unscoped lookup would let
anyone read anyone's legal questions by counting upwards.

A subject is namespaced by identity provider -- `clerk:user_2abc` for a law
firm user, `firebase:8fK2p` for a consumer app user -- because these tables
serve two products with two separate customer bases. See auth.py for why the
prefix is load-bearing rather than cosmetic.

Assistant turns store the retrieved articles alongside the text (see
migration 0008 for why they are not recomputed on read).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

import psycopg

from legalrag.answer import Answer
from legalrag.retrieve import Candidate

TITLE_MAX_LENGTH = 60


@dataclass(frozen=True)
class Conversation:
    id: int
    subject: str
    organization_id: int | None
    title: str
    jurisdiction: str
    created_at: datetime
    updated_at: datetime
    # Populated by list_conversations, which needs it for the list screen's
    # subtitle. Left at 0 by the single-row lookups, where the caller is about
    # to load the messages themselves anyway.
    message_count: int = 0


@dataclass(frozen=True)
class Message:
    id: int
    conversation_id: int
    role: str
    text: str
    created_at: datetime
    # Assistant turns only; None on a user turn.
    status: str | None = None
    strategy: str | None = None
    citations: list[str] = field(default_factory=list)
    blocked_citations: list[str] = field(default_factory=list)
    articles: list[Candidate] = field(default_factory=list)


def title_from_question(question: str) -> str:
    """A conversation's opening question, trimmed to a list-screen title.

    Truncated on a word boundary where one is available, so an Arabic or
    English title does not end mid-word. Falls back to a hard cut for text with
    no spaces in range.
    """
    collapsed = " ".join(question.split())
    if len(collapsed) <= TITLE_MAX_LENGTH:
        return collapsed or "New conversation"
    clipped = collapsed[:TITLE_MAX_LENGTH]
    boundary = clipped.rfind(" ")
    if boundary > TITLE_MAX_LENGTH // 2:
        clipped = clipped[:boundary]
    return clipped.rstrip() + "…"


def create_conversation(
    conn: psycopg.Connection,
    subject: str,
    title: str,
    jurisdiction: str = "EG",
    organization_id: int | None = None,
) -> Conversation:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO conversations (subject, organization_id, title, jurisdiction) "
            "VALUES (%s, %s, %s, %s) "
            "RETURNING id, subject, organization_id, title, jurisdiction, "
            "created_at, updated_at",
            (subject, organization_id, title, jurisdiction),
        )
        row = cur.fetchone()
    conn.commit()
    return Conversation(*row)


def list_conversations(
    conn: psycopg.Connection,
    subject: str,
    limit: int = 50,
    offset: int = 0,
) -> list[Conversation]:
    """This user's conversations, most recently active first."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT c.id, c.subject, c.organization_id, c.title, c.jurisdiction, "
            "       c.created_at, c.updated_at, "
            "       (SELECT count(*) FROM messages m "
            "         WHERE m.conversation_id = c.id AND m.role = 'user') "
            "FROM conversations c "
            "WHERE c.subject = %s "
            "ORDER BY c.updated_at DESC, c.id DESC "
            "LIMIT %s OFFSET %s",
            (subject, limit, offset),
        )
        return [Conversation(*row) for row in cur.fetchall()]


def get_conversation(
    conn: psycopg.Connection, conversation_id: int, subject: str
) -> Conversation | None:
    """One conversation, or None if it does not exist *or* is not this user's.

    The two cases are deliberately not distinguished: telling a caller "this
    exists but is not yours" confirms that a given id is a real conversation.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, subject, organization_id, title, jurisdiction, "
            "       created_at, updated_at "
            "FROM conversations WHERE id = %s AND subject = %s",
            (conversation_id, subject),
        )
        row = cur.fetchone()
    return Conversation(*row) if row else None


def rename_conversation(
    conn: psycopg.Connection, conversation_id: int, subject: str, title: str
) -> Conversation | None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE conversations SET title = %s "
            "WHERE id = %s AND subject = %s "
            "RETURNING id, subject, organization_id, title, jurisdiction, "
            "created_at, updated_at",
            (title, conversation_id, subject),
        )
        row = cur.fetchone()
    conn.commit()
    return Conversation(*row) if row else None


def delete_conversation(
    conn: psycopg.Connection, conversation_id: int, subject: str
) -> bool:
    """Deletes a conversation and its messages. False if it wasn't this user's."""
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM conversations WHERE id = %s AND subject = %s",
            (conversation_id, subject),
        )
        deleted = cur.rowcount > 0
    conn.commit()
    return deleted


def _touch(cur: psycopg.Cursor, conversation_id: int) -> None:
    cur.execute(
        "UPDATE conversations SET updated_at = now() WHERE id = %s", (conversation_id,)
    )


def append_user_message(
    conn: psycopg.Connection, conversation_id: int, text: str
) -> Message:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO messages (conversation_id, role, text) "
            "VALUES (%s, 'user', %s) RETURNING id, created_at",
            (conversation_id, text),
        )
        message_id, created_at = cur.fetchone()
        _touch(cur, conversation_id)
    conn.commit()
    return Message(
        id=message_id,
        conversation_id=conversation_id,
        role="user",
        text=text,
        created_at=created_at,
    )


def status_of(answer: Answer) -> str:
    if answer.blocked:
        return "blocked"
    if answer.refused:
        return "refused"
    return "answered"


def append_answer(
    conn: psycopg.Connection, conversation_id: int, answer: Answer
) -> Message:
    """Stores an assistant turn: the text as shown, its verdict, and its sources.

    The text stored is answer.text, which for a blocked answer is the blocked
    notice rather than the model's output. The rejected text is not kept: the
    whole point of blocking is that it must never be readable as an answer, and
    a copy in the database is a copy that some later screen can render.
    """
    retrieval = answer.retrieval
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO messages "
            "  (conversation_id, role, text, status, strategy, citations, blocked_citations) "
            "VALUES (%s, 'assistant', %s, %s, %s, %s, %s) "
            "RETURNING id, created_at",
            (
                conversation_id,
                answer.text,
                status_of(answer),
                retrieval.strategy,
                list(answer.citations),
                list(answer.blocked_citations),
            ),
        )
        message_id, created_at = cur.fetchone()

        if retrieval.candidates:
            cur.executemany(
                "INSERT INTO message_articles (message_id, article_id, rank, score) "
                "VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                [
                    (message_id, c.article_id, rank, c.score)
                    for rank, c in enumerate(retrieval.candidates)
                ],
            )
        _touch(cur, conversation_id)
    conn.commit()

    return Message(
        id=message_id,
        conversation_id=conversation_id,
        role="assistant",
        text=answer.text,
        created_at=created_at,
        status=status_of(answer),
        strategy=retrieval.strategy,
        citations=list(answer.citations),
        blocked_citations=list(answer.blocked_citations),
        articles=list(retrieval.candidates),
    )


def list_messages(conn: psycopg.Connection, conversation_id: int) -> list[Message]:
    """Every turn in a conversation, oldest first, with its retrieved articles.

    Ownership is not checked here -- callers reach this only after
    get_conversation has already resolved the conversation for the calling user.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, conversation_id, role, text, created_at, status, strategy, "
            "       citations, blocked_citations "
            "FROM messages WHERE conversation_id = %s ORDER BY id",
            (conversation_id,),
        )
        rows = cur.fetchall()
        if not rows:
            return []

        # One query for every message's articles rather than one per message:
        # a long conversation is the common case on a phone, where the whole
        # thread is loaded on open.
        cur.execute(
            "SELECT ma.message_id, a.id, i.number, i.year, i.title, i.instrument_type, "
            "       a.article_number, a.article_text, ma.score "
            "FROM message_articles ma "
            "JOIN articles a ON a.id = ma.article_id "
            "JOIN instruments i ON i.id = a.instrument_id "
            "WHERE ma.message_id = ANY(%s) "
            "ORDER BY ma.message_id, ma.rank",
            ([row[0] for row in rows],),
        )
        by_message: dict[int, list[Candidate]] = {}
        for message_id, *candidate_row in cur.fetchall():
            by_message.setdefault(message_id, []).append(Candidate(*candidate_row))

    return [
        Message(
            id=row[0],
            conversation_id=row[1],
            role=row[2],
            text=row[3],
            created_at=row[4],
            status=row[5],
            strategy=row[6],
            citations=list(row[7] or []),
            blocked_citations=list(row[8] or []),
            articles=by_message.get(row[0], []),
        )
        for row in rows
    ]
