/**
 * The alsigil mark, as numbers.
 *
 * Everything here is measured off the identity sheet ("alsigil — The Stamp"),
 * either read straight from its markup or measured out of a browser rendering
 * of it, so the outlined mark reproduces what the sheet shows rather than an
 * approximation of it. Units are ems of the wordmark, which is how the sheet
 * expresses every proportion.
 */

import { WORDMARK } from "./marks";

/* --- Colour ---------------------------------------------------------------
 * Three fixed hexes, deliberately not theme tokens. A theme token is a
 * decision the product is allowed to re-make per mode or per tenant; the seal
 * red is the same red on a white page, a dark page, a filing and a business
 * card. Anything that could recolour the punch would be the sheet's first
 * misuse case, so there is nowhere in this module to pass a colour in.
 * -------------------------------------------------------------------------- */
export const INK = "#12161C";
export const SEAL = "#A6301F";
export const PAPER = "#F6F3EE";

/* --- The punch ------------------------------------------------------------
 * A struck ring: a filled disc with its counter knocked out. The sheet paints
 * the counter with whatever colour is behind it (#FFF on the white card,
 * #12161C on the reversed one), which is a repaint that only works on the two
 * surfaces it was drawn for. Here the counter is a real hole (one path, even
 * -odd fill), so the mark sits on any surface — a tinted card, an image, the
 * dark rail — without a matching fill to keep in step.
 * -------------------------------------------------------------------------- */

/** Punch diameter, in ems of the wordmark.
 *
 *  The sheet's primary lockup puts a 42px punch beside a 92px wordmark, but
 *  42px is the `<svg>` box: inside it the disc is `r=46` in a 100 viewBox, so
 *  4% of the box on each side is padding and the drawn disc is 0.92 of it.
 *  Everything here measures the disc — the shape someone would put a ruler
 *  against — so 42/92 × 0.92 rather than 42/92. */
export const PUNCH_DIAMETER = (42 / 92) * 0.92;

/** How far the punch's centre sits above the wordmark's baseline. Measured
 *  from the sheet's own flex lockup in a browser (`align-items: center` over
 *  a `line-height: 1` box resolves to this against Archivo's metrics), not
 *  derived — the two disagree, and the sheet is what people have seen. */
export const PUNCH_CENTRE_ABOVE_BASELINE = 0.337;

/** Gap between the disc's right edge and the wordmark's pen origin. The
 *  sheet's 22px gap plus the 4% of padding the disc leaves inside its own box.
 *  Note this reaches the pen origin, not the ink: the `a` carries a 0.034em
 *  side bearing on top of it. */
export const PUNCH_GAP = 22 / 92 + (0.04 * 42) / 92;

/** The counter as a fraction of the punch radius: the sheet's r=17 in a
 *  r=46 disc. */
const COUNTER_RATIO = 17 / 46;

/** …and its floor value, the sheet's r=20 at the 8px punch. Below a certain
 *  rendered size a counter this small stops reading as a hole and the punch
 *  turns into a dot, so it opens up instead. */
const COUNTER_RATIO_SMALL = 20 / 46;

/** The rendered disc diameter, in CSS px, at which the counter opens up. The
 *  sheet holds r=17 down to its 12px punch (an 11px disc) and switches at its
 *  8px one (a 7.4px disc); the threshold sits between the two. */
const COUNTER_OPENS_BELOW_PX = 9;

/** Counter radius as a fraction of the punch radius, at a rendered size. */
export function counterRatio(punchDiameterPx: number): number {
  return punchDiameterPx < COUNTER_OPENS_BELOW_PX ? COUNTER_RATIO_SMALL : COUNTER_RATIO;
}

/* --- The lockup ----------------------------------------------------------- */

/** Ink box of the horizontal lockup, in ems, with the wordmark's baseline at
 *  y=0 and the punch's left edge at x=0. The box is tight to what is drawn —
 *  no side bearings, no line box — so a width in px is the width you see. */
export const LOCKUP_INK = {
  left: 0,
  right: PUNCH_DIAMETER + PUNCH_GAP + WORDMARK.ink.right,
  top: Math.min(WORDMARK.ink.top, -PUNCH_CENTRE_ABOVE_BASELINE - PUNCH_DIAMETER / 2),
  bottom: Math.max(WORDMARK.ink.bottom, -PUNCH_CENTRE_ABOVE_BASELINE + PUNCH_DIAMETER / 2),
} as const;

/* --- The composite lockups ------------------------------------------------
 * Stacked and ruled are arrangements rather than sizes, so they carry their
 * own proportions. Both are expressed in ems of their own wordmark.
 *
 * One deliberate departure from the sheet: its ruled specimen draws a chunkier
 * punch than its primary lockup (an 0.64em disc against 0.42em), the same way
 * its reversed and one-colour tiles do at 0.60em. Those are specimen tiles
 * drawn at a glance, and following each of them would put four different
 * punch-to-wordmark ratios into one product. The horizontal lockup keeps the
 * primary's proportions everywhere, including inside the rule; the counter
 * still opens at small sizes, which is the small-size rule the sheet actually
 * states. Stacked keeps its own ratio because it is drawn the same way twice
 * and reads as a seal over a signature, not as a folded lockup.
 * -------------------------------------------------------------------------- */

/** The sheet's stacked plate: a 34px punch over a 36px wordmark, 14px apart,
 *  with a 9.5px descriptor tracked out to .24em. */
export const STACKED = {
  punchDiameter: ((34 / 36) * 46) / 50,
  gap: 14 / 36,
  descriptorSize: 9.5 / 36,
  descriptorTracking: 0.24,
} as const;

/** The sheet's ruled plate, against its 26px wordmark. */
export const RULED = {
  gap: 11 / 26,
  paddingBlock: 9 / 26,
  paddingInline: 16 / 26,
  border: 2 / 26,
  ruleHeight: 20 / 26,
  descriptorSize: 10.5 / 26,
  descriptorTracking: 0.18,
} as const;

/* --- The icon tile --------------------------------------------------------
 * The sheet's icon set, in a 100-unit tile. Three plates, chosen by how many
 * pixels the tile will actually get: the monogram with its seal dot, the
 * monogram alone once the dot would be under a pixel across, and the initial
 * on seal once the monogram would be unreadable.
 *
 * The sheet centres these with `dominant-baseline="central"`, which centres
 * the em box — ascender and descender allowance included — rather than the
 * letters. Against `al`, which has an ascender but no descender, that pushes
 * the glyphs low in the tile; against `a`, which has neither, lower still.
 * Outlines have no em box to get in the way, so these centre the ink, which
 * is what the sheet was asking for.
 * -------------------------------------------------------------------------- */

export const ICON = {
  /** Corner radius of the tile, and of the smaller favicon plate. */
  radius: 23,
  faviconRadius: 20,
  /** Monogram size when the seal dot is under it, and when it is alone. */
  monogramSize: 58,
  monogramSizeAlone: 66,
  /** The dot, and its distance below the monogram's ink. */
  dotRadius: 6,
  dotGap: 3,
  /** The initial, on the favicon plate. */
  initialSize: 72,
} as const;

/** Below this rendered tile size the seal dot stops resolving, so the
 *  monogram goes it alone. The sheet drops the dot between its 64 and 32
 *  plates. */
export const ICON_DOT_MIN_PX = 40;

/** …and below this the monogram itself stops resolving and the tile falls
 *  back to the initial on seal. The sheet's 16px favicon. */
export const ICON_MONOGRAM_MIN_PX = 24;

/* --- The rules ------------------------------------------------------------
 * The sheet states these as prose next to a specimen. Stated as numbers they
 * can be asserted against, which is the only version of a rule that survives
 * contact with a codebase.
 * -------------------------------------------------------------------------- */

/** Clear space is one punch diameter on all sides, expressed against the
 *  lockup's rendered width. */
export function clearSpacePx(lockupWidthPx: number): number {
  return (lockupWidthPx / (LOCKUP_INK.right - LOCKUP_INK.left)) * PUNCH_DIAMETER;
}

/** Below this the punch counter fills in; drop the punch and set the wordmark
 *  alone rather than shrink the lockup further. */
export const LOCKUP_MIN_WIDTH_PX = 64;

/** The sheet's recommended screen minimum — the size at which the lockup is
 *  comfortable rather than merely legible. */
export const LOCKUP_SCREEN_MIN_WIDTH_PX = 96;

/** And in print. */
export const LOCKUP_MIN_WIDTH_MM = 22;
