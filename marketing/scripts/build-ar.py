#!/usr/bin/env python3
"""Generate ar/index.html from index.html + i18n/ar.json.

Why a generated page rather than a client-side toggle: this is a marketing page
for a market that reads Arabic, so the Arabic copy has to be in the HTML a
crawler receives, at its own URL, with hreflang pointing both ways. A toggle
that swaps text after load gives Arabic readers a page that ranks in English
and flashes English on every visit.

Why generated rather than hand-maintained: two 1,300-line files that have to say
the same thing in two languages drift within a week. The English page stays the
single source of structure; only the strings live in the dictionary.

    python3 scripts/build-ar.py           # write ar/index.html
    python3 scripts/build-ar.py --check   # exit 1 if it is stale or incomplete

The --check mode is the guard against the failure this design invites: English
copy edited in index.html and the Arabic page left behind. Any text node that is
in neither `translate` nor `keep` is reported, so new copy cannot ship silently
untranslated.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
from html import escape
from html.parser import HTMLParser

HERE = pathlib.Path(__file__).resolve().parent.parent
SRC = HERE / "index.html"
DICT = HERE / "i18n" / "ar.json"
OUT = HERE / "ar" / "index.html"

# Tags whose text is not prose. `text` and `textPath` are SVG, not copy.
SKIP_TEXT_IN = {
    "script", "style", "svg", "path", "use", "defs", "symbol", "linearGradient",
    "radialGradient", "stop", "circle", "rect", "mask", "g", "line", "polyline",
    "polygon", "text", "textPath", "filter", "feTurbulence", "clipPath", "ellipse",
}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "param", "source", "track", "wbr", "use", "stop", "path", "circle", "rect",
        "line", "polyline", "polygon", "ellipse", "feTurbulence"}

TRANSLATABLE_ATTRS = ("aria-label", "alt", "placeholder", "title", "content", "label")

HAS_LATIN = re.compile(r"[A-Za-z]{2}")
HAS_ARABIC = re.compile(r"[؀-ۿ]")


class Translator(HTMLParser):
    """Re-emits the document, translating text nodes and a few attributes.

    Deliberately a re-emitter rather than a DOM rewrite: it preserves the source
    byte-for-byte everywhere it does not translate, so the Arabic page stays
    diffable against the English one.
    """

    def __init__(self, table: dict[str, str], keep: set[str]):
        # charrefs converted: without it "Intake &amp; conflict check" reaches
        # the translator as three nodes and only the tail would match a key.
        # Text is re-escaped on the way out.
        super().__init__(convert_charrefs=True)
        self.table, self.keep = table, keep
        self.out: list[str] = []
        self.stack: list[str] = []
        self.classes: list[str] = []
        self.missing: list[str] = []

    # --- helpers ---------------------------------------------------------
    def _translate(self, text: str, classes: tuple[str, ...] = ()) -> str | None:
        stripped = " ".join(text.split())
        if not stripped or not HAS_LATIN.search(stripped) or HAS_ARABIC.search(stripped):
            return None
        # A qualified key wins over a bare one. "Legal" is a footer heading in
        # one place and half of a firm's name in another; "class::text" tells
        # those apart without keying every string by location. Ancestors count,
        # innermost first, because the text is usually a couple of unclassed
        # <b>/<em> wrappers below the element that names it.
        for cls in reversed(classes):
            for token in cls.split():
                qualified = f"{token}::{stripped}"
                if qualified in self.table:
                    return self.table[qualified]
        if stripped in self.table:
            return self.table[stripped]
        if stripped not in self.keep:
            self.missing.append(stripped)
        return None

    # --- parser hooks ----------------------------------------------------
    def handle_starttag(self, tag, attrs):
        self.out.append(self._tag(tag, attrs, self.get_starttag_text()))
        if tag not in VOID:
            self.stack.append(tag)
            self.classes.append(dict(attrs).get("class") or "")

    def handle_startendtag(self, tag, attrs):
        self.out.append(self._tag(tag, attrs, self.get_starttag_text()))

    def _tag(self, tag, attrs, raw):
        for key, value in attrs:
            if key not in TRANSLATABLE_ATTRS or not value:
                continue
            # `content` carries both prose (descriptions) and machinery
            # (viewport, og:type); only the prose has letters and spaces.
            translated = self._translate(value)
            if not translated:
                continue
            # Attribute values arrive unescaped; the raw tag text may not be.
            for literal in (value, escape(value, quote=True)):
                if f'{key}="{literal}"' in raw:
                    raw = raw.replace(f'{key}="{literal}"', f'{key}="{translated}"', 1)
                    break
        return raw

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
            self.classes.pop()
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if any(t in SKIP_TEXT_IN for t in self.stack):
            self.out.append(escape(data, quote=False))
            return
        translated = self._translate(data, tuple(self.classes))
        if translated is None:
            self.out.append(escape(data, quote=False))
            return
        # Keep the original leading/trailing whitespace so indentation survives.
        lead = data[: len(data) - len(data.lstrip())]
        trail = data[len(data.rstrip()):]
        self.out.append(f"{lead}{translated}{trail}")

    def handle_comment(self, data):
        self.out.append(f"<!--{data}-->")

    def handle_decl(self, decl):
        self.out.append(f"<!{decl}>")



def localise_document(html: str) -> str:
    """Everything that is about the document rather than about a string."""
    subs = [
        ('<html lang="en">', '<html lang="ar" dir="rtl">'),
        # Assets sit one level up from ar/.
        ('href="assets/', 'href="../assets/'),
        ('src="assets/', 'src="../assets/'),
        ('content="assets/', 'content="../assets/'),
        ('poster="assets/', 'poster="../assets/'),
        # Preload what this page actually paints with. The Latin faces still
        # load — the wordmark and every product code are Latin — but they are
        # no longer the first thing the Arabic page waits on.
        # (runs after the path rewrite above, hence ../)
        ('<link rel="preload" href="../assets/fonts/Archivo-400-700-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
         '<link rel="preload" href="../assets/fonts/Newsreader-400-latin.woff2" as="font" type="font/woff2" crossorigin>',
         '<link rel="preload" href="../assets/fonts/Tajawal-400-arabic.woff2" as="font" type="font/woff2" crossorigin>\n'
         '<link rel="preload" href="../assets/fonts/NotoNaskhArabic-400-700-arabic.woff2" as="font" type="font/woff2" crossorigin>'),
        # Every switcher points back at the page you are not on, and is written
        # in the language it leads to. Whole-element swaps rather than dictionary
        # entries: the label, the href, `lang` and the `ar` class all have to
        # change together, and none of that survives a string-for-string
        # translation. No `dir` on either: the switcher is a word, not a passage,
        # so it takes the page's direction like every other item in the bar and
        # `.ar`'s bidi isolation keeps it from disturbing its neighbours.
        ('<a class="nav-locale" href="/ar" hreflang="ar" lang="ar"><svg class="ico" aria-hidden="true"><use href="#i-globe"/></svg><span class="nav-locale-label ar">العربية</span></a>',
         '<a class="nav-locale" href="/" hreflang="en" lang="en"><svg class="ico" aria-hidden="true"><use href="#i-globe"/></svg><span class="nav-locale-label">English</span></a>'),
        ('<a class="mobile-locale ar" href="/ar" hreflang="ar" lang="ar">العربية</a>',
         '<a class="mobile-locale" href="/" hreflang="en" lang="en">English</a>'),
        # The footer switcher points back at the page you are not on.
        ('<span class="foot-locale"><svg class="ico" aria-hidden="true"><use href="#i-globe"/></svg>القاهرة · العربية<i>/</i><a href="/ar" class="ar">العربية</a></span>',
         '<span class="foot-locale"><svg class="ico" aria-hidden="true"><use href="#i-globe"/></svg>القاهرة · العربية<i>/</i><a href="/" lang="en" dir="ltr">English</a></span>'),
    ]
    for old, new in subs:
        if old not in html:
            raise SystemExit(f"build-ar: expected to find in the source:\n  {old[:90]}")
        html = html.replace(old, new)

    # The English page already carries the hreflang set and it is identical on
    # both sides of the pair, so it comes through the copy unchanged. Added
    # here only if the source ever loses it.
    if 'hreflang="ar"' not in html:
        alt = ('<link rel="alternate" hreflang="en" href="/">\n'
               '<link rel="alternate" hreflang="ar" href="/ar/">\n'
               '<link rel="alternate" hreflang="x-default" href="/">\n')
        html = html.replace('<link rel="icon"', alt + '<link rel="icon"', 1)
    return html


def main() -> int:
    check = "--check" in sys.argv
    spec = json.loads(DICT.read_text(encoding="utf-8"))
    table, keep = spec["translate"], set(spec["keep"])

    parser = Translator(table, keep)
    parser.feed(SRC.read_text(encoding="utf-8"))
    parser.close()
    html = localise_document("".join(parser.out))

    if parser.missing:
        seen, unique = set(), []
        for m in parser.missing:
            if m not in seen:
                seen.add(m)
                unique.append(m)
        print(f"build-ar: {len(unique)} string(s) with no Arabic and not in `keep`:")
        for m in unique:
            print(f"  · {m[:110]}")
        if check:
            return 1

    if check:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != html:
            print("build-ar: ar/index.html is stale — re-run scripts/build-ar.py")
            return 1
        print("build-ar: ar/index.html is up to date")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    translated = sum(1 for _ in table)
    print(f"build-ar: wrote {OUT.relative_to(HERE)} ({translated} strings)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
