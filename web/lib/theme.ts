// LegalOS theme: the "Stamp" identity (T-043), carried over from the
// marketing site rather than invented here.
//
// This theme used to follow PRODUCT.md's original brief -- navy #0F172A and
// emerald #10B981 -- independently of the marketing page. Marketing has since
// been rebuilt around a documented identity (marketing/assets/css/tokens.css:
// "The Stamp") -- Ink #12161C, Seal #A6301F, Paper #F6F3EE, Newsreader for
// display, Archivo for text -- and a visitor who signs up met a second,
// unrelated visual language the moment the app loaded. This theme now carries
// the same three colours and two faces, translated into Astryx's tokens
// rather than copied as raw CSS.
//
// Kept from the emerald-era reasoning below, because both still apply:
// colour stays off permanent chrome (the nav rail is neutral, not Seal) so it
// keeps meaning something on the one thing you are meant to act on, plus the
// status hues where colour *is* the information. Purple stays reserved for
// AI-surfaced UI only.
//
// Dark mode has no equivalent in the source: the Stamp identity
// (tokens.css) is light-only by its author's own account ("previously a dark
// violet-and-brass system; what survives is structure, not palette"). Rather
// than design a dark Stamp from nothing, only the light side of every token
// below moves; the dark side is untouched from the emerald theme, which
// already works and is a defensible dark posture on its own.
import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

// The identity's Arabic counterparts to Archivo/Newsreader (marketing pairs
// Latin and Arabic faces in the same stack via @font-face unicode-range, so
// the browser resolves per character rather than per language -- see
// app/globals.css, where these families are loaded and where [dir="rtl"]
// gets the Arabic-first pairing for the whole app).
const ARABIC_UI = "'Tajawal', 'Noto Naskh Arabic'";

export const legalosTheme = defineTheme({
  name: "legalos",
  extends: neutralTheme,
  color: {
    accent: "#A6301F",
    // The identity's Paper (#F6F3EE) is a warm off-white, not the untinted
    // grey the emerald era deliberately chose. "warm" is Astryx's generated
    // match for it -- the neutral ramp derives from the accent and this knob,
    // not from a separately hand-picked grey.
    neutralStyle: "warm",
    contrast: "standard",
  },
  typography: {
    // The scale still generates the leadings, weights and the display sizes;
    // the rungs the app actually reads are pinned explicitly in `tokens` below.
    scale: { base: 15, ratio: 1.2 },
    body: {
      family: "Archivo",
      fallbacks: `${ARABIC_UI}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    },
    heading: {
      // Newsreader is a display serif with no Arabic coverage of its own;
      // an Arabic heading falls through to the Arabic pairing exactly as
      // marketing's own headings do when they carry Arabic (matter names,
      // firm names).
      family: "Newsreader",
      fallbacks: `${ARABIC_UI}, Georgia, serif`,
    },
  },
  radius: { base: 4, multiplier: 0.35 },
  tokens: {
    // Type scale. A geometric progression off a 15px base gave a marketing
    // ladder (body 15, section headings 18, page titles 22) inside a tool where
    // a partner needs eight pipeline stages or six calendar weeks on screen at
    // once. These are the sizes the interface is specified in, pinned as tokens
    // so no component has to hardcode a font size; explicit tokens win over the
    // generated scale. Each rung is named for the job it does:
    //
    //   figure      26  KPI numbers                     Text size="2xl", h1
    //   page-title  22  screen titles ("CRM Pipeline")  Heading level={2}
    //   section     16  section and column headings     Heading level={3}
    //   card-title  14  card and list-row titles        Heading level={4}, Text type="label"
    //   body        13  body copy, nav labels           Text type="body"
    //   meta        12  labels, timestamps, captions    Text type="supporting"
    //   chip        11  calendar chips, badges          Text size="xsm", h6
    "--font-size-xs": "0.6875rem",
    "--font-size-sm": "0.75rem",
    "--font-size-base": "0.8125rem",
    "--font-size-lg": "1rem",
    "--font-size-xl": "1.375rem",
    "--font-size-2xl": "1.625rem",
    // Card titles sit one step above body without dragging body up with them:
    // h4 and `type="label"` both resolve to --font-size-base by default, and
    // body copy is the larger of the two populations.
    "--text-heading-4-size": "0.875rem",
    "--text-label-size": "0.875rem",

    // Surfaces. Light side is the identity's Paper/paper-lit (#F6F3EE ground,
    // white card); dark side is untouched -- the emerald theme's dark grey,
    // kept because the Stamp identity defines no dark mode of its own (see
    // the file header). Two steps only, same reasoning as before: nothing on
    // screen competes with the accent.
    "--color-background-body": ["#F6F3EE", "#0C0C0D"],
    "--color-background-surface": ["#FFFFFF", "#151516"],
    "--color-background-card": ["#FFFFFF", "#151516"],
    "--color-background-popover": ["#FFFFFF", "#1C1C1E"],
    "--color-background-inverted": ["#12161C", "#FAFAFA"],

    // Borders do the separating that shadows used to. Light side is the
    // identity's --hairline/--hairline-strong (Ink at 12%/20% alpha,
    // tokens.css:48-49); dark side unchanged.
    "--color-border": ["#12161C1F", "#FFFFFF14"],
    "--color-border-emphasized": ["#12161C33", "#FFFFFF26"],

    // Text: the identity's Ink and its two legible tints (tokens.css:59-61,
    // each ratio measured against Paper, not estimated -- see that file's
    // comment for the method). Dark side unchanged.
    "--color-text-primary": ["#12161C", "#EDEDED"],
    "--color-text-secondary": ["#565D66", "#A1A1AA"],
    "--color-text-disabled": ["#656B72", "#71717A"],

    // Elevation is gone from the resting state, as before. Light side is the
    // identity's contact-shadow pair (tokens.css:115-116: a tight dark line
    // where a sheet meets the page, a soft one under it) rather than a flat
    // black at increasing opacity; dark side unchanged.
    "--shadow-low": "0 1px 2px light-dark(rgba(18, 22, 28, 0.06), oklch(0 0 0 / 40%))",
    "--shadow-med": "0 2px 5px light-dark(rgba(18, 22, 28, 0.07), oklch(0 0 0 / 50%))",
    "--shadow-high": "0 14px 30px -14px light-dark(rgba(18, 22, 28, 0.22), oklch(0 0 0 / 60%))",

    // Corners: the identity's own scale (tokens.css:95-98), and its own
    // reasoning -- "a printed identity: filings, letterhead, a punch struck
    // into paper -- none of that is round." Same four steps as before, same
    // relative order, now near-flat instead of "drawn on purpose."
    "--radius-inner": "2px",
    "--radius-element": "3px",
    "--radius-container": "4px",
    "--radius-page": "5px",
  },
  components: {
    // The shell is the app's outer boundary: it is exactly one viewport tall,
    // and scrolling happens in a region inside it, never on the page. AppShell
    // sets the height but leaves overflow visible, so anything that overflows
    // its region -- a recharts wrapper that measures itself a few hundred
    // pixels too tall on /reports and /time-tracking is the current example --
    // pushes the document itself into scrolling, dragging the sidebar and top
    // bar off screen with it. Clipping here keeps a stray overflow a bug in
    // one region instead of a broken page.
    "app-shell": {
      base: { overflow: "hidden" },
    },
    // Astryx's Layout deliberately bleeds out of its container to cancel
    // AppShell's contentPadding, on the assumption the page re-supplies
    // padding through LayoutHeader/LayoutContent. Every page here passes
    // padding={0} (and LayoutContent's default inside a bleeding Layout is 0
    // anyway), so the net gutter was zero: body text sat 8px from the sidebar
    // and table cells touched the right window edge.
    //
    // The bleed is two coupled parts, and cancelling only one is what put a
    // second scrollbar on every screen: negative margins of one container
    // padding, plus `height: calc(100% + padding-block-start + padding-block-end)`
    // to make up for them. Zeroing the four vars the component reads cancels
    // both at once, so the page Layout is exactly as tall as the space it sits
    // in. Overriding `margin` alone left the height 48px too tall for its
    // parent, which made AppShell's <main> scroll by 48px on every page --
    // underneath the page's own scroll region.
    layout: {
      base: {
        "--container-padding-inline-start": "0px",
        "--container-padding-inline-end": "0px",
        "--container-padding-block-start": "0px",
        "--container-padding-block-end": "0px",
      },
    },
    // Badges carry two different jobs and were drawn the same loud way. The
    // status variants become tinted rather than filled: a solid #ffce2f block
    // for "Conflict flagged" pulls the eye harder than the matter name above
    // it, and on a board with several flagged leads the screen turns into
    // warning colour. The tint keeps the same hue and the same meaning at a
    // fraction of the weight. Neutral badges (counts, enumerated states) drop
    // to the muted surface, where they read as a label rather than a chip.
    badge: {
      "variant:neutral": {
        backgroundColor: "var(--color-background-muted)",
        color: "var(--color-text-secondary)",
      },
      "variant:info": {
        backgroundColor: "var(--color-background-blue)",
        color: "var(--color-text-blue)",
      },
      "variant:success": {
        backgroundColor: "var(--color-background-green)",
        color: "var(--color-text-green)",
      },
      "variant:warning": {
        backgroundColor: "var(--color-background-yellow)",
        color: "var(--color-text-yellow)",
      },
      "variant:error": {
        backgroundColor: "var(--color-background-red)",
        color: "var(--color-text-red)",
      },
    },
    // The neutral base theme hardcodes a blue fill on the accent progress bar
    // (`.astryx-progressbar.accent { --color-accent: #0074e2 }`), which token
    // overrides alone cannot reach. Point it back at the emerald accent so
    // utilization and risk bars match the rest of the interface.
    progressbar: {
      "variant:accent": { "--color-accent": "var(--color-text-accent)" },
    },
  },
});
