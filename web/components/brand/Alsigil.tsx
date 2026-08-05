/**
 * The alsigil mark.
 *
 * The identity sheet ends with four misuse cases — never recolour the punch,
 * never stretch, never set in caps, never add effects. Written down, those are
 * four things a reviewer has to remember. Built this way they are four things
 * that cannot be typed:
 *
 *   - no colour prop exists; `tone` picks one of the three sanctioned pairings
 *   - the SVG carries `preserveAspectRatio`, so a stylesheet that sets both
 *     dimensions letterboxes the mark instead of distorting it
 *   - the wordmark is outlined, so there is no text for `text-transform` to
 *     reach — and no webfont to load, fail, or substitute
 *   - there is no shadow, glow, or filter prop
 *
 * That leaves clear space and minimum size, which are facts about a rendered
 * result rather than about a call site, so those two get a runtime check in
 * development instead.
 */

import type { CSSProperties } from "react";

import { INITIAL, MONOGRAM, WORDMARK, type OutlinedMark } from "@/lib/brand/marks";
import {
  ICON,
  ICON_DOT_MIN_PX,
  ICON_MONOGRAM_MIN_PX,
  INK,
  LOCKUP_INK,
  LOCKUP_MIN_WIDTH_PX,
  PAPER,
  PUNCH_CENTRE_ABOVE_BASELINE,
  PUNCH_DIAMETER,
  PUNCH_GAP,
  RULED,
  SEAL,
  STACKED,
  clearSpacePx,
  counterRatio,
} from "@/lib/brand/geometry";

/**
 * Which colourway.
 *
 * `seal` and `reversed` are the sheet's two plates, fixed: the seal punch with
 * the wordmark in ink, and the same punch with the wordmark in paper. `mono`
 * is its one-colour plate, drawn in `currentColor` so the mark can take the
 * colour of whatever it sits in — a print stylesheet, a hover state — while
 * still being one colour, which is what that plate is for.
 *
 * `auto` is the pair the sheet does not have and a themed product needs. Its
 * two plates differ only in whether the wordmark is ink or paper, which is a
 * question about the surface; in an app with a light and a dark mode the
 * surface is the theme's decision, not the mark's. So: the seal punch, with
 * the wordmark in `currentColor`. The counter is a knockout rather than a
 * painted circle, so the punch works out in either mode without help.
 */
export type Tone = "seal" | "reversed" | "mono" | "auto";

/** Which of the sheet's arrangements. `wordmark` is the plate to reach for
 *  below the lockup's minimum width, not a stylistic alternative. */
export type Lockup = "horizontal" | "stacked" | "ruled" | "wordmark";

type AlsigilProps = {
  lockup?: Lockup;
  tone?: Tone;
  /** Rendered width of the mark's ink, in CSS px. Height follows from it. */
  width?: number;
  /** Reserve the sheet's clear space — one punch diameter on every side — as
   *  padding, so neighbouring content cannot crowd the mark. */
  clearSpace?: boolean;
  /** The descriptor beside (ruled) or under (stacked) the wordmark. Unlike the
   *  mark this is live text: in an Arabic UI it is Arabic. The wordmark stays
   *  Latin, the words around it do not. */
  descriptor?: string;
  className?: string;
};

/** Paints for each colourway: the punch and the wordmark. */
const TONES: Record<Tone, { punch: string; word: string }> = {
  seal: { punch: SEAL, word: INK },
  reversed: { punch: SEAL, word: PAPER },
  mono: { punch: "currentColor", word: "currentColor" },
  auto: { punch: SEAL, word: "currentColor" },
};

/** The 1000-unit em grid the outlines are drawn on. */
const U = 1000;

const LOCKUP_W = LOCKUP_INK.right - LOCKUP_INK.left;
const LOCKUP_H = LOCKUP_INK.bottom - LOCKUP_INK.top;
const WORD_W = WORDMARK.ink.right - WORDMARK.ink.left;
const WORD_H = WORDMARK.ink.bottom - WORDMARK.ink.top;

const DESCRIPTOR_DEFAULT = "Legal OS";

/**
 * The punch as one path with its counter knocked out.
 *
 * Two arcs under `fill-rule: evenodd`: the inner circle subtracts from the
 * outer one rather than being painted over it, so whatever is behind the mark
 * shows through the hole. The sheet fills the counter with the surface colour,
 * which is correct on exactly the two surfaces it was drawn against and wrong
 * on a tinted card, an image, or the dark rail.
 */
function punchPath(cx: number, cy: number, r: number, counter: number): string {
  const ring = (radius: number) =>
    `M${cx - radius},${cy}a${radius},${radius} 0 1,0 ${radius * 2},0` +
    `a${radius},${radius} 0 1,0 ${-radius * 2},0Z`;
  return `${ring(r)}${ring(counter)}`;
}

/**
 * Minimum size, checked where it is knowable.
 *
 * Warns once per offending width so a mark in a list does not produce one line
 * per row, and never in production — this is a note to whoever is building the
 * screen, not a runtime concern.
 */
const warned = new Set<number>();

function checkMinimumWidth(lockup: Lockup, width: number) {
  if (process.env.NODE_ENV === "production") return;
  if (lockup === "wordmark" || width >= LOCKUP_MIN_WIDTH_PX) return;
  const rounded = Math.round(width);
  if (warned.has(rounded)) return;
  warned.add(rounded);
  console.warn(
    `[alsigil] Lockup rendered ${rounded}px wide. Below ${LOCKUP_MIN_WIDTH_PX}px ` +
      `the punch counter fills in — use lockup="wordmark", or AlsigilPunch if ` +
      `even that will not fit, rather than shrinking this further.`,
  );
}

/** The descriptor and the rule beside it sit one step back from the wordmark.
 *  On the fixed plates that is a fixed tint of the plate's own text colour; on
 *  the two that follow their surroundings it has to be an opacity, because
 *  there is no colour to tint until render. */
function recede(tone: Tone, strength: number): Pick<CSSProperties, "color" | "opacity"> {
  if (tone === "seal") return { color: `rgba(18,22,28,${strength})` };
  if (tone === "reversed") return { color: `rgba(246,243,238,${strength})` };
  return { color: "currentColor", opacity: strength };
}

/** True for text outside the Latin/Greek/Cyrillic blocks and general
 *  punctuation — Arabic, Hebrew, Thai, CJK and the rest. Written with escapes
 *  rather than literal ranges: the upper end of the punctuation block is the
 *  invisible formatting characters, and pasting those into a source file makes
 *  it read as binary to git and grep. */
const NON_LATIN = /[^\u0020-\u04FF\u1E00-\u1FFF\u2000-\u206F]/;

/**
 * Descriptor type.
 *
 * Live text, so it inherits the UI's font stack rather than Archivo: the mark
 * is artwork and the words beside it are interface.
 *
 * Wide-set uppercase is a Latin device. Arabic has no case for
 * `text-transform` to reach, and letter-spacing prises apart letters that are
 * supposed to join — "نظام قانوني" set at .24em stops looking like a word. So
 * the sheet's tracking applies to the script the sheet was drawn in, and
 * anything else is left alone.
 */
function descriptorStyle(size: number, tracking: number, tone: Tone, text: string): CSSProperties {
  const latin = !NON_LATIN.test(text);
  return {
    fontSize: size,
    letterSpacing: latin ? `${tracking}em` : undefined,
    textTransform: latin ? "uppercase" : undefined,
    fontWeight: 500,
    lineHeight: 1,
    ...recede(tone, 0.55),
  };
}

/**
 * The mark. Defaults to the primary lockup at the sheet's recommended screen
 * size.
 */
export function Alsigil({
  lockup = "horizontal",
  tone = "seal",
  width = 132,
  clearSpace = false,
  descriptor = DESCRIPTOR_DEFAULT,
  className,
}: AlsigilProps) {
  checkMinimumWidth(lockup, width);

  if (lockup === "stacked") {
    return (
      <Stacked
        tone={tone}
        width={width}
        descriptor={descriptor}
        clearSpace={clearSpace}
        className={className}
      />
    );
  }
  if (lockup === "ruled") {
    return (
      <Ruled
        tone={tone}
        width={width}
        descriptor={descriptor}
        clearSpace={clearSpace}
        className={className}
      />
    );
  }

  const isWordmark = lockup === "wordmark";
  const boxWidth = isWordmark ? WORD_W : LOCKUP_W;
  const boxHeight = isWordmark ? WORD_H : LOCKUP_H;
  const boxTop = isWordmark ? WORDMARK.ink.top : LOCKUP_INK.top;
  const paint = TONES[tone];
  const punchRadius = (PUNCH_DIAMETER / 2) * U;

  return (
    <svg
      className={className}
      width={width}
      height={(width / boxWidth) * boxHeight}
      viewBox={`0 ${boxTop * U} ${boxWidth * U} ${boxHeight * U}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="alsigil"
      style={
        clearSpace ? { padding: clearSpacePx(width), boxSizing: "content-box" } : undefined
      }
    >
      {isWordmark ? (
        <path
          d={WORDMARK.path}
          fill={paint.word}
          transform={`translate(${-WORDMARK.ink.left * U}, 0)`}
        />
      ) : (
        <>
          <path
            d={punchPath(
              punchRadius,
              -PUNCH_CENTRE_ABOVE_BASELINE * U,
              punchRadius,
              punchRadius * counterRatio((width / LOCKUP_W) * PUNCH_DIAMETER),
            )}
            fill={paint.punch}
            fillRule="evenodd"
          />
          <path
            d={WORDMARK.path}
            fill={paint.word}
            transform={`translate(${(PUNCH_DIAMETER + PUNCH_GAP) * U}, 0)`}
          />
        </>
      )}
    </svg>
  );
}

/**
 * The punch alone — the smallest signature the identity has, for a collapsed
 * rail or any slot too narrow for the wordmark. `size` is the disc, not a box
 * around it: the punch has no padding of its own.
 */
export function AlsigilPunch({
  size = 18,
  tone = "seal",
  label = "alsigil",
  className,
}: {
  size?: number;
  tone?: Tone;
  /** Empty when the punch sits beside a wordmark that already names it. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <path
        d={punchPath(50, 50, 50, 50 * counterRatio(size))}
        fill={TONES[tone].punch}
        fillRule="evenodd"
      />
    </svg>
  );
}

/* --- The icon tile -------------------------------------------------------- */

/** Places an outlined mark's ink centred in the 100-unit tile, leaving room
 *  for `extraBelow` units of anything sitting under it. Returns tile-unit
 *  coordinates for the pen origin and the baseline. */
function placeInTile(mark: OutlinedMark, size: number, extraBelow = 0) {
  const inkHeight = (mark.ink.bottom - mark.ink.top) * size;
  const top = (100 - (inkHeight + extraBelow)) / 2;
  return {
    x: 50 - ((mark.ink.left + mark.ink.right) / 2) * size,
    baseline: top - mark.ink.top * size,
    inkBottom: top + inkHeight,
  };
}

/**
 * The app icon: the mark on a tile, for the places that want a square rather
 * than a lockup — a launcher, a tab, an OG card, a collapsed rail.
 *
 * Which plate it draws is decided by `size`, because that is the fact the
 * choice actually depends on. The sheet lists four sizes and quietly drops the
 * seal dot between two of them and changes the mark entirely at the fourth;
 * asking a caller to know that is asking them to reread the sheet, so the
 * component reads it instead.
 */
export function AlsigilIcon({
  size = 64,
  className,
  label = "alsigil",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  const common = {
    className,
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    preserveAspectRatio: "xMidYMid meet" as const,
    role: "img" as const,
    "aria-label": label || undefined,
    "aria-hidden": label ? undefined : true,
  };

  // Too small for the monogram: the initial, knocked out of the seal. The one
  // plate that puts the seal behind the mark rather than beside it — at this
  // size the colour is doing the identifying.
  if (size < ICON_MONOGRAM_MIN_PX) {
    const a = placeInTile(INITIAL, ICON.initialSize);
    return (
      <svg {...common}>
        <rect width="100" height="100" rx={ICON.faviconRadius} fill={SEAL} />
        <path
          d={INITIAL.path}
          fill={PAPER}
          transform={`translate(${a.x} ${a.baseline}) scale(${ICON.initialSize / 1000})`}
        />
      </svg>
    );
  }

  const withDot = size >= ICON_DOT_MIN_PX;
  const monogramSize = withDot ? ICON.monogramSize : ICON.monogramSizeAlone;
  const dotBlock = withDot ? ICON.dotGap + ICON.dotRadius * 2 : 0;
  const al = placeInTile(MONOGRAM, monogramSize, dotBlock);

  return (
    <svg {...common}>
      <rect width="100" height="100" rx={ICON.radius} fill={INK} />
      <path
        d={MONOGRAM.path}
        fill={PAPER}
        transform={`translate(${al.x} ${al.baseline}) scale(${monogramSize / 1000})`}
      />
      {withDot && (
        <circle
          cx={50}
          cy={al.inkBottom + ICON.dotGap + ICON.dotRadius}
          r={ICON.dotRadius}
          fill={SEAL}
        />
      )}
    </svg>
  );
}

/* --- Composite lockups ----------------------------------------------------
 * These two are a mark plus live text rather than a single piece of artwork,
 * so they are laid out rather than drawn. `dir="ltr"` holds the composition
 * together in an RTL page — the punch stays ahead of the wordmark and the rule
 * stays between the wordmark and the descriptor, which is how the mark is
 * drawn — while `dir="auto"` lets an Arabic descriptor set itself right-to-left
 * inside it.
 * -------------------------------------------------------------------------- */

type CompositeProps = {
  tone: Tone;
  width: number;
  descriptor: string;
  clearSpace?: boolean;
  className?: string;
};

function Stacked({ tone, width, descriptor, clearSpace, className }: CompositeProps) {
  // `width` is the wordmark's width here, since the wordmark is the widest
  // thing in the stack and therefore what the caller is sizing.
  const em = width / WORD_W;
  return (
    <div
      dir="ltr"
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: em * STACKED.gap,
        padding: clearSpace ? clearSpacePx(width) : undefined,
      }}
    >
      <AlsigilPunch size={em * STACKED.punchDiameter} tone={tone} label="" />
      <Alsigil lockup="wordmark" tone={tone} width={width} />
      <span
        dir="auto"
        style={descriptorStyle(em * STACKED.descriptorSize, STACKED.descriptorTracking, tone, descriptor)}
      >
        {descriptor}
      </span>
    </div>
  );
}

function Ruled({ tone, width, descriptor, clearSpace, className }: CompositeProps) {
  // The sheet's document plate: the mark boxed with the descriptor, for
  // filings and footers where it has to read as a stamp on a page. `width` is
  // the horizontal lockup inside the rule, so the box grows around it.
  const em = width / LOCKUP_W;
  const border = Math.max(1, em * RULED.border);
  const rule = recede(tone, 0.25);
  return (
    <div
      dir="ltr"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: em * RULED.gap,
        border: `${border}px solid ${
          tone === "seal" ? INK : tone === "reversed" ? PAPER : "currentColor"
        }`,
        padding: clearSpace
          ? clearSpacePx(width)
          : `${em * RULED.paddingBlock}px ${em * RULED.paddingInline}px`,
      }}
    >
      <Alsigil lockup="horizontal" tone={tone} width={width} />
      <span
        aria-hidden
        style={{
          width: 1,
          height: em * RULED.ruleHeight,
          background: rule.color,
          opacity: rule.opacity,
        }}
      />
      <span
        dir="auto"
        style={descriptorStyle(em * RULED.descriptorSize, RULED.descriptorTracking, tone, descriptor)}
      >
        {descriptor}
      </span>
    </div>
  );
}
