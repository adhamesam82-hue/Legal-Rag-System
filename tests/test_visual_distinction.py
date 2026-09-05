"""The visual distinction table (T-035, ui-upgrade-spec §6), checked as text.

The web app has no JS test runner, so the table is read the way the spec's
own verification reads it: as source. Each test is one of the ticket's
binding constraints, the ones a reviewer would otherwise have to hold in
their head every time somebody adds a fifteenth matter type or nudges a hue:

- one table covers every creatable matter type with a hue and a glyph;
- no two types share both hue and glyph (a repeat hue is fine, the glyph is
  what splits it), and purple stays reserved for AI;
- no hand-written colour anywhere in the new code;
- every hue and tone the table hands out clears WCAG AA text contrast on the
  theme's own tokens, on the light AND the dark surface;
- every screen that shows a type, a status or an invoice state does it
  through the shared components, not a local variant map;
- motion honours prefers-reduced-motion;
- the main screens' empty states carry a picture and a line.
"""
from __future__ import annotations

import math
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
WEB = REPO_ROOT / "web"

TABLE = WEB / "lib" / "distinction.ts"
COMPONENTS = WEB / "components" / "Distinction.tsx"
CATALOG = WEB / "lib" / "i18n" / "catalogs" / "distinction.ts"
THEME_CSS = WEB / "lib" / "legalos.css"
PRACTICE = WEB / "lib" / "practice.ts"
GLOBALS_CSS = WEB / "app" / "globals.css"

NEW_FILES = [TABLE, COMPONENTS, CATALOG]

# The palette hues Astryx's Badge/Token accept for categories. Purple is on
# the list the design system ships but not on the list this app may use: the
# theme reserves it for AI-surfaced UI (web/lib/theme.ts).
PALETTE_HUES = {"blue", "cyan", "green", "orange", "pink", "red", "teal", "yellow", "gray"}
RESERVED_HUES = {"purple"}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


# --- parsing helpers ---------------------------------------------------------

def creatable_matter_types() -> list[str]:
    """The MATTER_TYPES array in lib/practice.ts, in declared order."""
    src = read(PRACTICE)
    body = re.search(r"export const MATTER_TYPES: MatterType\[\] = \[(.*?)\];", src, re.S)
    assert body, "MATTER_TYPES not found in practice.ts"
    return re.findall(r'"([a-z_]+)"', body.group(1))


def matter_type_marks() -> dict[str, tuple[str, str]]:
    """MATTER_TYPE_MARK as {type: (hue, icon)}."""
    src = read(TABLE)
    body = re.search(r"export const MATTER_TYPE_MARK[^=]*= \{(.*?)\n\};", src, re.S)
    assert body, "MATTER_TYPE_MARK not found"
    rows = re.findall(r'^\s*([a-z_]+): \{ hue: "([a-z]+)", icon: (\w+) \}', body.group(1), re.M)
    return {t: (hue, icon) for t, hue, icon in rows}


def state_marks(name: str) -> dict[str, tuple[str, str]]:
    """A `Record<..., StateMark...>` constant as {key: (tone, icon)}."""
    src = read(TABLE)
    body = re.search(rf"export const {name}[^=]*= \{{(.*?)\n\}};", src, re.S)
    assert body, f"{name} not found"
    rows = re.findall(r'^\s*([a-z_]+): \{\s*tone: "([a-z]+)",\s*icon: (\w+)', body.group(1), re.M)
    return {k: (tone, icon) for k, tone, icon in rows}


def oklch_to_rgb(L: float, C: float, H: float) -> tuple[float, float, float]:
    """Convert OKLCH coordinates to sRGB (0..1)."""
    h_rad = math.radians(H)
    a = C * math.cos(h_rad)
    b = C * math.sin(h_rad)
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = +4.0767434721 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
    g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
    b_ = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_

    def gamma(x: float) -> float:
        x = max(0.0, min(1.0, x))
        return x * 12.92 if x <= 0.0031308 else 1.055 * (x ** (1 / 2.4)) - 0.055

    return gamma(r), gamma(g), gamma(b_)


def css_token(name: str) -> tuple[str, str]:
    """(light, dark) color for a `--name: light-dark(a, b)` or `--name: val` token in the theme."""
    src = read(THEME_CSS)
    m = re.search(rf"--{re.escape(name)}:\s*(?:light-dark\((.*?)\)|([^;]+));$", src, re.M)
    assert m, f"token --{name} not in legalos.css"
    if m.group(1) is not None:
        inner = m.group(1)
        depth, cut = 0, None
        for i, ch in enumerate(inner):
            depth += ch == "("
            depth -= ch == ")"
            if ch == "," and depth == 0:
                cut = i
                break
        assert cut is not None, inner
        light, dark = inner[:cut].strip(), inner[cut + 1 :].strip()
    else:
        val = m.group(2).strip()
        light, dark = val, val

    if light.startswith("var(--"):
        target = re.search(r"var\(--([a-zA-Z0-9_-]+)\)", light).group(1)
        light = css_token(target)[0]
    if dark.startswith("var(--"):
        target = re.search(r"var\(--([a-zA-Z0-9_-]+)\)", dark).group(1)
        dark = css_token(target)[1]
    return light, dark


# --- colour arithmetic (WCAG 2.x) -------------------------------------------

def parse_color(value: str) -> tuple[float, float, float, float]:
    """#RRGGBB, #RRGGBBAA, or oklch(...) -> (r, g, b, a) in 0..1."""
    v = value.strip()
    if v.startswith("#"):
        v = v.lstrip("#")
        assert len(v) in (6, 8), f"not a hex colour: {value}"
        r, g, b = (int(v[i : i + 2], 16) / 255 for i in (0, 2, 4))
        a = int(v[6:8], 16) / 255 if len(v) == 8 else 1.0
        return r, g, b, a
    m = re.match(r"oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*/\s*([\d.]+))?\s*\)", v)
    if m:
        L, C, H = float(m.group(1)), float(m.group(2)), float(m.group(3))
        a = float(m.group(4)) if m.group(4) else 1.0
        r, g, b = oklch_to_rgb(L, C, H)
        return r, g, b, a
    raise AssertionError(f"not a recognized colour format: {value}")


def parse_hex(value: str) -> tuple[float, float, float, float]:
    return parse_color(value)


def composite(fg: str, bg: tuple[float, float, float]) -> tuple[float, float, float]:
    """Alpha-blend a possibly translucent hex over an opaque rgb."""
    r, g, b, a = parse_hex(fg)
    return tuple(c * a + d * (1 - a) for c, d in zip((r, g, b), bg))  # type: ignore[return-value]


def luminance(rgb: tuple[float, float, float]) -> float:
    def lin(c: float) -> float:
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def surfaces() -> dict[str, tuple[float, float, float]]:
    """The card surface a badge sits on, light and dark."""
    light, dark = css_token("color-background-card")
    return {"light": composite(light, (1, 1, 1)), "dark": composite(dark, (0, 0, 0))}


def badge_contrast(hue: str, mode: str) -> float:
    """Text-on-tint contrast for a palette hue, as Badge draws it."""
    idx = 0 if mode == "light" else 1
    surface = surfaces()[mode]
    bg_token = css_token(f"color-background-{hue}")[idx]
    if bg_token.startswith("var("):
        # gray's dark tint delegates to --color-neutral.
        inner = re.search(r"var\(--([a-z-]+)\)", bg_token).group(1)
        bg_token = css_token(inner)[idx]
    bg = composite(bg_token, surface)
    fg = composite(css_token(f"color-text-{hue}")[idx], bg)
    return contrast(fg, bg)


# --- the table ---------------------------------------------------------------

def test_every_creatable_matter_type_has_a_hue_and_a_glyph():
    marks = matter_type_marks()
    missing = [t for t in creatable_matter_types() if t not in marks]
    assert not missing, f"types without a mark: {missing}"
    assert len(creatable_matter_types()) == 14, "the spec's fourteen types"
    assert "legacy_litigation" in marks, "the read-only legacy marker still needs a look"


def test_no_two_matter_types_share_both_hue_and_glyph():
    marks = matter_type_marks()
    seen: dict[tuple[str, str], str] = {}
    for t, pair in marks.items():
        assert pair not in seen, f"{t} and {seen[pair]} are both {pair}"
        seen[pair] = t


def test_glyphs_are_unique_across_matter_types():
    """Stronger than the pair rule: the glyph is what survives a greyscale
    print, so no two types may share one even on different hues."""
    icons = [icon for _, icon in matter_type_marks().values()]
    dupes = {i for i in icons if icons.count(i) > 1}
    assert not dupes, f"glyph reused across types: {dupes}"


def test_adjacent_types_in_the_picker_do_not_share_a_hue():
    marks = matter_type_marks()
    order = creatable_matter_types()
    for a, b in zip(order, order[1:]):
        assert marks[a][0] != marks[b][0], f"{a} and {b} sit together and are both {marks[a][0]}"


def test_hues_come_from_the_palette_and_never_the_reserved_one():
    hues = {hue for hue, _ in matter_type_marks().values()}
    assert hues <= PALETTE_HUES, f"unknown hue(s): {hues - PALETTE_HUES}"
    assert not (hues & RESERVED_HUES), "purple is reserved for AI-surfaced UI"


def test_every_state_mark_carries_a_glyph():
    for name, expected in (
        ("MATTER_STATUS_MARK", {"active", "on_hold", "closed"}),
        ("INVOICE_STATUS_MARK", {"draft", "sent", "paid", "overdue"}),
        ("PROXIMITY_MARK", {"this_week", "today", "overdue"}),
    ):
        marks = state_marks(name)
        assert set(marks) == expected, f"{name} covers {set(marks)}, expected {expected}"
        for key, (tone, icon) in marks.items():
            assert tone in {"neutral", "info", "success", "warning", "error"}, (name, key, tone)
            assert icon.endswith("Icon"), (name, key, icon)


def test_proximity_gradient_escalates_in_order():
    """this week < today < overdue: the tones must climb with the band."""
    severity = {"neutral": 0, "info": 1, "success": 1, "warning": 2, "error": 3}
    marks = state_marks("PROXIMITY_MARK")
    order = ["this_week", "today", "overdue"]
    tones = [severity[marks[b][0]] for b in order]
    assert tones == sorted(tones) and len(set(tones)) == 3, dict(zip(order, tones))


def test_invoice_states_escalate_and_overdue_is_the_loudest():
    marks = state_marks("INVOICE_STATUS_MARK")
    assert marks["draft"][0] == "neutral"
    assert marks["paid"][0] == "success"
    assert marks["overdue"][0] == "error"


def test_active_is_the_emphasised_matter_status():
    src = read(TABLE)
    body = re.search(r"export const MATTER_STATUS_MARK[^=]*= \{(.*?)\n\};", src, re.S).group(1)
    emphasised = re.findall(r"^\s*([a-z_]+): \{[^}]*isEmphasized: true", body, re.M)
    assert emphasised == ["active"], emphasised


# --- no hand-written colours -------------------------------------------------

HEX_OR_RGB = re.compile(r"#[0-9a-fA-F]{6}\b|rgba?\(")


@pytest.mark.parametrize("path", NEW_FILES, ids=lambda p: p.name)
def test_new_code_has_no_hand_written_colour(path: Path):
    hits = [
        (n, line.strip())
        for n, line in enumerate(read(path).splitlines(), 1)
        if HEX_OR_RGB.search(line)
    ]
    assert not hits, hits


# --- WCAG AA on the theme's own tokens, both modes ----------------------------

@pytest.mark.parametrize("mode", ["light", "dark"])
@pytest.mark.parametrize("hue", sorted(PALETTE_HUES))
def test_palette_hue_clears_aa_on_its_tint(hue: str, mode: str):
    ratio = badge_contrast(hue, mode)
    assert ratio >= 4.5, f"{hue} in {mode}: {ratio:.2f}:1"


@pytest.mark.parametrize("mode", ["light", "dark"])
def test_neutral_badge_clears_aa(mode: str):
    """The neutral tone is themed as muted background + secondary text
    (lib/theme.ts), which the palette check above does not cover."""
    idx = 0 if mode == "light" else 1
    surface = surfaces()[mode]
    bg = composite(css_token("color-background-muted")[idx], surface)
    fg = composite(css_token("color-text-secondary")[idx], bg)
    ratio = contrast(fg, bg)
    assert ratio >= 4.5, f"neutral in {mode}: {ratio:.2f}:1"


# --- one source of truth on the screens --------------------------------------

TYPE_SCREENS = [
    "app/matters/page.tsx",
    "app/matters/[id]/page.tsx",
    "components/matter/DashboardTab.tsx",
    "app/clients/[id]/page.tsx",
    "app/documents/page.tsx",
]
INVOICE_SCREENS = [
    "app/billing/page.tsx",
    "app/billing/[id]/page.tsx",
    "components/matter/FinanceTabs.tsx",
    "app/clients/[id]/page.tsx",
]
PROXIMITY_SCREENS = [
    "app/hearings/page.tsx",
    "app/dashboard/page.tsx",
    "app/calendar/page.tsx",
    "components/matter/CalendarTab.tsx",
]


@pytest.mark.parametrize("rel", TYPE_SCREENS)
def test_screens_that_show_a_type_use_the_shared_mark(rel: str):
    src = read(WEB / rel)
    assert re.search(r"MatterType(Badge|Icon)", src), f"{rel} does not render the shared type mark"


def test_no_screen_prints_a_type_name_without_its_mark():
    """A bare `enumLabel(x.matter_type)` is allowed only next to the shared
    glyph (the client card prints the name in the row text beside the icon);
    on its own it is the grey, undistinguished type the ticket replaces."""
    offenders = []
    for path in list((WEB / "app").rglob("*.tsx")) + list((WEB / "components").rglob("*.tsx")):
        src = read(path)
        if "enumLabel(matter.matter_type)" in src and not re.search(r"MatterType(Badge|Icon)", src):
            offenders.append(str(path.relative_to(WEB)))
    assert not offenders, offenders


@pytest.mark.parametrize("rel", INVOICE_SCREENS)
def test_screens_that_show_an_invoice_state_use_the_shared_mark(rel: str):
    assert "InvoiceStatusMark" in read(WEB / rel), rel


@pytest.mark.parametrize("rel", PROXIMITY_SCREENS)
def test_screens_that_show_a_date_use_the_shared_band(rel: str):
    assert "ProximityBadge" in read(WEB / rel), rel


def test_no_local_status_variant_maps_survive():
    """A `STATUS_VARIANT`/`INVOICE_VARIANT` map per page is exactly the second
    source of truth the table replaces."""
    offenders = []
    for path in list((WEB / "app").rglob("*.tsx")) + list((WEB / "components").rglob("*.tsx")):
        src = read(path)
        if re.search(r'Record<(MatterStatus|InvoiceStatus),\s*"', src):
            offenders.append(str(path.relative_to(WEB)))
    assert not offenders, offenders


def test_the_components_never_render_colour_without_a_glyph_and_a_label():
    src = read(COMPONENTS)
    badges = re.findall(r"<Badge\b(.*?)\n\s*/>", src, re.S)
    assert badges, "no Badge in the components"
    for props in badges:
        assert "icon=" in props and "label=" in props, props
    dots = re.findall(r"<StatusDot\b(.*?)/>", src, re.S)
    assert dots
    for props in dots:
        assert "label=" in props, props


# --- catalog and motion ------------------------------------------------------

def test_every_key_the_components_use_exists_in_both_locales():
    keys = set(re.findall(r'"(@legalos\.distinction\.[a-zA-Z.]+)"', read(TABLE) + read(COMPONENTS)))
    for rel in TYPE_SCREENS + PROXIMITY_SCREENS + ["app/tasks/page.tsx"]:
        keys |= set(re.findall(r'"(@legalos\.distinction\.[a-zA-Z.]+)"', read(WEB / rel)))
    assert keys, "no distinction keys referenced"
    catalog = read(CATALOG)
    en = catalog[: catalog.index("export const ar")]
    ar = catalog[catalog.index("export const ar") :]
    for key in sorted(keys):
        assert f'"{key}"' in en, f"{key} missing from en"
        assert f'"{key}"' in ar, f"{key} missing from ar"
    assert "distinction" in read(WEB / "lib" / "i18n" / "messages.ts")


def test_motion_honours_reduced_motion():
    css = read(GLOBALS_CSS)
    block = re.search(r"@media \(prefers-reduced-motion: reduce\) \{(.*?)\n\}", css, re.S)
    assert block, "no prefers-reduced-motion rule"
    assert "animation-duration" in block.group(1) and "transition-duration" in block.group(1)


# --- empty states say what goes here ------------------------------------------

MAIN_SCREENS = [
    "app/matters/page.tsx",
    "app/clients/page.tsx",
    "app/documents/page.tsx",
    "app/billing/page.tsx",
    "app/hearings/page.tsx",
    "app/tasks/page.tsx",
    "app/calendar/page.tsx",
    "app/dashboard/page.tsx",
]


@pytest.mark.parametrize("rel", MAIN_SCREENS)
def test_main_screen_empty_state_has_a_picture_and_a_line(rel: str):
    src = read(WEB / rel)
    states = re.findall(r"<EmptyState\b(.*?)\n\s*/>", src, re.S)
    assert states, f"{rel} renders no EmptyState"
    for props in states:
        assert "icon=" in props, f"{rel}: an EmptyState without a picture:\n{props}"
        assert "description=" in props, f"{rel}: an EmptyState without a line:\n{props}"
