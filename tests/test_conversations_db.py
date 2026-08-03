"""Saved chat history against a real database.

The isolation tests are the point of this file: conversation ids are
sequential, so "can user B read user A's conversation by id" is the question
that decides whether history is safe to turn on at all.
"""
from __future__ import annotations

import pytest

from legalrag.answer import DISCLAIMER_EN, Answer
from legalrag.conversations import (
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
from tests.conftest import connect_or_skip
from tests.test_answer import make_candidate, make_retrieval

USER_A = "clerk:user_test_conversations_a"
USER_B = "clerk:user_test_conversations_b"


@pytest.fixture
def conn():
    connection = connect_or_skip()
    yield connection
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM conversations WHERE subject = ANY(%s)",
            ([USER_A, USER_B],),
        )
    connection.commit()
    connection.close()


def real_article_id(connection) -> int:
    """message_articles has a real foreign key, so a real article is needed."""
    with connection.cursor() as cur:
        cur.execute("SELECT id FROM articles ORDER BY id LIMIT 1")
        row = cur.fetchone()
    if row is None:
        pytest.skip("corpus is empty")
    return row[0]


def grounded_answer(article_id: int) -> Answer:
    candidate = make_candidate()
    candidate = type(candidate)(
        **{**vars(candidate), "article_id": article_id}
    )
    return Answer(
        text=f"Hours are capped [Law 12/2003, Art. 80].\n\n_{DISCLAIMER_EN}_",
        citations=["12/2003 Art. 80"],
        retrieval=make_retrieval([candidate]),
        refused=False,
        blocked=False,
    )


class TestTitleFromQuestion:
    def test_short_question_is_kept_whole(self):
        assert title_from_question("What is the annual leave?") == "What is the annual leave?"

    def test_collapses_whitespace(self):
        assert title_from_question("What  is\n the  leave?") == "What is the leave?"

    def test_long_question_is_cut_on_a_word_boundary(self):
        title = title_from_question("What " * 40)
        assert len(title) <= 61
        assert title.endswith("…")
        assert "Wha…" not in title

    def test_empty_question_still_yields_a_title(self):
        assert title_from_question("   ") == "New conversation"

    def test_arabic_question_is_not_mangled(self):
        title = title_from_question("ما هي مدة الإجازة السنوية للعامل؟")
        assert title == "ما هي مدة الإجازة السنوية للعامل؟"


class TestOwnership:
    def test_another_users_conversation_is_not_readable_by_id(self):
        connection = connect_or_skip()
        try:
            mine = create_conversation(connection, USER_A, "Mine")
            assert get_conversation(connection, mine.id, USER_B) is None
            assert get_conversation(connection, mine.id, USER_A) is not None
        finally:
            with connection.cursor() as cur:
                cur.execute(
                    "DELETE FROM conversations WHERE subject = ANY(%s)",
                    ([USER_A, USER_B],),
                )
            connection.commit()
            connection.close()

    def test_listing_returns_only_the_callers_conversations(self, conn):
        create_conversation(conn, USER_A, "A's chat")
        create_conversation(conn, USER_B, "B's chat")

        titles_a = [c.title for c in list_conversations(conn, USER_A)]
        titles_b = [c.title for c in list_conversations(conn, USER_B)]

        assert "A's chat" in titles_a and "B's chat" not in titles_a
        assert "B's chat" in titles_b and "A's chat" not in titles_b

    def test_another_user_cannot_rename_or_delete(self, conn):
        mine = create_conversation(conn, USER_A, "Mine")

        assert rename_conversation(conn, mine.id, USER_B, "Hijacked") is None
        assert delete_conversation(conn, mine.id, USER_B) is False
        assert get_conversation(conn, mine.id, USER_A).title == "Mine"


class TestTurns:
    def test_a_saved_answer_reloads_with_its_sources_and_verdict(self, conn):
        article_id = real_article_id(conn)
        conversation = create_conversation(conn, USER_A, "Hours")
        append_user_message(conn, conversation.id, "How many hours?")
        append_answer(conn, conversation.id, grounded_answer(article_id))

        messages = list_messages(conn, conversation.id)

        assert [m.role for m in messages] == ["user", "assistant"]
        assistant = messages[1]
        assert assistant.status == "answered"
        assert assistant.citations == ["12/2003 Art. 80"]
        assert assistant.blocked_citations == []
        assert [a.article_id for a in assistant.articles] == [article_id]

    def test_a_blocked_answer_stores_the_notice_not_the_rejected_text(self, conn):
        article_id = real_article_id(conn)
        candidate = make_candidate()
        candidate = type(candidate)(**{**vars(candidate), "article_id": article_id})
        blocked = Answer(
            text="This answer was blocked because it cited articles that were not "
            "retrieved from the corpus, which means they cannot be verified: 99/1999 Art. 1",
            citations=["99/1999 Art. 1"],
            retrieval=make_retrieval([candidate]),
            refused=False,
            blocked=True,
            blocked_citations=("99/1999 Art. 1",),
        )
        conversation = create_conversation(conn, USER_A, "Blocked")
        append_answer(conn, conversation.id, blocked)

        assistant = list_messages(conn, conversation.id)[0]
        assert assistant.status == "blocked"
        assert assistant.blocked_citations == ["99/1999 Art. 1"]
        assert "was blocked" in assistant.text

    def test_appending_bumps_the_conversation_up_the_list(self, conn):
        older = create_conversation(conn, USER_A, "Older")
        create_conversation(conn, USER_A, "Newer")

        append_user_message(conn, older.id, "a follow-up question")

        assert [c.title for c in list_conversations(conn, USER_A)][:2] == ["Older", "Newer"]

    def test_message_count_counts_questions_not_turns(self, conn):
        article_id = real_article_id(conn)
        conversation = create_conversation(conn, USER_A, "Counting")
        append_user_message(conn, conversation.id, "one")
        append_answer(conn, conversation.id, grounded_answer(article_id))

        listed = next(c for c in list_conversations(conn, USER_A) if c.id == conversation.id)
        assert listed.message_count == 1

    def test_deleting_a_conversation_takes_its_messages(self, conn):
        conversation = create_conversation(conn, USER_A, "Doomed")
        append_user_message(conn, conversation.id, "question")

        assert delete_conversation(conn, conversation.id, USER_A) is True
        assert get_conversation(conn, conversation.id, USER_A) is None
        assert list_messages(conn, conversation.id) == []

    def test_an_empty_conversation_lists_no_messages(self, conn):
        conversation = create_conversation(conn, USER_A, "Empty")
        assert list_messages(conn, conversation.id) == []
