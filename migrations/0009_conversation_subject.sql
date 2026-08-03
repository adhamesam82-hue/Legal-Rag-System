-- 0009_conversation_subject.sql
-- Conversations are no longer owned only by Clerk users.
--
-- The consumer mobile app is a separate business with separate customers, and
-- signs in with Firebase (Apple and Google) rather than Clerk. So the owner of
-- a conversation may now come from either provider, and `clerk_user_id` became
-- a name that lies about half its rows.
--
-- The column is renamed and its values namespaced by provider:
--
--     clerk:user_2abc...      a law-firm user
--     firebase:8fK2p...       a consumer app user
--
-- The prefix is not decoration. Clerk user ids and Firebase uids are both
-- opaque strings from different keyspaces, so without it a collision between
-- the two would silently hand one person another's legal questions. With it,
-- a collision is impossible rather than improbable.
--
-- Done now, while the only rows are local and test data. Once real consumer
-- conversations exist this becomes a migration that has to reason about which
-- provider each historical row came from.

ALTER TABLE conversations RENAME COLUMN clerk_user_id TO subject;

-- Every existing row predates the consumer app, so all of them are Clerk.
UPDATE conversations SET subject = 'clerk:' || subject WHERE subject NOT LIKE '%:%';

-- Rebuild the list-screen index against the renamed column. (RENAME COLUMN
-- keeps the index working, but its name still says clerk_user_id, which is the
-- same lie one level down.)
DROP INDEX IF EXISTS conversations_clerk_user_id_updated_at_idx;
CREATE INDEX IF NOT EXISTS conversations_subject_updated_at_idx
    ON conversations (subject, updated_at DESC);

-- A subject must always carry its provider. This is the constraint that keeps
-- the namespacing true over time: a future code path that writes a bare user
-- id fails loudly here instead of creating rows nobody can safely query.
ALTER TABLE conversations
    ADD CONSTRAINT conversations_subject_is_namespaced
    CHECK (subject LIKE 'clerk:%' OR subject LIKE 'firebase:%');
