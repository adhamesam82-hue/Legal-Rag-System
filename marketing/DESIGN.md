---
name: alsigil Marketing
description: Source-backed landing page for alsigil — paper, ink and a single seal that marks only what resolves to law.
colors:
  paper: "#F6F3EE"
  paper-deep: "#E9E5DE"
  paper-lit: "#FFFFFF"
  ground: "#F6F3EE"
  ground-deep: "#E9E5DE"
  surface-1: "rgba(255, 255, 255, 0.58)"
  surface-2: "rgba(255, 255, 255, 0.82)"
  surface-3: "#FFFFFF"
  hairline: "rgba(18, 22, 28, 0.12)"
  hairline-strong: "rgba(18, 22, 28, 0.2)"
  hairline-bright: "rgba(18, 22, 28, 0.34)"
  seal: "#A6301F"
  seal-deep: "#7E2417"
  seal-wash: "rgba(166, 48, 31, 0.09)"
  seal-line: "rgba(166, 48, 31, 0.34)"
  ok: "#1F6F4A"
  warn: "#8A5F0B"
  risk: "#A6301F"
  ink: "#12161C"
  ink-2: "#565D66"
  ink-3: "#656B72"
  # The Reversed plate. Only .cta wears these, by re-scoping the tokens above.
  rev-ground: "#12161C"
  rev-ground-lit: "#1D222B"
  rev-ground-deep: "#0B0E13"
  rev-ink: "#F6F3EE"
  rev-seal-deep: "#E4785F"
  # Product-surface avatars, one per fee earner, deliberately low-chroma
  av-1-bg: "#E6E1D8"
  av-1-ink: "#5A6068"
  av-2-bg: "#EADFDA"
  av-2-ink: "#6E5A54"
  av-3-bg: "#DDE5E3"
  av-3-ink: "#4C625F"
  # Insight thumbnail grounds, category-tinted paper stocks
  thumb-compliance: "#F1ECE3"
  thumb-ai: "#F2EAE6"
  thumb-ops: "#E9EFEB"
  thumb-funds: "#EFEDE6"
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
  # One-off fluid display roles. Each is bespoke because it is the only thing
  # of its kind on the page and its endpoints are set by the composition it
  # sits in, not by a shared step.
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
  stat-callout:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.6rem, 4vw, 3.5rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.018em"
  headline-narrow:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.9rem, 3vw, 2.7rem)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.015em"
  # The watermark is outlined artwork, not type. Kept as a role so the scale
  # is documented; there is no font involved.
  watermark:
    fontFamily: "outlined SVG — web/lib/brand/marks.ts"
    fontSize: "106% of the footer width"
  surface-hero:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(0.62rem, 0.82vw, 0.82rem)"
    fontWeight: 400
  # Sub-display ramp: card headings, pull-quotes, the mobile drawer, and the
  # Arabic on the testimonial nameplate.
  card-title:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 400
    letterSpacing: "-0.014em"
  quote:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.16rem"
    fontWeight: 400
    letterSpacing: "-0.012em"
  dialog-title:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 400
    letterSpacing: "-0.014em"
  drawer-link:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    letterSpacing: "-0.015em"
  plate-arabic:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "1.75rem"
    lineHeight: 1.5
  # Working UI ramp. Chrome, controls, table furniture and the .ui product
  # surfaces sit on this.
  ui-lg:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 600
  ui:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 600
  ui-sm:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 600
  ui-xs:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 600
  micro:
    fontFamily: "IBM Plex Sans Arabic, system-ui, -apple-system, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 800
    letterSpacing: "0.15em"
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  # A printed identity has no round corners. Page radii are 2-5px; the .ui
  # product surfaces keep softer ones because they are a screenshot of a
  # different design system, not part of this one.
  chip: "2px"
  tag: "5px"
  control: "7px"
  panel: "9px"
  surface: "12px"
  frame: "14px"
  sm: "2px"
  md: "2px"
  lg: "3px"
  xl: "4px"
  2xl: "5px"
  pill: "2px"
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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  button-solid-hover:
    backgroundColor: "#000000"
    textColor: "{colors.paper}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  button-ghost-hover:
    backgroundColor: "rgba(18,22,28,0.04)"
  button-seal:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.paper-lit}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  button-lg:
    padding: "1.1rem 2rem"
  button-sm:
    padding: "0.62rem 1.15rem"
  pane:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.pane-pad}"
  chip:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0.42rem 0.9rem 0.42rem 0.75rem"
  cite-seal:
    backgroundColor: "{colors.seal-wash}"
    textColor: "{colors.seal-deep}"
    rounded: "3px"
    padding: "0.16rem 0.5rem 0.16rem 0.4rem"
  tab:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    padding: "0.66rem 1.15rem"
  tab-selected:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  input-email:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.9rem 1.1rem"
  ui-surface:
    backgroundColor: "linear-gradient(178deg, #FFFFFF 0%, #FBF9F6 62%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.frame}"
    typography: "{typography.body}"
  nav-link:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 0.9rem"
---

# Design System: alsigil Marketing

**Scope: `marketing/` only.** This file sits beside `index.html` rather than at the
repository root because the root belongs to a different surface. The product app at `web/`
is built on the Astryx design system: Arabic-first and RTL by default, with an emerald
accent for functional UI (see `PRODUCT.md` → Brand Commitments and `web/lib/theme.ts`).
The page documented here is a separate deployable surface — public, LTR, with its own
faces and its own component family. A root-level `DESIGN.md` carrying these tokens would
misdescribe the app to the next agent that opens it. Nothing below applies outside
`marketing/`.

**The two surfaces now share a brand and not a palette.** Both wear the alsigil identity
("The Stamp"): the same outlined mark, the same Ink / Seal / Paper. But Seal is the mark's
colour and the citation colour in both, while the *functional* accent differs — this page
spends Ink on its primary action, and the app keeps emerald for buttons and verified marks
so red stays available for the destructive actions a legal product needs. The mark travels;
the accent role does not.

**Migrated from the dark build, 2026-08-05.** Everything below describes the paper build.
Where a rule reads as a correction of something, the thing it corrects is the previous
violet-and-brass system on a `#08090B` ground; those notes are kept because the reasoning
survives the repaint.

Everything is captured from the built code: `assets/css/tokens.css`,
`assets/css/sections.css`, `assets/js/site.js`, `index.html`. Where the build and the
direction contract at the top of `<body>` disagree, the build is recorded as the truth.

### Where the build diverges from the direction contract

| Contract says | Build does | Note |
|---|---|---|
| Seal worn by "attestation marks" | The three security badges (`.sec-badge-mark`) are neutral (`--ink-2`, `--surface-3` fill). No seal. | Correct per the colour rule — a badge asserting an *in-progress* attestation does not resolve to a source. `README.md` is stale on this line. |
| "full-bleed ambient product loop" in the first viewport | `.amb` is pinned to `left: 30%`, `height: min(100svh, 980px)`, and radially masked away from the headline column. | Deliberate, and commented in place. Full-bleed is reserved for a real film. |
| "lede at 62ch" | `.lede` is 62ch, but `.hero-lede` overrides to `56ch`. | Hero lede is narrower than the page default. |
| `sections.css` header: "six sections render one" `.ui` | Ten `.ui` instances across **five** sections (hero 1, platform overview 3, features 4, solutions 1, showcase 1). | Stale comment, not a design change. |
| Seal "spent only where something resolves to a source" | One leak: the first insights thumbnail (`.ins-thumb--1`) draws a seal check-in-circle in decorative SVG. | The only decorative seal on the page. Either read it as a compliance seal or recolour it; do not treat it as licence for more. |

`--paper-lit` and `--r-2xl` survive the migration mostly as range rather than as heavy
use. The seal tokens (`--seal-wash`, `--seal-line`) are restated as literal `rgba()` in the
few gradients that need the channels for an alpha stop; that is deliberate, not drift.

## Overview

**Creative North Star: "The Sealed Instrument"**

A legal instrument is a document that carries its own proof — a seal, an article number, a
signature that resolves to an authority. The page is built as one, and since the alsigil
migration it is built as one *literally*: Paper stock, Ink type, sheets of white held by a
hairline and a contact shadow, and a single Seal mark that appears only where something on
screen can be traced back to Egyptian statute. Nothing decorative is allowed to wear the
seal. That restriction is the whole design; every other decision exists to keep it legible.

The dark build reached for the same idea through atmosphere — a near-black room with violet
weather in it. The paper build reaches it through the material itself, which is the shorter
route: the page now looks like the thing it is describing.

The density is editorial, not brochure. Sections breathe at `clamp(6rem, 11vw, 11rem)`,
copy is capped at 46rem for headings and 62–68ch for prose, and the visual weight lives in
the product surfaces rather than in decoration. There is no stock photography, no icon-tile
feature grid, and no raster screenshot anywhere on the page — every product screen is real
markup. Colour is spent sparingly against a monochrome ground: Ink is structure, action and
system state, Seal is verification, and green/amber appear only inside product surfaces
where they carry data meaning. Risk is Seal too — in this product the thing that is running
out and the thing that has been attested are the same red, which is how the identity sheet
paints its own "next deadline" figure.

Motion is one authored idea repeated: a citation resolving. The hero's ambient loop draws an
Arabic clause, underlines it in seal, then lands the article reference beneath it; the
document panels hold the same moment statically. Everything else is arrival, not
performance — a single fade-up on one easing curve, and a nav that condenses without
animating layout.

**Key Characteristics:**
- Paper ground (`#F6F3EE`) in three steps, with raised surfaces as white rather than as separate tinted hexes
- Ruled *fields*: 32px graph-paper grids masked behind whole sections, plus one blurred Seal flush per page third. A light page cannot glow, so the atmosphere is drawn rather than lit
- Seal as a functional, earned accent — never an eyebrow, tick, or icon tile
- Square corners (2–5px). A filing has none, and the identity is a printed one
- One outlined mark, shared byte-for-byte with the product app — artwork, not type
- Five self-hosted faces (~172 KB), Arabic among them as product data rather than as a fallback
- Real markup product screenshots that scale from one `font-size`, drawn light because the product is
- One pane recipe, one motion curve, one grain overlay
- Exactly one dark surface on the page: the final CTA, which is the identity's Reversed plate
- Content visible without JavaScript; every enhancement is additive

## Colors

Three colours and nothing else: the alsigil identity's Ink, Seal and Paper. The dark build
ran two coloured atmospheres — a cold navy→violet weather system and a warm brass mark;
both are gone. What replaced the atmosphere is not another colour but a drawn one: ruled
grids.

### Primary

- **Seal** (`#A6301F`): the functional accent, and the mark's own colour. Worn by exactly six things in the built page: the citation seal (`.cite`, at `--seal-wash` fill / `--seal-line` border with `--seal-deep` text), the clause an AI finding is anchored to (`.ui-clause mark`, seal-wash fill with a solid inset underline), the ambient loop's resolving-clause underline and its citation chip, the three verifiable proof points under the hero (`.hero-proof .ico`), the risk state inside product surfaces, and the punch in the mark — the documented single brand exception. **History, because it is the rationale:** an earlier pass put the accent on every eyebrow, tick and icon tile. Nine quiet labels in the accent colour cost the citation seal its meaning, and it was pulled back to source-backed material only. The comment above `.eyebrow` in `tokens.css` records this.
- **Seal Deep** (`#7E2417`): text and glyph colour *inside* seal-tinted containers, where flat Seal sits too light against Paper. Inside the Reversed CTA plate `--seal-deep` is re-pointed to `#E4785F`, because the same relationship inverts.

### Secondary

There is no secondary colour. **Ink** does the work violet used to do — primary action, system state, active rail item, progress fills, chart series, the current timeline node. Violet said *the software is doing something* against a black room; on Paper, ink saying it is both quieter and more accurate to a product about documents. Seal still says *the law says so*. Never swap them.

### Tertiary — status, product-surface only

- **Ledger Green** (`#1F6F4A`): reconciled, paid, cleared, approved. Also the chip dot.
- **Docket Amber** (`#8A5F0B`): due, pending review, written off.
- **Exposure** = `var(--seal)`: overdue, risk finding, blocked transfer. Distinguished from a citation by form, not hue — a citation is an outlined chip, a risk is a filled dot or bar.

These three never appear in page chrome — only inside `.ui` screens, `.ui-tag`, `.ui-find`, `.ui-guard`, and the newsletter's error/success line.

### Neutral

- **Paper** (`#F6F3EE`): the page. `theme-color` matches it.
- **Paper Deep** (`#E9E5DE`): behind the hero and under the footer, so both read as recessed relative to the sections between them.
- **Paper Lit** (`#FFFFFF`): a sheet lying on the page.
- **Surface 1 / 2 / 3** (white at 58% / 82% / 100%): every raised surface. Still overlays rather than tinted hexes, for the same reason as before — a pane crossing a ruled or seal-flushed region should pick it up rather than punch a flat hole in it. The alphas inverted along with the ground: on black a surface separates by being lighter, and on Paper the delta is small enough that the *edge* does most of the work.
- **Hairline / Strong / Bright** (ink at 12% / 20% / 34%): borders, dividers, and the eyebrow's 18px lead rule. `.rule` is a 1px gradient that fades to transparent at both ends.
- **Ink** (`#12161C`) primary text at 16.4:1, **Ink 2** (`#565D66`) secondary at 6.0:1 on Paper, **Ink 3** (`#656B72`) tertiary at 4.9:1 on Paper. All three are measured against `#F6F3EE`, not estimated, and the figures are recorded in `tokens.css`. `--ink-3` is the floor and is used for labels and metadata, never for body copy — but note it still has to clear **4.5:1**, not 3:1: the eyebrow sets it at `0.7rem/700`, which is 11px, well under the 18.66px-bold threshold for the large-text allowance. A first pass at this migration inverted the dark build's tertiary tint arithmetically and landed at 3.8:1; the eyebrow, the footer headings and every metadata line on the page failed AA until it was measured.

### Named Rules

**The Seal Rule.** Seal marks only material that resolves to a source. If a new element cannot be traced to an article of law or a verifiable figure, it is `--ink`, `--ink-2` or `--ink-3`. The audit test: count the seal elements in a viewport; if any of them is a decoration, a tick, an eyebrow or an icon tile, the rule is broken. Buttons are not an exception — `.btn--seal` exists once, for the single conversion point in the solutions hero.

**The Field Rule.** Fields are regions, never edges. `.field--grid` is a 32px ruled graph masked radially and sitting behind a whole section; `.field--seal` is the one blurred form that survives, at `blur(90px)` and 50% opacity. Do not use Seal as a 1px border, a divider or a small fill outside the product surfaces. **Why the grid replaced the glow:** a blurred coloured disc on Paper is a stain, not an atmosphere. The identity sheet's own device is a ruled ground, so the page borrowed it.

**The Overlay Rule.** New surfaces are white at alpha, not new tinted hexes. Anything that needs to sit over a field must be translucent or it will read as a patch.

**The One Dark Surface Rule.** The final CTA is the only ink block on the page, and it inverts by *re-scoping tokens* (`--ink`, `--paper`, `--surface-3`, the hairlines and `--seal-deep` are all redeclared on `.cta`) rather than by overriding each child. A second dark block would cost the first its force; if one is ever needed, it re-scopes the same way.

## Typography

**Primary Font:** IBM Plex Sans Arabic (with `system-ui, -apple-system, sans-serif`)
**Icon Font:** Material Symbols Rounded

**Character:** IBM Plex Sans Arabic carries all typography roles across Latin and Arabic scripts.
Self-hosted at weights 300, 400, 500, 600, 700 with `font-display: swap`.
Material Symbols Rounded carries icon glyphs.

All faces are self-hosted `woff2` with no external CDN requests.
`IBMPlexSansArabic-400.woff2` and `IBMPlexSansArabic-600.woff2` are `<link rel=preload>`ed.

### The mark is not type

The wordmark is outlined vector artwork at −5% tracking and shipped as path data, not set
as live text. It is the same artwork the product app ships (`web/lib/brand/marks.ts`,
generated by `web/scripts/brand/build-marks.py`), inlined here as SVG. Consequences worth
knowing before touching it: there is no font for it to fail to load, no `text-transform`
that can reach it, no tracking to re-tune, and the nav, the footer and the 19rem watermark
are all the same two paths at different scales. The punch's counter is knocked out
(`fill-rule: evenodd`) rather than painted, which is why the identical markup works on Paper
in the nav and on Ink inside the CTA.

### Hierarchy

- **Display / hero** (`.display--hero`, IBM Plex Sans Arabic 400, `clamp(2.65rem, 6.6vw, 5.5rem)`, 1.03, `-0.015em`, `text-wrap: balance`): the H1 only. Capped at `17ch` above 860px so it breaks into three lines by measure rather than by `<br>`.
- **Headline / section** (`.display--section`, IBM Plex Sans Arabic 400, `clamp(2.1rem, 4.2vw, 3.6rem)`, 1.06): every `<h2>`. The security section overrides down to `clamp(1.9rem, 3vw, 2.7rem)` because it lives inside a pane.
- **Title / sub** (`.display--sub`, IBM Plex Sans Arabic 400, `clamp(1.5rem, 2.4vw, 2.1rem)`, 1.16, `-0.012em`): panel and card `<h3>`.
- **Statement** (`.mission-statement`, IBM Plex Sans Arabic 400, `clamp(1.6rem, 3.35vw, 3rem)`, 1.24, max `24ch`, `--ink-2` with `.mission-hi` lifting the operative clause to `--ink`): the mission paragraph, the one place display type is used for a run of prose. The pull-quote (`.tm-quote p`) uses the same register; the feature quotes (`.feat-quote p`) use the **italic 300**, which is the identity's commentary voice.
- **Lede** (`.lede`, IBM Plex Sans Arabic, `clamp(1.05rem, 1.35vw, 1.2rem)`, 1.65, `--ink-2`, max `62ch`, `text-wrap: pretty`).
- **Body** (`.body-2`, IBM Plex Sans Arabic 400, 1rem, 1.65, `--ink-2`, max `68ch`).
- **Aside** (`.aside-italic`, IBM Plex Sans Arabic italic 300, `--ink-2`): the identity's editorial voice, for a line of commentary under a heading.
- **Label / eyebrow** (`.eyebrow`, IBM Plex Sans Arabic 700, `0.7rem`, `0.16em`, uppercase, `--ink-3`, with an 18×1px `--hairline-bright` lead rule): names the section's place in the product rather than restating the heading. Related label sizes: `.foot-h` and `.sol-tag` at `0.72rem`/`0.14–0.15em`, `.ins-cat` and `.tm-plate-role` at `0.68rem`/`0.15–0.18em`.
- **Numerals** (`.stat-v`, IBM Plex Sans Arabic 400, `clamp(3rem, 7vw, 5.4rem)`, `-0.018em`, `font-variant-numeric: tabular-nums`): the stats band. Counters ease up over 1500ms with `1 - 2^(-10t)` — the JS mirror of the CSS easing.
- **Code** (`.code`, `ui-monospace, "SF Mono", Menlo`, `0.78rem`, 1.75 on `rgba(18,22,28,0.04)`): the one API sample. Keywords `--seal-deep`, payload `--ink-3`.

### Named Rules

**The Isolate-Don't-Flip Rule.** `.ar` and `.ar-doc` carry `unicode-bidi: isolate` but deliberately **not** `direction: rtl`. The bidi algorithm already runs the Arabic right-to-left inside its own box; the box keeps the alignment of the row it sits in, so an Arabic matter title in an LTR table starts where its English subtitle starts. Surfaces that are genuinely right-to-left — the client portal, a document pane, an AI review pane, a citation seal — declare `dir="rtl"` on the *container* and inherit the real thing. Never put `direction: rtl` on the inline class.

**The Optical Size Rule.** Arabic set inline in English copy is scaled up and loosened: `.ar` at `1.06em`, `.ar-doc` at `1.08em` with `line-height: 2`. Do not normalise them to `1em`.

## Layout

**Shell.** `.shell` is `max-width: 1200px` with `padding-inline: clamp(1.25rem, 4vw, 2.75rem)`, centred. `.shell--wide` widens to `1400px` and is used for the nav, the hero mockup stage, the testimonial and the final CTA — the four places a surface should outgrow the reading column.

**Vertical rhythm.** One value: `--gap-section: clamp(6rem, 11vw, 11rem)` as `padding-block` on `.section`. `.section--tight` drops to `clamp(4rem, 7vw, 7rem)` for the six supporting sections (marquee, overview, testimonial, stats, security, case study). The marquee additionally pushes `padding-top: clamp(7rem, 12vw, 12rem)` to clear the hero mockup, which hangs `clamp(-9rem, -7vw, -3.5rem)` below the hero's own box.

**Grids.** Two-column section grids are always asymmetric and always `minmax(0, …)` so the product surface can shrink: overview `0.82fr / 1.18fr`, features `0.86fr / 1.14fr`, showcase `0.88fr / 1.12fr`, security `1.05fr / 0.95fr`, case study `1fr / 1.08fr`, solutions `1.28fr / 0.72fr` with the hero card spanning both rows. The testimonial is a three-track `15rem / 1fr / 15.5rem`.

**Scroll offset.** `html { scroll-padding-top: calc(var(--nav-h) + 24px) }` with `scroll-behavior: smooth`, disabled under reduced motion. `--nav-h` is `76px`, dropping to `66px` below 680px — the only token that changes at a breakpoint.

**The edge-bleeding rail.** The insights carousel escapes the shell while its first card still aligns with the section heading:
`padding-inline: max(var(--shell-pad), (100% - var(--shell)) / 2 + var(--shell-pad))`, with the same expression on `scroll-padding-inline-start`. Cards are `flex: 0 0 clamp(255px, 27vw, 330px)` with `scroll-snap-align: start`. The comment in place explains why: a gutter-width padding stands in for the shell instead of a max-width the flex track would fight.

### Breakpoints

| Width | What changes |
|---|---|
| **1180px** | Primary nav links hide; nav collapses to `auto 1fr`. Testimonial → `12rem / 1fr` with the stat card spanning full width as a horizontal row. Integration grid 8 → 6 columns. |
| **980px** | Every two-column section stacks: overview, showcase, security, case study, solutions. Footer top and footer legal go single-column, footer meta re-aligns to start. The report surface (`.ui-report`) stacks and its side column swaps its inline border for a top border. Case-study art moves above the copy (`order: -1`). |
| **900px** (JS) | Features tabs become an accordion. Not a media query in CSS — `site.js` reads `data-accordion-below="900"` off the `.feat` root and toggles `.is-acc`, because the swap also has to rewrite roles and `aria-*`. The CSS only styles the two modes. |
| **860px** | Sign-in link hides, burger appears. Hero H1 uncaps to 100%. Testimonial single-column. Integration cards single-column. Stats band stacks and its dividers rotate from vertical to horizontal. `.ui` interiors: the rail hides, `.ui-frame`, `.ui-split`, `.ui-review` and `.ui-docsplit` all collapse to one column, and the document list becomes a horizontal scroller of `11em` items. |
| **680px** | `--nav-h: 66px`. Hero CTAs go full-width; perspective and the mockup tilt are switched off entirely. **The ambient loop is removed** (`.amb { display: none }`) and the poster becomes the whole hero background. Integration grid → 4 columns. Footer columns → 2. `.ui` interiors reflow hardest here: KPIs and meta → 2 columns, matter rows become two-line, the ledger drops its balance column, avatars and the search field disappear, capture rows lose their icon. Marquee speeds to 34s. Insight cards go `80vw`. |
| **540px** | The overview tab bar goes full-width `space-between` and drops its icons — commented in place as cheaper than a scroller that would hide the third label behind a fade. |
| **420px** | Integration grid held at 4 columns; the pull-quote drops to a fixed `1.15rem`. |

### Progressive enhancement

Content is visible by default; script only ever adds. The chain, verified end to end:

1. `<head>` runs one inline statement: `document.documentElement.classList.add('js-boot')`.
2. `.js-boot [data-initial-hidden] { display: none }` hides the inactive tab panels for the window between first paint and init. The panels themselves ship **visible** in markup.
3. `site.js` wires both tablists (roving tabindex, arrow/Home/End keys, `hidden` on the inactive panels), then removes `js-boot` in the last line of `init()`.
4. A reader with no JS keeps every panel, stacked and readable.

The reveal animation works the same way: `[data-reveal]` is styled only under `.js-reveal`, which the script adds to `<html>` — and only when `IntersectionObserver` exists and reduced motion is not requested. A script failure leaves the page visible rather than blank. Elements already within 90% of the viewport height at load are revealed immediately in a `requestAnimationFrame` pass, so the first screen is never mid-animation.

## Elevation & Depth

Contact rather than glow, since the migration. Depth comes from three stacked mechanisms,
in order of importance: (1) hairline borders at three alphas, (2) a tight contact shadow
where a sheet meets the page plus a wide soft one under it, and (3) the small tonal step
between Paper and white. Flat panes at rest are still the norm; `.pane--lift` and
`.pane--action:hover` are the exceptions.

**What changed and why.** The dark build's depth was translucency over blurred colour
fields plus a lit top edge on glass — the right answer when the material is glass over
violet weather. The material here is paper on paper, where a white highlight along the top
of a white card is invisible. So the lit edge is gone, `backdrop-filter` is gone from the
pane recipe, and what separates two sheets is the edge and the shadow under it.

### Shadow Vocabulary

- **Lift** (`0 1px 2px rgba(18,22,28,0.06), 0 14px 30px -14px rgba(18,22,28,0.22)`): hover state for interactive panes, and any pane that needs to detach slightly at rest.
- **Deep** (`0 2px 5px rgba(18,22,28,0.07), 0 44px 80px -34px rgba(18,22,28,0.34)`): the product surfaces (`.ui`) and the lightbox frame. This is what makes a screenshot read as an object on the page rather than an inset panel. The dark build's near-opaque blacks would read as soot on Paper; these are the same two-part structure at a quarter of the density.
- **Solid-button seat** (`0 1px 2px rgba(18,22,28,0.18)`, hover adds `0 10px 22px -10px rgba(18,22,28,0.4)`): ink on paper, no bevel. There is no light source to bevel against.
- **Seal button** (`0 1px 2px rgba(126,36,23,0.3)` → `+ 0 12px 26px -12px rgba(126,36,23,0.5)` on hover): the one filled accent button.
- **Stage shadow** (not a glow): `.hero-stage-glow` keeps its name and its position but is now `rgba(18,22,28,0.3)` at `blur(46px)` — the shadow the tilted mockup casts on the page rather than the light it used to emit.

### Named Rules

**The Sheet Rule.** One pane recipe, everywhere: `1px solid var(--hairline)`, `background: var(--surface-3)`, radius `--r-xl` (4px). No blur, no `::before` ring. A sheet of white on Paper is separated by its edge and its shadow; adding a highlight to the top of it just makes it look like glass again.

**The Darker-Not-Denser Rule.** Interactive panes (`.pane--action`) hover by lifting `4px` and darkening the *border* (`--hairline` → `--hairline-strong`) plus adding the lift shadow. The fill never changes. The sheet reads as being picked up, not as changing colour.

**The Grain Rule.** A fixed full-page `.grain` overlay sits at `z-index: 1`, `opacity: 0.05`, `mix-blend-mode: multiply`, from an inline SVG `feTurbulence` (baseFrequency 0.85, 3 octaves, 140×140 tile). It began as banding insurance for large dark gradients; on Paper it is the tooth of the stock, and `multiply` rather than `overlay` is what makes it darken into the sheet instead of glowing off it. Never raise it above ~0.06, where it starts reading as noise.

## Shapes

A crisp-rectangular language. The stamp identity is a printed one — filings, letterhead, a
punch struck into paper — and none of that is round. The four-step scale and the pill are
kept so nothing downstream has to change, but every step is now an edge:

- **4px** (`--r-xl`) — the pane. Every `.pane`.
- **5px** (`--r-2xl`) — the final CTA panel, the largest single surface on the page.
- **3px** (`--r-lg`) — mid-size objects inside panes: the testimonial portrait, the stat card, the case-study art, security badges, the lightbox frame.
- **2px** (`--r-md`) — insight thumbnails, the code block.
- **2px** (`--r-pill`) — every control: buttons, chips, nav links, tabs, the newsletter input, the skip link. **The name is now a lie and is kept deliberately**: renaming it would touch forty call sites to say the same thing. Read it as "the control radius".
- **14px** — the product surface `.ui`, written literally rather than tokenised. Product chrome keeps its own softer radii because it is a screenshot of a different design system, not part of this one.

Inside `.ui`, radii step down again and are written in `px` because they are chrome, not
type-scaled content: `10px` lists and cards, `9px` KPIs and ledger rows, `8px` findings and
capture rows, `7px` rail items and search fields, `5–6px` tags and the citation seal, `2px`
on marked text. Bars and progress fills are `999px`; column bars are asymmetric
(`7px 7px 3px 3px`) so they read as growing from a baseline.

Borders are always 1px and always ink-at-alpha. Two exceptions carry colour, both
functional: `.ui-guard` (blocked transfer) and `.cite`, each at `--seal-line`.

Circles are reserved for identity and controls — and the punch, which is the only circle on
the page that means anything: avatars, integration badges
(`clamp(48px, 5.2vw, 62px)`, `aspect-ratio: 1`), carousel buttons (46px), the lightbox
close (40px), status dots (3–6px).

## Components

### Buttons

- **Shape:** square (`--r-pill`, now 2px). Base padding `0.95rem 1.6rem`, `--sm` `0.62rem 1.15rem` at `0.85rem`, `--lg` `1.1rem 2rem` at `1rem`. Weight 700, `white-space: nowrap`, icons at 18px.
- **Solid** (primary, "Book a Demo"): `--ink` fill on `--paper` text with a contact shadow. Hover goes to pure black and deepens the shadow. This is the page's highest-contrast control and it is reserved for the conversion action. **Ink, not Seal** — a page of red buttons would spend the accent on the least meaningful thing on it.
- **Ghost** (secondary, "See alsigil in action", "See pricing"): transparent over a `--hairline-strong` border. Hover adds a 4% ink fill and darkens the border.
- **Seal** (used once, "Talk to Sales" in the solutions hero): flat `--seal` on `--paper-lit`. Its scarcity is deliberate — it marks the one card that is itself seal-tinted, and it is the only filled accent on the page.
- **All:** `transform 0.4s var(--ease)` on transform/background/border/shadow/colour; `:active` is `translateY(1px) scale(0.99)`; `[disabled]` / `[aria-disabled]` is `opacity: 0.45` + `pointer-events: none`.
- **Link-arrow** (tertiary): 700 weight text with a `::after` underline that draws `scaleX(0) → 1` from the leading edge over 0.5s, and an arrow that translates 4px. The case-study card triggers both from the *card's* hover, so the whole card behaves as one control.

### Chips and seals

- **Chip** (`.chip`): `--surface-3` over `--hairline-strong`, `0.8rem/600`, `--ink-2`. Optional 6px `.dot` in `--ok`, no halo — a glow on a light ground reads as a rendering artefact.
- **Hero eyebrow** (`.hero-eyebrow`): a white plate on a `--hairline-strong` border, `--ink-2` text, uppercase `0.14em`. Its dot is Seal and pulses on a 3.4s expanding ring (`box-shadow: 0 0 0 0 → 0 0 0 9px`), disabled under reduced motion.
- **Citation seal** (`.cite`) — the page's one recurring product mark. 3px radius, `--seal-wash` fill and `--seal-line` border, `--seal-deep` text at `0.72rem/700`, an 11px shield-check glyph, and `white-space: normal` so a long article reference **wraps rather than clips**. The override is commented: an article reference running off the edge of its own panel is the opposite of what the mark is for. Inside `.ui-find` it also takes `--font-ar-ui` and `justify-self: start`.

### Cards / Containers

- **Pane** (`.pane`): see the Lit-Edge Rule. `overflow: hidden` by default; `.pane--flush` opts out (declared, unused). `.pane-pad` is `clamp(1.5rem, 2.6vw, 2.4rem)`.
- **Solution card** (`.sol-card`): a pane with a 44px `12px`-radius icon tile — bordered `--hairline-strong` over `--surface-3`, glyph in `--ink-2`. **The tile is never Seal.**
- **Solutions hero** (`.sol-hero`): a pane whose fill is overprinted with `linear-gradient(165deg, rgba(109,91,255,0.13), rgba(255,255,255,0.02) 46%)`, spanning two grid rows.
- **Testimonial** (`.testimonial`): a pane with a navy overprint and a navy field inside it. The stacking fix is worth keeping: `.testimonial > *:not(.field)` gets `position: relative; z-index: 1`. Without `:not(.field)`, forcing the absolutely-positioned glow to `position: relative` would drop it back into the grid as a fourth 46rem track and blow the quote column out of the card.
- **Portrait plate** (`.tm-plate`): an authored plate fallback, pressed rather than brass since the migration — Arabic name at `1.75rem`, Latin name, a 2.6rem rule, an uppercase role, and an inset 1px frame at `0.55rem`. A real headshot at `assets/img/partner-portrait.jpg` covers it; `data-optional-img` hides the `<img>` on error so a missing file reveals the plate instead of a broken-image glyph.

### Inputs

- **Newsletter email** (`.news input`): `--surface-3` over `--hairline-strong`, `flex: 1 1 13rem`. Hover darkens the border; `:focus-visible` takes the global Seal ring plus a lift to `--paper-lit`; `[aria-invalid="true"]` borders `--seal`.
- **Message line** (`.news-msg`): `role="status"`, `min-height: 1.2rem` so nothing shifts when it fills. `.is-err` `#FF9E92`, `.is-ok` `--ok`.
- **Behaviour, and the reason it matters:** the form validates the address, then — with no `data-endpoint` declared — says *"Signup is not connected yet"* rather than thanking the visitor. Commented in place: confirming a subscription nobody recorded is worse than admitting the form is not wired. Preserve that refusal if you touch this component.

### Navigation

- **Bar** (`.nav`): fixed, `z-index: 60`, height `--nav-h`, `shell--wide` inner on a `1fr auto 1fr` grid.
- **Condense on scroll** (`> 24px`, rAF-throttled): the box height never changes — so `scroll-padding-top` keeps matching it — and the effect is transform + opacity only. A `::before` plate (`rgba(8,9,11,0.72)`, `blur(20px) saturate(160%)`, bottom hairline) fades in and scales from its top edge to `scaleY(62/76)`, while `.nav-inner` slides `translate3d(0, -7px, 0)`. No layout work on any scroll frame.
- **Links:** `0.9rem/600` `--ink-2`, pill hover at `rgba(255,255,255,0.06)`. Hidden below 1180px.
- **Wordmark:** Sora 600 `1.18rem` at `-0.035em`, with a 27px scale-beam mark. `OS` and the mark's pivot dot are brass — the one branded exception to the Seal Rule.
- **Mobile drawer:** full-screen `rgba(8,9,11,0.94)` + `blur(26px)`, opacity-transitioned, links at Sora `1.6rem` with hairline separators. Opens with body scroll lock, focuses the first control, closes on Escape / link click / close button, and restores focus to the burger.

### Tabs and accordion

- **Overview tabs** (`.tabs-bar`): a pill-in-pill group — a `--surface-1` pill with `blur(16px)` containing pill tabs at `0.92rem/700`. Selected is `rgba(255,255,255,0.1)` + `--ink`. Horizontally scrollable with hidden scrollbars above 540px; below that it goes full-width and drops icons.
- **Feature tabs** (`.feat-bar`): a four-column underline bar on a hairline. The indicator is a `::after` at `bottom: -1px`, 2px, `--violet-lit` with `box-shadow: 0 0 16px rgba(142,124,255,0.55)`, animating `scaleX(0 → 1)` over `0.55s var(--ease)`.
- **Accordion mode** (below 900px, JS-driven): the same panels, animated by `grid-template-rows: 0fr → 1fr` over `0.6s var(--ease)`. Headers are generated in JS from the tab labels and inserted before each panel; `visibility` is delayed by the transition duration on close (`transition: visibility 0s linear 0.6s`) so the collapsing content is not focusable mid-animation. Only one panel is open at a time; the first opens on entering accordion mode.
- **Both:** real `role="tablist"` with roving tabindex, Arrow/Home/End keys, and `aria-controls` / `aria-labelledby` wiring that is rewritten when the mode flips.

### Signature component: the `.ui` product surface

The most important system on the page. Six sections' worth of product screenshots — ten
instances across five sections — are **real markup**, not images. Nothing on this page is a
raster screenshot.

**How it scales.** `.ui` sets `font-size: clamp(0.72rem, 0.86vw, 0.8rem)`; every interior
measurement in the entire family is expressed in `em`. One `font-size` therefore resizes a
whole screenshot without touching a single interior rule. Three sizes exist:
`.ui--sm` `clamp(0.68rem, 0.72vw, 0.7rem)`, `.ui--wide` `clamp(0.7rem, 0.78vw, 0.76rem)`,
and the hero's own override `clamp(0.62rem, 0.82vw, 0.82rem)`. **Never add a `px` or `rem`
value inside `.ui`** — it breaks the one property the system depends on.

**Frame.** `linear-gradient(178deg, #12141A 0%, #0A0B0F 62%)`, 1px `--hairline-strong`
border, 14px radius, `--shadow-deep`, `overflow: hidden`, `user-select: none`, plus an
`::after` inset `0 1px 0 rgba(255,255,255,0.09)` top highlight. `.ui--portal` lifts the
gradient two steps (`#14161D → #0B0C11`) to signal a different application.

**Class vocabulary.**

| Group | Classes |
|---|---|
| Chrome | `.ui-bar` (+`--rtl`), `.ui-dots`, `.ui-crumb` (`em` = the trailing path segment), `.ui-search` + `kbd`, `.ui-pill` (+`--ok`), `.ui-avs` / `.ui-av` (`--2`, `--3`) |
| Shell | `.ui-frame` (`12.5em 1fr`), `.ui-rail`, `.ui-rail-label`, `.ui-rail-item` (`.is-on`, count `b`, `b.is-warn`), `.ui-main` / `.ui-pad`, `.ui-head`, `.ui-title`, `.ui-sub`, `.ui-btn` (+`--wide`) |
| Metrics | `.ui-kpis` (+`--3`), `.ui-kpi`, `.ui-kpi-l` / `-v` / `-d` (`.is-good` / `.is-bad`) |
| Records | `.ui-split` (`1fr 15.5em`), `.ui-list` (+`--flat`), `.ui-row` (`4.6em 1fr auto auto`), `.ui-row-key`, `.ui-row-main`, `.ui-amt`, `.ui-tag` + `.tag-ok` / `-warn` / `-risk` / `-idle` |
| Side panels | `.ui-side`, `.ui-card` (+`--ai`), `.ui-card-h`, `.ui-ai-q` / `.ui-ai-a`, `.ui-mini` (+`--sum`) |
| Matter record | `.ui-matter-head`, `.ui-matter-title`, `.ui-meta` (3-col label/value), `.ui-timeline`, `.ui-tl-item` (`.is-done` green bar, `.is-now` violet bar with a 12px glow) |
| Documents | `.ui-docsplit` (`13em 1fr`), `.ui-doclist`, `.ui-docitem` (`.is-on`), `.ui-docview`, `.ui-clause mark` |
| Client portal | `.ui--portal`, `.ui-portal-status`, `.ui-portal-rows`, `.ui-portal-row` |
| Time capture | `.ui-cap-sum`, `.ui-cap-bar` + `u[style="--w"]`, `.ui-caps`, `.ui-cap` (`.is-pending`), `.ui-cap-t`, `u.ui-ok` |
| Receivables | `.ui-aged`, `.ui-aged-col` (`i.is-warn`, `i.is-risk`, height via `--h`) |
| Client funds | `.ui-vault`, `.ui-ledger`, `.ui-led-h` / `.ui-led` (`4.6em 1fr 5em 5em 6em`), `.ui-guard` |
| Reporting | `.ui-graph`, `.ui-grid-l`, `.ui-legend`, `.ui-earners` / `.ui-earner`, `.ui-report` (`1fr 15em`), `.ui-report-h` (+`--sm`), `.ui-hbars` / `.ui-hbar` (`13.5em minmax(0,1fr) 5.5em`), `.ui-report-side`, `.ui-donut`, `.ui-report-note` |
| AI review | `.ui-review` (`minmax(0,1fr) 17.5em`), `.ui-review-doc`, `.ui-flag--risk` / `--warn` `mark`, `.ui-findings`, `.ui-find` (`--risk` / `--warn` / `--miss`) |

**Conventions inside the family.**
- Numeric values (`.ui-kpi-v`, `.ui-amt`, `.ui-cap em`, `.ui-hbar em`, `.ui-led i:nth-child(n+3)`, `.ui-donut-c b`) are set in Sora with negative tracking. Labels stay in Manrope.
- Proportions are passed as inline custom properties, never as class variants: `--w` for bar widths, `--h` for column heights, `--d` for animation delay, `--x`/`--y` for mote position.
- **Deltas are coloured by whether the movement is good for the firm, not by its sign.** `.ui-kpi-d.is-good` is green on both `+8.2%` (WIP) and `−22%` (aged receivables); painting a fall red because the number went down would misread the data. The comment says so in `sections.css`.
- Marked text uses a fill + a 2px inset underline, colour-coded by meaning: brass for a resolved citation (`.ui-clause mark`), red for a risk finding, amber for a warning.
- Six-plus grids carry `minmax(0, …)` or `min-width: 0` on any track holding ellipsised text.

**Mobile.** At 860px the rail hides and every internal split collapses to one column; the document list becomes a horizontal scroller. At 680px the surfaces shed non-essential columns rather than shrinking type: search field, avatars, capture icons and the ledger's balance column all disappear; matter rows become two lines; KPI, meta and timeline grids halve.

### Lightbox

`position: fixed`, `z-index: 100`, `display: grid; place-items: center`. Scrim is
`rgba(4,5,7,0.82)` + `blur(10px)`, fading over 0.4s; the inner panel arrives from
`translateY(14px) scale(0.985)` over 0.5–0.6s. Frame is 16:9, `--r-lg`, `--shadow-deep`.
Focus is trapped in the dialog with a manual Tab/Shift-Tab wrap over visible focusables, the
body gets `is-locked` (`overflow: hidden`), Escape closes, and focus returns to the opener.
With no `tour.mp4` present, an authored fallback panel is shown instead of a dead player —
and only once a real film loads does the hero button relabel itself from "See LegalOS in
action" to "Watch the 2-min tour".

### Motion (page-level)

**The One Curve Rule.** `--ease: cubic-bezier(0.16, 1, 0.3, 1)` — exponential ease-out — is
the page's motion curve. It drives reveals, hovers, tab indicators, the nav condense, the
accordion, the lightbox, and (as `1 - 2^(-10t)`) the stat count-up. `--ease-soft`
(`cubic-bezier(0.33, 0.9, 0.35, 1)`) exists for exactly one thing: the CTA sheen. Do not
introduce a third.

- **Section reveal:** one gesture, `opacity 0 → 1` with `translateY(22px) → 0` over 0.85s/0.95s, staggered by an inline `--reveal-delay` in 70–90ms steps (observed values: 70/80/90/110/140/150/210/280ms). Triggered by IntersectionObserver at `threshold: 0.06`, `rootMargin: 0 0 -12% 0`, unobserved after firing, and `will-change` is released on `transitionend` so a layer is not pinned per section.
- **Hero ambient loop:** three CSS/SVG scenes (matter board breathing, an Arabic clause resolving to its article of law, a matter timeline drawing) cross-dissolving on a **27s** `ambCycle` with `-1s / -10s / -19s` delays; each scene runs its own 7–11s inner animations. It is the hero's motion until a film is supplied — not a placeholder. It is masked to the open right region (`left: 30%`, `height: min(100svh, 980px)`, `radial-gradient(66% 62% at 78% 52%)`) so it can never compete with the headline; it is `display: none` below 680px and under `prefers-reduced-motion`, where the `<video>` poster becomes the visible layer; and IntersectionObserver pauses all seven infinite animations the moment the hero leaves the viewport. If a real film loads, `.hero-bg:has(.hero-video.is-ready) .amb` kills the loop entirely rather than paying to paint it underneath.
- **Hero mockup:** CSS ships a static `rotateX(9deg) rotateZ(-0.5deg) scale(0.985)`; JS then interpolates the tilt to flat as the panel settles and drifts it at `depth 0.055`. Both are skipped on phones and under reduced motion, so a no-JS render still gets a straight, legible screenshot.
- **Marquee:** 46s linear `translate3d(-50%, 0, 0)` over a track the script duplicates so the loop is seamless. Pauses on hover *and* `:focus-within`; under reduced motion the animation stops and the mask is dropped so the track becomes a normal horizontal scroller.
- **Reduced motion:** `scroll-behavior: auto`; all reveals forced visible; every animation and transition clamped to `0.001ms`; the ambient loop, weave, sheen and eyebrow pulse removed rather than frozen mid-dissolve.

## Do's and Don'ts

### Do:
- **Do** keep Seal for material that resolves to a source. New elements default to `--ink-2` / `--ink-3` for neutral chrome and `--ink` for system state.
- **Do** build new surfaces as white-at-alpha overlays (`--surface-1/2/3`) so they pick up whatever field they cross, and let the hairline do the separating.
- **Do** express every interior measurement inside `.ui` in `em`. The whole product-surface system is one `font-size` away from being resizable; a single `px` value breaks that.
- **Do** give any new section its atmosphere with a `.field` — `.field--grid` for a ruled ground, `.field--seal` for a warm flush — absolutely positioned, sized in `vw`/`rem`, behind the content, with the section set to `overflow: clip` and its `.shell` raised to `z-index: 1`.
- **Do** ship content visible and let script add the hiding class. Any new progressive-enhancement flag follows the `js-boot` pattern: set inline in `<head>`, removed at the end of `init()`.
- **Do** declare `dir="rtl"` on a *container* when a surface is genuinely right-to-left, and use `.ar` / `.ar-doc` for Arabic set inline in LTR rows.
- **Do** use logical properties (`margin-inline-start`, `border-inline-end`, `padding-inline`, `text-align: start`) — the page already does throughout, which is what lets `dir="rtl"` surfaces work without a mirrored stylesheet.
- **Do** colour status by meaning, not by arithmetic sign.
- **Do** let a missing asset reveal an authored fallback (the ambient loop, the nameplate, the lightbox panel) rather than a broken element.

### Don't:
- **Don't** put Seal on eyebrows, ticks, icon tiles, headings or hover states. That was tried in the dark build with brass; it cost the citation seal its meaning and was reverted. The colour changed, the rule did not.
- **Don't** mix unapproved font faces; IBM Plex Sans Arabic carries the entire typography system.
- **Don't** add `direction: rtl` to `.ar` or `.ar-doc`. `unicode-bidi: isolate` alone is the rule, so Arabic keeps the alignment of the row it sits in.
- **Don't** use Seal as a border, divider or small fill in page chrome outside the citation seal. Fields are regions.
- **Don't** introduce a new tinted hex for a surface, and don't add a second dark block. If a surface needs to invert, it re-scopes tokens the way `.cta` does.
- **Don't** change a pane's fill on hover — darken its border.
- **Don't** add a third easing curve, or a second reveal gesture. One fade-up, one curve.
- **Don't** animate layout properties on scroll. The nav's condense is transform + opacity precisely so `--nav-h` and `scroll-padding-top` stay in agreement.
- **Don't** remove the `:not(.field)` in `.testimonial > *:not(.field)`; it keeps the absolutely-positioned glow out of the grid.
- **Don't** let the citation seal clip. `white-space: normal` on `.cite` is load-bearing.
- **Don't** fake a success state. The newsletter refuses rather than confirming an unrecorded subscription; hold that line for any form added here.
- **Don't** introduce raster screenshots. Every product surface on this page is markup, and the page's credibility rests on it staying that way.
- **Don't** carry these tokens into `web/`. The two surfaces share the mark and the Ink/Seal/Paper hexes, not the type scale, the shadows or the accent role — that app is Astryx with an emerald functional accent. Import the mark from `web/lib/brand/`; leave the rest at the boundary.
