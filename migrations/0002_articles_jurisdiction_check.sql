-- 0002_articles_jurisdiction_check.sql
-- articles.jurisdiction had no CHECK constraint, unlike instruments.jurisdiction
-- (see 0001_init.sql). Phase 2's retrieval design filters on articles.jurisdiction
-- directly for the hard jurisdiction pre-filter, so this table-level backstop
-- must accept the same value set as instruments -- see also
-- src/legalrag/ingest.py's insert_articles(), which now derives
-- articles.jurisdiction from the parent instruments row instead of trusting a
-- separately-passed value, so the two columns can no longer disagree in the
-- first place. This constraint is the DB-level guard on top of that.

ALTER TABLE articles
  ADD CONSTRAINT articles_jurisdiction_check
  CHECK (jurisdiction IN ('EG', 'SA'));
