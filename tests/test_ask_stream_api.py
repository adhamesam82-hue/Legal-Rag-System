"""The streaming ask endpoint, end to end over SSE.

Retrieval and the model are both faked; what is being tested is the wire
contract the mobile client codes against -- event order, what a blocked answer
puts on the wire, and that a turn is persisted even when the client never sees
the end of the stream.
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from legalrag import api
from legalrag.answer import DISCLAIMER_EN, Answer, Completed, TextDelta
from legalrag.api import app
from legalrag.auth import get_current_subject
from legalrag.conversations import list_messages
from tests.conftest import connect_or_skip
from tests.test_answer import make_candidate, make_retrieval

USER = "clerk:user_test_ask_stream"


@pytest.fixture
def conn():
    connection = connect_or_skip()
    yield connection
    with connection.cursor() as cur:
        cur.execute("DELETE FROM conversations WHERE subject = %s", (USER,))
    connection.commit()
    connection.close()


@pytest.fixture
def article_id(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM articles ORDER BY id LIMIT 1")
        row = cur.fetchone()
    if row is None:
        pytest.skip("corpus is empty")
    return row[0]


@pytest.fixture
def client(conn):
    app.dependency_overrides[get_current_subject] = lambda: USER
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_subject, None)


def grounded(retrieval):
    """Deltas then a grounded Completed, built against the faked retrieval."""
    return [
        TextDelta("Hours are capped at eight "),
        TextDelta("[Law 12/2003, Art. 80]."),
        Completed(
            Answer(
                text=f"Hours are capped at eight [Law 12/2003, Art. 80].\n\n_{DISCLAIMER_EN}_",
                citations=["12/2003 Art. 80"],
                retrieval=retrieval,
                refused=False,
                blocked=False,
            )
        ),
    ]


def parse_sse(body: str) -> list[tuple[str, dict]]:
    events = []
    for block in body.strip().split("\n\n"):
        if not block.strip():
            continue
        name, data = None, None
        for line in block.splitlines():
            if line.startswith("event: "):
                name = line[len("event: ") :]
            elif line.startswith("data: "):
                data = json.loads(line[len("data: ") :])
        events.append((name, data))
    return events


def stream_ask(client, monkeypatch, article_id, make_events, body=None):
    candidate = make_candidate()
    candidate = type(candidate)(**{**vars(candidate), "article_id": article_id})
    retrieval = make_retrieval([candidate])
    events = make_events(retrieval)

    monkeypatch.setattr(
        api, "ask_stream", lambda conn, q, j, **kw: (retrieval, iter(events))
    )
    response = client.post(
        "/api/ask/stream", json=body or {"question": "How many hours?"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    return parse_sse(response.text)


class TestEventContract:
    def test_articles_arrive_first_then_deltas_then_done(
        self, client, monkeypatch, article_id
    ):
        events = stream_ask(client, monkeypatch, article_id, grounded)
        names = [name for name, _ in events]

        assert names[0] == "articles"
        assert names[-1] == "done"
        assert set(names[1:-1]) == {"delta"}

    def test_articles_event_carries_the_retrieved_sources_and_new_ids(
        self, client, monkeypatch, article_id
    ):
        events = stream_ask(client, monkeypatch, article_id, grounded)
        _, payload = events[0]

        assert payload["conversation_id"] > 0
        assert payload["user_message_id"] > 0
        assert payload["conversation_title"] == "How many hours?"
        assert [a["id"] for a in payload["articles"]] == [article_id]

    def test_done_carries_the_authoritative_text(self, client, monkeypatch, article_id):
        events = stream_ask(client, monkeypatch, article_id, grounded)
        _, done = events[-1]

        assert done["blocked"] is False
        assert done["refused"] is False
        assert done["status"] == "answered"
        assert done["citations"] == ["12/2003 Art. 80"]
        assert "not legal advice" in done["text"]
        assert done["message_id"] > 0

    def test_arabic_text_survives_the_wire(self, client, monkeypatch, article_id):
        def arabic(retrieval):
            return [
                TextDelta("ساعات العمل محدودة "),
                Completed(
                    Answer(
                        text="ساعات العمل محدودة [Law 12/2003, Art. 80].",
                        citations=["12/2003 Art. 80"],
                        retrieval=retrieval,
                        refused=False,
                        blocked=False,
                    )
                ),
            ]

        events = stream_ask(
            client,
            monkeypatch,
            article_id,
            arabic,
            body={"question": "كم ساعة يجوز تشغيل العامل؟"},
        )
        deltas = [d["text"] for name, d in events if name == "delta"]
        assert "ساعات العمل محدودة " in deltas


class TestBlockedOverTheWire:
    def test_a_blocked_answer_ends_the_stream_with_a_blocked_done(
        self, client, monkeypatch, article_id
    ):
        def blocked(retrieval):
            return [
                TextDelta("Hours are capped [Law 12/2003, Art. 80]. "),
                Completed(
                    Answer(
                        text="This answer was blocked because it cited articles that "
                        "were not retrieved from the corpus, which means they cannot "
                        "be verified: 99/1999 Art. 1",
                        citations=["12/2003 Art. 80", "99/1999 Art. 1"],
                        retrieval=retrieval,
                        refused=False,
                        blocked=True,
                        blocked_citations=("99/1999 Art. 1",),
                    )
                ),
            ]

        events = stream_ask(client, monkeypatch, article_id, blocked)
        _, done = events[-1]

        assert done["blocked"] is True
        assert done["status"] == "blocked"
        assert done["blocked_citations"] == ["99/1999 Art. 1"]
        # The text a conforming client swaps in must not read as an answer.
        assert "Hours are capped" not in done["text"]


class TestPersistence:
    def test_the_turn_is_saved_and_reloadable(
        self, client, monkeypatch, article_id, conn
    ):
        events = stream_ask(client, monkeypatch, article_id, grounded)
        conversation_id = events[0][1]["conversation_id"]

        messages = list_messages(conn, conversation_id)
        assert [m.role for m in messages] == ["user", "assistant"]
        assert messages[0].text == "How many hours?"
        assert messages[1].status == "answered"
        assert [a.article_id for a in messages[1].articles] == [article_id]

    def test_the_question_is_saved_even_if_the_answer_never_arrives(
        self, client, monkeypatch, article_id, conn
    ):
        """A phone loses the network mid-answer constantly. The conversation
        must not be left holding an answer with no question."""

        def dies(retrieval):
            class Exploding:
                def __iter__(self):
                    return self

                def __next__(self):
                    raise RuntimeError("connection dropped")

            return Exploding()

        events = stream_ask(client, monkeypatch, article_id, dies)
        names = [name for name, _ in events]
        assert names == ["articles", "error"]

        conversation_id = events[0][1]["conversation_id"]
        messages = list_messages(conn, conversation_id)
        assert [m.role for m in messages] == ["user"]

    def test_a_second_ask_appends_to_the_same_conversation(
        self, client, monkeypatch, article_id, conn
    ):
        first = stream_ask(client, monkeypatch, article_id, grounded)
        conversation_id = first[0][1]["conversation_id"]

        second = stream_ask(
            client,
            monkeypatch,
            article_id,
            grounded,
            body={"question": "And overtime?", "conversation_id": conversation_id},
        )
        assert second[0][1]["conversation_id"] == conversation_id
        assert len(list_messages(conn, conversation_id)) == 4

    def test_another_users_conversation_is_not_appendable(
        self, client, monkeypatch, article_id, conn
    ):
        from legalrag.conversations import create_conversation

        theirs = create_conversation(conn, "clerk:someone_else", "Theirs")
        try:
            candidate = make_candidate()
            candidate = type(candidate)(**{**vars(candidate), "article_id": article_id})
            monkeypatch.setattr(
                api,
                "ask_stream",
                lambda conn, q, j, **kw: (make_retrieval([candidate]), iter([])),
            )
            response = client.post(
                "/api/ask/stream",
                json={"question": "hi", "conversation_id": theirs.id},
            )
            assert response.status_code == 404
        finally:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM conversations WHERE id = %s", (theirs.id,))
            conn.commit()


class TestConversationRoutes:
    def test_list_get_rename_delete(self, client, monkeypatch, article_id):
        events = stream_ask(client, monkeypatch, article_id, grounded)
        conversation_id = events[0][1]["conversation_id"]

        listed = client.get("/api/conversations").json()
        assert conversation_id in [c["id"] for c in listed]
        assert next(c for c in listed if c["id"] == conversation_id)["message_count"] == 1

        detail = client.get(f"/api/conversations/{conversation_id}").json()
        assert [m["role"] for m in detail["messages"]] == ["user", "assistant"]
        assert detail["messages"][1]["articles"][0]["id"] == article_id

        renamed = client.patch(
            f"/api/conversations/{conversation_id}", json={"title": "Working hours"}
        )
        assert renamed.json()["title"] == "Working hours"

        assert client.delete(f"/api/conversations/{conversation_id}").status_code == 204
        assert client.get(f"/api/conversations/{conversation_id}").status_code == 404

    def test_unknown_conversation_is_a_404(self, client):
        assert client.get("/api/conversations/99999999").status_code == 404
        assert client.delete("/api/conversations/99999999").status_code == 404
