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
    // Astryx's Layout deliberately bleeds -24px to cancel AppShell's
    // contentPadding, on the assumption the page re-supplies padding through
    // LayoutHeader/LayoutContent. Every page here passes padding={0} (and
    // LayoutContent's default inside a bleeding Layout is 0 anyway), so the
    // net gutter was zero: body text sat 8px from the sidebar and table
    // cells touched the right window edge. Cancelling the bleed once here
    // restores the shell's own 24px gutter across all ~29 pages instead of
    // re-specifying padding in each of them.
    layout: {
      base: { margin: "0" },
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
