# alsigil — marketing site

A single-page landing page for alsigil, in the "The Stamp" identity: Paper, Ink and one Seal. Self-contained static HTML,
CSS and JavaScript: no build step, no dependencies, no runtime network calls.

It lives outside `web/` on purpose. The product app is Clerk-gated, Arabic-first
and RTL, and wraps every route in the app `Shell`; a public LTR marketing page
inside it would have to opt out of all three. Here it can also deploy to its own
domain, and its hero video is not competing with an app bundle for the first
paint.

## Run it

```
cd marketing
python3 -m http.server 8899      # or any static server
open http://127.0.0.1:8899/
```

Deploy by uploading the folder. Vercel, Netlify, Cloudflare Pages and S3 all
serve it as-is; there is nothing to build.

## Structure

```
index.html                 the whole page, including the direction contract at the top of <body>
assets/css/tokens.css      faces, tokens, reset, and the primitives every section reuses
assets/css/sections.css    section layout + the .ui product-surface system
assets/js/site.js          reveal, nav, tabs/accordion, counters, carousel, lightbox, video, parallax
assets/fonts/*.woff2       self-hosted IBM Plex Sans Arabic (300, 400, 500, 600, 700) and Material Symbols Rounded
ar/index.html              the Arabic page — GENERATED, do not edit
i18n/ar.json               the Arabic copy, keyed by the English string
scripts/build-ar.py        generates ar/index.html from the two above
assets/img/                favicon, hero + tour posters, OG card
```

Typography: **IBM Plex Sans Arabic** carries all typography roles across Latin and Arabic
scripts (display, headings, text, UI, and document body), self-hosted with no external CDN requests.
**Material Symbols Rounded** carries UI icon glyphs.

## What you need to supply

### 1. Video — optional, the page is complete without it

There is no `.mp4` in the repo. Three slots are wired and will pick a file up
automatically on the next load:

| Drop a file at | What it does |
|---|---|
| `assets/video/hero-loop.mp4` | Hero background. Fades in over the authored loop once buffered. |
| `assets/video/tour.mp4` | Plays in the "Watch the 2-min tour" lightbox. |
| `assets/video/cta-texture.mp4` | Subtle texture behind the final CTA panel. |

Until then the hero runs an **authored ambient loop** — the product's own
surfaces cross-dissolving on a 27-second cycle: a matter board breathing, an
Arabic contract clause resolving to its article of law, a matter timeline
drawing itself. It is built in CSS and SVG, not a placeholder rectangle, and it
is what the page ships with today.

Behaviour that already works and that a real file inherits:

- Poster (`assets/img/hero-poster.svg`) paints first; the film fades in on `canplay`.
- **Phones** never fetch the film. They get the poster, and the ambient loop is
  switched off so its statute text cannot compete with the headline.
- **`prefers-reduced-motion`** swaps to the static poster frame everywhere.
- A missing file is silent: no broken player, no console noise the visitor sees.

Shoot the hero at 1920×1080 or wider, 8–15 seconds, seamless loop, ~2–4 MB
H.264, no audio track. Slow cross-dissolves between product screens; per the
brief, no stock footage of people shaking hands.

### 2. Assets

| File | Notes |
|---|---|
| `assets/img/partner-portrait.jpg` | Testimonial headshot, portrait crop, ~600×750. Until it exists, an authored slate nameplate fills the same slot; the `<img>` hides itself on error, so adding the file is the only step. |

### 3. Claims that need a real source before this page goes live

Everything below is **illustrative** and is labelled as such in the footer
compliance line. None of it should be published as fact without evidence.

| Where | Claim | Status |
|---|---|---|
| Stats band | 3,000+ firms · $12B+ billings · 2M+ matters | From the brief. No source. Replace or remove. |
| Logo marquee | Eight named firms | Invented. Replace with real customer logos and written permission, or cut the section. |
| Testimonial | Nour El Nadi quote, "40% more billable hours captured" | Invented. Needs a real, approved customer quote. |
| Feature tabs | Four one-line client quotes | Invented. Same. |
| Case study | 12-lawyer firm, doubled collections | Invented. Needs the real engagement or removal. |
| Security | SOC 2 Type II, ISO/IEC 27001, regional data residency | **Aspirational.** The badge copy is worded as "built to" and "attestation in progress" rather than asserting a completed audit, and the footer disclosure names certifications explicitly. Reword to a plain claim only once certified. |
| Integrations | 16 named products | Reflects intent, not shipped connectors. The footer disclosure covers this; confirm each one before implying availability. |
| Insights | Four articles with named authors | Placeholder cards. Point at real posts or remove the carousel. |

Two things on the page **are** true and verifiable from `PRODUCT.md`: the corpus
figure (6,985 articles of Egyptian law, 78 instruments) and the Arabic-first,
RTL-native claim. The Arabic matter names, statute references and screen data in
the product mockups are sample content, chosen to be plausible rather than real
— the law citations (Civil Code 131/1948 art. 147 and 217, Labour Law 12/2003
art. 122) are genuine Egyptian statute references used as demonstration data.

### 4. Forms and routes

**Newsletter.** Add `data-endpoint="https://…"` to the `<form class="news">` in
`index.html` and it POSTs `{ "email": "…" }` there, handling the pending,
success and failure states. Without that attribute it validates the address and
then says signup is not connected — deliberately, because confirming a
subscription nobody recorded is worse than admitting the form is not wired.

**Routes.** Links to sections on this page are anchors. Everything else points
at the path that page will live on, so nothing dead-ends in the footer:

```
/demo                /demo?team=sales      /pricing        /sign-in
/developers          /platform/reporting   /insights       /insights/<slug>
/case-studies/cairo-counsel                /careers        /contact
/legal/{privacy,terms,data-processing,sub-processors,data-residency}
/ar                  (Arabic version of this page)
```

Build those, or change the hrefs. Social links point at real profile URLs that
do not exist yet.

## Notes for whoever picks this up

- **Localisation.** The brief was written for a US market (AmLaw 100, IOLTA,
  LEDES, court e-filing). It is localised here for Egypt and MENA — client-money
  ledgers rather than IOLTA trust accounting, ETA e-invoicing, Fawry and Paymob,
  LEDES kept only as an export for international counsel. The page is in English;
  the Arabic on it is product data, not translation.
- **The `.ui` system** is one component family. Every product screenshot on the
  page is real markup that scales from a single `font-size` on `.ui`, so a
  screenshot resizes without touching an interior rule. Nothing is a raster.
- **Accessibility.** Tabs use a real tablist with roving tabindex and arrow keys;
  below 900px the same panels become an accordion with its own headers. The
  lightbox traps focus and restores it. Content is visible by default — the
  reveal class is added by script, so a JS failure shows the page rather than a
  blank one.
- **Brass is not a decorative accent.** `#E0A44C` is spent only on material
  that resolves to a source: citation seals, the clause an AI finding is
  anchored to, the security attestation marks, and the three verifiable proof
  points under the hero. Selection, status and emphasis are ink or neutral.
  An earlier pass had the accent on every eyebrow, tick and icon tile, which cost
  the citation seal its meaning. Keep it scarce.
- **The direction contract** is the HTML comment at the top of `<body>`. It
  records what this page is committed to. Read it before changing the look.

## The Arabic page

The page ships in both languages at two URLs: English at `/`, Arabic at `/ar`,
each with `hreflang` pointing at the other. The Arabic one is **generated** —
edit `index.html` and `i18n/ar.json`, never `ar/index.html`:

```
python3 scripts/build-ar.py           # rewrite ar/index.html
python3 scripts/build-ar.py --check   # exit 1 if stale or incomplete
```

Three things worth knowing before touching it:

- **A separate URL, not a toggle.** Most of this market reads Arabic, so the
  Arabic copy has to be in the HTML a crawler receives rather than swapped in
  after load.
- **Any new English string fails loudly.** The build reports every text node
  that is in neither `translate` nor the `keep` list, so copy cannot ship
  half-translated. Run `--check` after editing copy.
- **RTL is almost free.** The layout is written in logical properties, so
  `dir="rtl"` on `<html>` flips it. The exceptions are collected in one block
  at the end of `sections.css`: the ambient loop and the decorative fields,
  which are positioned in physical space on purpose.

What is *not* translated is as deliberate as what is: brand names, API
literals, and the wordmark, which stays Latin because the identity sheet has no
Arabic mark yet. Firm and person names *are* translated — the English page is
already bilingual in its marquee, and the product's own Arabic catalog names
firms in Arabic.
