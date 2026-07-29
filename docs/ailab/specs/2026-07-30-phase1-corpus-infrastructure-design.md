# Phase 1 — Corpus & Infrastructure (Egypt only) — Design

## Context

Phase 0 (weekend prototype: whole-statute-text-in-context, Streamlit + OpenRouter,
3 Egyptian statutes) passed its gate informally — the user is satisfied full
retrieval is warranted and wants to proceed. This document specs Phase 1 in
implementation-ready detail, superseding the roadmap-level sketch in
`docs/ailab/specs/2026-07-29-legal-rag-roadmap-design.md` (Phase 1 section,
now historical). That doc's non-negotiable design rules, stack, and schema
still apply and are restated here where relevant so this doc is self-contained.

**Time-box: 2–3 weeks.**

## Goal

Build a real, queryable Egyptian statute corpus in Postgres: article-level rows
with verified text, provenance, and normalization — no embeddings or retrieval
yet (that's Phase 2). Ends with a human-verified eval gold set ready for Phase 2
to score against.

## Scope: broad corpus, 3 statutes guaranteed

Unlike Phase 0's 3 hand-picked statutes, Phase 1 ingests as broad an Egyptian
statute corpus as the available datasets support (see Acquisition below).
Regardless of what the broad-corpus acquisition turns up, these 3 must be
present and correctly parsed, falling back to the same `lawyeregypt.net` scrape
Phase 0 already validated if no dataset covers them cleanly:

- Egyptian Civil Code — Law 131/1948
- Egyptian Labour Law — Law 12/2003
- Egyptian Companies Law — Law 159/1981

## Non-negotiable design rules (from the roadmap doc, apply in full from Phase 1 on)

1. Article-level chunking — never split or merge across the `مادة` boundary.
2. Every answer cites law number + year + article number (Phase 2, but storage
   must support it).
3. Refusal beats guessing (Phase 2, but low-fidelity/ambiguous articles must be
   flagged in Phase 1, not silently kept).
4. Jurisdiction is a hard pre-filter. Phase 1 is Egypt-only, but every row still
   carries `jurisdiction = 'EG'` so Phase 3's Saudi rows slot in without a
   migration.
5. Temporal validity tracked from day one — `effective_from`/`effective_to`/
   `is_repealed` columns exist now even though amendment extraction is Phase 4.
6. Identical Arabic normalization on indexed text and (later) queries,
   versioned — a normalization change invalidates the whole index.
7. No LangChain/LlamaIndex/agent frameworks.
8. Raw files immutable — every acquired file saved untouched to `data/raw/`,
   keyed by source + fetch date.

## Infrastructure

- **Container runtime**: Docker Desktop. Standard install, GUI for inspecting
  containers/volumes during development.
- **`docker-compose.yml`** (repo root): single `postgres` service using
  `pgvector/pgvector:pg16`, named volume `pgdata` for persistence, port 5432
  mapped to localhost, credentials from `.env` (`POSTGRES_USER`,
  `POSTGRES_PASSWORD`, `POSTGRES_DB`).
- **Migrations**: `migrations/0001_init.sql`, `0002_...` — plain numbered SQL
  files, no ORM. Applied by `scripts/migrate.py`, which tracks applied
  filenames in a `schema_migrations(filename TEXT PRIMARY KEY, applied_at
  TIMESTAMPTZ)` table and applies any not-yet-applied file in filename order.
- **Connection**: `psycopg` (v3), sync, from `src/legalrag/db.py` — a thin
  `get_connection()` reading `DATABASE_URL` from `.env`.

## Repository layout changes

```
legal-rag-system/
  docker-compose.yml
  migrations/
    0001_init.sql
  scripts/
    migrate.py
  data/
    raw/            # existing — untouched Phase 0 files stay; new sources added
    interim/         # NEW — extracted/pre-parse text, one file per instrument
  evals/
    goldset.yaml     # NEW
  src/legalrag/       # NEW package
    __init__.py
    config.py         # env loading
    db.py             # connection helper
    arabic.py         # normalization, single source of truth
    sources/
      fr3on.py
      dataflare.py
      tawasul.py
      lawyeregypt.py  # reuses Phase 0's extraction logic
    parse/
      articles.py     # article-boundary parser
      report.py        # parse_report CLI
  scratch/            # UNCHANGED — Phase 0 prototype stays frozen
  tests/
    test_arabic.py
    test_parse_articles.py
    (existing test_statute_sources.py untouched)
```

`scratch/phase0.py` and its helpers are not touched, deprecated, or deleted —
they remain the disposable Phase 0 artifact.

## Schema

Exactly the roadmap doc's Phase 1+ schema (`instruments`, `articles`,
`amendments`), created by `migrations/0001_init.sql`:

```sql
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
  id                    BIGSERIAL PRIMARY KEY,
  instrument_id         BIGINT NOT NULL REFERENCES instruments(id),
  jurisdiction          TEXT NOT NULL,
  book                  TEXT,
  chapter               TEXT,
  section               TEXT,
  article_number        TEXT NOT NULL,
  article_sort_key      NUMERIC NOT NULL,
  article_text          TEXT NOT NULL,
  article_text_norm     TEXT NOT NULL,
  norm_version          TEXT NOT NULL,
  language              TEXT NOT NULL,
  is_official_translation BOOLEAN DEFAULT FALSE,
  effective_from        DATE,
  effective_to          DATE,
  is_repealed           BOOLEAN DEFAULT FALSE,
  content_hash          TEXT NOT NULL,
  source_url            TEXT NOT NULL,
  embedding             vector(1024),
  text_search            tsvector,
  UNIQUE (instrument_id, article_number, language)
);

CREATE TABLE amendments (
  id                  BIGSERIAL PRIMARY KEY,
  target_article_id   BIGINT REFERENCES articles(id),
  amending_instrument_id BIGINT REFERENCES instruments(id),
  action              TEXT NOT NULL,
  effective_on        DATE,
  note                TEXT
);

CREATE INDEX ON articles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON articles USING gin (text_search);
CREATE INDEX ON articles (jurisdiction, is_repealed);
```

`norm_version` (added vs. the roadmap sketch) records which `arabic.py` rule
set produced `article_text_norm`, so a future normalization change is
detectable per-row rather than only "the whole index might be stale."
`embedding`/`text_search` columns exist now but stay NULL/unpopulated until
Phase 2.

## Arabic normalization (`arabic.py`)

```python
NORM_VERSION = "v1"

def normalize(text: str) -> str: ...
```

Rules: strip diacritics (tashkeel) and tatweel; unify alef forms (أ إ آ ٱ → ا);
ta marbuta ة→ه; alef maqsura ى→ي; normalize Arabic-Indic (٠-٩) and Eastern
digits to ASCII; collapse whitespace and normalize punctuation spacing. Unit
tests run against real article snippets pulled from the acquired corpus (not
synthetic examples), including at least one `مكرر` article and one with
parenthetical sub-clauses, so the tests double as regression coverage for
parser/normalizer interaction. `NORM_VERSION` is a plain string bumped on any
rule change; `scripts/migrate.py`-adjacent tooling is out of scope for
re-normalizing existing rows in Phase 1 — that's a Phase 2+ concern once
there's an index to invalidate.

## Acquisition (`sources/`)

Executed in this order — each step is a real investigation, not decided here:

1. **`fr3on/eg-legal-rag`**: already known from Phase 0 to cover only Penal
   Code + Criminal Procedure Law (1,046 rows, no structured law-number/year
   field). Load it anyway via `sources/fr3on.py` for completeness and to
   confirm nothing has changed upstream; treat it as a contributor, not the
   spine.
2. **Survey remaining `fr3on` releases** (`fr3on/eg-legal-instruction-following`
   for gold-set phrasing ideas later; scan the rest of the profile) —
   report coverage, don't ingest instruction-following data as corpus text.
3. **`dataflare/egypt-legal-corpus`** (~25M tokens, MIT, hierarchical category
   metadata): primary spine candidate given its breadth. `sources/dataflare.py`
   loads it, reports schema/row count/whether article-segmented.
4. **Fidelity check**: pick one well-known statute already in the spine
   dataset, compare 20 articles character-by-character against
   Tashreaat/gazette text, report a fidelity estimate. This gate must pass
   (or the discrepancies must be understood and acceptable) before building
   the parser against the spine dataset at scale.
5. **`TawasulAI/egyptian-law-articles`** cross-checked for coverage gaps or
   disagreements against the spine.
6. **Guarantee-list fallback**: for Civil Code 131/1948, Labour Law 12/2003,
   Companies Law 159/1981 specifically — if the spine dataset's version is
   missing, low-fidelity, or structurally unreliable, fall back to
   `sources/lawyeregypt.py`, which wraps Phase 0's already-validated
   `extract_law_text` logic against the same 3 URLs.
7. **No further scraping** beyond the guarantee list unless a specific,
   named gap is found and approved — the "no scraper until exhausted" rule
   from the roadmap doc applies to avoid open-ended crawler-building.
8. Every acquired file is written untouched to `data/raw/{slug}.{ext}` with a
   `.meta.json` sidecar (source name + revision/URL, fetch date) before any
   parsing touches it. Extracted-but-not-yet-parsed intermediate text (e.g.
   HF dataset rows flattened to per-instrument text) goes in `data/interim/`.

## Article parser (`parse/articles.py`)

Regex-based, matching `مادة` / `المادة` / `مادة رقم` with Arabic-Indic or ASCII
digits, spelled-out ordinals, and `مكرر` / `مكرراً` suffixes (sort keys like
`77.1`, `77.2` for `77 مكرر`, `77 مكرر أ`). Captures book/chapter/section
headers where the source text has them. Content-hash (`sha256` of
`article_text`) computed at parse time for future change-detection (Phase 4
refresh jobs).

**`parse_report` CLI** (`parse/report.py`, run as
`uv run python -m legalrag.parse.report`): for every instrument, prints
article count, numbering gaps (e.g. jumps from 45 to 47 with no `46`),
and articles whose length is a statistical outlier (suspiciously short/long)
for manual review. Run against the full broad corpus, not just the 3 core
statutes — a bigger corpus surfaces more edge cases here, which is expected
and budgeted into the 2–3 week estimate.

Development loop: parse → run `parse_report` → eyeball flagged instruments →
fix regex/logic → re-run. Iterate until gaps are either resolved or explicitly
understood and logged (e.g. "instrument X's source text is missing articles
12–15 in the upstream dataset itself").

## Eval gold set (`evals/goldset.yaml`)

Once the corpus is parsed and loaded, Claude drafts 30–50 candidate entries
against the actual stored articles:

- Exact-citation lookups ("what does Article 558 of the Civil Code say about
  X") with the verified correct answer.
- Plain-language questions requiring the model to find the right article
  without a citation in the question.
- Unanswerable questions (must refuse) — genuinely outside the corpus, not
  edge cases of covered topics.
- ≥3 questions targeting statutes outside the original 3, to stress
  broad-corpus coverage specifically.

Format:

```yaml
- id: goldset-001
  question: "..."
  jurisdiction: EG
  expected_articles: ["131/1948 Art. 558"]
  category: exact_citation   # exact_citation | plain_language | unanswerable
  notes: ""
```

The user reviews and corrects every entry before it counts as ground truth —
no entry ships unverified. No scoring/harness code is written in Phase 1
(that's Phase 2's `evals/test_retrieval.py` / `report.py`); this phase
produces only the verified YAML.

## Phase gate

- Corpus ingested with article counts verified against official tables of
  contents (or the acquisition source's own stated scope, where no official
  ToC is practical to check by hand for the full broad corpus).
- `parse_report` shows no unexplained numbering gaps.
- Normalization unit tests pass.
- Gold set has ≥30 human-verified entries covering all four categories above.
- 5 spot-check `SELECT`s (run by hand against the live DB) return correct,
  readable article text matching `data/raw/`.
- The 3 guaranteed statutes are present, correctly parsed, and pass the same
  spot-checks as the rest of the corpus.

## Known risks (carried forward from the roadmap doc)

- **Broad-corpus fidelity is unverified until the step-4 gate runs** — if the
  spine dataset's fidelity estimate comes back poor, the acquisition order
  above may need to fall back further than planned (e.g. treating
  `dataflare` as a cross-check instead of the spine). This is a real
  possibility, not just a formality — flag it to the user immediately if it
  happens rather than proceeding on low-fidelity text.
- **`مكرر` chains and spelled ordinals** remain the most likely source of
  silent numbering gaps, now across many more instruments than Phase 0's 3.
- **Arabic OCR is out of scope for Phase 1** unless the guarantee-list
  fallback or a broad-corpus gap specifically requires it — expect this not
  to come up if `dataflare`/`fr3on`/`lawyeregypt.net` cover what's needed,
  but don't assume it in advance.
</content>
