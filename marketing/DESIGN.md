---
name: LegalOS Marketing
description: Dark, source-backed landing page for LegalOS — a legal-operations world where brass marks only what resolves to law.
colors:
  ground: "#08090B"
  ground-deep: "#050608"
  surface-1: "rgba(255, 255, 255, 0.028)"
  surface-2: "rgba(255, 255, 255, 0.046)"
  surface-3: "rgba(255, 255, 255, 0.07)"
  hairline: "rgba(255, 255, 255, 0.09)"
  hairline-strong: "rgba(255, 255, 255, 0.16)"
  hairline-bright: "rgba(255, 255, 255, 0.28)"
  navy: "#101A3D"
  navy-lit: "#16225C"
  violet: "#6D5BFF"
  violet-lit: "#8E7CFF"
  violet-deep: "#3A2E8C"
  brass: "#E0A44C"
  brass-lit: "#F0BE76"
  ok: "#4ED8A0"
  warn: "#F2C14E"
  risk: "#FF7A6B"
  ink: "#F5F6F8"
  ink-2: "#A9AEB9"
  ink-3: "#7E8492"
  # Action — the one gradient fill on the page, on .btn--violet
  action: "#7A66FF"
  action-deep: "#5B47E8"
  # Tints of the semantic set, for text and small marks on their own fills
  ok-lit: "#7FE6BC"
  warn-lit: "#F5D384"
  risk-lit: "#FF9E92"
  risk-text: "#FFB3A9"
  # Violet text tints, brightest first: data strokes, section labels, hero pill
  violet-text: "#A79BFF"
  violet-text-2: "#B8ACFF"
  violet-text-3: "#C9C0FF"
  violet-muted: "#A9A4C4"
  # Product-surface avatars, one per fee earner, deliberately low-chroma
  av-1-bg: "#262A35"
  av-1-ink: "#B7BDCC"
  av-2-bg: "#2F2A3A"
  av-2-ink: "#C2B8D2"
  av-3-bg: "#233034"
  av-3-ink: "#AFC6CC"
  # Insight thumbnail grounds, category-tinted
  thumb-compliance: "#131320"
  thumb-ai: "#14122A"
  thumb-ops: "#0E1A18"
  thumb-funds: "#141220"
typography:
  display:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.65rem, 6.6vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 4.2vw, 3.6rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.4vw, 2.1rem)"
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: "-0.028em"
  lede:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1.35vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.16em"
  statute:
    fontFamily: "Noto Naskh Arabic, Segoe UI, serif"
    fontSize: "1.08em"
    fontWeight: 400
    lineHeight: 2
  arabic-ui:
    fontFamily: "Tajawal, Noto Naskh Arabic, sans-serif"
    fontSize: "1.06em"
    fontWeight: 500
  # Working UI ramp. Chrome, controls, table furniture and the .ui product
  # surfaces sit on this; it is finer-grained than the editorial scale above
  # because a screenshot needs more steps than a page does.
  # One-off fluid display roles. Each is bespoke because it is the only thing
  # of its kind on the page and its endpoints are set by the composition it
  # sits in, not by a shared step.
  statement:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3.35vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.24
    letterSpacing: "-0.032em"
  stat:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7vw, 5.4rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
  stat-callout:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 4vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline-narrow:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 3vw, 2.7rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  watermark:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(4.5rem, 19.5vw, 19rem)"
    fontWeight: 600
    letterSpacing: "-0.04em"
  surface-hero:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(0.62rem, 0.82vw, 0.82rem)"
    fontWeight: 400
  # Sub-display ramp: card headings, pull-quotes, the mobile drawer, and the
  # Arabic on the testimonial nameplate. Sora above 1.2rem, Manrope below.
  card-title:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.24rem"
    fontWeight: 600
    letterSpacing: "-0.028em"
  quote:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 500
    letterSpacing: "-0.02em"
  dialog-title:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 600
    letterSpacing: "-0.03em"
  drawer-link:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 600
    letterSpacing: "-0.03em"
  plate-arabic:
    fontFamily: "Noto Naskh Arabic, Segoe UI, serif"
    fontSize: "1.75rem"
    lineHeight: 1.5
  ui-lg:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 600
  ui:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 600
  ui-sm:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 600
  ui-xs:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 600
  micro:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 800
    letterSpacing: "0.15em"
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  # Inside a .ui product surface, radii shrink with the component: a tag is
  # 5px where a page card is 20px, because the surface is drawn at screenshot
  # scale and the page scale would read as a cartoon.
  chip: "2px"
  tag: "5px"
  control: "7px"
  panel: "9px"
  surface: "12px"
  frame: "14px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  2xl: "36px"
  pill: "999px"
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
    textColor: "#0A0B0E"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  button-solid-hover:
    backgroundColor: "#FFFFFF"
    textColor: "#0A0B0E"
  button-ghost:
    backgroundColor: "rgba(255,255,255,0.045)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  button-ghost-hover:
    backgroundColor: "rgba(255,255,255,0.09)"
  button-violet:
    backgroundColor: "linear-gradient(135deg, #7A66FF, #5B47E8)"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.6rem"
  button-lg:
    padding: "1.1rem 2rem"
  button-sm:
    padding: "0.62rem 1.15rem"
  pane:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.pane-pad}"
  chip:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0.42rem 0.9rem 0.42rem 0.75rem"
  cite-seal:
    backgroundColor: "rgba(224, 164, 76, 0.11)"
    textColor: "{colors.brass-lit}"
    rounded: "6px"
    padding: "0.16rem 0.5rem 0.16rem 0.4rem"
  tab:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    padding: "0.66rem 1.15rem"
  tab-selected:
    backgroundColor: "rgba(255,255,255,0.1)"
    textColor: "{colors.ink}"
  input-email:
    backgroundColor: "rgba(255,255,255,0.04)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.9rem 1.1rem"
  ui-surface:
    backgroundColor: "linear-gradient(178deg, #12141A 0%, #0A0B0F 62%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    typography: "{typography.body}"
  nav-link:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 0.9rem"
---

# Design System: LegalOS Marketing

**Scope: `marketing/` only.** This file sits beside `index.html` rather than at the
repository root because the root already belongs to a different visual world. The product
app at `web/` is built on the Astryx design system: light mode, Arabic-first and RTL by
default, Inter, an emerald/navy palette (see `PRODUCT.md` → Brand Commitments and
`web/lib/theme.ts`). The page documented here is a separate deployable surface — a
public, LTR, dark landing page with its own faces, its own ground and its own component
family. A root-level `DESIGN.md` carrying these tokens would misdescribe the app to the
next agent that opens it. Nothing below applies outside `marketing/`.

Everything is captured from the built code: `assets/css/tokens.css`,
`assets/css/sections.css`, `assets/js/site.js`, `index.html`. Where the build and the
direction contract at the top of `<body>` disagree, the build is recorded as the truth.

### Where the build diverges from the direction contract

| Contract says | Build does | Note |
|---|---|---|
| Brass worn by "attestation marks" | The three security badges (`.sec-badge-mark`) are neutral (`--ink-2`, `rgba(255,255,255,0.05)` fill). No brass. | Correct per the colour rule — a badge asserting an *in-progress* attestation does not resolve to a source. Contract and `README.md` are both stale on this line. |
| "full-bleed ambient product loop" in the first viewport | `.amb` is pinned to `left: 30%`, `height: min(100svh, 980px)`, and radially masked away from the headline column. | Deliberate, and commented in place. Full-bleed is reserved for a real film. |
| "lede at 62ch" | `.lede` is 62ch, but `.hero-lede` overrides to `56ch`. | Hero lede is narrower than the page default. |
| `sections.css` header: "six sections render one" `.ui` | Ten `.ui` instances across **five** sections (hero 1, platform overview 3, features 4, solutions 1, showcase 1). | Stale comment, not a design change. |
| Brass "spent only where something resolves to a source" | One leak: the first insights thumbnail (`.ins-thumb--1`) draws a brass check-in-circle in decorative SVG. | The only decorative brass on the page. Either read it as a compliance seal or recolour it; do not treat it as licence for more. |

Three tokens are declared and never used: `--brass-dim` (`#8A6529`), `--ink-on-violet`
(`#EDEBFF`), `--r-sm` (`10px`). `--navy` / `--navy-lit` / `--violet-deep` are declared but
the field gradients restate them as literal `rgba()` (blur + alpha stops need the channels).
Leaving them in the frontmatter is intentional: they are the palette's stated range even
where a rule inlines them.

## Overview

**Creative North Star: "The Sealed Instrument"**

A legal instrument is a document that carries its own proof — a seal, an article number, a
signature that resolves to an authority. The page is built as one: a near-black room with
weather in it, glass sheets holding real product surfaces, and a single brass mark that
appears only where something on screen can be traced back to Egyptian statute. Nothing
decorative is allowed to wear the seal. That restriction is the whole design; every other
decision exists to keep it legible.

The density is editorial, not brochure. Sections breathe at `clamp(6rem, 11vw, 11rem)`,
copy is capped at 46rem for headings and 62–68ch for prose, and the visual weight lives in
the product surfaces rather than in decoration. There is no stock photography, no icon-tile
feature grid, and no raster screenshot anywhere on the page — every product screen is real
markup. Colour is spent sparingly against a monochrome ground: violet is atmosphere and
system state, brass is verification, and green/amber/red appear only inside product
surfaces where they carry data meaning.

Motion is one authored idea repeated: a citation resolving. The hero's ambient loop draws an
Arabic clause, underlines it in brass, then lands the article reference beneath it; the
document panels hold the same moment statically. Everything else is arrival, not
performance — a single fade-up on one easing curve, and a nav that condenses without
animating layout.

**Key Characteristics:**
- Near-black ground (`#08090B`) with all surfaces as low-alpha white overlays, never separate hexes
- Navy→violet *fields*: blurred radial regions sized in viewport units, sitting behind whole sections
- Brass as a functional, earned accent — never an eyebrow, tick, or icon tile
- Four self-hosted faces (~167 KB), Arabic among them as product data rather than as a fallback
- Real markup product screenshots that scale from one `font-size`
- One glass recipe, one motion curve, one grain overlay
- Content visible without JavaScript; every enhancement is additive

## Colors

A monochrome dark ground carrying two coloured atmospheres — a cold navy→violet weather
system for the platform, and a single warm brass mark for verified law.

### Primary

- **Brass Seal** (`#E0A44C`): the functional accent. Worn by exactly five things in the built page: the citation seal (`.cite`, at 11% fill / 42% border with `--brass-lit` text), the clause an AI finding is anchored to (`.ui-clause mark`, 13% fill with a 65% inset underline), the ambient loop's resolving-clause underline and its citation chip, the three verifiable proof points under the hero (`.hero-proof .ico`), and the wordmark (`.wordmark-os` plus the dot in the mark) — the documented single brand exception. **History, because it is the rationale:** an earlier pass put brass on every eyebrow, tick and icon tile. Nine quiet labels in the accent colour cost the citation seal its meaning, and it was pulled back to source-backed material only. The comment above `.eyebrow` in `tokens.css` records this.
- **Brass Lit** (`#F0BE76`): text and glyph colour *inside* brass-tinted containers, where the base brass would not hold contrast on a translucent fill.

### Secondary

- **Signal Violet** (`#6D5BFF`) and **Violet Lit** (`#8E7CFF`): the system's own colour. It is the near end of the atmosphere (fields, the hero stage glow, the CTA weave), the state colour inside product surfaces (active rail item at 15% fill, current timeline node, progress fills, chart series), the selection colour (`::selection` at 40%), and the focus ring (`2px solid` violet-lit, `3px` offset). Violet says *the software is doing something*; brass says *the law says so*. Never swap them.
- **Deep Navy** (`#101A3D`) and **Navy Lit** (`#16225C`): the far end of the same atmosphere. Navy fields sit under the mission, testimonial and CTA; the violet fields sit under hero, features and showcase. Navy also tints the testimonial pane fill (`linear-gradient(150deg, rgba(22,34,92,0.42), …)`).

### Tertiary — status, product-surface only

- **Ledger Green** (`#4ED8A0`): reconciled, paid, cleared, approved. Also the chip dot.
- **Docket Amber** (`#F2C14E`): due, pending review, written off.
- **Exposure Red** (`#FF7A6B`): overdue, risk finding, blocked transfer.

These three never appear in page chrome — only inside `.ui` screens, `.ui-tag`, `.ui-find`, `.ui-guard`, and the newsletter's error/success line.

### Neutral

- **Ground** (`#08090B`): the page. `theme-color` matches it.
- **Ground Deep** (`#050608`): behind the hero only, so the hero reads as recessed relative to the sections below it.
- **Surface 1 / 2 / 3** (white at 2.8% / 4.6% / 7%): every raised surface on the page. They are overlays, not hexes, which is why a pane crossing a violet field picks the field up instead of punching a grey hole in it.
- **Hairline / Strong / Bright** (white at 9% / 16% / 28%): borders, dividers, and the eyebrow's 18px lead rule. `.rule` is a 1px gradient that fades to transparent at both ends.
- **Ink** (`#F5F6F8`) primary text, **Ink 2** (`#A9AEB9`) secondary at 7.9:1 on ground, **Ink 3** (`#7E8492`) tertiary at 4.7:1 on ground. Both contrast figures are recorded in `tokens.css`; `--ink-3` is the floor and is used for labels and metadata, never for body copy.

### Named Rules

**The Seal Rule.** Brass marks only material that resolves to a source. If a new element cannot be traced to an article of law or a verifiable figure, it is `--ink-2`, `--ink-3`, or violet. The audit test: count the brass elements in a viewport; if any of them is a decoration, a tick, an eyebrow or an icon tile, the rule is broken.

**The Field Rule.** Navy and violet are regions, never edges. A field is `position: absolute`, `border-radius: 50%`, `filter: blur(90px)`, `opacity: 0.4–0.8`, sized in `vw`/`rem` (e.g. `76vw` square), and lives behind a whole section. Do not use either colour as a 1px border, a divider or a small fill outside the product surfaces.

**The Overlay Rule.** New surfaces are white at low alpha, not new dark hexes. Anything that needs to sit over a field must be translucent or it will read as a hole.

## Typography

**Display Font:** Sora (with `ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Manrope (with `ui-sans-serif, system-ui, sans-serif`)
**Statute / document font:** Noto Naskh Arabic (with `Segoe UI, serif`)
**Arabic UI font:** Tajawal (with `Noto Naskh Arabic, sans-serif`)

**Character:** Sora is geometric and tightly tracked — at `-0.035em` and 600 weight it reads
as engineered rather than corporate. Manrope underneath it is neutral and slightly warm, so
long legal prose stays readable at 1.6–1.65 line-height. The two Arabic faces are not
fallbacks: Naskh is the style Egyptian legal text is actually set in and carries statute and
document body; Tajawal is the UI companion that sits beside Manrope in labels and chips
without a jolt in weight or colour.

All four are self-hosted `woff2`, Latin **or** Arabic subset only, ~167 KB total. Sora and
Manrope are `<link rel=preload>`ed; all faces are `font-display: swap`. Weight ranges:
Sora 400–700, Manrope 400–800, Noto Naskh 400–700, Tajawal 400/500/700 as three files.

### Hierarchy

- **Display / hero** (`.display--hero`, Sora 600, `clamp(2.65rem, 6.6vw, 5.5rem)`, 1.02, `-0.035em`, `text-wrap: balance`): the H1 only. Capped at `17ch` above 860px so it breaks into three lines by measure rather than by `<br>`.
- **Headline / section** (`.display--section`, Sora 600, `clamp(2.1rem, 4.2vw, 3.6rem)`, 1.06): every `<h2>`. The security section overrides down to `clamp(1.9rem, 3vw, 2.7rem)` because it lives inside a pane.
- **Title / sub** (`.display--sub`, Sora 600, `clamp(1.5rem, 2.4vw, 2.1rem)`, 1.14, `-0.028em`): panel and card `<h3>`.
- **Statement** (`.mission-statement`, Sora **500**, `clamp(1.6rem, 3.35vw, 3rem)`, 1.24, max `24ch`, `--ink-2` with `.mission-hi` lifting the operative clause to `--ink`): the mission paragraph, the one place display type is used for a run of prose. The pull-quote (`.tm-quote p`) and feature quotes use the same 500-weight display register.
- **Lede** (`.lede`, Manrope, `clamp(1.05rem, 1.35vw, 1.2rem)`, 1.65, `--ink-2`, max `62ch`, `text-wrap: pretty`).
- **Body** (`.body-2`, Manrope 400, 1rem, 1.65, `--ink-2`, max `68ch`).
- **Label / eyebrow** (`.eyebrow`, Manrope 700, `0.7rem`, `0.16em`, uppercase, `--ink-3`, with an 18×1px `--hairline-bright` lead rule): names the section's place in the product rather than restating the heading. Related label sizes: `.foot-h` and `.sol-tag` at `0.72rem`/`0.14–0.15em`, `.ins-cat` and `.tm-plate-role` at `0.68rem`/`0.15–0.18em`.
- **Numerals** (`.stat-v`, Sora 600, `clamp(3rem, 7vw, 5.4rem)`, `-0.04em`, `font-variant-numeric: tabular-nums`): the stats band. Counters ease up over 1500ms with `1 - 2^(-10t)` — the JS mirror of the CSS easing.
- **Code** (`.code`, `ui-monospace, "SF Mono", Menlo`, `0.78rem`, 1.75 on `rgba(0,0,0,0.4)`): the one API sample. Keywords `#A79BFF`, payload `#9C90E8`.

### Named Rules

**The Isolate-Don't-Flip Rule.** `.ar` and `.ar-doc` carry `unicode-bidi: isolate` but deliberately **not** `direction: rtl`. The bidi algorithm already runs the Arabic right-to-left inside its own box; the box keeps the alignment of the row it sits in, so an Arabic matter title in an LTR table starts where its English subtitle starts. Surfaces that are genuinely right-to-left — the client portal, a document pane, an AI review pane, a citation seal — declare `dir="rtl"` on the *container* and inherit the real thing. Never put `direction: rtl` on the inline class.

**The Optical Size Rule.** Arabic set inline in English copy is scaled up and loosened: `.ar` at `1.06em`, `.ar-doc` at `1.08em` with `line-height: 2`. Naskh at Manrope's optical size looks broken; do not normalise them to `1em`.

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

Hybrid, weighted toward light rather than shadow. Depth comes from four stacked mechanisms,
in order of importance: (1) translucency over blurred colour fields, (2) a lit top edge on
glass, (3) hairline borders at three alphas, and (4) shadow — used almost exclusively on
product surfaces and hover states, never as the primary separator. Flat panes at rest are
the norm; `.pane--lift` and `.pane--action:hover` are the exceptions.

### Shadow Vocabulary

- **Lift** (`0 2px 4px rgba(0,0,0,0.4), 0 18px 40px -12px rgba(0,0,0,0.7)`): hover state for interactive panes, and any pane that needs to detach slightly at rest.
- **Deep** (`0 4px 10px rgba(0,0,0,0.45), 0 48px 90px -28px rgba(0,0,0,0.85)`): the product surfaces (`.ui`) and the lightbox frame. This is what makes a screenshot read as an object on the page rather than an inset panel.
- **Solid-button seat** (`0 1px 0 rgba(255,255,255,0.5) inset, 0 8px 24px -8px rgba(0,0,0,0.9)`): the inset white line is a top bevel, not a glow. On hover the ambient half becomes violet: `0 12px 34px -10px rgba(109,91,255,0.6)`.
- **Violet button glow** (`0 10px 30px -10px rgba(109,91,255,0.85)` → `0 16px 40px -10px rgba(109,91,255,1)` on hover).
- **Stage glow** (not a shadow): `.hero-stage-glow` is a radial violet region at 55% alpha, `filter: blur(56px)`, sitting behind and below the mockup.

### Named Rules

**The Lit-Edge Rule.** One glass recipe, everywhere: `1px solid var(--hairline)`, `background: var(--surface-1)`, `backdrop-filter: blur(18px) saturate(140%)`, radius `--r-xl` (28px), plus a masked `::before` that paints `linear-gradient(160deg, rgba(255,255,255,0.22), transparent 42%)` into a 1px ring via `mask-composite: exclude`. The blur is real and load-bearing — panes sit over violet fields and are supposed to pick them up. Do not replace it with a flat fill.

**The Brighter-Not-Denser Rule.** Interactive panes (`.pane--action`) hover by lifting `4px` and brightening the *border* (`--hairline` → `--hairline-strong`) plus adding the lift shadow. The fill never changes. The glass reads as catching more light, not as changing material.

**The Grain Rule.** A fixed full-page `.grain` overlay sits at `z-index: 1`, `opacity: 0.035`, `mix-blend-mode: overlay`, from an inline SVG `feTurbulence` (baseFrequency 0.85, 3 octaves, 140×140 tile). It exists because the large dark gradients band on 8-bit displays. Never remove it when adding a new full-width gradient; never raise it above ~0.04, where it starts reading as texture.

## Shapes

A soft-rectangular language with a wide radius range, chosen by surface size rather than by
component type: the bigger the surface, the rounder it is.

- **28px** (`--r-xl`) — the glass pane. Every `.pane`.
- **36px** (`--r-2xl`) — the final CTA panel, the largest single surface on the page.
- **20px** (`--r-lg`) — mid-size objects inside panes: the testimonial portrait, the stat card, the case-study art, security badges, the lightbox frame.
- **14px** (`--r-md`) — the product surface `.ui` (written literally as `14px`, matching the token), insight thumbnails, the code block.
- **999px** (`--r-pill`) — every control: buttons, chips, nav links, tabs, the newsletter input, the skip link, circular icon buttons at 40–46px.
- **10px** (`--r-sm`) — declared, currently unused.

Inside `.ui`, radii step down again and are written in `px` because they are chrome, not
type-scaled content: `10px` lists and cards, `9px` KPIs and ledger rows, `8px` findings and
capture rows, `7px` rail items and search fields, `5–6px` tags and the citation seal, `2px`
on marked text. Bars and progress fills are `999px`; column bars are asymmetric
(`7px 7px 3px 3px`) so they read as growing from a baseline.

Borders are always 1px and always white-at-alpha. Two exceptions carry colour, both
functional: `.ui-guard` (blocked transfer) at `rgba(255,122,107,0.24)` and `.cite` at
`rgba(224,164,76,0.42)`.

Circles are reserved for identity and controls: avatars, integration badges
(`clamp(48px, 5.2vw, 62px)`, `aspect-ratio: 1`), carousel buttons (46px), the lightbox
close (40px), status dots (3–6px).

## Components

### Buttons

- **Shape:** fully pill (`999px`). Base padding `0.95rem 1.6rem`, `--sm` `0.62rem 1.15rem` at `0.85rem`, `--lg` `1.1rem 2rem` at `1rem`. Weight 700, `white-space: nowrap`, icons at 18px.
- **Solid** (primary, "Book a Demo"): near-white `--ink` fill on `#0A0B0E` text with the bevel + ambient shadow. Hover goes to pure white and swaps the ambient shadow to violet. This is the page's only high-contrast surface and it is reserved for the single conversion action.
- **Ghost** (secondary, "See LegalOS in action", "See pricing"): `rgba(255,255,255,0.045)` over a `--hairline-strong` border with its own `blur(14px)`. Hover doubles the fill and brightens the border.
- **Violet** (used once, "Talk to Sales" in the solutions hero): `linear-gradient(135deg, #7A66FF, #5B47E8)`. Its scarcity is deliberate — it marks the one card that is itself violet-tinted.
- **All:** `transform 0.4s var(--ease)` on transform/background/border/shadow/colour; `:active` is `translateY(1px) scale(0.99)`; `[disabled]` / `[aria-disabled]` is `opacity: 0.45` + `pointer-events: none`.
- **Link-arrow** (tertiary): 700 weight text with a `::after` underline that draws `scaleX(0) → 1` from the leading edge over 0.5s, and an arrow that translates 4px. The case-study card triggers both from the *card's* hover, so the whole card behaves as one control.

### Chips and seals

- **Chip** (`.chip`): pill, `rgba(255,255,255,0.05)` over `--hairline-strong`, `blur(14px)`, `0.8rem/600`, `--ink-2`. Optional 6px `.dot` in `--ok` with `box-shadow: 0 0 8px currentColor`.
- **Hero eyebrow** (`.hero-eyebrow`): the violet variant — `rgba(109,91,255,0.13)` fill, `rgba(142,124,255,0.32)` border, `#C9C0FF` text, uppercase `0.09em`. Its dot pulses on a 3.4s expanding ring (`box-shadow: 0 0 0 0 → 0 0 0 9px`), disabled under reduced motion.
- **Citation seal** (`.cite`) — the page's one recurring product mark. 6px radius, brass at 11% fill and 42% border, `--brass-lit` text at `0.72rem/700`, an 11px shield-check glyph, and `white-space: normal` so a long article reference **wraps rather than clips**. The override is commented: an article reference running off the edge of its own panel is the opposite of what the mark is for. Inside `.ui-find` it also takes `--font-ar-ui` and `justify-self: start`.

### Cards / Containers

- **Pane** (`.pane`): see the Lit-Edge Rule. `overflow: hidden` by default; `.pane--flush` opts out (declared, unused). `.pane-pad` is `clamp(1.5rem, 2.6vw, 2.4rem)`.
- **Solution card** (`.sol-card`): a pane with a 44px `12px`-radius icon tile — bordered `--hairline-strong` over `rgba(255,255,255,0.05)`, glyph in `--ink-2`. **The tile is never brass.**
- **Solutions hero** (`.sol-hero`): a pane whose fill is overprinted with `linear-gradient(165deg, rgba(109,91,255,0.13), rgba(255,255,255,0.02) 46%)`, spanning two grid rows.
- **Testimonial** (`.testimonial`): a pane with a navy overprint and a navy field inside it. The stacking fix is worth keeping: `.testimonial > *:not(.field)` gets `position: relative; z-index: 1`. Without `:not(.field)`, forcing the absolutely-positioned glow to `position: relative` would drop it back into the grid as a fourth 46rem track and blow the quote column out of the card.
- **Portrait plate** (`.tm-plate`): an authored brass-door-plate fallback — Naskh name at `1.75rem`, Latin name in Sora, a 2.6rem rule, an uppercase role, and an inset 1px frame at `0.55rem`. A real headshot at `assets/img/partner-portrait.jpg` covers it; `data-optional-img` hides the `<img>` on error so a missing file reveals the plate instead of a broken-image glyph.

### Inputs

- **Newsletter email** (`.news input`): pill, `rgba(255,255,255,0.04)` over `--hairline-strong`, `flex: 1 1 13rem`. Hover brightens the border; `:focus-visible` takes the global violet ring plus a lift to `rgba(255,255,255,0.07)`; `[aria-invalid="true"]` borders `rgba(255,122,107,0.6)`.
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
- **Do** keep brass for material that resolves to a source. New elements default to `--ink-2` / `--ink-3` for neutral chrome and `--violet-lit` for system state.
- **Do** build new surfaces as white-at-alpha overlays (`--surface-1/2/3`) so they pick up whatever field they cross.
- **Do** express every interior measurement inside `.ui` in `em`. The whole product-surface system is one `font-size` away from being resizable; a single `px` value breaks that.
- **Do** give any new section its atmosphere with a `.field` — absolutely positioned, `blur(90px)`, sized in `vw`/`rem`, behind the content, with the section set to `overflow: clip` and its `.shell` raised to `z-index: 1`.
- **Do** ship content visible and let script add the hiding class. Any new progressive-enhancement flag follows the `js-boot` pattern: set inline in `<head>`, removed at the end of `init()`.
- **Do** declare `dir="rtl"` on a *container* when a surface is genuinely right-to-left, and use `.ar` / `.ar-doc` for Arabic set inline in LTR rows.
- **Do** use logical properties (`margin-inline-start`, `border-inline-end`, `padding-inline`, `text-align: start`) — the page already does throughout, which is what lets `dir="rtl"` surfaces work without a mirrored stylesheet.
- **Do** colour status by meaning, not by arithmetic sign.
- **Do** let a missing asset reveal an authored fallback (the ambient loop, the nameplate, the lightbox panel) rather than a broken element.

### Don't:
- **Don't** put brass on eyebrows, ticks, icon tiles, headings or hover states. That was tried; it cost the citation seal its meaning and was reverted.
- **Don't** add `direction: rtl` to `.ar` or `.ar-doc`. `unicode-bidi: isolate` alone is the rule, so Arabic keeps the alignment of the row it sits in.
- **Don't** use navy or violet as a border, divider or small fill in page chrome. They are fields.
- **Don't** introduce a new dark hex for a surface. If it needs to be darker, it needs less alpha or more blur.
- **Don't** change a pane's fill on hover — brighten its border.
- **Don't** add a third easing curve, or a second reveal gesture. One fade-up, one curve.
- **Don't** animate layout properties on scroll. The nav's condense is transform + opacity precisely so `--nav-h` and `scroll-padding-top` stay in agreement.
- **Don't** remove the `:not(.field)` in `.testimonial > *:not(.field)`; it keeps the absolutely-positioned glow out of the grid.
- **Don't** let the citation seal clip. `white-space: normal` on `.cite` is load-bearing.
- **Don't** fake a success state. The newsletter refuses rather than confirming an unrecorded subscription; hold that line for any form added here.
- **Don't** introduce raster screenshots. Every product surface on this page is markup, and the page's credibility rests on it staying that way.
- **Don't** carry these tokens into `web/`. That app is light-mode Astryx with an emerald/navy palette and Inter; this world stops at `marketing/`.
