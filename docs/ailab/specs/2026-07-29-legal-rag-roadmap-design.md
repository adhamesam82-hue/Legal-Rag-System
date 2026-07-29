# Arabic Legal Q&A System (Egypt + Saudi Arabia) — Design

## Purpose

A personal research tool for asking questions in Arabic or English about Egyptian and
Saudi law, and getting answers grounded in the actual text of statutes, with exact
article citations. The user is not a lawyer; the tool's job is to point them to the
right law and article before they walk into a lawyer's office — it is not legal advice
and must never present itself as such.

Solo side project. Boring, debuggable technology over frameworks. Every phase ends in
a **phase gate**: stop, show results, wait for confirmation before continuing.

This document captures the full roadmap for context. **Only Phase 0 is specced in
implementation-ready detail here.** Phases 1–4 are recorded as the agreed direction and
will each get their own brainstorming pass — with a fresh design doc — once the
preceding phase's gate has passed, since requirements may shift based on what's learned
along the way (e.g., what the `fr3on` dataset inspection in Phase 1 actually turns up).

## Non-negotiable design rules

These apply across all phases, from Phase 1 onward (Phase 0 is a disposable prototype
and is exempt from most of them by design):

1. **Article-level chunking.** Statutes are already divided into numbered articles.
   Chunk on that boundary. Never split an article across chunks; never merge two
   articles into one chunk.
2. **Every answer cites law number + year + article number.** No citation, no claim.
3. **Refusal beats guessing.** Low retrieval confidence → "I could not find this in the
   corpus." Hallucinated article numbers are the primary failure mode of legal RAG.
4. **Jurisdiction is a hard pre-filter, not a ranking signal.** A query scoped to Egypt
   must never retrieve Saudi text, regardless of vocabulary overlap.
5. **Temporal validity is tracked from day one.** Every article carries effective dates
   and a repealed flag.
6. **Identical Arabic normalization on indexed text and queries**, versioned — a
   normalization change invalidates the whole index.
7. **No LangChain, no LlamaIndex, no agent frameworks.** Retrieval loop written
   directly, roughly 300 lines.
8. **Raw files are immutable.** Every downloaded/fetched file saved to disk untouched,
   keyed by source (URL or dataset identity + revision) and fetch date. Re-parsing is
   free; re-crawling is not.

## Stack (Phase 1+)

- Python 3.11+, `uv` for dependency management
- Postgres 16 + pgvector + built-in full-text search, one database for vectors,
  keyword search, and metadata filters. Docker Compose locally.
- `PyMuPDF` for PDF text extraction; Surya OCR or a vision LLM for scanned pages
- `camel-tools` for Arabic normalization
- `httpx` + `BeautifulSoup` for scraping; `Playwright` only where JS rendering is
  required
- Embeddings: BGE-M3 (local) or a hosted multilingual model, behind a swappable
  interface
- Reranker: `bge-reranker-v2-m3`
- UI: Streamlit initially; FastAPI + React only if genuinely outgrown
- `pytest` for the eval harness

## Data sources

**Saudi Arabia**
- `laws.boe.gov.sa` (Bureau of Experts) — Arabic + official English translations,
  clean text, no OCR needed
- `ncar.gov.sa` (National Center for Archives and Records)
- Ministry of Justice monthly circulars on amendments

**Egypt**
- `fr3on/eg-legal-rag` (Hugging Face) — primary candidate, inspect schema before
  assuming shape
- `fr3on/eg-legal-instruction-following` — 4,184 instruction examples, mined for gold-set
  question phrasing, labels hand-verified rather than trusted
- Rest of the `fr3on` HF profile — survey for other releases
  (`egyptian-dialogue` noted as relevant if colloquial-Arabic support is added later)
- `dataflare/egypt-legal-corpus` — ~25M tokens, MIT, hierarchical category metadata,
  fallback/cross-check
- `TawasulAI/egyptian-law-articles` — another article-level set to compare
- `tashreaat.com` (LADIS) — authority to validate datasets against, fill gaps
- Al-Waqai al-Misriyya (Official Gazette) — authoritative text
- Court of Cassation Technical Bureau — rulings, known incomplete coverage

**Validation gate before building on any dataset**: pick one well-known statute,
compare 20 articles character-by-character against the official gazette/Tashreaat
text, report a fidelity estimate.

## Repository layout (Phase 1+)

```
legalrag/
  docker-compose.yml
  pyproject.toml
  .env.example
  data/
    raw/            # immutable downloads, never edited
    interim/        # extracted text
  migrations/       # plain .sql files, numbered
  src/legalrag/
    config.py
    db.py
    arabic.py       # normalization — single source of truth
    sources/
      boe.py
      egypt_hf.py
      tashreaat.py
    parse/
      articles.py   # article-boundary parser
      amendments.py
    embed.py        # embedding interface + implementations
    index.py        # ingestion orchestration
    retrieve.py     # hybrid search + RRF + rerank
    answer.py       # prompt construction + citation enforcement
    app.py          # Streamlit
  evals/
    goldset.yaml
    test_retrieval.py
    test_answers.py
    report.py
```

## Schema (Phase 1+)

```sql
CREATE TABLE instruments (
  id                 BIGSERIAL PRIMARY KEY,
  jurisdiction       TEXT NOT NULL CHECK (jurisdiction IN ('EG','SA')),
  instrument_type    TEXT NOT NULL,   -- law | royal_decree | regulation | ministerial_decision
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
  jurisdiction          TEXT NOT NULL,          -- denormalized for fast filtering
  book                  TEXT,
  chapter               TEXT,
  section               TEXT,
  article_number        TEXT NOT NULL,          -- text: "77", "77 مكرر"
  article_sort_key      NUMERIC NOT NULL,       -- for ordering: 77, 77.1
  article_text          TEXT NOT NULL,          -- raw, as published
  article_text_norm     TEXT NOT NULL,          -- normalized for search
  language              TEXT NOT NULL,          -- ar | en
  is_official_translation BOOLEAN DEFAULT FALSE,
  effective_from        DATE,
  effective_to          DATE,                   -- NULL = currently in force
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
  action              TEXT NOT NULL,   -- amended | replaced | repealed | added
  effective_on        DATE,
  note                TEXT
);

CREATE INDEX ON articles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON articles USING gin (text_search);
CREATE INDEX ON articles (jurisdiction, is_repealed);
```

## Known risks (flagged upfront, not blockers)

- **Arabic OCR**: Tesseract already ruled out. Even Surya/vision-LLM OCR on scanned
  gazette pages will need spot-checking — likely the slowest, most manual part of
  Phase 1 if the HF datasets don't cover everything.
- **Article parsing edge cases**: `مكرر` chains (`77 مكرر`, `77 مكرر أ`) and
  spelled-out ordinals are the most common source of silent numbering gaps. The
  `parse_report` gap-detector is mandatory, not optional, for this reason.
- **Embedding recall on legal Arabic**: BGE-M3 is a reasonable default, but legal
  terminology is narrow and formulaic — full-text search will likely carry more
  weight than vector search for citation-style queries. RRF fusion should absorb
  this, but expect FTS-alone to beat vectors-alone on parts of the gold set.
- **Amendment chains**: the hardest part of the project. Expect the regex+LLM
  extraction in Phase 4 to leave a real `needs_review` backlog, not a clean pass.

---

## PHASE 0 — Prove the value (fully specced, ready to build)

**Time-box: one weekend. No database, no embeddings, no retrieval scaffolding.**

### Goal

Load full statute text into a long-context model, ask it real questions through a
minimal chat UI, and find out whether that alone is good enough — before building any
of the retrieval/indexing machinery in Phase 1+.

### Statutes

Three Egyptian statutes the user has real questions about:
- Egyptian Civil Code — Law 131/1948
- Egyptian Labour Law — Law 12/2003
- Egyptian Companies Law — Law 159/1981

### Text acquisition

1. Load `fr3on/eg-legal-rag` from Hugging Face (`datasets` library), filter to these 3
   statutes.
2. Spot-check a sample of articles for garbling/OCR artifacts/obvious corruption. This
   is a quick gut-check, not the full character-by-character fidelity validation Phase
   1 requires.
3. If the text for a statute looks clean → use it.
4. If a statute is missing from the dataset, or the sample looks unreliable → fetch it
   from an authoritative source (tashreaat.com or the Official Gazette) instead.
5. Write each statute's full text to `data/raw/{statute-slug}.txt`
   (e.g. `data/raw/eg-civil-code-131-1948.txt`), plus a sidecar
   `data/raw/{statute-slug}.meta.json` recording: source (`fr3on/eg-legal-rag` +
   revision, or the fetched URL), fetch date. This keeps the Phase 1 immutability rule
   in effect from day one even though Phase 0 has no database.

### `scratch/phase0.py`

Single file, under 150 lines.

- Loads the 3 `.txt` files from `data/raw/`.
- Builds a system prompt: each statute's full text, labeled with its law number/year
  so the model can distinguish sources when citing.
- Streamlit chat UI: text input, message history, nothing fancier.
- Calls OpenRouter (`anthropic/claude-sonnet-5`) via the OpenAI-compatible SDK,
  `OPENROUTER_API_KEY` from `.env`, full statute text sent as context on every turn
  (no chunking, no caching optimization — this is a throwaway prototype).
- No citation-verification code, no refusal logic beyond whatever the model does on
  its own. The point of Phase 0 is to observe raw model behavior on real questions,
  unassisted, so those failure modes are visible before any scaffolding masks them.

### Config

- `.env.example` with `OPENROUTER_API_KEY=`
- `pyproject.toml` (`uv`) with: `streamlit`, `openai` (OpenRouter's OpenAI-compatible
  endpoint), `httpx`, `datasets`

### Deliverables

- `scratch/phase0.py`
- 3 statutes as `.txt` (+ `.meta.json`) in `data/raw/`
- A written list of the 10 real questions asked and how the system did on each
  (correct citation? hallucinated article? appropriate refusal? wrong jurisdiction
  reasoning?)

### Phase gate

- 10 genuine questions asked through the UI
- Joint decision: is full retrieval (Phase 1+) warranted, or does whole-document
  context already answer real questions well enough?
- If retrieval is warranted: the specific failure modes observed here are written down
  and used to prioritize Phase 2's answering/citation-enforcement work

---

## PHASE 1 — Corpus, Egypt only (roadmap, to be re-specced after Phase 0 gate)

**Time: 2–3 weeks.**

- **1a. Infrastructure**: Docker Compose, Postgres + pgvector, numbered SQL migrations
  applied by script, no ORM (`psycopg`).
- **1b. Arabic normalization** (`arabic.py`): strip diacritics/tatweel, unify alef
  forms (أ إ آ ٱ → ا), ta marbuta ة→ه, alef maqsura ى→ي, normalize Arabic-Indic and
  Eastern digits to ASCII, collapse whitespace/punctuation. Unit-tested on real
  article text. Versioned — a change invalidates the whole index.
- **1c. Acquisition** (strict order, no scraper until exhausted):
  1. Load `fr3on/eg-legal-rag`, report schema/row count/whether article-segmented/
     whether law+article metadata is structured or embedded in text
  2. Survey remaining `fr3on` datasets + `dataflare/egypt-legal-corpus` for coverage
     overlap/gaps
  3. Run the 20-article fidelity check against an official source on the proposed
     spine dataset, report the number
  4. Only then scrape/extract what's missing (`PyMuPDF` first, OCR only if no text
     layer)
  5. `source_url`/`fetched_at` record dataset identity + revision even when a dataset
     supplies the text
- **1d. Article parser** (`parse/articles.py`): match `مادة`/`المادة`/`مادة رقم` with
  Arabic-Indic or ASCII digits, spelled ordinals, `مكرر`/`مكرراً` suffixes (sort keys
  like 77.1), capture book/chapter/section headers. Iterative: parse, print, eyeball,
  fix. `parse_report` command prints article count per instrument, numbering gaps,
  suspiciously short/long articles.
- **1e. Eval set** (`evals/goldset.yaml`), built before any tuning: 30–50 entries,
  mixing exact-citation lookups, plain-language questions, unanswerable questions
  (must refuse), and ≥3 EG/SA pairs that genuinely differ.

**Phase gate**: corpus ingested with article counts verified against official ToCs;
parse report shows no unexplained gaps; normalization unit tests pass; gold set ≥30
human-verified entries; 5 spot-check `SELECT`s return correct text.

## PHASE 2 — Retrieval and answering (roadmap)

**Time: 2–3 weeks.**

- **2a. Embedding** (`embed.py`): `embed_documents`/`embed_query` interface, two
  implementations (local BGE-M3, hosted), batched, cached by content hash, model
  name + normalization version recorded per row.
- **2b. Hybrid retrieval** (`retrieve.py`): explicit-citation parse → direct lookup
  wins outright; otherwise parallel Postgres FTS (`article_text_norm`) + pgvector
  cosine, both with `jurisdiction`/`is_repealed` filters applied in SQL before
  ranking; Reciprocal Rank Fusion (`k=60`, ~30 lines, no library); rerank top 30 → top
  8 with `bge-reranker-v2-m3`; candidates returned with scores.
- **2c. Answering** (`answer.py`): answer only from supplied articles, every claim
  carries `[Law N/YYYY, Art. M]`, plain refusal when articles don't answer it (no
  general legal knowledge), note when text is a translation, standing "not legal
  advice" footer. Post-generation validation: every citation in the output must
  resolve against the retrieved set, or the answer is blocked.
- **2d. UI** (`app.py`): Streamlit, required jurisdiction selector (no "both"
  default), answer pane with retrieved articles/scores in an expander, thumbs-down
  appends to a triage file.
- **2e. Eval harness**: recall@8, MRR against `expected_articles`; citation-resolution
  rate, must-include accuracy, refusal correctness; `report.py` diffs against the last
  recorded run, results committed to `evals/history.md`.

**Phase gate**: recall@8 ≥ 0.85; citation resolution rate = 1.00; correct refusal on
100% of the unanswerable set; explicit-citation queries resolve by direct lookup;
baseline committed to `evals/history.md`.

## PHASE 3 — Add Saudi Arabia (roadmap)

**Time: 1–2 weeks.**

- **3a. Ingestion** (`sources/boe.py`): walk BOE catalogue, Arabic + official English
  translations as separate `articles` rows sharing `instrument_id`,
  `is_official_translation` set correctly. `نظام` issued by royal decree —
  `instrument_type` + decree reference both matter.
- **3b. Cross-jurisdiction isolation tests**: gold-set entries where EG/SA genuinely
  differ (employment termination, personal status, commercial agency); assert EG-scoped
  queries return zero SA rows and vice versa (row counts, not answer text); same
  question under each jurisdiction yields materially different answers.
- **3c. Bilingual retrieval**: English queries must reach Arabic articles, tested both
  directions; if cross-lingual recall is weak, try translating the query to Arabic
  before embedding and measure whether it helps before adopting it.

**Phase gate**: Saudi statutes ingested with correct decree references; zero
cross-jurisdiction leakage; gold set extended to SA with recall@8 ≥ 0.85; measured
English-query recall against Arabic articles.

## PHASE 4 — Amendment and repeal tracking (roadmap)

**Time: 2–3 weeks.**

- **4a. Amendment extraction**: formulaic language ("تُستبدل بنص المادة …", "تُلغى
  المادة …", "يُضاف إلى …") parsed into `amendments` rows via regex, LLM extraction
  pass for the residue, marked `needs_review`.
- **4b. Point-in-time state**: given a date, resolve which article version was in
  force; `effective_to`/`is_repealed` set from the amendment chain, not by hand;
  ambiguous chains marked `uncertain` and surfaced as such in the UI.
- **4c. Surfacing in answers**: repealed article retrieved → answer states the repeal
  and points to the replacement; amended article → answer notes the amending
  instrument/date; optional "as of date" selector.
- **4d. Refresh**: scheduled re-crawl of BOE + Egyptian gazette, diffed by
  `content_hash`, changes reported for review rather than applied silently.

**Phase gate**: querying a known-repealed article returns the repeal, not stale text;
amendment chains hand-verified for 10 known-amended articles; refresh job produces a
readable change report; ambiguous chains flagged, never silently guessed.

---

## Overall definition of done

- A real question, in Arabic or English, scoped to one country, gets an answer with
  citations verifiable against the official source
- The system refuses rather than invents, every time
- Repealed text never appears as current law
- The eval harness catches regressions before they ship
- Every answer makes clear this is research assistance, not legal advice
