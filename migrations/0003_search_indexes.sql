-- 0003_search_indexes.sql
-- Makes the corpus lexically searchable. See design doc
-- docs/ailab/specs/2026-07-31-phase2-retrieval-answering-design.md
--
-- 0001_init.sql created articles.text_search as a plain tsvector column and
-- nothing ever wrote to it -- all 6,985 rows were NULL. Replacing it with a
-- generated column means it cannot drift out of sync with the text it indexes,
-- which matters because article_text_norm is itself derived (arabic.normalize)
-- and design rule 6 requires indexed text and query text to agree exactly.
--
-- The 'arabic' config stems and drops Arabic stopwords. It runs on
-- article_text_norm, not article_text, so it sees text that already has
-- diacritics, tatweel, and alef/ta-marbuta/alef-maqsura variation removed.

DROP INDEX IF EXISTS articles_text_search_idx;
ALTER TABLE articles DROP COLUMN text_search;

ALTER TABLE articles
  ADD COLUMN text_search tsvector
  GENERATED ALWAYS AS (to_tsvector('arabic', article_text_norm)) STORED;

CREATE INDEX articles_text_search_idx ON articles USING gin (text_search);

-- Trigram similarity is the second ranked list fused into RRF. It catches
-- morphological variants and misspellings that survive normalization but that
-- the Arabic stemmer does not conflate.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX articles_text_norm_trgm_idx
  ON articles USING gin (article_text_norm gin_trgm_ops);

-- Citation lookup path: resolve (jurisdiction, article_number) directly.
CREATE INDEX articles_citation_lookup_idx
  ON articles (jurisdiction, article_number);

-- Instrument title matching for citations that name a law but not its number
-- ("المادة 163 من القانون المدني").
CREATE INDEX instruments_title_norm_trgm_idx
  ON instruments USING gin (title_norm gin_trgm_ops);
