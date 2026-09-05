---
name: Al-Sijil Marketing
description: Marketing landing page for Al-Sijil (السِّجل) — the unified operating system for law firms, sharing the single source of truth design tokens derived from web/lib/theme.ts.
colors:
  bg: "oklch(0.963 0.005 265)"
  surface: "#ffffff"
  surface2: "oklch(0.978 0.004 265)"
  surface3: "oklch(0.952 0.007 265)"
  border: "oklch(0.902 0.008 265)"
  border2: "oklch(0.84 0.012 265)"
  text: "oklch(0.245 0.022 265)"
  text2: "oklch(0.5 0.02 265)"
  text3: "oklch(0.635 0.016 265)"
  primary: "oklch(0.45 0.11 265)"
  primary-h: "oklch(0.38 0.11 265)"
  primary-fg: "#ffffff"
  primary-soft: "oklch(0.952 0.028 265)"
  accent: "oklch(0.66 0.11 76)"
  accent-fg: "#ffffff"
  accent-soft: "oklch(0.955 0.04 82)"
  success: "oklch(0.53 0.12 155)"
  success-soft: "oklch(0.955 0.045 155)"
  warn: "oklch(0.63 0.13 68)"
  warn-soft: "oklch(0.958 0.055 78)"
  danger: "oklch(0.54 0.17 25)"
  danger-soft: "oklch(0.953 0.045 25)"
  info: "oklch(0.54 0.12 242)"
  info-soft: "oklch(0.952 0.04 242)"
typography:
  display:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.65rem, 6.6vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.1rem, 4.2vw, 3.6rem)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.015em"
  title:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.5rem, 2.4vw, 2.1rem)"
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: "-0.012em"
  lede:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.05rem, 1.35vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  aside:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.14rem"
    fontStyle: "italic"
    fontWeight: 300
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.16em"
  statute:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.08em"
    fontWeight: 400
    lineHeight: 2
  arabic-ui:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.06em"
    fontWeight: 500
  statement:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.6rem, 3.35vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.24
    letterSpacing: "-0.015em"
  stat:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(3rem, 7vw, 5.4rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.018em"
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  r: "14px"
  rs: "10px"
  pill: "9999px"
  panel: "14px"
  card: "14px"
spacing:
  section: "clamp(6rem, 11vw, 11rem)"
  section-tight: "clamp(4rem, 7vw, 7rem)"
  pane-pad: "clamp(1.5rem, 2.6vw, 2.4rem)"
  shell: "1200px"
  shell-wide: "1400px"
  shell-pad: "clamp(1.25rem, 4vw, 2.75rem)"
  nav-h: "76px"
components:
  button-solid:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-fg}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  pane:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.r}"
    padding: "{spacing.pane-pad}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text2}"
    rounded: "{rounded.pill}"
    padding: "0.42rem 0.9rem 0.42rem 0.75rem"
  cite-badge:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "4px"
    padding: "0.16rem 0.5rem 0.16rem 0.4rem"
---

# Design System: Al-Sijil Marketing (هوية السِّجل)

## 1. Single Source of Truth (مصدر الحقيقة الموحَّد)

The marketing surface and application app share a single, unified visual identity: **Al-Sijil (السِّجل)**.
To eliminate visual divergence between the landing site and the app, all design tokens are anchored in `web/lib/theme.ts` and generated automatically into:

```text
marketing/assets/css/sijil-tokens.css
```

Generated via `python marketing/scripts/build-tokens.py`.
`marketing/assets/css/tokens.css` imports this token sheet directly via `@import "./sijil-tokens.css";` and maps section layout primitives and semantic aliases onto it.

Both public visitors and signed-in users experience the exact same typography, palette, corner radiuses, and brand mark without visual jarring or dissonance.

---

## 2. Palette & Color Roles (لوحة الألوان)

All chromatic values are defined in modern, wide-gamut `oklch` color spaces, providing perceptual uniformity across lightness and chroma steps.

### Light Ground & Surfaces
- **Background (`--bg`):** `oklch(0.963 0.005 265)` — a serene, luminous ground with a subtle violet tint.
- **Surface (`--surface`):** `#ffffff` — clean white card and pane surface.
- **Surface 2 (`--surface2`):** `oklch(0.978 0.004 265)` — subtle raised elements.
- **Surface 3 (`--surface3`):** `oklch(0.952 0.007 265)` — recessed containers, search bars, inputs.

### Borders & Hairlines
- **Hairline (`--border`):** `oklch(0.902 0.008 265)` — subtle boundary.
- **Hairline Strong (`--border2`):** `oklch(0.84 0.012 265)` — active borders, input borders, interactive hover states.

### Text Hierarchy
- **Primary Text (`--text`):** `oklch(0.245 0.022 265)` — deep legible contrast (>14:1).
- **Secondary Text (`--text2`):** `oklch(0.5 0.02 265)` — supportive copy, ledes, metadata (>5.5:1).
- **Tertiary Text (`--text3`):** `oklch(0.635 0.016 265)` — labels, date labels, disabled hints (>4.5:1).

### Brand & Accents
- **Primary Brand (`--primary`):** `oklch(0.45 0.11 265)` — rich violet brand tone for primary actions and key highlights.
  - Hover: `oklch(0.38 0.11 265)`.
  - Foreground: `#ffffff`.
  - Soft background: `oklch(0.952 0.028 265)`.
- **Warm Accent (`--accent`):** `oklch(0.66 0.11 76)` — warm amber gold used purposefully for statutory verification, citations, and featured cards.
  - Soft background: `oklch(0.955 0.04 82)`.

### Semantic Statuses
- **Success (`--success`):** `oklch(0.53 0.12 155)` — paid, cleared, reconciled, approved.
- **Warning (`--warn`):** `oklch(0.63 0.13 68)` — upcoming deadline, review pending.
- **Danger / Risk (`--danger`):** `oklch(0.54 0.17 25)` — overdue, risk flag, compliance hazard.
- **Info (`--info`):** `oklch(0.54 0.12 242)` — neutral notice, system advisory.

---

## 3. Typography (التايبوغرافي)

The typography is unified under **IBM Plex Sans Arabic** for all languages and contexts, paired with **Material Symbols Rounded** for vector iconography.

### Font Family
- Primary: `'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif`
- Icon: `'Material Symbols Rounded'`

### Weights & Files
All fonts are hosted locally in `marketing/assets/fonts/` (no external CDNs):
- `IBMPlexSansArabic-300.woff2` (Light / Italic voice)
- `IBMPlexSansArabic-400.woff2` (Regular text & body — preloaded)
- `IBMPlexSansArabic-500.woff2` (Medium UI text)
- `IBMPlexSansArabic-600.woff2` (SemiBold titles & headings — preloaded)
- `IBMPlexSansArabic-700.woff2` (Bold display numbers & eyebrows)
- `MaterialSymbolsRounded.woff2` (Icon glyph font)

### Scale & Hierarchy
- **Hero Display:** `clamp(2.65rem, 6.6vw, 5.5rem)`, line-height `1.03`, letter-spacing `-0.015em`.
- **Section Heading:** `clamp(2.1rem, 4.2vw, 3.6rem)`, line-height `1.06`.
- **Subheading / Card Title:** `clamp(1.5rem, 2.4vw, 2.1rem)`, line-height `1.16`.
- **Lede Copy:** `clamp(1.05rem, 1.35vw, 1.2rem)`, line-height `1.65`.
- **Body:** `1rem`, line-height `1.6`.
- **Eyebrow / Label:** `0.7rem`, uppercase, letter-spacing `0.16em`, weight `700`.
- **Stat Value:** `clamp(3rem, 7vw, 5.4rem)`, tabular numbers.

---

## 4. Geometry & Radii (الزوايا والأشكال)

The geometric language of Al-Sijil is gentle and modern, matching the 14px radius foundation of the product app:
- **`--r` (`14px`):** default radius for cards, containers, dialogue panels, and `.ui` frames.
- **`--rs` (`max(4px, calc(var(--r) - 4px))` = `10px`):** secondary radius for chips, tags, inputs, and small tiles.
- **`--r-pill` (`9999px`):** buttons, status pills, and toggle bars.

---

## 5. Elevation & Shadows (الظلال والعمق)

Clean layered depth with soft ambient occlusion:
- **`--shadow`:** `0 1px 2px rgba(18, 22, 34, 0.05), 0 10px 26px -14px rgba(18, 22, 34, 0.16)`
- **`--shadow-lg`:** `0 2px 6px rgba(18, 22, 34, 0.06), 0 24px 60px -20px rgba(18, 22, 34, 0.28)`

---

## 6. Layout & Responsive Rhythm (البنية والتجاوب)

- **Section Spacing:** `--gap-section: clamp(6rem, 11vw, 11rem)`.
- **Shell Width:** `--shell: 1200px`, `--shell-wide: 1400px`.
- **Shell Padding:** `--shell-pad: clamp(1.25rem, 4vw, 2.75rem)`.
- **Nav Height:** `--nav-h: 76px` (`66px` below 680px).
- **Responsive Breakpoints:** 1180px, 980px, 900px (tabs to accordion), 860px (mobile drawer), 680px, 540px, 420px.

---

## 7. Motion & Curves (الحركة)

- **Primary Ease:** `--ease: cubic-bezier(0.16, 1, 0.3, 1)` (exponential ease-out).
- **Soft Ease:** `--ease-soft: cubic-bezier(0.33, 0.9, 0.35, 1)`.
- **Reduced Motion:** When `prefers-reduced-motion: reduce` is active, animations clamp to 0.001ms, reveals are instantly visible, and infinite loops are paused.

---

## 8. Brand Mark & Outlined Artwork (العلامة والشعار)

The Al-Sijil wordmark and logo mark are rendered from outlined SVG vector artwork directly matching `web/lib/brand/marks.ts`:
- Wordmark: "Al-Sijil" (السِّجل) accompanied by "Law Firm Management" (إدارة مكاتب المحاماة).
- Mark icon: scale of justice / judicial gavel vector geometry with responsive scaling.

---

## 9. Key Rules (القواعد الصارمة)

1. **Single Source of Truth:** Never hardcode new palettes or typography overrides in CSS. Always update or regenerate tokens from `web/lib/theme.ts`.
2. **Purposed Accents:** Accents are reserved for statutory verification, citations (`.cite`), and authoritative proof points.
3. **No External Fonts or Assets:** All fonts, icons, and stylesheets are self-hosted with zero external network dependencies.
4. **Logical Properties:** All layout styling uses CSS logical properties (`margin-inline`, `padding-inline`, `inset-inline`) to support seamless LTR and RTL rendering without duplicate code.
