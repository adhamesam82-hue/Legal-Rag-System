-- 0004_embedding_halfvec.sql
-- Switches the embedding column to match the model that was actually chosen.
-- See docs/ailab/specs/2026-07-31-phase2-retrieval-answering-design.md
--
-- 0001_init.sql sized this vector(1024) for BGE-M3, which cannot run on this
-- machine and 500s on the hosted API. The model that measurably works on Arabic
-- (nvidia/nemotron-3-embed-1b) emits 2048 dimensions and its API refuses to
-- truncate to anything smaller.
--
-- The type is halfvec, not vector, because pgvector caps HNSW at 2000 dimensions
-- for vector but allows up to 4000 for halfvec. halfvec stores fp16, which costs
-- precision that cosine ranking over 2048 dimensions does not miss.
--
-- The column was NULL for all 6,985 rows, so nothing is lost by dropping it.

DROP INDEX IF EXISTS articles_embedding_idx;
ALTER TABLE articles DROP COLUMN IF EXISTS embedding;

ALTER TABLE articles ADD COLUMN embedding halfvec(2048);

-- Records which model produced the vector. A model change invalidates every
-- embedding, exactly as a normalization change invalidates article_text_norm,
-- and without this there is no way to tell a stale row from a current one.
ALTER TABLE articles ADD COLUMN embedding_model TEXT;

CREATE INDEX articles_embedding_idx
  ON articles USING hnsw (embedding halfvec_cosine_ops);
