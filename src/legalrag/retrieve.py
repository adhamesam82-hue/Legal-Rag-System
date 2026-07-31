"""Lexical retrieval: citation lookup, then IDF-weighted search fused with RRF.

Jurisdiction is applied inside every SQL query, before ranking -- never as a
post-filter and never as a scoring term. See design doc
docs/ailab/specs/2026-07-31-phase2-retrieval-answering-design.md
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

import psycopg

from legalrag.arabic import normalize
from legalrag.embed import embed_query, to_pgvector
from legalrag.expand import Expansion

RRF_K = 60
CANDIDATE_POOL = 50
TITLE_OVERLAP_FLOOR = 0.5

# A lexeme in more than this share of the corpus carries no discriminating
# signal -- in legal Arabic that is words like قانون and أحكام, which otherwise
# dominate an OR query and drag every long article to the top.
MAX_DOCUMENT_FREQUENCY_RATIO = 0.25

# Two instruments can share a (number, year): a law and the decree that
# promulgated it, each with its own "Article 1". A citation means the law.
_INSTRUMENT_TYPE_RANK = "CASE WHEN instrument_type = 'law' THEN 0 ELSE 1 END"

ARTICLE_COLUMNS = """
    a.id, i.number, i.year, i.title, i.instrument_type,
    a.article_number, a.article_text
"""


@dataclass(frozen=True)
class Citation:
    """An article reference parsed out of a question."""

    article_numbers: tuple[str, ...]
    law_number: str | None
    law_year: int | None
    title_hint: str | None


@dataclass(frozen=True)
class Candidate:
    article_id: int
    instrument_number: str
    instrument_year: int
    instrument_title: str
    instrument_type: str
    article_number: str
    article_text: str
    score: float

    @property
    def citation(self) -> str:
        return f"{self.instrument_number}/{self.instrument_year} Art. {self.article_number}"


@dataclass(frozen=True)
class Retrieval:
    candidates: list[Candidate]
    strategy: str
    search_text: str
    parsed_citation: Citation | None = None
    expansion: Expansion | None = None
    # Set when a citation named a law we hold but an article we do not. The
    # difference between "not found" and "not searched" matters for refusal.
    missing_citation: bool = False
    debug: dict = field(default_factory=dict)


# --- citation parsing -------------------------------------------------------
# Patterns run against normalized text, so Arabic-Indic digits are already ASCII
# and ة/ى are already ه/ي -- hence "الماده" and "لسنه", not "المادة"/"لسنة".

_ARTICLE_RANGE_PATTERNS = (
    re.compile(r"(?:المواد|مواد)\s*(?:من\s*)?(\d+)\s*(?:الي|إلى|حتي|-)\s*(\d+)"),
    re.compile(r"(?:articles|arts\.?)\s*(\d+)\s*(?:to|-|through)\s*(\d+)", re.IGNORECASE),
)
_ARTICLE_PATTERNS = (
    re.compile(r"(?:الماده|ماده|المواد|مواد)\s*(?:رقم\s*)?(\d+)"),
    re.compile(r"(?:articles?|arts?\.?)\s+(?:no\.?\s*)?(\d+)", re.IGNORECASE),
)
_LAW_PATTERNS = (
    re.compile(r"رقم\s*(\d+)\s*لسنه\s*(\d{4})"),
    re.compile(r"\b(\d+)\s*/\s*(\d{4})\b"),
    re.compile(r"\blaw\s*(?:no\.?\s*)?(\d+)\s*(?:/|of)\s*(\d{4})", re.IGNORECASE),
)
# Matches both "من القانون المدني" and a bare title emitted by query expansion.
_TITLE_HINT_PATTERN = re.compile(
    r"(?:^|\s)((?:ال)?(?:قانون|نظام|لائحه)(?:\s+[^\s؟?,.\n]+){0,5})"
)
_MAX_RANGE_SPAN = 60

# Words shared by nearly every statute title, so they carry no signal about
# which statute is meant.
_TITLE_BOILERPLATE = frozenset(
    {
        "قانون", "القانون", "بقانون", "نظام", "النظام", "لائحه", "اللائحه",
        "مرسوم", "قرار", "رقم", "لسنه", "سنه", "باصدار", "اصدار", "في", "فى",
        "شان", "بشان", "المصري", "المصريه", "الجديد", "الجديده", "علي", "علي",
        "من", "الي", "او", "الخاص", "بعض", "احكام", "تنظيم",
    }
)
_WORD_PATTERN = re.compile(r"[^\W\d_]+", re.UNICODE)


def _content_words(text: str) -> list[str]:
    words = _WORD_PATTERN.findall(normalize(text))
    return list(
        dict.fromkeys(w for w in words if len(w) > 2 and w not in _TITLE_BOILERPLATE)
    )


def _parse_law_number(text: str) -> tuple[str, int] | None:
    normalized = normalize(text)
    for pattern in _LAW_PATTERNS:
        match = pattern.search(normalized)
        if match:
            return match.group(1), int(match.group(2))
    return None


def parse_citation(question: str) -> Citation | None:
    """Extract an article reference from a question, or None if it isn't one."""
    text = normalize(question)

    numbers: list[str] = []
    for pattern in _ARTICLE_RANGE_PATTERNS:
        for start, end in pattern.findall(text):
            low, high = int(start), int(end)
            if low <= high and high - low <= _MAX_RANGE_SPAN:
                numbers.extend(str(n) for n in range(low, high + 1))
    if not numbers:
        for pattern in _ARTICLE_PATTERNS:
            numbers.extend(pattern.findall(text))
    if not numbers:
        return None

    law_number = law_year = None
    for pattern in _LAW_PATTERNS:
        match = pattern.search(text)
        if match:
            law_number, law_year = match.group(1), int(match.group(2))
            break

    title_match = _TITLE_HINT_PATTERN.search(text)
    title_hint = title_match.group(1).strip() if title_match else None

    return Citation(tuple(dict.fromkeys(numbers)), law_number, law_year, title_hint)


def resolve_instrument(
    conn: psycopg.Connection, citation: Citation, jurisdiction: str
) -> int | None:
    """Map a parsed citation to one instrument id, preferring laws over decrees."""
    with conn.cursor() as cur:
        if citation.law_number and citation.law_year:
            cur.execute(
                f"""
                SELECT id FROM instruments
                WHERE jurisdiction = %s AND number = %s AND year = %s
                ORDER BY {_INSTRUMENT_TYPE_RANK}
                LIMIT 1
                """,
                (jurisdiction, citation.law_number, citation.law_year),
            )
            row = cur.fetchone()
            if row:
                return row[0]

    if citation.title_hint:
        return resolve_instrument_by_title(conn, citation.title_hint, jurisdiction)

    return None


def resolve_instrument_by_title(
    conn: psycopg.Connection, title: str, jurisdiction: str
) -> int | None:
    """Resolve a law named in prose to one instrument id.

    Character trigrams are the wrong tool here: every Egyptian statute title
    shares the same boilerplate (قانون, رقم, لسنة, a year), so 'قانون البيئة'
    scores 0.47 against 'قانون العمل' but only 0.30 against the actual
    environment law, whose real title is padded with that boilerplate. The
    distinguishing signal is a whole content word, so match on those instead.
    """
    number_year = _parse_law_number(title)
    if number_year:
        number, year = number_year
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id FROM instruments
                WHERE jurisdiction = %s AND number = %s AND year = %s
                ORDER BY {_INSTRUMENT_TYPE_RANK}
                LIMIT 1
                """,
                (jurisdiction, number, year),
            )
            row = cur.fetchone()
            if row:
                return row[0]

    words = _content_words(title)
    if not words:
        return None

    with conn.cursor() as cur:
        cur.execute(
            f"""
            WITH w(word) AS (SELECT unnest(%s::text[]))
            SELECT i.id,
                   count(*) FILTER (WHERE i.title_norm LIKE '%%' || w.word || '%%')::float
                     / %s AS overlap
            FROM instruments i CROSS JOIN w
            WHERE i.jurisdiction = %s
            GROUP BY i.id, i.instrument_type, i.title_norm
            HAVING count(*) FILTER (WHERE i.title_norm LIKE '%%' || w.word || '%%') > 0
            ORDER BY overlap DESC, {_INSTRUMENT_TYPE_RANK}, length(i.title_norm)
            LIMIT 1
            """,
            (words, float(len(words)), jurisdiction),
        )
        row = cur.fetchone()
        return row[0] if row and row[1] >= TITLE_OVERLAP_FLOOR else None


def direct_lookup(
    conn: psycopg.Connection, instrument_id: int, article_numbers: tuple[str, ...]
) -> list[Candidate]:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {ARTICLE_COLUMNS}
            FROM articles a JOIN instruments i ON i.id = a.instrument_id
            WHERE a.instrument_id = %s
              AND a.article_number = ANY(%s)
              AND NOT a.is_repealed
            ORDER BY a.article_sort_key
            """,
            (instrument_id, list(article_numbers)),
        )
        return [to_candidate(row, score=1.0) for row in cur.fetchall()]


# --- lexical search ---------------------------------------------------------


def query_lexemes(conn: psycopg.Connection, text: str) -> list[str]:
    """Tokenize with the same 'arabic' config that built the index."""
    with conn.cursor() as cur:
        cur.execute("SELECT lexeme FROM unnest(to_tsvector('arabic', %s))", (text,))
        return list(dict.fromkeys(row[0] for row in cur.fetchall()))


def lexeme_weights(
    conn: psycopg.Connection, lexemes: list[str], jurisdiction: str
) -> tuple[list[str], list[float]]:
    """Inverse document frequency per lexeme, dropping the uninformative ones.

    Postgres full-text search has no IDF: ts_rank_cd scores purely on term
    frequency and proximity, so long articles stuffed with common legal
    boilerplate outrank the short article that actually answers the question.
    Measured on the gold set, ts_rank_cd retrieved 0 of 16 plain-language
    questions; weighting the same lexemes by IDF retrieved 9 of 9 of the ones
    written in Arabic. Hence scoring here rather than in ts_rank_cd.
    """
    if not lexemes:
        return [], []

    with conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM articles WHERE jurisdiction = %s AND NOT is_repealed",
            (jurisdiction,),
        )
        corpus_size = cur.fetchone()[0]
        if not corpus_size:
            return [], []

        cur.execute(
            """
            SELECT l.lexeme,
                   (SELECT count(*) FROM articles a
                     WHERE a.jurisdiction = %s
                       AND NOT a.is_repealed
                       AND a.text_search @@ to_tsquery('arabic', quote_literal(l.lexeme))
                   ) AS df
            FROM unnest(%s::text[]) AS l(lexeme)
            """,
            (jurisdiction, lexemes),
        )
        rows = cur.fetchall()

    ceiling = corpus_size * MAX_DOCUMENT_FREQUENCY_RATIO
    kept = [(lexeme, df) for lexeme, df in rows if 0 < df <= ceiling]
    return (
        [lexeme for lexeme, _ in kept],
        [math.log(1 + corpus_size / df) for _, df in kept],
    )


def lexical_search(
    conn: psycopg.Connection,
    text: str,
    jurisdiction: str,
    limit: int = CANDIDATE_POOL,
    instrument_id: int | None = None,
) -> list[Candidate]:
    """Rank articles by summed IDF of the query lexemes they contain.

    Divided by ln(length) so a long article does not win merely by covering more
    of the query -- measured better than both no normalization and 1/sqrt(len).

    `instrument_id` narrows the search to one law. Corpus-wide, a topical query
    matches hundreds of articles and the right one can sit past rank 50; within
    the correct law it usually surfaces immediately.
    """
    lexemes, weights = lexeme_weights(conn, query_lexemes(conn, text), jurisdiction)
    if not lexemes:
        return []

    with conn.cursor() as cur:
        cur.execute(
            f"""
            WITH q(lexeme, idf) AS (SELECT * FROM unnest(%s::text[], %s::float8[]))
            SELECT {ARTICLE_COLUMNS},
                   sum(q.idf) / ln(50 + length(a.article_text_norm)) AS score
            FROM articles a
                 JOIN instruments i ON i.id = a.instrument_id
                 JOIN q ON a.text_search @@ to_tsquery('arabic', quote_literal(q.lexeme))
            WHERE a.jurisdiction = %s AND NOT a.is_repealed
              AND (%s::bigint IS NULL OR a.instrument_id = %s)
            GROUP BY a.id, i.number, i.year, i.title, i.instrument_type,
                     a.article_number, a.article_text, a.article_text_norm
            ORDER BY score DESC
            LIMIT %s
            """,
            (lexemes, weights, jurisdiction, instrument_id, instrument_id, limit),
        )
        return [to_candidate(row, score=row[7]) for row in cur.fetchall()]


def vector_search(
    conn: psycopg.Connection,
    text: str,
    jurisdiction: str,
    limit: int = CANDIDATE_POOL,
) -> list[Candidate]:
    """Rank by cosine distance over article embeddings.

    Embedded from `article_text`, not `article_text_norm`: normalization exists
    to make lexical matching consistent, and stripping diacritics and unifying
    alef forms only removes signal a multilingual encoder can use.

    Returns nothing when the corpus has no embeddings, so the fusion simply
    falls back to lexical retrieval rather than erroring.
    """
    try:
        query_vector = to_pgvector(embed_query(text))
    except Exception:  # noqa: BLE001 - a missing key or API outage degrades
        return []

    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {ARTICLE_COLUMNS},
                   1 - (a.embedding <=> %s::halfvec) AS similarity
            FROM articles a JOIN instruments i ON i.id = a.instrument_id
            WHERE a.jurisdiction = %s
              AND NOT a.is_repealed
              AND a.embedding IS NOT NULL
            ORDER BY a.embedding <=> %s::halfvec
            LIMIT %s
            """,
            (query_vector, jurisdiction, query_vector, limit),
        )
        return [to_candidate(row, score=row[7]) for row in cur.fetchall()]


def reciprocal_rank_fusion(
    ranked_lists: list[list[Candidate]], k: int = RRF_K
) -> list[Candidate]:
    """Fuse ranked lists by summed 1/(k + rank). Rank position only, never scores.

    IDF scores from different query texts are not on a comparable scale, so
    fusing on rank is what stops the longer expansion from swamping the
    question's own terms.
    """
    scores: dict[int, float] = {}
    seen: dict[int, Candidate] = {}
    for ranked in ranked_lists:
        for rank, candidate in enumerate(ranked, start=1):
            scores[candidate.article_id] = scores.get(candidate.article_id, 0.0) + 1.0 / (
                k + rank
            )
            seen.setdefault(candidate.article_id, candidate)

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [_rescore(seen[article_id], score) for article_id, score in ordered]


def search(
    conn: psycopg.Connection,
    question: str,
    jurisdiction: str,
    limit: int = 8,
    expansion: Expansion | None = None,
    use_vectors: bool = True,
) -> Retrieval:
    """Retrieve articles for a question. Citation lookup wins outright when it hits.

    `expansion` is produced upstream by expand_query() and passed in rather than
    fetched here, so retrieval stays synchronous and testable. `use_vectors` is
    what the eval harness toggles to measure what the embeddings actually buy.
    """
    citation = parse_citation(question)
    if citation:
        # A question can name its law only in English ("the Egyptian Civil
        # Code"), which no Arabic title match can resolve. Expansion emits the
        # formal Arabic title, so retry resolution with that.
        if expansion and expansion.law_hint and not (citation.law_number and citation.law_year):
            citation = Citation(
                citation.article_numbers,
                citation.law_number,
                citation.law_year,
                citation.title_hint or normalize(expansion.law_hint),
            )
        instrument_id = resolve_instrument(conn, citation, jurisdiction)
        if instrument_id is not None:
            hits = direct_lookup(conn, instrument_id, citation.article_numbers)
            if hits:
                return Retrieval(
                    candidates=hits[:limit],
                    strategy="direct_citation",
                    search_text=question,
                    parsed_citation=citation,
                    expansion=expansion,
                )
            return Retrieval(
                candidates=[],
                strategy="direct_citation",
                search_text=question,
                parsed_citation=citation,
                expansion=expansion,
                missing_citation=True,
            )

    question_norm = normalize(question)
    ranked_lists = [lexical_search(conn, question_norm, jurisdiction)]
    hinted_instrument = None

    # Vector search runs on the raw question, not the normalized or expanded
    # text: it is the one list that does not need the question rewritten into
    # statutory Arabic, which is the whole reason for adding it.
    if use_vectors:
        ranked_lists.append(vector_search(conn, question, jurisdiction))

    if expansion and expansion.terms:
        terms_norm = normalize(expansion.terms)
        ranked_lists.append(lexical_search(conn, terms_norm, jurisdiction))

        if expansion.law_hint:
            hinted_instrument = resolve_instrument_by_title(
                conn, normalize(expansion.law_hint), jurisdiction
            )
            if hinted_instrument is not None:
                ranked_lists.append(
                    lexical_search(
                        conn, terms_norm, jurisdiction, instrument_id=hinted_instrument
                    )
                )

    fused = reciprocal_rank_fusion(ranked_lists)
    return Retrieval(
        candidates=fused[:limit],
        strategy="hybrid",
        search_text=question_norm,
        parsed_citation=citation,
        expansion=expansion,
        debug={
            "list_sizes": [len(ranked) for ranked in ranked_lists],
            "hinted_instrument": hinted_instrument,
        },
    )


def to_candidate(row: tuple, score: float) -> Candidate:
    return Candidate(
        article_id=row[0],
        instrument_number=row[1],
        instrument_year=row[2],
        instrument_title=row[3],
        instrument_type=row[4],
        article_number=row[5],
        article_text=row[6],
        score=float(score),
    )


def _rescore(candidate: Candidate, score: float) -> Candidate:
    return Candidate(
        article_id=candidate.article_id,
        instrument_number=candidate.instrument_number,
        instrument_year=candidate.instrument_year,
        instrument_title=candidate.instrument_title,
        instrument_type=candidate.instrument_type,
        article_number=candidate.article_number,
        article_text=candidate.article_text,
        score=score,
    )
