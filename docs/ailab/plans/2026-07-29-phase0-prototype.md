# Phase 0 Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ailab:subagent-driven-development (recommended) or ailab:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 0 weekend prototype — a Streamlit chat UI over the full text of 3 Egyptian statutes, answered by Claude Sonnet 5 via OpenRouter — so the user can ask 10 real questions and decide whether full retrieval (Phase 1+) is warranted.

**Architecture:** A one-off acquisition script populates `data/raw/` with statute text + provenance sidecars (checking the `fr3on/eg-legal-rag` HF dataset first, then fetching from `lawyeregypt.net`, per investigation below). A single-file Streamlit app loads that text into a system prompt and chats with OpenRouter, no chunking or retrieval.

**Tech Stack:** Python 3.11+, `uv`, Streamlit, `openai` SDK pointed at OpenRouter, `httpx`, `beautifulsoup4`, `datasets` (HF), `python-dotenv`, `pytest`.

## Pre-plan investigation (context for every task below)

Before writing this plan, the following was verified directly (not assumed):

- **`fr3on/eg-legal-rag` does not contain our 3 statutes.** Sampled across its full 1,046 rows via the HF datasets-server API: it contains only Criminal Procedure Law and Penal Code articles (both `criminal_law` domain), plus some `Unknown Document` rows. It also has no structured law-number/year field — only an Arabic document-name string embedded in `title`. The acquisition script must still check it programmatically (per the approved design), but expect it to report "not found" for all 3 statutes.
- **`tashreaat.com`, the design doc's originally planned fallback, does not resolve** (`ECONNREFUSED`). **`eastlaws.com` returns HTTP 403** (bot-blocked). **`manshurat.org` only offers a PDF download**, format unverified.
- **`lawyeregypt.net` works and is usable**: plain HTML (WordPress + Elementor), fetchable with a normal `httpx.get()` (redirects + a browser User-Agent), no JavaScript rendering needed. Verified all 3 target pages return HTTP 200 with real statute text:
  - Civil Code 131/1948 — one page has the **entire law**, articles 1–1149, confirmed by counting `مادة` occurrences.
  - Labour Law 12/2003 — one page, articles 1–257 (matches the law's known scope).
  - Companies Law 159/1981 — one page, but the extracted text runs past article 505, higher than the core law's article count — likely includes appended executive-regulation text or cross-references. Flagged for the user to eyeball during Task 3; not a blocker for Phase 0.
- Each `lawyeregypt.net` page's real content sits in `.elementor-widget-theme-post-content` (there are 2 matches per page; the correct one is the longer one — the other is an empty duplicate the theme renders). Two of the three pages append a law-firm contact block starting with the literal string `Lawyer Egypt Firm`, which the extraction function must strip.
- OpenRouter's exact model slug was confirmed via `GET https://openrouter.ai/api/v1/models`: **`anthropic/claude-sonnet-5`**.

## Global Constraints

- Time-box: this is a weekend prototype. No database, no embeddings, no retrieval scaffolding — full statute text goes directly into the model's context window.
- `scratch/phase0.py` must be a single file, under 150 lines (per the approved design doc). Do not split it for testability — its real test is the manual smoke test in Task 4.
- Raw immutability rule applies even in Phase 0: every downloaded statute is saved untouched to `data/raw/{slug}.txt`, with a `data/raw/{slug}.meta.json` sidecar recording source and fetch date. Never edit a `.txt` in `data/raw/` by hand after it's written — re-run the acquisition script instead.
- Model: `anthropic/claude-sonnet-5` via OpenRouter, using the OpenAI-compatible SDK (`base_url="https://openrouter.ai/api/v1"`). API key read from `OPENROUTER_API_KEY` in `.env` — never hardcoded, never committed.
- Python 3.11+, dependency management via `uv` only (no bare `pip install`).

---

### Task 1: Project scaffolding

**Files:**
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: a `uv`-managed project with `streamlit`, `openai`, `httpx`, `beautifulsoup4`, `datasets`, `python-dotenv` as runtime deps and `pytest` as a dev dep; `pytest` configured with `pythonpath = ["."]` so `import scratch.<module>` works from any cwd.

- [ ] **Step 1: Confirm `uv` is installed**

Run: `uv --version`
Expected: a version string (e.g. `uv 0.4.x`). If the command is not found, install it first:
`curl -LsSf https://astral.sh/uv/install.sh | sh`, then re-open the shell and re-run `uv --version`.

- [ ] **Step 2: Write `pyproject.toml`**

```toml
[project]
name = "legal-rag-system"
version = "0.1.0"
description = "Arabic legal Q&A research tool (Egypt + Saudi Arabia)"
requires-python = ">=3.11"
dependencies = [
    "streamlit>=1.38",
    "openai>=1.50",
    "httpx>=0.27",
    "beautifulsoup4>=4.12",
    "datasets>=3.0",
    "python-dotenv>=1.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0",
]

[tool.pytest.ini_options]
pythonpath = ["."]
```

- [ ] **Step 3: Write `.env.example`**

```
OPENROUTER_API_KEY=
```

- [ ] **Step 4: Write `.gitignore`**

```
.venv/
__pycache__/
*.pyc
.env
.pytest_cache/
```

- [ ] **Step 5: Copy `.env.example` to `.env` and fill in your real key**

Run: `cp .env.example .env`
Then edit `.env` and set `OPENROUTER_API_KEY=<your real OpenRouter key>`. `.env` is gitignored — it will not be committed.

- [ ] **Step 6: Install dependencies and verify**

Run: `uv sync`
Expected: a `.venv/` directory is created and dependencies install without errors.

Run: `uv run python -c "import streamlit, openai, httpx, bs4, datasets, dotenv; print('ok')"`
Expected: `ok`

- [ ] **Step 7: Commit**

```bash
git add pyproject.toml .env.example .gitignore
git commit -m "Add project scaffolding for Phase 0 (uv, deps, env template)"
```

---

### Task 2: Statute source config, HTML extraction, and fr3on matching

**Files:**
- Create: `scratch/__init__.py` (empty — makes `scratch` an importable package)
- Create: `scratch/statute_sources.py`
- Test: `tests/test_statute_sources.py`

**Interfaces:**
- Consumes: nothing (pure module, no dependency on Task 1 beyond installed packages)
- Produces:
  - `STATUTES: list[dict]` — each dict has keys `slug`, `law_number`, `law_year`, `title_ar`, `fr3on_keywords`, `source_url`
  - `extract_law_text(html: str) -> str`
  - `fr3on_titles_matching(rows: list[dict], keywords: list[str]) -> list[str]`
  - `write_statute_files(raw_dir: Path, statute: dict, text: str, fetched_at: datetime, source: str) -> tuple[Path, Path]`
  - These are consumed by Task 3's `scratch/fetch_statutes.py`.

- [ ] **Step 1: Create the empty package marker**

```bash
mkdir -p scratch tests
touch scratch/__init__.py
```

- [ ] **Step 2: Write the failing tests for `extract_law_text`**

Create `tests/test_statute_sources.py`:

```python
from datetime import datetime, timezone
from pathlib import Path

import pytest

from scratch.statute_sources import (
    extract_law_text,
    fr3on_titles_matching,
    write_statute_files,
)

FIXTURE_HTML = """
<html><body>
<div class="elementor-widget-theme-post-content"></div>
<div class="elementor-widget-theme-post-content">
<p>قانون تجريبى</p>
<p>مادة 1 - نص المادة الأولى.</p>
<p>مادة 2 - نص المادة الثانية.</p>
<p>Lawyer Egypt Firm</p>
<p>واتس أب: 201220615243+</p>
</div>
</body></html>
"""


def test_extract_law_text_picks_longest_container_and_trims_junk():
    text = extract_law_text(FIXTURE_HTML)
    assert "مادة 1" in text
    assert "مادة 2" in text
    assert "Lawyer Egypt Firm" not in text
    assert "واتس" not in text


def test_extract_law_text_raises_when_no_container_found():
    with pytest.raises(ValueError):
        extract_law_text("<html><body><p>no container here</p></body></html>")
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `uv run pytest tests/test_statute_sources.py -v`
Expected: `ModuleNotFoundError: No module named 'scratch.statute_sources'` (or collection error) — the module doesn't exist yet.

- [ ] **Step 4: Write `scratch/statute_sources.py` (extraction + config only, first pass)**

```python
"""Statute definitions and extraction/storage helpers for Phase 0 acquisition."""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup

STATUTES = [
    {
        "slug": "eg-civil-code-131-1948",
        "law_number": "131",
        "law_year": 1948,
        "title_ar": "القانون المدني",
        "fr3on_keywords": ["مدني", "المدني"],
        "source_url": (
            "https://lawyeregypt.net/%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8%D8%A9-"
            "%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%D9%8A%D8%A9/%D9%86%D8%B5"
            "%D9%88%D8%B5-%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%A7%D9%84"
            "%D9%85%D8%AF%D9%86%D9%89-%D8%A7%D9%84%D9%85%D8%B5%D8%B1%D9%89-%D8%B1"
            "%D9%82%D9%85-131-%D9%84%D8%B3%D9%86%D8%A9-1948/"
        ),
    },
    {
        "slug": "eg-labour-law-12-2003",
        "law_number": "12",
        "law_year": 2003,
        "title_ar": "قانون العمل",
        "fr3on_keywords": ["العمل"],
        "source_url": (
            "https://lawyeregypt.net/%d8%a7%d9%84%d9%85%d9%83%d8%aa%d8%a8%d8%a9-"
            "%d8%a7%d9%84%d9%82%d8%a7%d9%86%d9%88%d9%86%d9%8a%d8%a9/%d9%82%d8%a7"
            "%d9%86%d9%88%d9%86-%d8%a7%d9%84%d8%b9%d9%85%d9%84-%d8%a7%d9%84%d9%85"
            "%d8%b5%d8%b1%d9%89-%d8%b1%d9%82%d9%85-12-%d9%84%d8%b3%d9%86%d8%a9-2003/"
        ),
    },
    {
        "slug": "eg-companies-law-159-1981",
        "law_number": "159",
        "law_year": 1981,
        "title_ar": "قانون الشركات",
        "fr3on_keywords": ["الشركات", "شركات"],
        "source_url": (
            "https://lawyeregypt.net/%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8%D8%A9-"
            "%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%D9%8A%D8%A9/%D9%82%D8%A7"
            "%D9%86%D9%88%D9%86-%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A7%D8%AA-%D8%B1"
            "%D9%82%D9%85-159-%D9%84%D8%B3%D9%86%D8%A9-1981/"
        ),
    },
]

JUNK_MARKER = "Lawyer Egypt Firm"


def extract_law_text(html: str) -> str:
    """Pull the statute body out of a lawyeregypt.net article page.

    The site's Elementor theme renders post content inside one or more
    `.elementor-widget-theme-post-content` containers (one is often an
    empty duplicate); pick the longest one. Trim the trailing law-firm
    contact block if present.
    """
    soup = BeautifulSoup(html, "html.parser")
    candidates = soup.select(".elementor-widget-theme-post-content")
    if not candidates:
        raise ValueError("no .elementor-widget-theme-post-content container found")
    best = max(candidates, key=lambda c: len(c.get_text(strip=True)))
    text = best.get_text("\n", strip=True)
    if JUNK_MARKER in text:
        text = text[: text.index(JUNK_MARKER)].rstrip()
    return text
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `uv run pytest tests/test_statute_sources.py -v`
Expected: both tests `PASS`.

- [ ] **Step 6: Write the failing test for `fr3on_titles_matching`**

Append to `tests/test_statute_sources.py`:

```python
def test_fr3on_titles_matching_finds_substring_matches():
    rows = [
        {"title": "المادة 1 - قانون الإجراءات الجنائية"},
        {"title": "المادة 2 - قانون الإجراءات الجنائية"},
        {"title": "المادة 1 - قانون العقوبات"},
    ]
    matched = fr3on_titles_matching(rows, ["الإجراءات"])
    assert matched == ["قانون الإجراءات الجنائية"]


def test_fr3on_titles_matching_returns_empty_when_no_match():
    rows = [{"title": "المادة 1 - قانون الإجراءات الجنائية"}]
    assert fr3on_titles_matching(rows, ["الشركات"]) == []
```

- [ ] **Step 7: Run to verify failure**

Run: `uv run pytest tests/test_statute_sources.py -v`
Expected: `ImportError: cannot import name 'fr3on_titles_matching'`

- [ ] **Step 8: Add `fr3on_titles_matching` to `scratch/statute_sources.py`**

Append:

```python
def fr3on_titles_matching(rows: list[dict], keywords: list[str]) -> list[str]:
    """Return distinct statute names (from HF row titles) matching any keyword.

    `rows` are fr3on/eg-legal-rag rows; each row's `title` looks like
    "المادة 1 - <statute name>". Matching is a substring check against
    the statute-name portion of the title.
    """
    matched = set()
    for row in rows:
        title = row.get("title", "")
        statute_name = title.split(" - ", 1)[1] if " - " in title else title
        if any(kw in statute_name for kw in keywords):
            matched.add(statute_name)
    return sorted(matched)
```

- [ ] **Step 9: Run to verify it passes**

Run: `uv run pytest tests/test_statute_sources.py -v`
Expected: all 4 tests `PASS`.

- [ ] **Step 10: Write the failing test for `write_statute_files`**

Append to `tests/test_statute_sources.py`:

```python
def test_write_statute_files_writes_text_and_meta(tmp_path: Path):
    statute = {
        "slug": "test-statute",
        "law_number": "1",
        "law_year": 2000,
        "title_ar": "قانون تجريبى",
        "source_url": "https://example.com/law",
    }
    fetched_at = datetime(2026, 7, 29, tzinfo=timezone.utc)

    txt_path, meta_path = write_statute_files(
        tmp_path, statute, "نص القانون", fetched_at, source="example.com"
    )

    assert txt_path.read_text(encoding="utf-8") == "نص القانون"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    assert meta["slug"] == "test-statute"
    assert meta["source"] == "example.com"
    assert meta["fetched_at"] == "2026-07-29T00:00:00+00:00"
```

Add `import json` and `from datetime import datetime, timezone` to the top of `tests/test_statute_sources.py` if not already present (the file already imports `datetime, timezone` from Step 2 — just add `import json`).

- [ ] **Step 11: Run to verify failure**

Run: `uv run pytest tests/test_statute_sources.py -v`
Expected: `ImportError: cannot import name 'write_statute_files'`

- [ ] **Step 12: Add `write_statute_files` to `scratch/statute_sources.py`**

Append (and add `import json` near the top, next to the existing imports):

```python
def write_statute_files(
    raw_dir: Path, statute: dict, text: str, fetched_at: datetime, source: str
) -> tuple[Path, Path]:
    """Write a statute's text and provenance sidecar to `raw_dir`.

    Returns (txt_path, meta_path). `source` is a short label such as
    "lawyeregypt.net" or "fr3on/eg-legal-rag@<revision>".
    """
    raw_dir.mkdir(parents=True, exist_ok=True)
    txt_path = raw_dir / f"{statute['slug']}.txt"
    meta_path = raw_dir / f"{statute['slug']}.meta.json"
    txt_path.write_text(text, encoding="utf-8")
    meta = {
        "slug": statute["slug"],
        "law_number": statute["law_number"],
        "law_year": statute["law_year"],
        "title_ar": statute["title_ar"],
        "source": source,
        "source_url": statute["source_url"],
        "fetched_at": fetched_at.isoformat(),
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return txt_path, meta_path
```

- [ ] **Step 13: Run the full test file to verify everything passes**

Run: `uv run pytest tests/test_statute_sources.py -v`
Expected: all 6 tests `PASS`.

- [ ] **Step 14: Commit**

```bash
git add scratch/__init__.py scratch/statute_sources.py tests/test_statute_sources.py
git commit -m "Add statute source config, HTML extraction, and fr3on matching helpers"
```

---

### Task 3: Acquisition script — populate `data/raw/`

**Files:**
- Create: `scratch/fetch_statutes.py`

**Interfaces:**
- Consumes: `STATUTES`, `extract_law_text`, `fr3on_titles_matching`, `write_statute_files` from `scratch/statute_sources.py` (Task 2)
- Produces: `data/raw/eg-civil-code-131-1948.txt` + `.meta.json`, `data/raw/eg-labour-law-12-2003.txt` + `.meta.json`, `data/raw/eg-companies-law-159-1981.txt` + `.meta.json` — consumed by Task 4's `scratch/phase0.py`.

This task is not TDD — it's a real network call to a live dataset and a live website, so there's nothing meaningful to unit-test beyond what Task 2 already covers. It's verified by running it for real and inspecting the output.

- [ ] **Step 1: Write `scratch/fetch_statutes.py`**

```python
"""One-off Phase 0 acquisition script.

Checks fr3on/eg-legal-rag for our 3 statutes first (expected to report
"not found" — see the investigation notes in the plan), then fetches each
from lawyeregypt.net and writes data/raw/{slug}.txt + {slug}.meta.json.

Run: uv run python scratch/fetch_statutes.py
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import httpx
from datasets import load_dataset

from scratch.statute_sources import (
    STATUTES,
    extract_law_text,
    fr3on_titles_matching,
    write_statute_files,
)

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def check_fr3on() -> None:
    print("Checking fr3on/eg-legal-rag for our 3 statutes...")
    dataset = load_dataset("fr3on/eg-legal-rag", split="train")
    rows = list(dataset)
    for statute in STATUTES:
        matches = fr3on_titles_matching(rows, statute["fr3on_keywords"])
        if matches:
            print(f"  FOUND in fr3on for {statute['slug']}: {matches}")
        else:
            print(f"  not found in fr3on for {statute['slug']}, will fetch instead")


def fetch_statute(statute: dict) -> None:
    print(f"Fetching {statute['slug']} from {statute['source_url']}")
    response = httpx.get(
        statute["source_url"],
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
        timeout=30.0,
    )
    response.raise_for_status()
    text = extract_law_text(response.text)
    article_mentions = text.count("مادة")
    print(f"  extracted {len(text)} chars, {article_mentions} occurrences of 'مادة'")
    txt_path, meta_path = write_statute_files(
        RAW_DIR, statute, text, datetime.now(timezone.utc), source="lawyeregypt.net"
    )
    print(f"  wrote {txt_path}")
    print(f"  wrote {meta_path}")


def main() -> None:
    check_fr3on()
    for statute in STATUTES:
        fetch_statute(statute)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

Run: `uv run python scratch/fetch_statutes.py`

Expected output: 3 "not found in fr3on" lines, then for each statute a "Fetching..." line, an "extracted N chars, M occurrences of 'مادة'" line, and two "wrote ..." lines. Expect roughly: Civil Code ~270k chars / ~1100+ occurrences, Labour Law ~100k chars / ~300+ occurrences, Companies Law ~100k chars / ~250+ occurrences. If any request fails (non-200 status), `response.raise_for_status()` will raise `httpx.HTTPStatusError` — re-run once (transient network issues are common), and if it persists, the site's page structure or availability has changed since this plan was written and `scratch/statute_sources.py`'s `source_url` or `extract_law_text` selector needs a manual fix before continuing.

- [ ] **Step 3: Verify the files by hand**

Run: `ls -la data/raw/`
Expected: 6 files — 3 `.txt`, 3 `.meta.json`.

Run: `head -c 300 data/raw/eg-civil-code-131-1948.txt`
Expected: readable Arabic text starting at or near "مادة 1".

Run: `cat data/raw/eg-civil-code-131-1948.meta.json`
Expected: valid JSON with `slug`, `law_number: "131"`, `law_year: 1948`, `source: "lawyeregypt.net"`, `source_url`, and `fetched_at` set to today's date.

Open each `.txt` file and skim the last ~20 lines to confirm no leftover junk (phone numbers, "Lawyer Egypt Firm", unrelated links). This is the spot-check called for in the design doc — if you see garbling or leftover boilerplate, note it now; it'll matter when judging Phase 0's answers later.

- [ ] **Step 4: Commit**

```bash
git add scratch/fetch_statutes.py data/raw/
git commit -m "Add acquisition script and fetch the 3 Phase 0 statutes"
```

---

### Task 4: Phase 0 Streamlit app

**Files:**
- Create: `scratch/phase0.py`

**Interfaces:**
- Consumes: `data/raw/*.txt` + `data/raw/*.meta.json` (Task 3), `OPENROUTER_API_KEY` from `.env` (Task 1)
- Produces: a running Streamlit chat app — the end-user-facing deliverable of Phase 0. No other task depends on this one's internals.

Per the Global Constraints, this stays a single file under 150 lines and is not unit-tested — its test is the manual smoke test in Step 3, and the full 10-question deliverable in Task 5.

- [ ] **Step 1: Write `scratch/phase0.py`**

```python
"""Phase 0 prototype: chat over the full text of 3 Egyptian statutes.

No chunking, no retrieval, no citation verification — the point is to see
raw model behavior on real questions before building any retrieval
scaffolding. Run: uv run streamlit run scratch/phase0.py
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "anthropic/claude-sonnet-5"

SYSTEM_PROMPT_HEADER = (
    "أنت مساعد بحث قانوني. أجب فقط استنادًا إلى نصوص القوانين المرفقة أدناه، "
    "واذكر رقم القانون وسنته ورقم المادة في كل إجابة. إذا لم يكن الجواب موجودًا "
    "في النصوص المرفقة، قل ذلك صراحة ولا تخمن. هذه الأداة مساعدة بحثية وليست "
    "استشارة قانونية.\n\n"
)


def load_statute_texts(raw_dir: Path) -> list[dict]:
    statutes = []
    for meta_path in sorted(raw_dir.glob("*.meta.json")):
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        txt_path = raw_dir / f"{meta['slug']}.txt"
        statutes.append(
            {
                "law_number": meta["law_number"],
                "law_year": meta["law_year"],
                "title_ar": meta["title_ar"],
                "text": txt_path.read_text(encoding="utf-8"),
            }
        )
    return statutes


def build_system_prompt(statutes: list[dict]) -> str:
    parts = [SYSTEM_PROMPT_HEADER]
    for s in statutes:
        parts.append(
            f"=== {s['title_ar']} - قانون رقم {s['law_number']} لسنة {s['law_year']} ===\n"
            f"{s['text']}\n"
        )
    return "\n".join(parts)


st.set_page_config(page_title="Legal RAG Phase 0", page_icon="⚖️")
st.title("Egyptian Law Q&A — Phase 0 prototype")
st.caption(
    "Research assistance only, not legal advice. Answers are drawn from the "
    "Civil Code (131/1948), Labour Law (12/2003), and Companies Law (159/1981)."
)

api_key = os.environ.get("OPENROUTER_API_KEY")
if not api_key:
    st.error("Set OPENROUTER_API_KEY in .env before running this app.")
    st.stop()

client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=api_key)

if "statutes" not in st.session_state:
    st.session_state.statutes = load_statute_texts(RAW_DIR)
if "system_prompt" not in st.session_state:
    st.session_state.system_prompt = build_system_prompt(st.session_state.statutes)
if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

question = st.chat_input("اسأل عن القانون المدني أو قانون العمل أو قانون الشركات...")
if question:
    st.session_state.messages.append({"role": "user", "content": question})
    with st.chat_message("user"):
        st.markdown(question)

    with st.chat_message("assistant"):
        with st.spinner("جارٍ البحث في نصوص القانون..."):
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": st.session_state.system_prompt},
                    *st.session_state.messages,
                ],
            )
            reply = response.choices[0].message.content
        st.markdown(reply)
    st.session_state.messages.append({"role": "assistant", "content": reply})
```

- [ ] **Step 2: Verify the file is under 150 lines**

Run: `wc -l scratch/phase0.py`
Expected: fewer than 150.

- [ ] **Step 3: Run it and smoke-test manually**

Run: `uv run streamlit run scratch/phase0.py`
Expected: the app opens in a browser at `http://localhost:8501`, showing the title, the "not legal advice" caption, and a chat input box.

Ask one sanity question in the chat box, e.g. `ما هي مدة فترة الاختبار في عقد العمل؟` (Labour Law probation period). Expected: within a few seconds, a reply appears citing something resembling `[قانون 12/2003]` and an article number, in Arabic. If you get an authentication error, double check `.env` has a real `OPENROUTER_API_KEY` and that `load_dotenv()` is finding it (run `uv run python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(bool(os.environ.get('OPENROUTER_API_KEY')))"` — expect `True`).

Stop the app with `Ctrl+C` once confirmed working.

- [ ] **Step 4: Commit**

```bash
git add scratch/phase0.py
git commit -m "Add Phase 0 Streamlit chat prototype"
```

---

### Task 5: Deliverable template for the 10-question log

**Files:**
- Create: `docs/phase0-questions.md`

**Interfaces:**
- Consumes: nothing
- Produces: the document the user fills in while running Task 4's app — this is the actual Phase 0 gate deliverable ("a written list of 10 real questions I asked and how well it did").

- [ ] **Step 1: Write the template**

```markdown
# Phase 0 — Question Log

Filled in while using `scratch/phase0.py`. For each question: what you asked, what
it answered, and whether the answer was actually correct (check citations against
the real statute text in `data/raw/`, not just against how confident the answer
sounds).

## Question 1

- **Asked:**
- **Answer summary:**
- **Citation given (law + article):**
- **Citation correct? (checked against data/raw/):**
- **Verdict:** [correct / wrong article / hallucinated citation / appropriate refusal / wrong jurisdiction reasoning]

## Question 2

- **Asked:**
- **Answer summary:**
- **Citation given (law + article):**
- **Citation correct? (checked against data/raw/):**
- **Verdict:**

## Question 3

(repeat this structure through Question 10)

## Summary

- Questions answered correctly with a verifiable citation: _/10
- Questions with a hallucinated or wrong citation: _/10
- Questions correctly refused (no answer in the 3 statutes): _/10
- Failure modes observed (to prioritize in Phase 2 if we proceed):
- Decision: proceed to Phase 1, or is whole-document context good enough?
```

- [ ] **Step 2: Commit**

```bash
git add docs/phase0-questions.md
git commit -m "Add Phase 0 question log template"
```

- [ ] **Step 3: Run through the actual phase gate**

This step is manual and belongs to the user, not an agentic worker: run `uv run streamlit run scratch/phase0.py`, ask 10 genuine questions you actually want answered about these 3 statutes, fill in `docs/phase0-questions.md` as you go, then bring the filled-in log back for the Phase 0 gate review (decide together whether Phase 1 is warranted, and if so, which failure modes should drive its priorities).

---

## Self-review notes

- **Spec coverage:** every Phase 0 deliverable in the design doc is covered — `scratch/phase0.py` (Task 4, single file <150 lines), 3 statutes as `.txt` in `data/raw/` (Task 3), and the 10-question written log (Task 5 template + manual step). The `.meta.json` sidecar (design doc's immutability requirement) is covered in Task 2/3. `.env.example` and `pyproject.toml` are covered in Task 1.
- **Placeholder scan:** no TBD/TODO; the one deliberately manual step (Task 5 Step 3) is manual because only the user can ask their own real questions — it is not a stand-in for missing implementation work.
- **Type consistency:** `STATUTES` dicts (Task 2) use `slug`, `law_number`, `law_year`, `title_ar`, `fr3on_keywords`, `source_url` consistently across `statute_sources.py`, `fetch_statutes.py`, and the `.meta.json` schema written by `write_statute_files`; `phase0.py`'s `load_statute_texts` reads that same `.meta.json` schema back out (`law_number`, `law_year`, `title_ar`, plus `text` from the sidecar `.txt`).
