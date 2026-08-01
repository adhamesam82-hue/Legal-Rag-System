// LegalOS theme: emerald interactive accent, deep-navy dark surfaces, Inter
// type, layered on Astryx's neutral base rather than replacing it. Purple
// (Astryx's built-in --color-*-purple roles) is reserved for AI-surfaced UI
// only, never used as a general accent.
import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

export const legalosTheme = defineTheme({
  name: "legalos",
  extends: neutralTheme,
  color: {
    accent: "#10B981",
    neutralStyle: "cool",
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

    // Dark surfaces read as navy, not Astryx's default near-black — this is
    // what gives the SideNav (forced to mode="dark" regardless of the app's
    // own light/dark setting, see Shell.tsx) its brand deep-navy rail color.
    "--color-background-body": ["#F8FAFC", "#0B1220"],
    "--color-background-surface": ["#FFFFFF", "#111C33"],
    "--color-background-card": ["#FFFFFF", "#111C33"],
    "--color-background-popover": ["#FFFFFF", "#16203B"],
    "--color-background-inverted": ["#0F172A", "#F8FAFC"],
    "--color-border": ["#0F172A14", "#F8FAFC1F"],
    "--color-border-emphasized": ["#0F172A26", "#F8FAFC33"],
  },
  components: {
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
    // The neutral base theme hardcodes a blue fill on the accent progress bar
    // (`.astryx-progressbar.accent { --color-accent: #0074e2 }`), which token
    // overrides alone cannot reach. Point it back at the emerald accent so
    // utilization and risk bars match the rest of the interface.
    progressbar: {
      "variant:accent": { "--color-accent": "var(--color-text-accent)" },
    },
  },
});
