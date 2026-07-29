-- 0001_init.sql
-- Core schema: instruments, articles, amendments. See design doc
-- docs/ailab/specs/2026-07-30-phase1-corpus-infrastructure-design.md
-- for the full rationale.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE instruments (
  id                 BIGSERIAL PRIMARY KEY,
  jurisdiction       TEXT NOT NULL CHECK (jurisdiction IN ('EG','SA')),
  instrument_type    TEXT NOT NULL,
  number             TEXT NOT NULL,
  year               INT  NOT NULL,
  title              TEXT NOT NULL,
  title_norm         TEXT NOT NULL,
  promulgated_on     DATE,
  gazette_ref        TEXT,
  source_url         TEXT NOT NULL,
  fetched_at         TIMESTAMPTZ NOT NULL,
  UNIQUE (jurisdiction, instrument_type, number, year)
);

CREATE TABLE articles (
  id                      BIGSERIAL PRIMARY KEY,
  instrument_id           BIGINT NOT NULL REFERENCES instruments(id),
  jurisdiction            TEXT NOT NULL,
  book                    TEXT,
  chapter                 TEXT,
  section                 TEXT,
  article_number          TEXT NOT NULL,
  article_sort_key        NUMERIC NOT NULL,
  article_text            TEXT NOT NULL,
  article_text_norm       TEXT NOT NULL,
  norm_version            TEXT NOT NULL,
  language                TEXT NOT NULL,
  is_official_translation BOOLEAN DEFAULT FALSE,
  effective_from          DATE,
  effective_to            DATE,
  is_repealed             BOOLEAN DEFAULT FALSE,
  content_hash            TEXT NOT NULL,
  source_url              TEXT NOT NULL,
  embedding               vector(1024),
  text_search             tsvector,
  UNIQUE (instrument_id, article_number, language)
);

CREATE TABLE amendments (
  id                      BIGSERIAL PRIMARY KEY,
  target_article_id       BIGINT REFERENCES articles(id),
  amending_instrument_id  BIGINT REFERENCES instruments(id),
  action                  TEXT NOT NULL,
  effective_on            DATE,
  note                    TEXT
);

CREATE INDEX ON articles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON articles USING gin (text_search);
CREATE INDEX ON articles (jurisdiction, is_repealed);
