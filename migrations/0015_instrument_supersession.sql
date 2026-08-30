-- 0015_instrument_supersession.sql
-- So the corpus can say when a law has been replaced.
--
-- THE PROBLEM THIS ADDRESSES
--
-- `is_repealed` has been read in twelve places since 0001 and written in none.
-- The corpus currently holds Labour Law 12/2003 alongside قانون العمل الجديد
-- 14/2025 that replaced it, with no relationship recorded and both marked
-- live. A lawyer reading the older one sees nothing to tell them so, and --
-- this is the part that makes it dangerous rather than merely incomplete --
-- an answer citing it looks exactly like a correct one. Right number, right
-- year, right text. A hallucinated citation announces itself; a superseded
-- one does not.
--
-- WHY THIS IS INSTRUMENT-LEVEL AND NOT ARTICLE-LEVEL
--
-- Article-level amendment tracking means parsing the Official Gazette for
-- "تُلغى المادة كذا" and linking each amendment to its target. That is a
-- project, it needs a source that may not be machine-readable, and it is not
-- something to half-build.
--
-- Saying "a later law replaced this one" is a hundredth of the work and
-- catches the case that actually hurts. It is a WARNING, not a repeal flag:
-- it does not claim to know which articles survived, only that a lawyer
-- should look before relying on this text. That is a true statement the
-- system can make, and the alternative was silence.
--
-- `is_repealed` stays untouched and unwritten. Setting it would claim
-- article-level knowledge nobody has, and every query filters on it.

CREATE TABLE instrument_supersessions (
  id                 BIGSERIAL PRIMARY KEY,
  -- The older law.
  superseded_id      BIGINT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  -- The one that replaced it. Nullable: a firm may know a law was replaced
  -- before the replacement is in the corpus, and recording half the fact is
  -- better than recording none.
  superseding_id     BIGINT REFERENCES instruments(id) ON DELETE SET NULL,
  -- Free text when superseding_id is unknown, e.g. "القانون 14 لسنة 2025".
  superseding_label  TEXT NOT NULL DEFAULT '',
  -- 'full'    the whole law was replaced
  -- 'partial' parts of it were, and the rest still stands
  -- The distinction changes what a lawyer does next, so it is recorded rather
  -- than assumed.
  scope              TEXT NOT NULL DEFAULT 'full'
                     CHECK (scope IN ('full', 'partial')),
  effective_on       DATE,
  note               TEXT NOT NULL DEFAULT '',
  -- Who said so. A supersession asserted by the system and one entered by a
  -- lawyer carry different weight, and a reader deserves to know which.
  source             TEXT NOT NULL DEFAULT 'manual',
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (superseded_id, superseding_id)
);

CREATE INDEX ON instrument_supersessions (superseded_id);

-- The one the corpus already contains, and the reason this table exists.
-- Egypt's Labour Law 12/2003 was replaced by Law 14/2025. Recorded as 'full'
-- because that is what a new labour law is, with the caveat that which
-- transitional provisions survive is a question for the lawyer -- which is
-- exactly what the warning tells them.
INSERT INTO instrument_supersessions
       (superseded_id, superseding_id, superseding_label, scope, note, source)
SELECT old.id, new.id, 'قانون العمل رقم 14 لسنة 2025', 'full',
       'قانون العمل الجديد. راجع الأحكام الانتقالية قبل الاستناد إلى النص القديم.',
       'seed'
  FROM instruments old
  JOIN instruments new
    ON new.jurisdiction = 'EG' AND new.number = '14'  AND new.year = 2025
 WHERE old.jurisdiction = 'EG' AND old.number = '12' AND old.year = 2003
ON CONFLICT DO NOTHING;
