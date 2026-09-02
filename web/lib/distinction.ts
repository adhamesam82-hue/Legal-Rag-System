// -----------------------------------------------------------------------------
// The visual distinction table (T-035, ui-upgrade-spec §6).
//
// One place decides what colour and what glyph each classified value carries,
// and every screen reads from it -- the matters list, the matter file, the
// client card, the documents tree, the calendar. A type that is blue with a
// scale on one screen and grey text on another means two sources of truth,
// which is the failure this file exists to make impossible.
//
// Rules this table is built under, each one a reason a change here can be
// wrong even when it compiles:
//
// 1. Colours are design-system palette names (`Badge` / `Token` variants), never
//    hex. The theme resolves each name to a background/text pair whose contrast
//    it guarantees on both the light and the dark surface; a hand-picked value
//    would have to prove that for itself in every theme, twice.
// 2. Fourteen matter types share nine hues. Astryx ships ten non-semantic hues;
//    purple is reserved for AI-surfaced UI (lib/theme.ts), which leaves nine.
//    So hues repeat, and the glyph is what keeps two same-hue types apart:
//    no two types share BOTH hue and glyph, and no hue is reused by two types
//    that sit next to each other in MATTER_TYPES (a picker lists them in that
//    order, and adjacent twins would read as one group).
// 3. Colour is never the only carrier. Every mark here pairs a hue or tone with
//    a glyph, and the components that render them always print the label too
//    -- the screen has to survive protanopia, deuteranopia and a black-and-white
//    printout. tests/test_visual_distinction.py checks the pairs are unique and
//    the tokens clear WCAG AA in both modes.
//
// Pure data and arithmetic only: no JSX here, so the table can be imported by
// anything (including a test that reads it as text) without pulling React in.
// The rendering lives in components/Distinction.tsx.
// -----------------------------------------------------------------------------

import type { ComponentType, SVGProps } from "react";
import {
  ArchiveBoxIcon,
  BellAlertIcon,
  BoltIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  HandRaisedIcon,
  HomeModernIcon,
  LightBulbIcon,
  LockClosedIcon,
  PaperAirplaneIcon,
  PauseCircleIcon,
  PencilIcon,
  PlayCircleIcon,
  ReceiptPercentIcon,
  ScaleIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import {
  daysUntil,
  type InvoiceStatus,
  type MatterStatus,
  type MatterType,
} from "@/lib/practice";

/** An outline glyph from @heroicons, as `Icon` accepts it. */
export type Glyph = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * The non-semantic palette hues a category may take. These are the `Badge`
 * colour variants minus purple (AI-only, see lib/theme.ts). `gray` is the
 * deliberate "unclassified" hue: it is what a type looks like when it carries
 * no category information of its own.
 */
export type PaletteHue =
  | "blue"
  | "cyan"
  | "green"
  | "orange"
  | "pink"
  | "red"
  | "teal"
  | "yellow"
  | "gray";

export interface TypeMark {
  hue: PaletteHue;
  icon: Glyph;
}

/**
 * Matter type -> hue + glyph. The fourteen creatable types plus the read-only
 * legacy marker, which shares the grey of "other" because both mean "not yet
 * classified" -- and takes an archive box so the two still differ.
 *
 * Hue pairs (each pair split by glyph): blue = civil/labour,
 * orange = commercial/tax, teal = corporate/arbitration,
 * green = real estate/execution, cyan = administrative/advisory,
 * gray = other/legacy. Criminal (red), IP (pink) and family (yellow) are alone
 * on their hue; criminal is the one type whose hue is meant to be read as a
 * warning on its own, and it is the one that gets the warning-coloured hue.
 */
export const MATTER_TYPE_MARK: Record<MatterType, TypeMark> = {
  civil: { hue: "blue", icon: ScaleIcon },
  criminal: { hue: "red", icon: ShieldExclamationIcon },
  commercial: { hue: "orange", icon: BuildingStorefrontIcon },
  corporate: { hue: "teal", icon: BuildingOffice2Icon },
  real_estate: { hue: "green", icon: HomeModernIcon },
  intellectual_property: { hue: "pink", icon: LightBulbIcon },
  administrative: { hue: "cyan", icon: BuildingLibraryIcon },
  family_personal_status: { hue: "yellow", icon: UsersIcon },
  labour: { hue: "blue", icon: WrenchScrewdriverIcon },
  tax: { hue: "orange", icon: ReceiptPercentIcon },
  arbitration: { hue: "teal", icon: HandRaisedIcon },
  execution: { hue: "green", icon: BoltIcon },
  advisory: { hue: "cyan", icon: DocumentTextIcon },
  other: { hue: "gray", icon: Squares2X2Icon },
  legacy_litigation: { hue: "gray", icon: ArchiveBoxIcon },
};

/** Look a type up without trusting the value: an unknown string (a new enum
 *  member added server-side before this table learns it) falls back to the
 *  "other" mark instead of crashing the row. */
export function matterTypeMark(type: string | null | undefined): TypeMark {
  return (type && MATTER_TYPE_MARK[type as MatterType]) || MATTER_TYPE_MARK.other;
}

/**
 * The semantic tones. These are Badge's five status variants; the theme tints
 * them (lib/theme.ts) rather than filling them so a status does not shout
 * louder than the name beside it.
 */
export type Tone = "neutral" | "info" | "success" | "warning" | "error";

/** StatusDot has no `info`; `accent` is its equivalent. */
export const DOT_VARIANT: Record<
  Tone,
  "neutral" | "accent" | "success" | "warning" | "error"
> = {
  neutral: "neutral",
  info: "accent",
  success: "success",
  warning: "warning",
  error: "error",
};

export interface StateMark {
  tone: Tone;
  icon: Glyph;
}

/**
 * Matter status. "The current one is emphasised": active is the state a firm
 * acts on, so it is the one drawn in a positive tone; on hold warns; closed
 * recedes to neutral -- a closed file should be the quietest row in the list.
 */
export const MATTER_STATUS_MARK: Record<MatterStatus, StateMark & { isEmphasized: boolean }> = {
  active: { tone: "success", icon: PlayCircleIcon, isEmphasized: true },
  on_hold: { tone: "warning", icon: PauseCircleIcon, isEmphasized: false },
  closed: { tone: "neutral", icon: LockClosedIcon, isEmphasized: false },
};

/** Invoice status: draft, sent, paid, overdue, in escalating attention. */
export const INVOICE_STATUS_MARK: Record<InvoiceStatus, StateMark> = {
  draft: { tone: "neutral", icon: PencilIcon },
  sent: { tone: "info", icon: PaperAirplaneIcon },
  paid: { tone: "success", icon: CheckCircleIcon },
  overdue: { tone: "error", icon: ExclamationTriangleIcon },
};

/**
 * How near a dated commitment is. The three named bands form the warning
 * gradient the spec asks for -- this week < today < overdue -- and anything
 * further out is `null`: no mark at all, because a badge on every row is the
 * row style, not a signal (the dashboard learned that the hard way and the
 * comment there still says so).
 */
export type Proximity = "overdue" | "today" | "this_week";

/** Mildest first, so `PROXIMITY_ORDER.indexOf` ranks severity. */
export const PROXIMITY_ORDER: Proximity[] = ["this_week", "today", "overdue"];

export const PROXIMITY_MARK: Record<Proximity, StateMark & { labelKey: string }> = {
  this_week: {
    tone: "info",
    icon: CalendarDaysIcon,
    labelKey: "@legalos.distinction.proximity.thisWeek",
  },
  today: {
    tone: "warning",
    icon: BellAlertIcon,
    labelKey: "@legalos.distinction.proximity.today",
  },
  overdue: {
    tone: "error",
    icon: ExclamationTriangleIcon,
    labelKey: "@legalos.distinction.proximity.overdue",
  },
};

/** Days until the last day that still counts as "this week". Seven, not
 *  "until Saturday": a hearing six days away is as near on a Sunday as on a
 *  Thursday, and the firm's week boundary is not something this app knows. */
export const THIS_WEEK_DAYS = 7;

/** Band for a whole-day distance (the output of `daysUntil`). Pure, so it can
 *  be checked without a clock. */
export function proximityOfDays(days: number): Proximity | null {
  if (!Number.isFinite(days)) return null;
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= THIS_WEEK_DAYS) return "this_week";
  return null;
}

/** Band for an ISO date measured from today, on the same arithmetic every
 *  other countdown in the app uses. */
export function proximityOf(iso: string | null | undefined): Proximity | null {
  return proximityOfDays(daysUntil(iso));
}
