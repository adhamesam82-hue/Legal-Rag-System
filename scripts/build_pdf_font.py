"""Builds the single TTF the invoice PDF draws with.

reportlab has no font fallback: one face draws a whole string, and any glyph
that face lacks comes out as an empty box, silently. The first invoice this
project rendered proved it -- the Arabic was shaped and laid out perfectly and
every digit, date and money figure was a row of tofu, because the web fonts
vendored for the landing page are SUBSETS. Tajawal ships 186 glyphs there and
not one numeral.

So one face has to cover both scripts, and it is built here rather than
downloaded: both inputs are already in the repository, already used by the
marketing site, and already under the SIL Open Font License.

    NotoNaskhArabic  1225 glyphs  the Arabic, including presentation forms
    Archivo           230 glyphs  Latin letters, numerals, punctuation

Run when either input changes:

    uv run python scripts/build_pdf_font.py

The output is committed. A deployment must not depend on fontTools, and an
invoice must not depend on a build step someone forgot to run.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fontTools import varLib
from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
WEB_FONTS = ROOT / "web" / "public" / "landing" / "assets" / "fonts"
OUT_DIR = ROOT / "assets" / "fonts"

ARABIC = WEB_FONTS / "NotoNaskhArabic-400-700-arabic.woff2"
LATIN = WEB_FONTS / "Archivo-400-700-latin.woff2"
OUTPUT = OUT_DIR / "LegalOS-Invoice.ttf"
OUTPUT_BOLD = OUT_DIR / "LegalOS-Invoice-Bold.ttf"

# Arabic is the base, so its metrics win. A merged face inherits the first
# font's unitsPerEm, and a mismatch would leave one script visibly the wrong
# size next to the other.
REQUIRED_SAMPLE = "0123456789ابتثجحخدذرزسشصضطظعغفقكلمنهوي.,/-"


def to_ttf(woff2: Path, work_dir: Path, weight: int = 400) -> Path:
    """One static TTF from a web font.

    Both inputs are VARIABLE fonts -- a weight axis from 400 to 700 in one
    file. fontTools cannot merge those (their VarStore tables have no merge
    rule), and reportlab would not use the axis anyway, so a single weight is
    pinned first and the variation tables go away with it.
    """
    font = TTFont(woff2)
    font.flavor = None  # decompress out of woff2 into plain TTF
    if "fvar" in font:
        font = instancer.instantiateVariableFont(font, {"wght": weight})
    out = work_dir / f"{woff2.stem}-{weight}.ttf"
    font.save(out)
    return out


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    work = OUT_DIR / "_build"
    work.mkdir(exist_ok=True)

    builds = [(400, OUTPUT), (700, OUTPUT_BOLD)]
    arabic = to_ttf(ARABIC, work)
    latin = to_ttf(LATIN, work)

    arabic_upem = TTFont(arabic)["head"].unitsPerEm
    latin_upem = TTFont(latin)["head"].unitsPerEm
    if arabic_upem != latin_upem:
        print(
            f"unitsPerEm differ ({arabic_upem} vs {latin_upem}); "
            "the two scripts would render at different sizes",
            file=sys.stderr,
        )
        return 1

    for weight, target in builds:
        a = to_ttf(ARABIC, work, weight)
        l = to_ttf(LATIN, work, weight)
        merged = Merger().merge([str(a), str(l)])
        # Name the result for what it is. Left alone it inherits Noto's name
        # table, so a PDF would report NotoNaskhArabic for a face that is half
        # Archivo -- misleading to anyone inspecting an invoice, and it makes
        # "is our font embedded?" impossible to assert on.
        family = "LegalOS Invoice"
        style = "Bold" if weight >= 700 else "Regular"
        full = f"{family} {style}"
        postscript = f"LegalOSInvoice-{style}"
        for record in merged["name"].names:
            if record.nameID == 1:
                record.string = family.encode("utf-16-be")
            elif record.nameID == 2:
                record.string = style.encode("utf-16-be")
            elif record.nameID == 4:
                record.string = full.encode("utf-16-be")
            elif record.nameID == 6:
                record.string = postscript.encode("utf-16-be")
        merged.save(target)

        # Prove the result before anyone ships an invoice with it. This is
        # exactly the check that was missing the first time: the font loaded,
        # the page rendered, and every numeral was an empty box.
        cmap = TTFont(target).getBestCmap()
        missing = [ch for ch in REQUIRED_SAMPLE if ord(ch) not in cmap]
        if missing:
            print(f"{target.name} is missing: {''.join(missing)}", file=sys.stderr)
            return 1
        print(f"{target.name}: {len(cmap)} characters, {target.stat().st_size:,} bytes")

    for leftover in work.iterdir():
        leftover.unlink()
    work.rmdir()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
