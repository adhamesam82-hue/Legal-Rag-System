// LegalOS theme: a near-neutral surface set with one accent, layered on
// Astryx's neutral base rather than replacing it.
//
// The brief's palette (PRODUCT.md) named deep navy #0F172A as the primary and
// emerald #10B981 as the accent. Navy is no longer painted on the nav rail:
// two large colour fields (navy rail, white content) made the screen read as
// two applications side by side, and colour on permanent chrome is colour that
// can never mean anything. The greys below are untinted, so the only colour on
// a screen is the accent on the one thing you are meant to act on, plus the
// status hues where the colour *is* the information (overdue, conflict
// flagged). Emerald stays that accent, one step deeper so it holds its
// contrast against white as a fill.
//
// Purple (Astryx's built-in --color-*-purple roles) is still reserved for
// AI-surfaced UI only, never used as a general accent.
import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

export const legalosTheme = defineTheme({
  name: "legalos",
  extends: neutralTheme,
  color: {
    accent: "#047857",
    // Untinted: the previous "cool" neutrals carried a blue cast that read as
    // a second colour once the navy left.
    neutralStyle: "neutral",
    contrast: "standard",
  },
  typography: {
    // The scale still generates the leadings, weights and the display sizes;
    // the rungs the app actually reads are pinned explicitly in `tokens` below.
    scale: { base: 15, ratio: 1.2 },
    body: {
      family: "Inter",
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: "Inter",
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  },
  radius: { base: 4, multiplier: 1.25 },
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

    // Surfaces. Two steps only -- the wash the app sits on and the surface
    // content sits on -- and both untinted, so nothing on screen competes with
    // the accent. Dark mode is a true dark grey rather than the old navy.
    "--color-background-body": ["#FAFAFA", "#0C0C0D"],
    "--color-background-surface": ["#FFFFFF", "#151516"],
    "--color-background-card": ["#FFFFFF", "#151516"],
    "--color-background-popover": ["#FFFFFF", "#1C1C1E"],
    "--color-background-inverted": ["#18181B", "#FAFAFA"],

    // Borders do the separating that shadows used to. They are hairlines: at
    // this weight a card reads as an area rather than an object, which is the
    // whole point of dropping the elevation.
    "--color-border": ["#18181B14", "#FFFFFF14"],
    "--color-border-emphasized": ["#18181B26", "#FFFFFF26"],

    // Text: near-black rather than black, and a secondary that is legibly
    // quieter without going pale.
    "--color-text-primary": ["#18181B", "#EDEDED"],
    "--color-text-secondary": ["#71717A", "#A1A1AA"],
    "--color-text-disabled": ["#A1A1AA", "#71717A"],

    // Elevation is gone from the resting state. The tokens stay non-empty for
    // the things that genuinely float above the page -- menus, dialogs, the
    // toolbar pill -- but even those are a single soft shadow rather than the
    // stacked three-layer set.
    "--shadow-low": "0 1px 2px light-dark(oklch(0 0 0 / 6%), oklch(0 0 0 / 40%))",
    "--shadow-med": "0 2px 8px light-dark(oklch(0 0 0 / 8%), oklch(0 0 0 / 50%))",
    "--shadow-high": "0 8px 24px light-dark(oklch(0 0 0 / 10%), oklch(0 0 0 / 60%))",

    // Corners: enough to look drawn on purpose, not enough to be a style.
    "--radius-inner": "4px",
    "--radius-element": "6px",
    "--radius-container": "8px",
    "--radius-page": "16px",
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
