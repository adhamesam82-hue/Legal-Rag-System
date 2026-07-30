"""Crawls the 309 sitemap-discovered lawyeregypt.net statute-post URLs,
extracts full statute text with the proven extract_law_text() parser,
qualifies each post as a genuine standalone statute, and ingests the
qualifying ones into Postgres.

Qualification gate (all must hold):
  - parse_articles() returns >= MIN_ARTICLES articles
  - no duplicate article_number values among them
  - a law number + year can be derived from the URL's decoded slug
  - that (number, year) is not one of the 3 hand-verified guaranteed
    statutes, which take precedence over anything scraped here

Everything else (announcement posts, commentary, amendment stubs) is
rejected and reported, not ingested.

Raw HTML is cached per URL under data/interim/html_cache/ so re-runs cost
nothing for already-fetched pages -- required because the site rate-limits
and some fraction of requests are expected to fail (ConnectTimeout / TLS
handshake errors). Failed URLs are reported at the end; simply re-running
the script retries only those (cached successes are skipped).

Arabic-literal note: the only Arabic keywords this script needs (رقم /
"number", لسنة / "year") are extracted programmatically at import time from
legalrag.sources.dataflare's existing _LAW_NUMBER_YEAR regex source, never
hand-typed here. See _extract_law_number_year_keywords(). Page titles are
derived from each cached page's own <h1>/<title> element at runtime (see
derive_title()); the site-branding suffix stripped off the end of those
titles is likewise read at runtime from that same page's og:site_name meta
tag, never hand-typed.

Run: uv run python scripts/crawl_lawyeregypt.py
"""
from __future__ import annotations

import hashlib
import json
import re
import time
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

import httpx
from bs4 import BeautifulSoup

from legalrag.arabic import normalize_digits
from legalrag.db import get_connection
from legalrag.ingest import insert_articles, upsert_instrument
from legalrag.parse.articles import ParsedArticle, parse_articles
from legalrag.sources.lawyeregypt import GUARANTEED_STATUTES, extract_law_text

ROOT = Path(__file__).resolve().parent.parent
URL_LIST_PATH = ROOT / "data" / "interim" / "lawyeregypt_statute_urls.txt"
HTML_CACHE_DIR = ROOT / "data" / "interim" / "html_cache"
RAW_DIR = ROOT / "data" / "raw"
DATAFLARE_SRC = ROOT / "src" / "legalrag" / "sources" / "dataflare.py"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
THROTTLE_SECONDS = 1.5
TIMEOUT_SECONDS = 60.0
MIN_ARTICLES = 20

ALREADY_INGESTED = {(s["number"], str(s["year"])) for s in GUARANTEED_STATUTES}

# lawyeregypt.net's sitemap mixes in statutes from other Gulf states (their
# own slugs describe them as "federal law", which cannot be Egyptian since
# Egypt is a unitary state -- plus one confirmed Qatari prisons law). This
# corpus is Egypt-only, so these (number, year) pairs are rejected during
# qualification regardless of how many articles they parse. Identified from
# their cached page titles: 21/2001 is UAE Federal Law No. 21/2001; 3/1995
# is Qatar's Law No. 3/1995 on prison organization; the rest are UAE federal
# laws of the same pattern.
NON_EGYPTIAN_EXCLUSIONS: set[tuple[str, str]] = {
    ("5", "1973"),
    ("8", "1980"),
    ("1", "1991"),
    ("37", "1992"),
    ("40", "1992"),
    ("3", "1995"),
    ("21", "2001"),
    ("28", "2005"),
    ("9", "2016"),
}

# These (number, year) pairs are Egyptian executive regulations (implementing
# regulations for an underlying law), not statutes -- the crawl's generic
# "law" typing was wrong for them. Everything else stays "law".
REGULATION_TYPE_OVERRIDES: dict[tuple[str, str], str] = {
    ("14", "2012"): "regulation",
    ("72", "2019"): "regulation",
}


def _extract_law_number_year_keywords() -> tuple[str, str]:
    """Pull the رقم / لسنة keywords out of dataflare.py's own regex source
    at runtime, byte-identical to what's already on disk there, rather
    than hand-typing Arabic literals into this file.
    """
    source = DATAFLARE_SRC.read_text(encoding="utf-8")
    match = re.search(r'_LAW_NUMBER_YEAR = re\.compile\(\s*r"""(.*?)"""\s*\)', source, re.DOTALL)
    if match is None:
        raise RuntimeError("could not locate _LAW_NUMBER_YEAR pattern source in dataflare.py")
    pattern_body = match.group(1)
    arabic_words = re.findall(r"[ء-ي]+", pattern_body)
    if len(arabic_words) != 3:
        raise RuntimeError(
            f"expected 3 Arabic keyword runs in _LAW_NUMBER_YEAR pattern, found {len(arabic_words)}"
        )
    _law_word, number_word, year_word = arabic_words
    return number_word, year_word


_RAQM, _LISANAH = _extract_law_number_year_keywords()

_ARABIC_INDIC_DIGITS = "".join(chr(0x0660 + i) for i in range(10))
_EASTERN_ARABIC_INDIC_DIGITS = "".join(chr(0x06F0 + i) for i in range(10))
_DIGIT_CLASS = "[" + re.escape("0123456789" + _ARABIC_INDIC_DIGITS + _EASTERN_ARABIC_INDIC_DIGITS) + "]"

_SLUG_NUMBER_YEAR_RE = re.compile(
    rf"{_RAQM}-(?P<number>{_DIGIT_CLASS}+)-{_LISANAH}-(?P<year>{_DIGIT_CLASS}{{4}})"
)


def load_urls() -> list[str]:
    lines = URL_LIST_PATH.read_text(encoding="utf-8").splitlines()
    return [line.strip() for line in lines if line.strip()]


def url_slug(url: str) -> tuple[str, str]:
    path_segment = urlparse(url).path.rstrip("/").rsplit("/", 1)[-1]
    decoded = unquote(path_segment)
    digest = hashlib.sha1(decoded.encode("utf-8")).hexdigest()[:12]
    return f"eg-statute-{digest}", decoded


def _site_suffix(soup: BeautifulSoup) -> str | None:
    """Read this page's own site-branding string from its og:site_name meta
    tag (present on every cached page, always the same value there). This
    is a literal already on disk, read at runtime -- never hand-typed.
    """
    meta = soup.select_one('meta[property="og:site_name"]')
    if meta is None:
        return None
    content = meta.get("content")
    if not content:
        return None
    return content.strip()


def _strip_site_suffix(text: str, site_suffix: str | None) -> str:
    text = text.strip()
    if site_suffix:
        suffix = f" - {site_suffix}"
        if text.endswith(suffix):
            text = text[: -len(suffix)].rstrip()
    return text


def derive_title(html: str, slug_fallback: str) -> str:
    """Prefer the page's <h1>; else its <title>; strip the trailing
    site-branding suffix from whichever is used (read from that same
    page's og:site_name meta tag). Fall back to the slug-derived title
    only if the page has neither an <h1> nor a <title> element with text.
    """
    soup = BeautifulSoup(html, "html.parser")
    site_suffix = _site_suffix(soup)

    h1 = soup.find("h1")
    if h1 is not None:
        h1_text = h1.get_text(" ", strip=True)
        if h1_text:
            return _strip_site_suffix(h1_text, site_suffix)

    title_tag = soup.find("title")
    if title_tag is not None:
        title_text = title_tag.get_text(strip=True)
        if title_text:
            return _strip_site_suffix(title_text, site_suffix)

    return slug_fallback


@dataclass
class FetchResult:
    url: str
    slug: str
    decoded_slug: str
    html: str | None
    from_cache: bool
    error: str | None = None


def fetch_all(urls: list[str], client: httpx.Client) -> list[FetchResult]:
    HTML_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    results: list[FetchResult] = []
    for i, url in enumerate(urls, 1):
        slug, decoded = url_slug(url)
        cache_path = HTML_CACHE_DIR / f"{slug}.html"
        if cache_path.exists():
            results.append(FetchResult(url, slug, decoded, cache_path.read_text(encoding="utf-8"), True))
            continue
        try:
            response = client.get(url, headers={"User-Agent": USER_AGENT})
            response.raise_for_status()
            html = response.text
            cache_path.write_text(html, encoding="utf-8")
            results.append(FetchResult(url, slug, decoded, html, False))
            print(f"[{i}/{len(urls)}] fetched {url}")
        except httpx.HTTPError as exc:
            print(f"[{i}/{len(urls)}] FETCH FAILED {url}: {type(exc).__name__}")
            results.append(FetchResult(url, slug, decoded, None, False, error=type(exc).__name__))
        finally:
            time.sleep(THROTTLE_SECONDS)
    return results


@dataclass
class QualifyResult:
    fetch: FetchResult
    status: str
    reason_code: str
    reason: str
    number: str | None = None
    year: int | None = None
    title: str | None = None
    instrument_type: str = "law"
    text: str | None = None
    articles: list[ParsedArticle] = field(default_factory=list)


def qualify(fetch: FetchResult) -> QualifyResult:
    assert fetch.html is not None
    try:
        text = extract_law_text(fetch.html)
    except ValueError as exc:
        return QualifyResult(fetch, "rejected", "no_content_container", f"extract_law_text failed: {exc}")

    articles = parse_articles(text)
    if len(articles) < MIN_ARTICLES:
        return QualifyResult(
            fetch, "rejected", "too_few_articles",
            f"only {len(articles)} article(s) parsed (need >= {MIN_ARTICLES})",
            text=text, articles=articles,
        )

    numbers = [a.article_number for a in articles]
    number_counts = Counter(numbers)
    duplicates = {n: c for n, c in number_counts.items() if c > 1}
    if duplicates:
        return QualifyResult(
            fetch, "rejected", "duplicate_article_numbers",
            f"{len(articles)} articles, duplicate numbers: {duplicates}",
            text=text, articles=articles,
        )

    match = _SLUG_NUMBER_YEAR_RE.search(fetch.decoded_slug)
    if match is None:
        return QualifyResult(
            fetch, "rejected", "no_number_year_in_slug",
            f"{len(articles)} articles, but no {_RAQM}-N-{_LISANAH}-YYYY pattern in slug",
            text=text, articles=articles,
        )

    number = normalize_digits(match.group("number"))
    year = int(normalize_digits(match.group("year")))

    if (number, str(year)) in NON_EGYPTIAN_EXCLUSIONS:
        return QualifyResult(
            fetch, "rejected", "non_egyptian_jurisdiction",
            f"{len(articles)} articles, ({number}/{year}) is not Egyptian law "
            f"(UAE federal / Qatar) -- excluded from Egypt-only corpus",
            number=number, year=year, text=text, articles=articles,
        )

    if (number, str(year)) in ALREADY_INGESTED:
        return QualifyResult(
            fetch, "rejected", "already_guaranteed",
            f"{len(articles)} articles, ({number}/{year}) already in hand-verified corpus",
            number=number, year=year, text=text, articles=articles,
        )

    slug_fallback_title = fetch.decoded_slug[: match.start()].rstrip("-").replace("-", " ").strip()
    title = derive_title(fetch.html, slug_fallback_title)
    instrument_type = REGULATION_TYPE_OVERRIDES.get((number, str(year)), "law")

    return QualifyResult(
        fetch, "qualified", "qualified",
        f"{len(articles)} articles, {number}/{year}",
        number=number, year=year, title=title, instrument_type=instrument_type,
        text=text, articles=articles,
    )


def ingest_qualified(conn, qualified: list[QualifyResult]) -> list[dict]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ingested: list[dict] = []
    claimed: dict[tuple[str, int], str] = {}

    for q in qualified:
        assert q.number is not None and q.year is not None and q.title is not None and q.text is not None
        key = (q.number, q.year)
        if key in claimed:
            print(
                f"SKIP duplicate-in-run {q.fetch.url}: ({q.number}/{q.year}) "
                f"already claimed this run by {claimed[key]}"
            )
            continue

        cache_path = HTML_CACHE_DIR / f"{q.fetch.slug}.html"
        fetched_at = datetime.fromtimestamp(cache_path.stat().st_mtime, tz=timezone.utc)

        raw_txt_path = RAW_DIR / f"{q.fetch.slug}.txt"
        raw_meta_path = RAW_DIR / f"{q.fetch.slug}.meta.json"
        raw_txt_path.write_text(q.text, encoding="utf-8")
        raw_meta_path.write_text(
            json.dumps(
                {
                    "slug": q.fetch.slug,
                    "law_number": q.number,
                    "law_year": q.year,
                    "title_ar": q.title,
                    "source": "lawyeregypt.net",
                    "source_url": q.fetch.url,
                    "fetched_at": fetched_at.isoformat(),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        try:
            instrument_id = upsert_instrument(
                conn,
                jurisdiction="EG",
                instrument_type=q.instrument_type,
                number=q.number,
                year=q.year,
                title=q.title,
                source_url=q.fetch.url,
                fetched_at=fetched_at,
            )
            count = insert_articles(
                conn,
                instrument_id=instrument_id,
                articles=q.articles,
                language="ar",
                source_url=q.fetch.url,
            )
        except ValueError as exc:
            print(f"SKIP ingest-failed {q.fetch.url}: {exc}")
            continue

        claimed[key] = q.fetch.url
        ingested.append(
            {"number": q.number, "year": q.year, "title": q.title, "articles": count, "url": q.fetch.url}
        )
        print(f"INGESTED {q.number}/{q.year}: {count} articles ({q.title})")

    return ingested


def main() -> None:
    urls = load_urls()
    print(f"Loaded {len(urls)} URLs from {URL_LIST_PATH}")

    with httpx.Client(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
        fetch_results = fetch_all(urls, client)

    fetched_ok = [f for f in fetch_results if f.html is not None]
    cached = [f for f in fetched_ok if f.from_cache]
    fresh = [f for f in fetched_ok if not f.from_cache]
    failed = [f for f in fetch_results if f.html is None]

    qualify_results = [qualify(f) for f in fetched_ok]
    qualified = [q for q in qualify_results if q.status == "qualified"]
    rejected = [q for q in qualify_results if q.status == "rejected"]

    for q in rejected:
        print(f"REJECT {q.fetch.url}: [{q.reason_code}] {q.reason}")

    conn = get_connection()
    try:
        ingested = ingest_qualified(conn, qualified)
    finally:
        conn.close()

    total_articles_added = sum(i["articles"] for i in ingested)
    reject_breakdown = Counter(q.reason_code for q in rejected)

    print("\n=== SUMMARY ===")
    print(f"Total URLs: {len(urls)}")
    print(f"Fetched fresh: {len(fresh)}  Cached: {len(cached)}  Failed: {len(failed)}")
    print(f"Qualified: {len(qualified)}  Rejected: {len(rejected)}")
    print("Rejected breakdown:")
    for reason_code, count in reject_breakdown.most_common():
        print(f"  {reason_code}: {count}")
    print(f"Ingested: {len(ingested)}  Total articles added: {total_articles_added}")

    if failed:
        print(f"\nFailed to fetch ({len(failed)}) -- re-run this script to retry:")
        for f in failed:
            print(f"  {f.url} ({f.error})")

    if ingested:
        print("\nIngested statutes:")
        print(f"{'number/year':<16}{'articles':<10}title")
        for i in sorted(ingested, key=lambda x: (x["year"], int(x["number"]))):
            print(f"{i['number']}/{i['year']:<12}{i['articles']:<10}{i['title']}")


if __name__ == "__main__":
    main()
