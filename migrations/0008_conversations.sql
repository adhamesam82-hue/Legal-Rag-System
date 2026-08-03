-- 0008_conversations.sql
-- Chat history for the assistant. Until now conversations lived only in the
-- browser tab that created them (web/lib/i18n/catalogs/ai.ts still says so:
-- "Conversations are kept for this session only"), which is survivable for a
-- desktop tool and not survivable for a phone, where the app is killed and
-- relaunched constantly.
--
-- Ownership is the Clerk user id, TEXT and not a foreign key, for the same
-- reason as 0005: Clerk owns identity, this database does not.
--
-- organization_id is nullable on purpose. The same tables serve two products:
-- LegalOS, where a conversation belongs to a firm, and the consumer mobile
-- app, where there is no firm at all. A NOT NULL column would have forced the
-- consumer app to invent a fake organization for every signup.

CREATE TABLE conversations (
  id               BIGSERIAL PRIMARY KEY,
  clerk_user_id    TEXT NOT NULL,
  organization_id  BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  jurisdiction     TEXT NOT NULL CHECK (jurisdiction IN ('EG', 'SA')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The list screen is the only way into a conversation, and it always asks the
-- same question: this user's conversations, most recently active first.
CREATE INDEX ON conversations (clerk_user_id, updated_at DESC);

CREATE TABLE messages (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  text             TEXT NOT NULL,

  -- How answer.py classified this turn. Persisted rather than re-derived,
  -- because the three outcomes are not recoverable from the text: a refusal
  -- and a blocked answer are both prose, and telling them apart after the
  -- fact by pattern-matching the wording is exactly the kind of fragile check
  -- the citation enforcement exists to avoid. NULL for user messages.
  status           TEXT CHECK (status IN ('answered', 'refused', 'blocked')),

  -- Which retrieval path produced the context (direct_citation, vector, ...).
  -- Diagnostic only; the UI does not show it.
  strategy         TEXT,

  -- Citations as extracted from the answer text, in the exact form
  -- answer.extract_citations produces ("12/2003 Art. 80"). blocked_citations
  -- is the subset that did not resolve to a retrieved article -- kept so a
  -- blocked answer stays explainable when it is reloaded from history.
  citations         TEXT[] NOT NULL DEFAULT '{}',
  blocked_citations TEXT[] NOT NULL DEFAULT '{}',

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON messages (conversation_id, id);

-- The articles that were retrieved for an assistant turn -- the model's entire
-- permitted source for that answer.
--
-- Stored per message rather than recomputed on read. Re-running retrieval to
-- redisplay an old conversation would not reproduce it: the corpus is
-- re-ingested and re-embedded over time, so the same question asked against a
-- later index returns a different set, and the citations shown under a saved
-- answer would stop matching the text above them.
CREATE TABLE message_articles (
  message_id  BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  rank        INTEGER NOT NULL,
  score       DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (message_id, article_id)
);

CREATE INDEX ON message_articles (message_id, rank);
