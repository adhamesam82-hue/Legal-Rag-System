# Phase 1 Corpus & Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ailab:subagent-driven-development (recommended) or ailab:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, queryable Egyptian statute corpus in Postgres — article-level rows with verified text, provenance, and Arabic normalization — covering a broad statute corpus with 3 specific statutes (Civil Code 131/1948, Labour Law 12/2003, Companies Law 159/1981) guaranteed present, plus a human-verified eval gold set ready for Phase 2. No embeddings or retrieval yet.

**Architecture:** Postgres 16 + pgvector runs in Docker Desktop, schema applied via numbered SQL migrations. A new `src/legalrag/` package holds normalization, parsing, and per-source acquisition modules, all converging on a shared `ingest.py` loader. The 3 guaranteed statutes (already scraped in Phase 0) are parsed and loaded first to prove the full pipeline end-to-end on clean, known-good text before tackling the messier broad-corpus sources (`dataflare`, `fr3on`, `TawasulAI`).

**Tech Stack:** Python 3.11+, `uv`, `psycopg[binary]` (v3), `pgvector/pgvector:pg16` via Docker Compose, `datasets` (HF), `pytest`.

## Global Constraints

- Spec: `docs/ailab/specs/2026-07-30-phase1-corpus-infrastructure-design.md` (approved, includes corrections from live dataset investigation — read it before starting if context is needed).
- Container runtime: Docker Desktop (already decided; must be running before Task 1's verification steps).
- No LangChain/LlamaIndex/agent frameworks. No ORM — `psycopg` directly, plain numbered SQL migrations.
- `scratch/` (Phase 0) is frozen — do not modify `scratch/phase0.py`, `scratch/fetch_statutes.py`, or `scratch/statute_sources.py`. Do not import from `scratch/` into `src/legalrag/` — logic is ported/adapted, not shared, so the new package has no dependency on the disposable prototype.
- Raw immutability: every acquired file is written untouched to `data/raw/{slug}.{ext}` with a `.meta.json` sidecar (source + revision/URL, fetch date) before parsing.
- Arabic normalization is versioned (`NORM_VERSION`); every `articles` row records which version produced `article_text_norm`.
- Phase 1 stores Arabic text only (`language='ar'`) — bilingual rows are Phase 3 scope (Saudi official translations), not built here even though `TawasulAI` has English text available for cross-checking.
- Python 3.11+, dependency management via `uv` only.

---

### Task 1: Docker Compose + Postgres bootstrap

**Files:**
- Create: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `.env`

**Interfaces:**
- Produces: a running Postgres 16 + pgvector container reachable at `postgresql://legalrag:legalrag@localhost:5432/legalrag`, consumed by Task 2's migration runner and every later DB-touching task.

- [ ] **Step 1: Confirm Docker Desktop is installed and running**

Run: `docker --version && docker ps`
Expected: a version string, then an empty (or existing-container) table with no error. If Docker Desktop isn't installed, install it from https://www.docker.com/products/docker-desktop/, launch it, wait for the whale icon to show "running," then re-run this check.

- [ ] **Step 2: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-legalrag}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-legalrag}
      POSTGRES_DB: ${POSTGRES_DB:-legalrag}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U legalrag -d legalrag"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 3: Add Postgres vars to `.env.example`**

Append to `.env.example`:

```
POSTGRES_USER=legalrag
POSTGRES_PASSWORD=legalrag
POSTGRES_DB=legalrag
DATABASE_URL=postgresql://legalrag:legalrag@localhost:5432/legalrag
```

- [ ] **Step 4: Add the same vars to `.env`**

Run: `grep -q DATABASE_URL .env || cat >> .env << 'EOF'
POSTGRES_USER=legalrag
POSTGRES_PASSWORD=legalrag
POSTGRES_DB=legalrag
DATABASE_URL=postgresql://legalrag:legalrag@localhost:5432/legalrag
EOF`

`.env` is gitignored — these local-only defaults are fine to commit as literal values in `.env.example` since they're not real secrets (local dev Postgres).

- [ ] **Step 5: Start the container and verify**

Run: `docker compose up -d`
Expected: `postgres` container created and started.

Run: `docker compose ps`
Expected: `postgres` service, `STATUS` eventually shows `healthy` (may take a few seconds — re-run if it still says `starting`).

Run: `docker compose exec postgres psql -U legalrag -d legalrag -c "SELECT 1;"`
Expected: a result row showing `1`.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "Add Docker Compose Postgres+pgvector service for Phase 1"
```

---

### Task 2: Migration runner + initial schema

**Files:**
- Create: `migrations/0001_init.sql`
- Create: `src/legalrag/__init__.py` (empty)
- Create: `src/legalrag/config.py`
- Create: `src/legalrag/db.py`
- Create: `scripts/migrate.py`
- Test: `tests/test_migrate.py`
- Modify: `pyproject.toml`

**Interfaces:**
- Consumes: `DATABASE_URL` from `.env` (Task 1)
- Produces:
  - `legalrag.config.get_database_url() -> str`
  - `legalrag.db.get_connection() -> psycopg.Connection`
  - `scripts/migrate.pending_migrations(migrations_dir: Path, applied: set[str]) -> list[Path]`
  - A live `instruments`/`articles`/`amendments`/`schema_migrations` schema in Postgres, consumed by every later DB-touching task.

- [ ] **Step 1: Add `psycopg` to dependencies**

Edit `pyproject.toml`, add `"psycopg[binary]>=3.2"` to the `dependencies` list (alongside the existing `streamlit`, `openai`, etc. — those stay, Phase 0 still needs them).

Run: `uv sync`
Expected: `psycopg` installs without errors.

- [ ] **Step 2: Create the package skeleton**

```bash
mkdir -p src/legalrag
touch src/legalrag/__init__.py
```

Edit `pyproject.toml`'s `[tool.pytest.ini_options]` section — it already has `pythonpath = ["."]`; also add:

```toml
[tool.uv]
dev-dependencies = [
    "pytest>=8.0",
]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]
```

Run: `uv sync`
Expected: no errors. (This makes `src/legalrag` importable as `legalrag` via an editable install; `pythonpath = ["."]` already covers `import scratch.*` for the untouched Phase 0 tests.)

Run: `uv run python -c "import legalrag; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Write `src/legalrag/config.py`**

```python
"""Environment configuration — single source of truth for env var access."""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set in .env")
    return url
```

- [ ] **Step 4: Write `src/legalrag/db.py`**

```python
"""Postgres connection helper — thin wrapper, no ORM."""
from __future__ import annotations

import psycopg

from legalrag.config import get_database_url


def get_connection() -> psycopg.Connection:
    return psycopg.connect(get_database_url())
```

- [ ] **Step 5: Write `migrations/0001_init.sql`**

```bash
mkdir -p migrations
```

```sql
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
```

- [ ] **Step 6: Write the failing test for `pending_migrations`**

```bash
mkdir -p scripts
touch scripts/__init__.py
```

Create `tests/test_migrate.py`:

```python
from pathlib import Path

from scripts.migrate import pending_migrations


def test_pending_migrations_excludes_applied(tmp_path: Path):
    (tmp_path / "0001_init.sql").write_text("SELECT 1;")
    (tmp_path / "0002_add_col.sql").write_text("SELECT 1;")

    pending = pending_migrations(tmp_path, applied={"0001_init.sql"})

    assert [p.name for p in pending] == ["0002_add_col.sql"]


def test_pending_migrations_returns_all_when_none_applied(tmp_path: Path):
    (tmp_path / "0001_init.sql").write_text("SELECT 1;")

    pending = pending_migrations(tmp_path, applied=set())

    assert [p.name for p in pending] == ["0001_init.sql"]


def test_pending_migrations_sorted_by_filename(tmp_path: Path):
    (tmp_path / "0002_second.sql").write_text("SELECT 1;")
    (tmp_path / "0001_first.sql").write_text("SELECT 1;")

    pending = pending_migrations(tmp_path, applied=set())

    assert [p.name for p in pending] == ["0001_first.sql", "0002_second.sql"]
```

- [ ] **Step 7: Run to verify failure**

Run: `uv run pytest tests/test_migrate.py -v`
Expected: `ModuleNotFoundError: No module named 'scripts.migrate'`

- [ ] **Step 8: Write `scripts/migrate.py`**

```python
"""Applies numbered SQL migrations in migrations/, tracked in schema_migrations.

Run: uv run python scripts/migrate.py
"""
from __future__ import annotations

from pathlib import Path

import psycopg

from legalrag.db import get_connection

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def pending_migrations(migrations_dir: Path, applied: set[str]) -> list[Path]:
    all_files = sorted(migrations_dir.glob("*.sql"))
    return [f for f in all_files if f.name not in applied]


def ensure_schema_migrations_table(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    conn.commit()


def applied_migration_filenames(conn: psycopg.Connection) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT filename FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}


def apply_migration(conn: psycopg.Connection, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(
            "INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,)
        )
    conn.commit()


def main() -> None:
    conn = get_connection()
    ensure_schema_migrations_table(conn)
    applied = applied_migration_filenames(conn)
    pending = pending_migrations(MIGRATIONS_DIR, applied)
    if not pending:
        print("No pending migrations.")
        conn.close()
        return
    for path in pending:
        print(f"Applying {path.name}...")
        apply_migration(conn, path)
        print("  applied.")
    conn.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 9: Run the unit tests to verify they pass**

Run: `uv run pytest tests/test_migrate.py -v`
Expected: all 3 tests `PASS`. (These test the pure `pending_migrations` function only — no DB needed.)

- [ ] **Step 10: Run the migration for real against the live DB**

Run: `uv run python scripts/migrate.py`
Expected: `Applying 0001_init.sql...` then `  applied.`

Run it again: `uv run python scripts/migrate.py`
Expected: `No pending migrations.` (idempotency check)

- [ ] **Step 11: Verify the schema by hand**

Run: `docker compose exec postgres psql -U legalrag -d legalrag -c "\dt"`
Expected: `instruments`, `articles`, `amendments`, `schema_migrations` tables listed.

- [ ] **Step 12: Commit**

```bash
git add pyproject.toml migrations/ scripts/ src/legalrag/__init__.py src/legalrag/config.py src/legalrag/db.py tests/test_migrate.py
git commit -m "Add migration runner and initial Phase 1 schema"
```

---

### Task 3: Arabic normalization (`arabic.py`)

**Files:**
- Create: `src/legalrag/arabic.py`
- Test: `tests/test_arabic.py`

**Interfaces:**
- Consumes: nothing (pure module)
- Produces: `legalrag.arabic.normalize(text: str) -> str`, `legalrag.arabic.normalize_digits(text: str) -> str`, `legalrag.arabic.NORM_VERSION: str` — consumed by Task 4's parser and Task 6's ingest loader.

Tests use real snippets copied from `data/raw/eg-civil-code-131-1948.txt` and `data/raw/eg-companies-law-159-1981.txt` (already acquired in Phase 0), not synthetic text — per the design doc's requirement.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_arabic.py`:

```python
from legalrag.arabic import NORM_VERSION, normalize, normalize_digits


def test_normalize_strips_diacritics():
    # Real snippet from eg-civil-code-131-1948.txt, article 1 sub-clause (1)
    text = "تسري النصوص التشريعية على جميع المسائل التي تتناولها"
    diacritized = "تَسرِي النُّصوصُ التَّشريعيّةُ على جميع المسائل التي تتناولها"
    assert normalize(diacritized) == normalize(text)


def test_normalize_unifies_alef_variants():
    assert normalize("أحكام إحكام آحكام ٱحكام") == normalize("احكام احكام احكام احكام")


def test_normalize_ta_marbuta_and_alef_maqsura():
    assert normalize("المحكمة الكبرى") == "المحكمه الكبري"


def test_normalize_digits_arabic_indic_to_ascii():
    # Real snippet from eg-companies-law-159-1981.txt title line
    text = "قانون رقم ۱٥۹ لسنة ۱۹۸۱"
    assert normalize_digits(text) == "قانون رقم 159 لسنة 1981"


def test_normalize_collapses_whitespace():
    assert normalize("مادة   1    –  نص") == normalize("مادة 1 – نص")


def test_normalize_real_mukarrar_article_snippet():
    # Real snippet from eg-companies-law-159-1981.txt, Article (1 مكررًا)
    text = (
        "مع عدم الإخلال بأحكام قانون سوق رأس المال الصادر بالقانون رقم 95 "
        "لسنة 1992، وقانون المناطق الاقتصادية ذات الطبيعة الخاصة الصادر "
        "بالقانون رقم 83 لسنة 2002"
    )
    result = normalize(text)
    assert "قانون سوق راس المال" in result  # أ->ا applied
    assert result == result.strip()


def test_norm_version_is_a_short_string():
    assert isinstance(NORM_VERSION, str)
    assert len(NORM_VERSION) > 0
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run pytest tests/test_arabic.py -v`
Expected: `ModuleNotFoundError: No module named 'legalrag.arabic'`

- [ ] **Step 3: Write `src/legalrag/arabic.py`**

```python
"""Arabic text normalization — single source of truth for indexed text and queries.

Versioned via NORM_VERSION: bump it whenever a rule changes, so every
articles row can record which version produced its article_text_norm.
"""
from __future__ import annotations

import re

NORM_VERSION = "v1"

_DIACRITICS = re.compile(
    r"[ؐ-ًؚ-ٟۖ-ۜ۟-۪ۨ-ٰۭ]"
)
_TATWEEL = "ـ"

_ALEF_VARIANTS = str.maketrans(
    {
        "أ": "ا",  # أ -> ا
        "إ": "ا",  # إ -> ا
        "آ": "ا",  # آ -> ا
        "ٱ": "ا",  # ٱ -> ا
    }
)

_ARABIC_INDIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
_EASTERN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")

_WHITESPACE = re.compile(r"\s+")


def normalize_digits(text: str) -> str:
    return text.translate(_ARABIC_INDIC_DIGITS).translate(_EASTERN_DIGITS)


def normalize(text: str) -> str:
    text = _DIACRITICS.sub("", text)
    text = text.replace(_TATWEEL, "")
    text = text.translate(_ALEF_VARIANTS)
    text = text.replace("ة", "ه")  # ة -> ه
    text = text.replace("ى", "ي")  # ى -> ي
    text = normalize_digits(text)
    text = _WHITESPACE.sub(" ", text)
    return text.strip()
```

- [ ] **Step 4: Run to verify tests pass**

Run: `uv run pytest tests/test_arabic.py -v`
Expected: all 7 tests `PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/legalrag/arabic.py tests/test_arabic.py
git commit -m "Add versioned Arabic normalization module"
```

---

### Task 4: Article parser (`parse/articles.py`)

**Files:**
- Create: `src/legalrag/parse/__init__.py` (empty)
- Create: `src/legalrag/parse/articles.py`
- Test: `tests/test_parse_articles.py`

**Interfaces:**
- Consumes: `legalrag.arabic.normalize_digits` (Task 3)
- Produces: `legalrag.parse.articles.ParsedArticle` (dataclass: `article_number: str`, `article_sort_key: Decimal`, `article_text: str`, `book: str | None`, `chapter: str | None`, `section: str | None`), `legalrag.parse.articles.parse_articles(text: str) -> list[ParsedArticle]` — consumed by Task 5's `parse_report` and Task 6's `ingest.py`.

Tests use real snippets from the 3 already-acquired statutes, which were found (during plan-writing) to use **three different article-marker formats**: Civil Code uses `مادة N –`, Labour Law uses `مادة N:`, Companies Law uses `مادة (N):` and has one real `مكرر` example, `مادة (1 مكررًا):`. The parser must handle all three.

- [ ] **Step 1: Write the failing tests**

```bash
mkdir -p src/legalrag/parse
touch src/legalrag/parse/__init__.py
```

Create `tests/test_parse_articles.py`:

```python
from decimal import Decimal

from legalrag.parse.articles import parse_articles


def test_parses_dash_style_marker():
    # Real format from eg-civil-code-131-1948.txt
    text = (
        "مادة 1 –\n"
        "يلغى القانون المدنى المعمول به أمام المحاكم الوطنية.\n"
        "مادة 2 –\n"
        "على وزير العدل تنفيذ هذا القانون.\n"
    )
    articles = parse_articles(text)
    assert len(articles) == 2
    assert articles[0].article_number == "1"
    assert articles[0].article_sort_key == Decimal("1")
    assert "يلغى القانون المدنى" in articles[0].article_text
    assert articles[1].article_number == "2"


def test_parses_colon_style_marker():
    # Real format from eg-labour-law-12-2003.txt
    text = (
        "مادة 1:\n"
        "يقصد في تطبيق أحكام هذا القانون بالمصطلحات الآتية.\n"
        "مادة 2:\n"
        "في تطبيق أحكام هذا القانون تعتبر السنة 365 يوما.\n"
    )
    articles = parse_articles(text)
    assert len(articles) == 2
    assert articles[0].article_number == "1"
    assert articles[1].article_text.strip().startswith("في تطبيق")


def test_parses_parenthesized_style_marker():
    # Real format from eg-companies-law-159-1981.txt
    text = (
        "مادة (1):\n"
        "نص المادة الاولى.\n"
        "مادة (2):\n"
        "نص المادة الثانية.\n"
    )
    articles = parse_articles(text)
    assert len(articles) == 2
    assert articles[0].article_number == "1"
    assert articles[1].article_number == "2"


def test_parses_real_mukarrar_marker():
    # Real format from eg-companies-law-159-1981.txt, article (1 مكررًا)
    text = (
        "مادة (1):\n"
        "نص المادة الاولى.\n"
        "مادة (1 مكررًا):\n"
        "مع عدم الإخلال بأحكام قانون سوق رأس المال.\n"
        "مادة (2):\n"
        "نص المادة الثانية.\n"
    )
    articles = parse_articles(text)
    assert len(articles) == 3
    assert articles[1].article_number == "1 مكررًا"
    assert articles[1].article_sort_key == Decimal("1.1")
    assert articles[2].article_sort_key == Decimal("2")


def test_second_mukarrar_for_same_base_increments_sort_key():
    text = (
        "مادة 5 –\nنص خامس.\n"
        "مادة 5 مكرر –\nنص خامس مكرر اول.\n"
        "مادة 5 مكرر –\nنص خامس مكرر ثان.\n"
    )
    articles = parse_articles(text)
    assert [a.article_sort_key for a in articles] == [
        Decimal("5"),
        Decimal("5.1"),
        Decimal("5.2"),
    ]


def test_arabic_indic_digits_in_marker_are_normalized():
    text = "مادة ١ –\nنص.\nمادة ٢ –\nنص ثان.\n"
    articles = parse_articles(text)
    assert [a.article_number for a in articles] == ["1", "2"]


def test_captures_chapter_header_preceding_article():
    text = (
        "الباب الأول\n"
        "التعاريف\n"
        "مادة 1:\n"
        "نص.\n"
    )
    articles = parse_articles(text)
    assert articles[0].chapter == "الباب الأول"


def test_no_markers_returns_empty_list():
    assert parse_articles("لا يوجد مواد هنا على الإطلاق.") == []


def test_article_text_stops_before_next_marker():
    text = "مادة 1 –\nسطر اول.\nسطر ثان.\nمادة 2 –\nنص اخر.\n"
    articles = parse_articles(text)
    assert "مادة 2" not in articles[0].article_text
    assert "سطر اول" in articles[0].article_text
    assert "سطر ثان" in articles[0].article_text
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run pytest tests/test_parse_articles.py -v`
Expected: `ModuleNotFoundError: No module named 'legalrag.parse.articles'`

- [ ] **Step 3: Write `src/legalrag/parse/articles.py`**

```python
"""Article-boundary parser — splits raw statute text on مادة markers.

Handles the three marker formats found across the Phase 0-acquired
statutes: "مادة N –" (Civil Code), "مادة N:" (Labour Law), and
"مادة (N):" (Companies Law), plus مكرر suffixes for added articles
(e.g. "مادة (1 مكررًا):"). Development is iterative by design: run
parse_report (parse/report.py) after any regex change and eyeball the
gaps it flags.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal

from legalrag.arabic import normalize_digits

ARTICLE_MARKER = re.compile(
    r"^(?:ال)?مادة\s*\(?\s*(?P<num>[0-9٠-٩]+)"
    r"(?:\s*(?P<mukarrar>مكرر(?:[اةً]{0,2})?(?:\s+[ء-غف-ي])?))?"
    r"\s*\)?\s*[:\-–]?\s*$",
    re.MULTILINE,
)

_HEADER_PATTERNS: dict[str, re.Pattern[str]] = {
    "book": re.compile(r"^(الكتاب\s.+)$", re.MULTILINE),
    "chapter": re.compile(r"^(الباب\s.+)$", re.MULTILINE),
    "section": re.compile(r"^(الفصل\s.+)$", re.MULTILINE),
}


@dataclass(frozen=True)
class ParsedArticle:
    article_number: str
    article_sort_key: Decimal
    article_text: str
    book: str | None = None
    chapter: str | None = None
    section: str | None = None


def parse_articles(text: str) -> list[ParsedArticle]:
    markers = list(ARTICLE_MARKER.finditer(text))
    if not markers:
        return []

    headers: list[tuple[int, str, str]] = []
    for kind, pattern in _HEADER_PATTERNS.items():
        for m in pattern.finditer(text):
            headers.append((m.start(), kind, m.group(1).strip()))
    headers.sort(key=lambda h: h[0])

    current: dict[str, str | None] = {"book": None, "chapter": None, "section": None}
    header_idx = 0
    mukarrar_counts: dict[str, int] = {}
    articles: list[ParsedArticle] = []

    for i, marker in enumerate(markers):
        while header_idx < len(headers) and headers[header_idx][0] < marker.start():
            _, kind, value = headers[header_idx]
            current[kind] = value
            header_idx += 1

        body_start = marker.end()
        body_end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
        article_text = text[body_start:body_end].strip()

        base = int(normalize_digits(marker.group("num")))
        mukarrar = marker.group("mukarrar")
        if mukarrar:
            key = str(base)
            mukarrar_counts[key] = mukarrar_counts.get(key, 0) + 1
            sort_key = Decimal(base) + Decimal(mukarrar_counts[key]) / Decimal(10)
            article_number = f"{base} {mukarrar.strip()}"
        else:
            sort_key = Decimal(base)
            article_number = str(base)

        articles.append(
            ParsedArticle(
                article_number=article_number,
                article_sort_key=sort_key,
                article_text=article_text,
                book=current["book"],
                chapter=current["chapter"],
                section=current["section"],
            )
        )

    return articles
```

- [ ] **Step 4: Run to verify tests pass**

Run: `uv run pytest tests/test_parse_articles.py -v`
Expected: all 9 tests `PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/legalrag/parse/__init__.py src/legalrag/parse/articles.py tests/test_parse_articles.py
git commit -m "Add article-boundary parser handling three real marker formats"
```

---

### Task 5: `parse_report` CLI

**Files:**
- Create: `src/legalrag/parse/report.py`

**Interfaces:**
- Consumes: `legalrag.parse.articles.parse_articles` (Task 4), reads `data/raw/*.meta.json` + `.txt`
- Produces: a CLI printing article counts / numbering gaps / duplicate article numbers / length outliers per instrument — used manually throughout acquisition tasks (7 onward) after every new source is added.

Not unit-tested — it's a reporting CLI over real files, verified by running it (same pattern as Phase 0's acquisition script).

**Amended during Task 4's review:** the Task 4 reviewer ran the parser against the real, already-acquired `eg-civil-code-131-1948.txt` and found genuine duplicate article numbers — two articles numbered `"1"` and two numbered `"2"` (Egyptian promulgation-law texts commonly prepend a short 2-article "law of promulgation" before the substantive law's own text, which restarts numbering from 1), plus two entries both numbered `"922"` with different text (likely a pre-existing scrape defect from Phase 0's acquisition, not a parser bug). Task 6's `ingest.py` has a `UNIQUE (instrument_id, article_number, language)` constraint and an `ON CONFLICT ... DO UPDATE`, which means a real duplicate silently overwrites one article's text with the other's — undetected data loss unless `parse_report` flags it first. Duplicate detection is added to `report_instrument` below for this reason; it is not optional/deferred.

- [ ] **Step 1: Write `src/legalrag/parse/report.py`**

```python
"""parse_report CLI: article counts, numbering gaps, length outliers per instrument.

Run: uv run python -m legalrag.parse.report
"""
from __future__ import annotations

import json
import statistics
from collections import Counter
from pathlib import Path

from legalrag.parse.articles import parse_articles

RAW_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw"


def load_instruments(raw_dir: Path) -> list[dict]:
    instruments = []
    for meta_path in sorted(raw_dir.glob("*.meta.json")):
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        txt_path = raw_dir / f"{meta['slug']}.txt"
        if not txt_path.exists():
            continue
        instruments.append({"slug": meta["slug"], "text": txt_path.read_text(encoding="utf-8")})
    return instruments


def report_instrument(slug: str, text: str) -> None:
    articles = parse_articles(text)
    print(f"{slug}: {len(articles)} articles")
    if not articles:
        print("  WARNING: no articles found")
        return

    base_numbers = sorted({int(a.article_sort_key) for a in articles})
    gaps = [
        n
        for n in range(base_numbers[0], base_numbers[-1])
        if n not in base_numbers and (n + 1) in base_numbers
    ]
    print(f"  numbering gaps: {gaps}" if gaps else "  no numbering gaps")

    number_counts = Counter(a.article_number for a in articles)
    duplicates = {number: count for number, count in number_counts.items() if count > 1}
    if duplicates:
        print(f"  WARNING duplicate article numbers (ingest will silently overwrite these): {duplicates}")

    lengths = [len(a.article_text) for a in articles]
    mean = statistics.mean(lengths)
    stdev = statistics.pstdev(lengths) if len(lengths) > 1 else 0
    outliers = [
        (a.article_number, len(a.article_text))
        for a in articles
        if stdev and abs(len(a.article_text) - mean) > 2 * stdev
    ]
    if outliers:
        print(f"  length outliers (>2 stdev from mean {mean:.0f} chars): {outliers}")


def main() -> None:
    instruments = load_instruments(RAW_DIR)
    if not instruments:
        print(f"No instruments found in {RAW_DIR}")
        return
    for instrument in instruments:
        report_instrument(instrument["slug"], instrument["text"])


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it against the 3 already-acquired statutes**

Run: `uv run python -m legalrag.parse.report`
Expected: one block per statute (`eg-civil-code-131-1948`, `eg-companies-law-159-1981`, `eg-labour-law-12-2003`) showing article count, gap list, duplicate-number warnings, and any length outliers. Eyeball the gap lists — Civil Code has ~1149 articles, Labour Law ~257, Companies Law's real article count is expected to be lower than the raw `مادة` occurrence count noted in Phase 0 (that count included appended executive-regulation cross-references past article 505; the real parse should clarify the true count). If a gap list looks wrong (e.g. large unexplained runs), stop and inspect the source text at that line number before proceeding to Task 6 — don't paper over a parser bug by adjusting the gap-detection thresholds.

Expect the Civil Code's duplicate-number warning to include `"1"` and `"2"` (the 2-article promulgation decree preceding the substantive law restarts numbering — benign, both articles are real text, Task 6 will need to decide how to handle the collision, e.g. by treating the promulgation decree as a separate instrument or accepting last-write-wins) and `"922"` (found during Task 4's review with different text at each occurrence — inspect both occurrences in `data/raw/eg-civil-code-131-1948.txt` directly; this looks like a pre-existing scrape defect from Phase 0's acquisition rather than a parser bug, but confirm before treating it as such, and decide with the user whether to hand-correct the source file or accept the data loss from Task 6's overwrite behavior).

- [ ] **Step 3: Commit**

```bash
git add src/legalrag/parse/report.py
git commit -m "Add parse_report CLI for article count/gap/outlier inspection"
```

---

### Task 6: Ingestion loader (`ingest.py`)

**Files:**
- Create: `src/legalrag/ingest.py`
- Test: `tests/test_ingest.py`

**Interfaces:**
- Consumes: `legalrag.arabic.{NORM_VERSION,normalize}` (Task 3), `legalrag.parse.articles.ParsedArticle` (Task 4), `legalrag.db.get_connection` (Task 2)
- Produces: `legalrag.ingest.upsert_instrument(conn, *, jurisdiction, instrument_type, number, year, title, source_url, fetched_at) -> int`, `legalrag.ingest.insert_articles(conn, *, instrument_id, jurisdiction, articles, language, source_url) -> int` — consumed by Task 7's end-to-end guarantee-list run and Task 10's broad-corpus run.

Tested against the live local DB (no mocking — this project has no CI and the DB is a required local dependency from Task 1 onward; mocking `psycopg` would test nothing about the actual SQL). Each test opens a real connection and cleans up via rollback.

- [ ] **Step 1: Write the failing tests**

```python
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import ParsedArticle


@pytest.fixture
def conn():
    connection = get_connection()
    yield connection
    connection.rollback()
    connection.close()


def test_upsert_instrument_inserts_and_returns_id(conn):
    instrument_id = upsert_instrument(
        conn,
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-1",
        year=2000,
        title="قانون تجريبى",
        source_url="https://example.com/test",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    assert isinstance(instrument_id, int)

    with conn.cursor() as cur:
        cur.execute("SELECT title_norm FROM instruments WHERE id = %s", (instrument_id,))
        (title_norm,) = cur.fetchone()
    assert title_norm == "قانون تجريبي"  # ى -> ي applied


def test_upsert_instrument_is_idempotent_on_conflict(conn):
    kwargs = dict(
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-2",
        year=2001,
        title="قانون تجريبى ثان",
        source_url="https://example.com/test2",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    first_id = upsert_instrument(conn, **kwargs)
    second_id = upsert_instrument(conn, **kwargs)
    assert first_id == second_id


def test_insert_articles_writes_normalized_text_and_hash(conn):
    instrument_id = upsert_instrument(
        conn,
        jurisdiction="EG",
        instrument_type="law",
        number="TEST-3",
        year=2002,
        title="قانون تجريبى ثالث",
        source_url="https://example.com/test3",
        fetched_at=datetime(2026, 7, 30, tzinfo=timezone.utc),
    )
    articles = [
        ParsedArticle(
            article_number="1",
            article_sort_key=Decimal("1"),
            article_text="نص المادة الأولى.",
        )
    ]

    count = insert_articles(
        conn,
        instrument_id=instrument_id,
        jurisdiction="EG",
        articles=articles,
        language="ar",
        source_url="https://example.com/test3",
    )
    assert count == 1

    with conn.cursor() as cur:
        cur.execute(
            "SELECT article_text_norm, norm_version, content_hash FROM articles "
            "WHERE instrument_id = %s AND article_number = %s",
            (instrument_id, "1"),
        )
        text_norm, norm_version, content_hash = cur.fetchone()
    assert "نص الماده الاولي" in text_norm  # ة->ه, ى->ي applied
    assert norm_version == "v1"
    assert len(content_hash) == 64  # sha256 hex digest
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run pytest tests/test_ingest.py -v`
Expected: `ModuleNotFoundError: No module named 'legalrag.ingest'`

- [ ] **Step 3: Write `src/legalrag/ingest.py`**

```python
"""Loads parsed, normalized articles into the instruments/articles tables."""
from __future__ import annotations

import hashlib
from datetime import datetime

import psycopg

from legalrag.arabic import NORM_VERSION, normalize
from legalrag.parse.articles import ParsedArticle


def upsert_instrument(
    conn: psycopg.Connection,
    *,
    jurisdiction: str,
    instrument_type: str,
    number: str,
    year: int,
    title: str,
    source_url: str,
    fetched_at: datetime,
) -> int:
    title_norm = normalize(title)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO instruments
                (jurisdiction, instrument_type, number, year, title, title_norm, source_url, fetched_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (jurisdiction, instrument_type, number, year)
            DO UPDATE SET title = EXCLUDED.title, title_norm = EXCLUDED.title_norm,
                          source_url = EXCLUDED.source_url, fetched_at = EXCLUDED.fetched_at
            RETURNING id
            """,
            (jurisdiction, instrument_type, number, year, title, title_norm, source_url, fetched_at),
        )
        row = cur.fetchone()
        assert row is not None
        instrument_id = row[0]
    conn.commit()
    return instrument_id


def insert_articles(
    conn: psycopg.Connection,
    *,
    instrument_id: int,
    jurisdiction: str,
    articles: list[ParsedArticle],
    language: str,
    source_url: str,
) -> int:
    count = 0
    with conn.cursor() as cur:
        for article in articles:
            article_text_norm = normalize(article.article_text)
            content_hash = hashlib.sha256(article.article_text.encode("utf-8")).hexdigest()
            cur.execute(
                """
                INSERT INTO articles
                    (instrument_id, jurisdiction, book, chapter, section, article_number,
                     article_sort_key, article_text, article_text_norm, norm_version,
                     language, content_hash, source_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (instrument_id, article_number, language)
                DO UPDATE SET article_text = EXCLUDED.article_text,
                              article_text_norm = EXCLUDED.article_text_norm,
                              norm_version = EXCLUDED.norm_version,
                              content_hash = EXCLUDED.content_hash
                """,
                (
                    instrument_id,
                    jurisdiction,
                    article.book,
                    article.chapter,
                    article.section,
                    article.article_number,
                    article.article_sort_key,
                    article.article_text,
                    article_text_norm,
                    NORM_VERSION,
                    language,
                    content_hash,
                    source_url,
                ),
            )
            count += 1
    conn.commit()
    return count
```

- [ ] **Step 4: Run to verify tests pass**

Run: `uv run pytest tests/test_ingest.py -v`
Expected: all 3 tests `PASS` (requires the Task 1 Postgres container running and Task 2's migration applied).

- [ ] **Step 5: Clean up test rows**

The tests commit real rows (the `ON CONFLICT` upsert design means rollback-on-close isn't enough once `conn.commit()` has run inside the functions under test). Run:

```bash
docker compose exec postgres psql -U legalrag -d legalrag -c "DELETE FROM articles WHERE instrument_id IN (SELECT id FROM instruments WHERE number LIKE 'TEST-%'); DELETE FROM instruments WHERE number LIKE 'TEST-%';"
```

Expected: `DELETE N` for both statements, no error.

- [ ] **Step 6: Commit**

```bash
git add src/legalrag/ingest.py tests/test_ingest.py
git commit -m "Add ingestion loader bridging parsed articles into Postgres"
```

---

### Task 7: Guarantee-list source module + end-to-end pipeline run

**Files:**
- Create: `src/legalrag/sources/__init__.py` (empty)
- Create: `src/legalrag/sources/lawyeregypt.py`
- Test: `tests/test_lawyeregypt.py`
- Create: `scripts/ingest_guaranteed.py`

**Interfaces:**
- Consumes: `legalrag.parse.articles.parse_articles` (Task 4), `legalrag.ingest.{upsert_instrument,insert_articles}` (Task 6)
- Produces: `legalrag.sources.lawyeregypt.extract_law_text(html: str) -> str` (ported from `scratch/statute_sources.py`'s proven logic — duplicated, not imported, since `scratch/` stays a standalone frozen prototype), `legalrag.sources.lawyeregypt.GUARANTEED_STATUTES: list[dict]` — consumed by Task 10's broad-corpus fallback logic.

This task proves the full pipeline (raw text → parse → normalize → DB) end-to-end on the 3 statutes already known-clean from Phase 0's spot-check, before Task 8 onward tackles messier broad-corpus sources.

- [ ] **Step 1: Write the failing test for `extract_law_text`** (same fixture as Phase 0's proven test, since the extraction logic is identical)

```bash
mkdir -p src/legalrag/sources
touch src/legalrag/sources/__init__.py
```

Create `tests/test_lawyeregypt.py`:

```python
import pytest

from legalrag.sources.lawyeregypt import GUARANTEED_STATUTES, extract_law_text

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


def test_extract_law_text_raises_when_no_container_found():
    with pytest.raises(ValueError):
        extract_law_text("<html><body><p>no container here</p></body></html>")


def test_guaranteed_statutes_has_the_three_core_statutes():
    slugs = {s["slug"] for s in GUARANTEED_STATUTES}
    assert slugs == {
        "eg-civil-code-131-1948",
        "eg-labour-law-12-2003",
        "eg-companies-law-159-1981",
    }
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run pytest tests/test_lawyeregypt.py -v`
Expected: `ModuleNotFoundError: No module named 'legalrag.sources.lawyeregypt'`

- [ ] **Step 3: Write `src/legalrag/sources/lawyeregypt.py`**

```python
"""lawyeregypt.net source — guarantee-list fallback for the 3 core statutes.

Extraction logic ported from scratch/statute_sources.py (Phase 0), which
validated it against all 3 target pages returning clean text. Duplicated
here rather than imported so src/legalrag has no dependency on the
disposable scratch/ prototype.
"""
from __future__ import annotations

from bs4 import BeautifulSoup

JUNK_MARKER = "Lawyer Egypt Firm"

GUARANTEED_STATUTES = [
    {
        "slug": "eg-civil-code-131-1948",
        "instrument_type": "law",
        "number": "131",
        "year": 1948,
        "title": "القانون المدني",
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
        "instrument_type": "law",
        "number": "12",
        "year": 2003,
        "title": "قانون العمل",
        "source_url": (
            "https://lawyeregypt.net/%d8%a7%d9%84%d9%85%d9%83%d8%aa%d8%a8%d8%a9-"
            "%d8%a7%d9%84%d9%82%d8%a7%d9%86%d9%88%d9%86%d9%8a%d8%a9/%d9%82%d8%a7"
            "%d9%86%d9%88%d9%86-%d8%a7%d9%84%d8%b9%d9%85%d9%84-%d8%a7%d9%84%d9%85"
            "%d8%b5%d8%b1%d9%89-%d8%b1%d9%82%d9%85-12-%d9%84%d8%b3%d9%86%d8%a9-2003/"
        ),
    },
    {
        "slug": "eg-companies-law-159-1981",
        "instrument_type": "law",
        "number": "159",
        "year": 1981,
        "title": "قانون الشركات",
        "source_url": (
            "https://lawyeregypt.net/%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8%D8%A9-"
            "%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%D9%8A%D8%A9/%D9%82%D8%A7"
            "%D9%86%D9%88%D9%86-%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A7%D8%AA-%D8%B1"
            "%D9%82%D9%85-159-%D9%84%D8%B3%D9%86%D8%A9-1981/"
        ),
    },
]


def extract_law_text(html: str) -> str:
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

- [ ] **Step 4: Run to verify tests pass**

Run: `uv run pytest tests/test_lawyeregypt.py -v`
Expected: all 3 tests `PASS`.

- [ ] **Step 5: Write `scripts/ingest_guaranteed.py`**

Since `data/raw/eg-civil-code-131-1948.txt` etc. already exist (fetched in Phase 0), this reads them directly rather than re-fetching over the network — avoiding a redundant load on lawyeregypt.net.

```python
"""Parses and ingests the 3 guaranteed statutes from their already-acquired
data/raw/ files (fetched in Phase 0) into Postgres.

Run: uv run python scripts/ingest_guaranteed.py
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import parse_articles
from legalrag.sources.lawyeregypt import GUARANTEED_STATUTES

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def main() -> None:
    conn = get_connection()
    for statute in GUARANTEED_STATUTES:
        txt_path = RAW_DIR / f"{statute['slug']}.txt"
        meta_path = RAW_DIR / f"{statute['slug']}.meta.json"
        if not txt_path.exists():
            print(f"SKIP {statute['slug']}: {txt_path} not found")
            continue

        text = txt_path.read_text(encoding="utf-8")
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

        articles = parse_articles(text)
        print(f"{statute['slug']}: parsed {len(articles)} articles")

        instrument_id = upsert_instrument(
            conn,
            jurisdiction="EG",
            instrument_type=statute["instrument_type"],
            number=statute["number"],
            year=statute["year"],
            title=statute["title"],
            source_url=statute["source_url"],
            fetched_at=datetime.fromisoformat(meta["fetched_at"]),
        )

        count = insert_articles(
            conn,
            instrument_id=instrument_id,
            jurisdiction="EG",
            articles=articles,
            language="ar",
            source_url=statute["source_url"],
        )
        print(f"  inserted/updated {count} article rows (instrument_id={instrument_id})")

    conn.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Run it**

Run: `uv run python scripts/ingest_guaranteed.py`
Expected: 3 blocks, each showing a parsed article count and an inserted row count matching it.

- [ ] **Step 7: Spot-check the DB**

Run:
```bash
docker compose exec postgres psql -U legalrag -d legalrag -c "SELECT i.number, i.year, count(*) FROM articles a JOIN instruments i ON i.id = a.instrument_id GROUP BY i.number, i.year ORDER BY i.number;"
```
Expected: 3 rows (131/1948, 12/2003, 159/1981) with article counts roughly matching Task 5's `parse_report` output for the same statutes.

Run:
```bash
docker compose exec postgres psql -U legalrag -d legalrag -c "SELECT article_number, left(article_text, 80) FROM articles a JOIN instruments i ON i.id = a.instrument_id WHERE i.number = '131' AND article_number = '1';"
```
Expected: readable Arabic text matching the known Civil Code Article 1 opening ("يلغى القانون المدنى المعمول به...").

- [ ] **Step 8: Commit**

```bash
git add src/legalrag/sources/__init__.py src/legalrag/sources/lawyeregypt.py tests/test_lawyeregypt.py scripts/ingest_guaranteed.py
git commit -m "Add lawyeregypt.net source module and ingest the 3 guaranteed statutes end-to-end"
```

---

### Task 8: `fr3on` source survey

**Files:**
- Create: `src/legalrag/sources/fr3on.py`

**Interfaces:**
- Consumes: `datasets.load_dataset`
- Produces: a coverage report printed to stdout — informs Task 10's decision about what (if anything) from `fr3on` gets ingested. Not consumed programmatically by later tasks; this is an investigation script, same pattern as Phase 0's acquisition script.

- [ ] **Step 1: Write `src/legalrag/sources/fr3on.py`**

```python
"""fr3on/eg-legal-rag coverage survey.

Verified during Phase 1 planning: this dataset (and its sibling releases —
eg-legal-multi-task, eg-legal-comparative-law, eg-legal-ner,
eg-legal-classification, eg-legal-reasoning, eg-legal-qa) are all scoped to
Penal Code + Criminal Procedure Law only. This script re-confirms that's
still true (upstream datasets can change) and prints a coverage summary —
it does not ingest anything itself.

Run: uv run python -m legalrag.sources.fr3on
"""
from __future__ import annotations

from collections import Counter

from datasets import load_dataset


def summarize_titles(rows: list[dict]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for row in rows:
        title = row.get("title", "")
        statute_name = title.split(" - ", 1)[1] if " - " in title else title
        counts[statute_name] += 1
    return counts


def main() -> None:
    print("Loading fr3on/eg-legal-rag...")
    dataset = load_dataset("fr3on/eg-legal-rag", split="train")
    rows = list(dataset)
    print(f"  {len(rows)} rows")

    counts = summarize_titles(rows)
    print("  statute coverage (by row count):")
    for name, count in counts.most_common():
        print(f"    {count:5d}  {name}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

Run: `uv run python -m legalrag.sources.fr3on`
Expected: coverage limited to Penal Code / Criminal Procedure Law titles (and possibly `Unknown Document` rows), consistent with Phase 0's finding. If the coverage has expanded to include statutes outside that scope, note it — it may be worth a follow-up ingestion task, but don't act on it without flagging it first, since that would be new information changing this plan's scope.

- [ ] **Step 3: Commit**

```bash
git add src/legalrag/sources/fr3on.py
git commit -m "Add fr3on/eg-legal-rag coverage survey script"
```

---

### Task 9: `dataflare` source with row classification

**Files:**
- Create: `src/legalrag/sources/dataflare.py`
- Test: `tests/test_dataflare.py`

**Interfaces:**
- Consumes: `datasets.load_dataset`
- Produces: `legalrag.sources.dataflare.extract_law_number_year(text: str) -> tuple[str, int] | None` (pure, unit-tested), `legalrag.sources.dataflare.classify_rows(rows: list[dict], token_threshold: int = 10000) -> list[dict]` (pure, unit-tested) — consumed by Task 10's ingestion run.

`classify_rows` is the row-classification filter the corrected spec calls for: token-count threshold + `law_name`/text pattern matching, output meant for human review before anything is ingested.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_dataflare.py`:

```python
from legalrag.sources.dataflare import classify_rows, extract_law_number_year


def test_extract_law_number_year_finds_real_pattern():
    # Real snippet from dataflare's Civil Code row
    text = "ا دودو 1 القانون رقم 131 لسنة 1948 باصدار - القانون المدني"
    assert extract_law_number_year(text) == ("131", 1948)


def test_extract_law_number_year_handles_arabic_indic_digits():
    text = "قانون رقم ١٥٩ لسنة ١٩٨١ بإصدار قانون الشركات"
    assert extract_law_number_year(text) == ("159", 1981)


def test_extract_law_number_year_returns_none_when_no_match():
    assert extract_law_number_year("دعوى مدنية تعويض عن ضرر") is None


def test_classify_rows_filters_by_token_threshold_and_pattern():
    rows = [
        {"law_name": "القانون المدني", "categories": ["الاكواد"], "text": "القانون رقم 131 لسنة 1948", "tokens": 192818},
        {"law_name": "دعوى مدنية تعويض", "categories": ["الاكواد"], "text": "نص قصير عن التعويض", "tokens": 850},
        {"law_name": "قانون بلا رقم واضح", "categories": ["الاكواد"], "text": "نص طويل بلا رقم قانون واضح فيه", "tokens": 15000},
    ]
    candidates = classify_rows(rows, token_threshold=10000)
    assert len(candidates) == 2
    assert candidates[0]["law_name"] == "القانون المدني"
    assert candidates[0]["law_number"] == "131"
    assert candidates[0]["law_year"] == 1948
    assert candidates[1]["law_name"] == "قانون بلا رقم واضح"
    assert candidates[1]["law_number"] is None  # over threshold but no number/year match


def test_classify_rows_excludes_short_rows_even_with_law_pattern():
    rows = [
        {"law_name": "ذكر عابر", "categories": [], "text": "اشارة الى قانون رقم 1 لسنة 2000 فى سياق اخر", "tokens": 200},
    ]
    assert classify_rows(rows, token_threshold=10000) == []
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run pytest tests/test_dataflare.py -v`
Expected: `ModuleNotFoundError: No module named 'legalrag.sources.dataflare'`

- [ ] **Step 3: Write `src/legalrag/sources/dataflare.py`**

```python
"""dataflare/egypt-legal-corpus source — requires row classification.

Verified during Phase 1 planning: this dataset's 2,434 rows are mostly
short legal-encyclopedia/case-note entries (e.g. "دعوى مدنية تعويض"), not
statute text. Only rows above a token-count threshold, ideally also
matching a "قانون رقم N لسنة YYYY" pattern, are candidate full-instrument
rows — and even those must be human-eyeballed before ingestion (see
scripts/dataflare_candidates.py in Task 10).
"""
from __future__ import annotations

import re

from legalrag.arabic import normalize_digits

_LAW_NUMBER_YEAR = re.compile(
    r"قانون\s+رقم\s*[:\-]?\s*(?P<number>[0-9٠-٩]+)\s*لسنة\s*(?P<year>[0-9٠-٩]{4})"
)


def extract_law_number_year(text: str) -> tuple[str, int] | None:
    match = _LAW_NUMBER_YEAR.search(text)
    if not match:
        return None
    number = normalize_digits(match.group("number"))
    year = int(normalize_digits(match.group("year")))
    return number, year


def classify_rows(rows: list[dict], token_threshold: int = 10000) -> list[dict]:
    candidates = []
    for row in rows:
        if row.get("tokens", 0) <= token_threshold:
            continue
        law_number_year = extract_law_number_year(row.get("text", ""))
        candidates.append(
            {
                "law_name": row["law_name"],
                "categories": row.get("categories", []),
                "tokens": row["tokens"],
                "law_number": law_number_year[0] if law_number_year else None,
                "law_year": law_number_year[1] if law_number_year else None,
                "text": row["text"],
            }
        )
    return candidates
```

- [ ] **Step 4: Run to verify tests pass**

Run: `uv run pytest tests/test_dataflare.py -v`
Expected: all 5 tests `PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/legalrag/sources/dataflare.py tests/test_dataflare.py
git commit -m "Add dataflare source module with row-classification filter"
```

---

### Task 10: Fidelity check + broad-corpus ingestion run

**Files:**
- Create: `scripts/fidelity_check.py`
- Create: `scripts/dataflare_candidates.py`
- Create: `scripts/ingest_dataflare.py`

**Interfaces:**
- Consumes: `legalrag.sources.dataflare.classify_rows` (Task 9), `legalrag.sources.lawyeregypt` (Task 7), `legalrag.parse.articles.parse_articles` (Task 4), `legalrag.ingest.{upsert_instrument,insert_articles}` (Task 6)
- Produces: a fidelity report (printed), a reviewed candidate list (printed + written to `data/interim/dataflare_candidates.json` for the next script to consume), and new rows in the live DB.

This task is not unit-tested — real dataset calls and a human review step, same pattern as Task 8/9's investigation scripts and Phase 0's acquisition script.

- [ ] **Step 1: Write `scripts/fidelity_check.py`**

Compares the Civil Code as it appears in `dataflare` against the already-scraped `lawyeregypt.net` text (ground truth per the corrected spec — `tashreaat.com` is confirmed unreachable).

```python
"""Character-by-character fidelity check: dataflare's Civil Code row vs.
the already-scraped lawyeregypt.net text (data/raw/eg-civil-code-131-1948.txt).

tashreaat.com (the roadmap's originally intended ground-truth source) is
confirmed unreachable, so lawyeregypt.net text — already spot-checked
clean in Phase 0 — is used instead.

Run: uv run python scripts/fidelity_check.py
"""
from __future__ import annotations

from pathlib import Path

from datasets import load_dataset

from legalrag.parse.articles import parse_articles

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
SAMPLE_SIZE = 20


def find_civil_code_row(rows: list[dict]) -> dict:
    matches = [r for r in rows if r["law_name"] == "القانون المدني"]
    if not matches:
        raise RuntimeError("no dataflare row with law_name == 'القانون المدني'")
    return max(matches, key=lambda r: r["tokens"])


def main() -> None:
    print("Loading dataflare/egypt-legal-corpus...")
    dataset = load_dataset("dataflare/egypt-legal-corpus", split="train")
    rows = list(dataset)
    dataflare_row = find_civil_code_row(rows)
    dataflare_articles = {a.article_number: a.article_text for a in parse_articles(dataflare_row["text"])}
    print(f"dataflare Civil Code row: {len(dataflare_articles)} articles parsed")

    ground_truth_text = (RAW_DIR / "eg-civil-code-131-1948.txt").read_text(encoding="utf-8")
    ground_truth_articles = {a.article_number: a.article_text for a in parse_articles(ground_truth_text)}
    print(f"lawyeregypt.net Civil Code: {len(ground_truth_articles)} articles parsed")

    common_numbers = sorted(
        (set(dataflare_articles) & set(ground_truth_articles)),
        key=lambda n: int(n.split()[0]),
    )[:SAMPLE_SIZE]

    if not common_numbers:
        print("No overlapping article numbers found between the two sources — investigate before proceeding.")
        return

    exact_matches = 0
    for number in common_numbers:
        df_text = dataflare_articles[number].strip()
        gt_text = ground_truth_articles[number].strip()
        is_match = df_text == gt_text
        exact_matches += is_match
        status = "MATCH" if is_match else "DIFFERS"
        print(f"  Art. {number}: {status}")
        if not is_match:
            print(f"    dataflare:     {df_text[:120]!r}")
            print(f"    lawyeregypt:   {gt_text[:120]!r}")

    print(f"\nFidelity: {exact_matches}/{len(common_numbers)} articles exact-matched.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

Run: `uv run python scripts/fidelity_check.py`
Expected: a per-article MATCH/DIFFERS report and a final fidelity score. Exact character matches are not required to pass the gate — whitespace/punctuation differences between two independently-scraped sources are expected. Judge the score qualitatively: if differences are cosmetic (spacing, stray characters) the gate passes; if article *content* differs (missing sentences, wrong numbers), stop and report this to the user before proceeding — it means dataflare's text quality is worse than assumed and Task 10's remaining steps need to fall back further (e.g., treat dataflare as unusable for the spine and rely more heavily on the guarantee-list + fr3on approach).

- [ ] **Step 3: Write `scripts/dataflare_candidates.py`**

```python
"""Prints dataflare's classified candidate rows for human review, and writes
the reviewed set to data/interim/dataflare_candidates.json.

Run: uv run python scripts/dataflare_candidates.py
"""
from __future__ import annotations

import json
from pathlib import Path

from datasets import load_dataset

from legalrag.sources.dataflare import classify_rows

INTERIM_DIR = Path(__file__).resolve().parent.parent / "data" / "interim"


def main() -> None:
    print("Loading dataflare/egypt-legal-corpus...")
    dataset = load_dataset("dataflare/egypt-legal-corpus", split="train")
    rows = list(dataset)

    candidates = classify_rows(rows, token_threshold=10000)
    print(f"{len(candidates)} candidate rows (>10000 tokens):")
    for c in candidates:
        law_ref = f"{c['law_number']}/{c['law_year']}" if c["law_number"] else "NO NUMBER/YEAR MATCH"
        print(f"  [{c['tokens']:>7}] {c['law_name']}  ({law_ref})")

    INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    out_path = INTERIM_DIR / "dataflare_candidates.json"
    out_path.write_text(
        json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nWrote {out_path}. Review the printed list, then hand-edit this file to remove")
    print("any row that isn't genuinely a full statute before running ingest_dataflare.py.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run it and review the output**

Run: `uv run python scripts/dataflare_candidates.py`
Expected: a printed list of candidate rows with token counts and extracted law number/year (or "NO NUMBER/YEAR MATCH" for rows that passed the token threshold but didn't match the title pattern — these need a manual look at `law_name` to judge whether they're real statutes worth a manual number/year fill-in, or still encyclopedia content that slipped past the threshold).

Manually edit `data/interim/dataflare_candidates.json`: delete any entry that isn't genuinely a full statute, and fill in `law_number`/`law_year` by hand for any real statute the regex missed (e.g. differently-worded titles). This is the human-eyeball step the design doc requires — do not skip it.

- [ ] **Step 5: Write `scripts/ingest_dataflare.py`**

```python
"""Parses and ingests the human-reviewed dataflare candidates
(data/interim/dataflare_candidates.json) into Postgres. Skips any of the 3
guaranteed statutes already loaded by ingest_guaranteed.py, since the
guarantee-list source takes precedence for those per the design doc.

Run: uv run python scripts/ingest_dataflare.py
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import parse_articles
from legalrag.sources.lawyeregypt import GUARANTEED_STATUTES

INTERIM_DIR = Path(__file__).resolve().parent.parent / "data" / "interim"
DATASET_SOURCE = "dataflare/egypt-legal-corpus"

_GUARANTEED_NUMBER_YEARS = {(s["number"], s["year"]) for s in GUARANTEED_STATUTES}


def main() -> None:
    candidates_path = INTERIM_DIR / "dataflare_candidates.json"
    candidates = json.loads(candidates_path.read_text(encoding="utf-8"))

    conn = get_connection()
    for candidate in candidates:
        if not candidate.get("law_number") or not candidate.get("law_year"):
            print(f"SKIP (no number/year): {candidate['law_name']}")
            continue
        if (candidate["law_number"], candidate["law_year"]) in _GUARANTEED_NUMBER_YEARS:
            print(f"SKIP (already loaded via guarantee list): {candidate['law_name']}")
            continue

        articles = parse_articles(candidate["text"])
        if not articles:
            print(f"SKIP (no articles parsed): {candidate['law_name']}")
            continue

        print(f"{candidate['law_name']} ({candidate['law_number']}/{candidate['law_year']}): {len(articles)} articles")

        instrument_id = upsert_instrument(
            conn,
            jurisdiction="EG",
            instrument_type="law",
            number=candidate["law_number"],
            year=candidate["law_year"],
            title=candidate["law_name"],
            source_url=f"hf://{DATASET_SOURCE}",
            fetched_at=datetime.now(timezone.utc),
        )
        count = insert_articles(
            conn,
            instrument_id=instrument_id,
            jurisdiction="EG",
            articles=articles,
            language="ar",
            source_url=f"hf://{DATASET_SOURCE}",
        )
        print(f"  inserted/updated {count} article rows (instrument_id={instrument_id})")

    conn.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Run it**

Run: `uv run python scripts/ingest_dataflare.py`
Expected: one block per reviewed candidate, either `SKIP` with a reason or a parsed+inserted count.

- [ ] **Step 7: Re-run `parse_report` and spot-check**

Run: `uv run python -m legalrag.parse.report`
Expected: now reports on every instrument in `data/raw/` — but note this CLI currently only reads `data/raw/`, and Task 10's dataflare rows were ingested directly from HF without a `data/raw/` sidecar. Before relying on `parse_report` for these, write each ingested dataflare candidate's raw `text` to `data/raw/{slug}.txt` + `.meta.json` (slug: transliterate or hash the law_name, e.g. `dataflare-{law_number}-{law_year}`) as part of Step 6 above, per the immutability rule — add this to `ingest_dataflare.py` before the parse step:

```python
# Insert into ingest_dataflare.py's main(), before parse_articles(candidate["text"]):
import json as _json  # already imported above; this note is for the raw-file write

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
slug = f"dataflare-{candidate['law_number']}-{candidate['law_year']}"
(RAW_DIR / f"{slug}.txt").write_text(candidate["text"], encoding="utf-8")
(RAW_DIR / f"{slug}.meta.json").write_text(
    json.dumps(
        {
            "slug": slug,
            "law_number": candidate["law_number"],
            "law_year": candidate["law_year"],
            "title_ar": candidate["law_name"],
            "source": DATASET_SOURCE,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        },
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)
```

Add this snippet into `scripts/ingest_dataflare.py`'s loop (right after the `if not articles` skip check, before the `upsert_instrument` call), re-run Step 6, then re-run `parse_report`.

Run: `docker compose exec postgres psql -U legalrag -d legalrag -c "SELECT count(DISTINCT instrument_id) FROM articles;"`
Expected: a count ≥ 4 (3 guaranteed + at least the Civil Code cross-check, likely more).

- [ ] **Step 8: Commit**

```bash
git add scripts/fidelity_check.py scripts/dataflare_candidates.py scripts/ingest_dataflare.py data/raw/dataflare-*.txt data/raw/dataflare-*.meta.json data/interim/dataflare_candidates.json
git commit -m "Add fidelity check and broad-corpus dataflare ingestion"
```

---

### Task 11: `TawasulAI` cross-check

**Files:**
- Create: `src/legalrag/sources/tawasul.py`

**Interfaces:**
- Consumes: `datasets.load_dataset`
- Produces: a printed cross-check report comparing `TawasulAI/egyptian-law-articles` against the already-ingested Civil Code rows. Investigation script, not consumed programmatically.

- [ ] **Step 1: Write `src/legalrag/sources/tawasul.py`**

```python
"""TawasulAI/egyptian-law-articles cross-check.

Verified during Phase 1 planning: 1,105 rows, article-level, bilingual
(text_ar/text_en per row), covering the Civil Code only. Used here as a
coverage/fidelity cross-check against the Civil Code rows already loaded
from lawyeregypt.net (Task 7), not as an ingestion source — Phase 1 stores
Arabic-only rows (language='ar'); TawasulAI's text_en is noted for future
Phase 3 bilingual work, not stored now.

Run: uv run python -m legalrag.sources.tawasul
"""
from __future__ import annotations

from datasets import load_dataset

from legalrag.db import get_connection


def main() -> None:
    print("Loading TawasulAI/egyptian-law-articles...")
    dataset = load_dataset("TawasulAI/egyptian-law-articles", split="train")
    rows = list(dataset)
    tawasul_numbers = {row["articles"]["number"] for row in rows}
    print(f"  {len(rows)} rows, {len(tawasul_numbers)} distinct article numbers")

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT article_number FROM articles a JOIN instruments i ON i.id = a.instrument_id "
            "WHERE i.number = '131' AND i.year = 1948"
        )
        db_numbers = {row[0] for row in cur.fetchall()}
    conn.close()
    print(f"  {len(db_numbers)} article numbers already in DB for Civil Code 131/1948")

    only_in_tawasul = tawasul_numbers - db_numbers
    only_in_db = db_numbers - tawasul_numbers
    print(f"  in TawasulAI but not in DB: {len(only_in_tawasul)} (sample: {sorted(only_in_tawasul)[:10]})")
    print(f"  in DB but not in TawasulAI: {len(only_in_db)} (sample: {sorted(only_in_db)[:10]})")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

Run: `uv run python -m legalrag.sources.tawasul`
Expected: mostly-overlapping article number sets. A large one-sided gap in either direction is a real signal worth reporting back (e.g. if TawasulAI has hundreds of articles missing from the DB, the Civil Code parse from Task 7 likely has a bug — go back to `parse_report` and investigate rather than ignoring it).

- [ ] **Step 3: Commit**

```bash
git add src/legalrag/sources/tawasul.py
git commit -m "Add TawasulAI cross-check script for Civil Code coverage"
```

---

### Task 12: Eval gold set

**Files:**
- Create: `evals/goldset.yaml`

**Interfaces:**
- Consumes: the live DB (all prior tasks)
- Produces: `evals/goldset.yaml` — the Phase 1 gate deliverable, consumed by Phase 2's scoring harness (not built yet).

This task is content-drafting, not code — no steps beyond the draft-then-review loop below.

- [ ] **Step 1: Query the DB for real article text to draft against**

Run a handful of `SELECT`s against the now-populated `articles`/`instruments` tables (covering each ingested instrument) to pull real article numbers and text — this grounds every gold-set entry in verifiable stored text rather than invented examples.

- [ ] **Step 2: Draft 30–50 entries**

Using the queried text, draft entries in this format, covering all 4 categories from the design doc (exact-citation lookups, plain-language questions, unanswerable questions, ≥3 questions on statutes outside the original 3):

```yaml
- id: goldset-001
  question: "..."
  jurisdiction: EG
  expected_articles: ["131/1948 Art. 558"]
  category: exact_citation   # exact_citation | plain_language | unanswerable
  notes: ""
```

Write the drafted entries to `evals/goldset.yaml`.

- [ ] **Step 3: User review**

Present the drafted `evals/goldset.yaml` to the user for correction — per the design doc, no entry counts as ground truth until the user has verified it against the actual statute text. Apply any corrections requested.

- [ ] **Step 4: Commit**

```bash
git add evals/goldset.yaml
git commit -m "Add Phase 1 eval gold set (30-50 human-verified entries)"
```

---

### Task 13: Phase gate verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `uv run pytest -v`
Expected: all tests pass (Phase 0's `test_statute_sources.py` plus all Phase 1 tests added above).

- [ ] **Step 2: Run `parse_report` one final time**

Run: `uv run python -m legalrag.parse.report`
Expected: no unexplained numbering gaps across all ingested instruments (any remaining gaps should be understood and explainable, e.g. "source dataset is missing these articles upstream").

- [ ] **Step 3: Run the 5 phase-gate spot-checks**

```bash
docker compose exec postgres psql -U legalrag -d legalrag -c "SELECT i.title, i.number, i.year, count(*) FROM articles a JOIN instruments i ON i.id = a.instrument_id GROUP BY i.title, i.number, i.year ORDER BY i.number;"
```
Then run at least 5 individual article `SELECT`s by hand (mix of the 3 guaranteed statutes and broad-corpus additions), comparing the returned `article_text` against `data/raw/` by eye.

- [ ] **Step 4: Confirm the gold set meets the ≥30-entry, all-4-categories bar**

Run: `python3 -c "import yaml; d=yaml.safe_load(open('evals/goldset.yaml')); print(len(d)); from collections import Counter; print(Counter(e['category'] for e in d))"`
Expected: count ≥ 30, all 4 categories represented (`exact_citation`, `plain_language`, `unanswerable` — the design doc's 4th requirement, ≥3 non-core-3 statute questions, is a subset check within `expected_articles`, verify by eye).

- [ ] **Step 5: Report the phase gate result to the user**

Summarize: article counts per instrument, any unexplained gaps, gold set size/category breakdown, and a recommendation on whether the gate is met — per the design doc, this is a joint decision, not an automatic pass.

---

## Self-review notes

- **Spec coverage:** infra (Task 1–2), normalization (Task 3), parser (Task 4–5), ingestion (Task 6), guarantee-list end-to-end (Task 7), fr3on/dataflare/TawasulAI acquisition (Task 8–11) with the corrected classification/fidelity approach, gold set (Task 12), phase gate (Task 13) — every section of the approved (and corrected) design doc has a task.
- **Placeholder scan:** no TBD/TODO. Task 12 (gold set) is content-drafting rather than code by nature — its steps describe the real process (query → draft → user review → commit), not a stand-in for missing work.
- **Type consistency:** `ParsedArticle` (Task 4) fields (`article_number`, `article_sort_key`, `article_text`, `book`, `chapter`, `section`) are used identically in `ingest.py` (Task 6), `parse/report.py` (Task 5), and `scripts/ingest_guaranteed.py`/`ingest_dataflare.py` (Task 7/10). `upsert_instrument`/`insert_articles` signatures (Task 6) match their call sites in Tasks 7 and 10 exactly (keyword args: `jurisdiction`, `instrument_type`, `number`, `year`, `title`, `source_url`, `fetched_at` / `instrument_id`, `jurisdiction`, `articles`, `language`, `source_url`).
- **Known deviation flagged inline:** Task 10 Step 7 catches that `ingest_dataflare.py` as first drafted in Step 5 doesn't write `data/raw/` sidecars (violating the immutability rule) and fixes it before commit, rather than leaving it as a silent gap.
</content>
