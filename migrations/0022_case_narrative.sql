-- 0022_case_narrative.sql
-- What the case is about, and cases that are the same dispute in more than
-- one court.
--
-- `cases` held the court, the judge, the number, the opposing party and the
-- filing date -- and not one word about the subject. No facts, no legal
-- basis, no defences. A lawyer preparing for a hearing found nothing in the
-- system to read; it was in a Word file, or in their head.
--
-- Six text columns, NOT NULL DEFAULT '' rather than nullable: every existing
-- case becomes six honestly empty fields, and the screen can say "empty --
-- write the facts here" without a second state for "unknown". client_narrative
-- is deliberately separate from facts: what the client said and what the
-- lawyer established are different documents, and a court reads only one.
--
-- ai_summary (0006) is untouched and unused. AI is closed in the first
-- release; summary is what the lawyer writes.
--
-- parent_case_id: the same dispute filed under different numbers before more
-- than one court -- an appeal, a parallel execution case, a related claim.
-- On `cases`, not `matters`: the child is another suit about the same
-- subject, and the file (matter) with its client and its billing is one.
-- Linking matters instead would double the files and split one piece of
-- work's billing across two of them.
--
-- ON DELETE SET NULL: deleting the parent must not take the child suit with
-- it -- that suit is still before its court. One level only, enforced in
-- practice/cases.py: a case that has a parent cannot itself be a parent.
-- That is the shape the practice actually has, and it spares the layer a
-- recursive walk on every write.

ALTER TABLE cases ADD COLUMN summary            TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN facts              TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN legal_basis        TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN defences           TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN procedural_posture TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN client_narrative   TEXT NOT NULL DEFAULT '';

ALTER TABLE cases ADD COLUMN parent_case_id BIGINT
  REFERENCES cases(id) ON DELETE SET NULL;

-- A case is not a sub-case of itself. Same-organization and one-level are
-- cross-row rules and live in the layer.
ALTER TABLE cases ADD CONSTRAINT cases_parent_not_self
  CHECK (parent_case_id IS NULL OR parent_case_id <> id);

CREATE INDEX ON cases (parent_case_id);
