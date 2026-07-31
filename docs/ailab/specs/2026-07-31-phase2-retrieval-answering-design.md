# Phase 2 — Retrieval and Answering — Design

Supersedes the Phase 2 sketch in `2026-07-29-legal-rag-roadmap-design.md` where they
disagree. Written after the Phase 1 gate passed with 6,985 Egyptian articles across 78
instruments ingested.

## Goal

Given a question in Arabic or English scoped to one jurisdiction, find the articles in
the corpus that actually answer it, and produce an answer where every claim carries a
citation that resolves to a retrieved article. When the corpus does not contain the
answer, refuse plainly rather than reaching for general legal knowledge.

## Starting state

| Fact | Value |
|---|---|
| Articles | 6,985 (all `jurisdiction='EG'`, all `language='ar'`) |
| Instruments | 78 (74 `law`, 2 `promulgation_decree`, 2 `regulation`) |
| `articles.embedding` populated | 0 rows |
| `articles.text_search` populated | 0 rows |
| Postgres | 16.14, pgvector 0.8.6, `arabic` FTS config available |
| Gold set | 38 entries: 13 exact-citation, 16 plain-language, 9 unanswerable |

> **Superseded in part, same day.** The sections below describe a lexical-only
> system built because no embedding model was available. An NVIDIA API key later
> made hosted embeddings free, and vector search changed the results so
> substantially that the conclusions here no longer hold. See
> [Addendum: embeddings](#addendum-embeddings-change-the-answer) at the end —
> the analysis is kept because it is why the fusion had a seam for vectors at
> all, and because the lexical ranker is still one of the fused lists.

## Decision: no vector search in Phase 2

The roadmap assumed local BGE-M3 embeddings plus a local `bge-reranker-v2-m3`. Neither
`torch` nor `onnxruntime` publishes a wheel this venv can install, so both are
unavailable. Hosted embeddings were offered and declined for now, to avoid a new API key
and recurring cost.

> **Correction.** This originally said the machine was an Intel Mac. It is an Apple M1;
> the venv's Python is an x86_64 build running under Rosetta, which is why wheels resolve
> against `macosx_15_0_x86_64` and fail. An arm64 Python 3.13 would very likely install
> torch. The conclusion — no local models *as configured* — held, but the stated cause
> was wrong, and it would have pointed any future fix in the wrong direction.

**Phase 2 therefore ships lexical retrieval only.** The `embedding` column stays in the
schema, unpopulated. `embed.py` is not written — an interface with zero implementations
is dead code, and the roadmap's "swappable interface" requirement is satisfied instead
by the fusion structure: RRF consumes a list of ranked candidate lists, so adding a
vector list later is an additive change to one function, not a refactor.

### Consequence, and what compensates for it

Pure keyword search cannot do the two things embeddings were there for:

1. **Cross-lingual retrieval.** The corpus is 100% Arabic. An English question shares no
   tokens with it, so FTS scores every article at zero. Seven gold-set entries are
   English plain-language questions.
2. **Vocabulary-gap retrieval.** "Can my boss fire me for showing up drunk?" contains
   none of the statutory terms (`سكر بيّن`, `الفصل`) that the article actually uses.

The compensating mechanism is **LLM query expansion**: before searching, the question is
sent to the answering model with instructions to emit the Arabic legal terms a statute
drafter would have used. Those terms, not the raw question, drive the FTS query. This
uses the OpenRouter key already in `.env` and adds no dependency.

Expansion is a measured layer, not an assumption. The eval harness runs the gold set
both with and without it and records both numbers, so its contribution is visible and it
can be removed if it does not earn its latency.

## Retrieval pipeline (`retrieve.py`)

```
search(question, jurisdiction, limit=8)
  │
  ├─ 1. parse_citation(question)
  │      "المادة 558 من القانون المدني رقم 131 لسنة 1948" → (law 131/1948, art 558)
  │      "Article 9 of Law 82/2002"                        → (law 82/2002, art 9)
  │      "المادة 163 من القانون المدني"                     → (title match, art 163)
  │      resolves against `instruments` → if rows found, RETURN them as a direct hit.
  │      Direct lookup wins outright; no ranking involved.
  │
  ├─ 2. otherwise, build the search text
  │      raw question  ─┬─→ (expansion on) LLM → Arabic legal terms
  │                     └─→ (expansion off) used as-is
  │      normalized with arabic.normalize() — the same function that produced
  │      article_text_norm. This is design rule 6 and the whole reason it is one function.
  │
  ├─ 3. two ranked lists, both pre-filtered in SQL on jurisdiction + NOT is_repealed
  │      a. FTS:      ts_rank_cd over the `arabic`-config tsvector, OR-joined lexemes
  │      b. trigram:  similarity() over article_text_norm, catches morphological
  │                   variants and typos the stemmer misses
  │
  └─ 4. Reciprocal Rank Fusion, k=60, ~30 lines, no library → top `limit`
```

Jurisdiction is applied as a `WHERE` clause inside both search queries, before ranking —
never as a post-filter and never as a scoring term (design rule 4).

### Why `arabic` and not `simple`

The `arabic` config applies a Snowball stemmer and drops Arabic stopwords, which matters
because legal Arabic questions are mostly function words. It runs on top of
`article_text_norm`, which has already had diacritics, tatweel, and alef/ta-marbuta/alef-
maqsura variation removed — so the stemmer sees consistent input. `text_search` becomes a
`GENERATED ALWAYS ... STORED` column so it can never drift out of sync with the text it
indexes.

### The duplicate-instrument trap

Two `(number, year)` pairs resolve to two instruments each: `131/1948` and `141/2020`
both exist as a `law` and as its `promulgation_decree`, and both have an "Article 1" with
completely different text. A citation of "131/1948 Art. 1" means the Civil Code's Art. 1,
not the promulgating decree's. Citation resolution therefore prefers
`instrument_type='law'` when a number/year is ambiguous.

## Answering (`answer.py`)

The model is instructed to answer only from the supplied articles, to attach
`[Law N/YYYY, Art. M]` to every claim, and to refuse plainly when the articles do not
contain the answer. Every answer carries a standing "research assistance, not legal
advice" footer.

Instructions are not trusted. After generation, every `[Law N/YYYY, Art. M]` in the
output is extracted and checked against the set of articles actually retrieved. **A
citation that does not resolve blocks the answer** — the user sees a refusal and the
offending citation, never the ungrounded text. This is the mechanism that makes design
rule 3 real rather than aspirational, because a hallucinated article number is otherwise
indistinguishable from a correct one.

Refusal happens without an LLM call at all when retrieval returns nothing above the
score floor.

## UI (`app.py`)

Streamlit. Required jurisdiction selector with no "both" default. Answer pane, with the
retrieved articles and their fusion scores in an expander so retrieval failures are
diagnosable from the UI. Thumbs-down appends the question and the retrieved set to a
triage file.

## Eval harness (`evals/`)

- `test_retrieval.py` — recall@8 and MRR against `expected_articles`, per category.
- `test_answers.py` — citation-resolution rate, refusal correctness on the unanswerable
  set.
- `report.py` — runs the gold set both with and without query expansion, diffs against
  the last recorded run, appends to `evals/history.md`.

## Measured results

Two findings changed the design during implementation, both recorded here because
neither was predictable from the roadmap.

**Postgres full-text ranking is unusable for this corpus as shipped.** `ts_rank_cd`
scores on term frequency and proximity with no IDF term, so an OR-query over a legal
question's stems ranks long articles stuffed with common boilerplate (`قانون`, `أحكام`)
above the short article that answers it. It retrieved **0 of 16** plain-language
questions. Scoring the same lexemes by summed IDF, divided by `ln(length)`, retrieved
**9 of 9** of the Arabic ones — the entire monolingual ceiling. IDF is computed per query
against the corpus rather than precomputed; at 6,985 articles that costs one indexed
count per lexeme and the whole gold set runs in 0.5s without the LLM stages.

**Character trigrams are the wrong tool for matching statute titles.** Every Egyptian
title shares the same boilerplate, so `قانون البيئة` scored 0.47 against `قانون العمل`
(labour) and only 0.30 against the actual environment law, whose real title is padded
with `قانون رقم 4 لسنة 1994 بإصدار قانون في شأن…`. Trigram matching therefore resolved
law hints to confidently wrong statutes. Replaced with exact number/year resolution where
the hint carries them, falling back to content-word overlap after stripping the shared
boilerplate. A trigram list over full article text was also dropped from the fusion
entirely: measured, it returned the same handful of articles for unrelated questions,
because trigram similarity is a short-string metric and carries no signal at document
length.

Ablation over the 38-entry gold set (`evals/history.md`), one run each:

| configuration | answerable recall@8 | MRR | unanswerable |
| --- | --- | --- | --- |
| lexical only | 0.72 | 0.64 | 0.78 |
| + query expansion | 0.86 | 0.66 | 0.22 |
| + expansion + rerank | 0.86 | 0.84 | 0.89 |

Expansion buys cross-lingual recall and costs precision — it surfaces plausible articles
for questions the corpus cannot answer, which is why the unanswerable column collapses.
Reranking restores it, because a reranker permitted to return nothing is a refusal
mechanism as much as a ranking one.

At the answer level: **9/9 correct refusals**, and 43 citations emitted of which **2 did
not resolve**. Both were caught and their answers blocked. That is the design's central
claim doing visible work — roughly one answer in twenty carried a hallucinated article
number, indistinguishable from a real one by inspection.

### The recall number is not stable

The single-run table above overstates its own precision. Repeating the full pipeline on
the identical gold set produced answerable recall@8 of **0.83, 0.86, 0.86, 0.83, and
0.93** — a spread of ten points across five runs, straddling the 0.85 target in both
directions.

The cause is that expansion and reranking are LLM calls, and `temperature=0` is not
determinism. A different expansion produces a different candidate pool, which produces a
different rerank. Any single run is therefore a sample, not a measurement, and **the
0.85 gate is not reliably met** — it is met about half the time.

This has a direct consequence for the eval harness: a one-run number cannot detect a
regression smaller than the noise floor, which is roughly ten points. Before recall is
used to accept or reject a change, `report.py` needs to average several runs.

### Where else this falls short

- **3 plain-language questions miss consistently**, all English, all of the form "right
  law found, wrong article chosen." Lexical retrieval locates the statute reliably;
  choosing the article within it is where the absent embeddings would have helped most.
- **The gold set is 38 entries**, and the tuning above was done against those same
  entries, so some overfitting is unavoidable. The number should be re-earned on unseen
  questions before it is trusted.
- **Every query costs two LLM calls.** Embeddings would remove the first; a local
  cross-encoder would make the second nearly free. On this corpus that cost is also a
  hard dependency — the credit exhaustion hit during evaluation takes the whole system
  down to its lexical baseline.

## Phase gate

The roadmap set recall@8 ≥ 0.85, assuming hybrid lexical + vector retrieval with a
reranker. Lexical-only retrieval was measured against that bar rather than granted a
lowered one.

| criterion | target | measured | met? |
| --- | --- | --- | --- |
| Answerable recall@8 | ≥ 0.85 | 0.83–0.93 over 5 runs, median 0.86 | **marginal** |
| Citation resolution, delivered answers | 1.00 | 1.00 (2 blocked before delivery) | yes |
| Refusal on unanswerable | 100% | 9/9 | yes |
| Explicit citations via direct lookup | all | 13/13 | yes |
| Baseline in `evals/history.md` | committed | committed | yes |

Every criterion about *correctness* is met: nothing ungrounded is delivered, and the
system refuses rather than guessing. The recall criterion is genuinely unresolved, and
the honest reading is that lexical-only retrieval sits right at the target rather than
clearing it. That is the decision for the gate review: accept ~0.86 median recall for a
research tool whose failure mode is "you have to search again," or spend roughly $0.10
on hosted embeddings to add the vector list this design deliberately left a seam for.

---

## Addendum: embeddings change the answer

An NVIDIA API key became available after the lexical-only system was built and
measured. It makes hosted embeddings free, which removes the constraint the whole
design above was shaped around.

### Model selection was measured, not read off a model card

Three candidates were tested against real corpus articles, asking one Arabic and
one English question whose answer is Law 12/2003 Art. 47:

| model | dims | Arabic query | English query |
|---|---|---|---|
| `baai/bge-m3` | — | endpoint 500s | endpoint 500s |
| `nvidia/nv-embedqa-e5-v5` | 1024 | wrong article | wrong article |
| `nvidia/nemotron-3-embed-1b` | 2048 | correct | correct |

`nv-embedqa-e5-v5` is the trap: it is 1024-dimensional and would have dropped
into the original schema with no migration at all, and it is useless here because
it is English-only. Taking the convenient one on faith would have produced a
system that silently retrieved the wrong law. `baai/bge-m3` — the model the
roadmap named — is listed by the API and returns 500 on every request.

So the schema moved to the model rather than the model to the schema: migration
`0004` changes `embedding` to **`halfvec(2048)`**. `halfvec` rather than `vector`
because pgvector caps HNSW at 2000 dimensions for `vector` but allows 4000 for
`halfvec`; fp16 precision costs nothing that cosine ranking over 2048 dimensions
notices. `embedding_model` is recorded per row, so a model change invalidates
rows the same way a normalization change does.

### Result

Ablation over the same 38-entry gold set:

| configuration | answerable recall@8 | MRR | plain-language | LLM calls/query |
|---|---|---|---|---|
| lexical only | 0.72 | 0.64 | 0.56 | 0 |
| **lexical + vectors** | **0.97** | **0.90** | **0.94** | **0** |
| lexical + expansion + rerank | 0.72 | 0.70 | 0.50 | 2 |
| vectors + expansion + rerank | 0.97 | 0.90 | 0.94 | 2 |

Two conclusions, both uncomfortable for the design above:

1. **Vector search does all the work.** Recall goes 0.72 → 0.97 and, unlike the
   0.83–0.93 spread of the LLM pipeline, it is deterministic — the same query
   returns the same articles every time.
2. **Query expansion and reranking now contribute nothing.** Rows 2 and 4 are
   identical to two decimal places. They were built as substitutes for
   embeddings; with real embeddings they are two LLM calls of pure latency and
   cost. They are therefore **off by default**, not deleted — `use_vectors`,
   `expand`, and `do_rerank` remain switches the harness can flip, because the
   evidence for turning them off should stay reproducible.

Note also that expansion + rerank *without* vectors scored 0.72 here versus 0.86
when the same code ran on `claude-sonnet-5`. The LLM stages were sensitive to
which model ran them. Vector retrieval is not.

### What this costs and does not fix

- **Refusal got harder.** Vector search always returns its nearest neighbours, so
  retrieval-level "returned nothing" on unanswerable questions falls from 0.78 to
  0.22. Refusal now rests entirely on `answer.py` and its citation guard, which
  is where it always belonged, but it means the answering model carries more of
  the safety burden than it did when a reranker could return NONE.
- **Free-tier rate limits are real.** Parallel eval runs hit HTTP 429 at 6
  concurrent workers; clients now retry with backoff and the harness runs 3.
- **The gold set is still 38 entries.** 0.97 on 38 items is 28 of 29 answerable
  questions. That is a strong signal, not a precise number, and the tuning
  history in this document all happened against these same entries.

---

## Addendum: two production bugs, and why the fix had to be structural

A user-reported regression ("this answered correctly yesterday, now it refuses")
led to two distinct bugs in the answering step, not one. Both were found by
reproducing against the real pipeline before touching anything, per the
project's debugging discipline: no fix without a reproduced root cause.

### Bug 1: silence as the answer

**Report:** "ما هو الحد الأدنى لرأس مال الشركة ذات المسؤولية المحدودة؟" (what is
the minimum capital for an LLC) returned a refusal.

**Root cause:** the correct article, 159/1981 Art. 116, was retrieved every
time -- but it states that capital is "determined by the partners in the
constitutive contract," with no fixed floor. That silence *is* the correct
answer (Egyptian law sets no statutory minimum), but recognizing it requires an
inferential step the model would not reliably take, especially when the article
sat at rank #6 of 8 among several similar-looking Companies Law provisions
(single-person companies, share transfer, the members' register). Isolated with
just that one article, the model got it right; in the real 8-candidate pool, it
refused.

**What didn't work:** a system-prompt rule instructing the model to treat
explicit silence as an answer, plus a rule instructing it to check each
supplied article individually rather than judging the batch at once. Together
these fixed the LLC case -- but caused the model to answer a question about
**Saudi Arabian VAT using Egypt's VAT law**, once fabricating a specific rate
that appeared nowhere in the retrieved text. Three prompt-wording iterations
here produced three different, unpredictable outcomes on the same underlying
question depending on unrelated context in the same prompt. That instability,
not any single failure, is what stopped further prompt tuning -- ever-more-
careful wording is not a reliable way to compose two behaviors that are in
tension inside one shared instruction.

### Bug 2: jurisdiction inferred, not checked

**Root cause:** the model was never given jurisdiction as a fact. It had to
infer "this article is Egyptian" from titles and content, and that inference
degraded under the same kind of distraction as bug 1 -- a topically similar
article from the only jurisdiction in the corpus was enough to answer a
question that named a different country entirely.

**Fix, and why it holds:** `Retrieval` now carries the `jurisdiction` it was
searched under (every candidate in one batch shares it, since the SQL `WHERE`
clause guarantees that), and `build_context()` labels every article
`(Jurisdiction: EGYPT)` explicitly. The system prompt tells the model to check
that label, not the article's subject matter. This is a fact placed in front of
the model rather than a nuance of wording, and it stayed correct across every
retest -- including once the silence-as-answer rule from bug 1 was
reintroduced, because the two are now independent: jurisdiction is a label to
check, not a judgment call the same paragraph has to also get right.

**Verified:** 9/9 across three repeated runs each on the LLC case, Saudi VAT,
and UAE company law, plus the full offline suite and gold-set retrieval eval,
after both fixes landed together.

### Bug 1, revisited: a retrieval-side fix instead of more prompt tuning

Rather than a fourth prompt iteration, the ranking itself was measured.
Equal-weight RRF fusion combines lexical rank and vector rank per candidate --
but Art. 116's lexical rank was weak (~30th) precisely because it doesn't use
words like "minimum": it has none to use. Vector search alone ranked it #2.
Fusing it against a rank in the 30s dragged an excellent semantic match down to
#6.

Weighting the vector list's contribution at `VECTOR_RANK_WEIGHT = 2.0` (see
`retrieve.py`) was tested against the full gold set before being adopted:

| | plain-language recall@8 | plain-language MRR | ANSWERABLE recall@8 |
|---|---|---|---|
| equal weight (1:1) | 15/16 | 0.81 | 28/29 |
| vector weighted 2x | 16/16 | 0.85 | 29/29 |

No category regressed. This is a deterministic, instantly-testable change --
unlike prompt wording, sweeping the weight and rerunning the eval took seconds
and gave the same answer every time, which is exactly why it was preferred over
a fourth attempt at rephrasing the system prompt.

It moved Art. 116 from #6 to #5 -- real, but not by itself enough to fix bug 1.
The silence-as-answer prompt rule was still needed on top of it. Both changes
were kept: the ranking weight is a general improvement (measured across the
whole gold set), while the prompt rule addresses the specific reasoning gap.

### Aside: a docker-compose incident, unrelated to any of the above

Mid-investigation, `docker compose up` silently created a fresh, empty
database instead of reusing the one holding the corpus and its embeddings. The
project's directory had been renamed from `phase1-corpus-infra` to
`legal-rag-system` after the data was loaded, and compose derives volume names
from the project directory by default. No data was lost -- the original
container was found stopped, not removed -- but nothing signaled the mismatch
before an empty `articles` table did. `docker-compose.yml` now pins the volume
name explicitly, independent of the directory the project happens to live in.
