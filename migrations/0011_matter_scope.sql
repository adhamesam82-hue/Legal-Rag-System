-- 0011_matter_scope.sql
-- Whether a member sees every case in the firm, or only the ones they are on.
--
-- The firm decides per person. A senior partner sees everything; an associate
-- brought in for one matter should not be reading the rest of the practice,
-- and in a firm holding both sides' worth of confidences that is a
-- professional obligation rather than a preference.
--
-- The assignment mechanism already exists: matter_staff has been recording who
-- works a case since 0006. Nothing here adds a second one -- this column only
-- decides whether that table is consulted.
--
-- DEFAULT 'assigned' so a member added from here on starts closed and is
-- opened up deliberately. Existing rows are set to 'all' in the same
-- transaction: this migration must not silently take away access that people
-- already had, which is how a "security improvement" becomes an outage.

ALTER TABLE memberships
  ADD COLUMN matter_scope TEXT NOT NULL DEFAULT 'assigned'
    CHECK (matter_scope IN ('all', 'assigned'));

UPDATE memberships SET matter_scope = 'all';

-- The scoped queries all pivot on this lookup, and it had no index of its own
-- in the direction they read it (who is on what, rather than what has who).
CREATE INDEX IF NOT EXISTS matter_staff_by_user_idx
  ON matter_staff (clerk_user_id, matter_id);
