"use client";

/**
 * The rendering half of the visual distinction table (lib/distinction.ts).
 *
 * Each component here is the one way a screen shows a classified value, so
 * the colour, the glyph and the label always arrive together: a type badge
 * without its icon, or a status dot without its word, cannot be built from
 * these -- which is how the "colour is never the only carrier" rule is kept
 * by construction rather than by review.
 */

import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Token } from "@astryxdesign/core/Token";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import type { InvoiceStatus, MatterStatus } from "@/lib/practice";
import {
  DOT_VARIANT,
  INVOICE_STATUS_MARK,
  MATTER_STATUS_MARK,
  PROXIMITY_MARK,
  matterTypeMark,
  proximityOf,
  type StateMark,
} from "@/lib/distinction";

// --- matter type -------------------------------------------------------------

/**
 * The matter type as a tinted badge: hue + glyph + translated label. The same
 * element wherever a type is shown, so a "real estate" file is green with a
 * house in the list, on its own page, on the client card and in the tree.
 */
export function MatterTypeBadge({ type }: { type: string | null | undefined }) {
  const enumLabel = useEnumLabel();
  const mark = matterTypeMark(type);
  return (
    <Badge
      variant={mark.hue}
      icon={<Icon icon={mark.icon} size="sm" color="inherit" />}
      label={enumLabel(type)}
    />
  );
}

/**
 * The type's glyph on its hue, for row leaders where the label is already
 * printed in the row's own text (a list description, a tree label). A Token
 * with the label visually hidden: the same palette name as the badge, so the
 * colour is the theme's and the contrast is the theme's, and the type name
 * stays in the accessible name for anyone not reading it off the row.
 */
export function MatterTypeIcon({ type }: { type: string | null | undefined }) {
  const enumLabel = useEnumLabel();
  const mark = matterTypeMark(type);
  return (
    <Token
      size="sm"
      color={mark.hue}
      icon={<Icon icon={mark.icon} size="xsm" color="inherit" />}
      label={enumLabel(type)}
      isLabelHidden
    />
  );
}

// --- semantic states ---------------------------------------------------------

/** A tinted badge for a semantic state: tone + glyph + label. */
function StateBadge({ mark, label }: { mark: StateMark; label: string }) {
  return (
    <Badge
      variant={mark.tone}
      icon={<Icon icon={mark.icon} size="sm" color="inherit" />}
      label={label}
    />
  );
}

/**
 * The quieter form for dense tables: a dot, then the glyph, then the word. A
 * pill on every row makes a column into a block of colour; this is the same
 * information at a whisper, and it lines up with the text columns.
 */
function StateDot({
  mark,
  label,
  isEmphasized = false,
}: {
  mark: StateMark;
  label: string;
  isEmphasized?: boolean;
}) {
  const color = isEmphasized ? "primary" : "secondary";
  return (
    <HStack gap={1.5} vAlign="center">
      <StatusDot variant={DOT_VARIANT[mark.tone]} label={label} />
      <Icon icon={mark.icon} size="sm" color={color} />
      <Text type="body" color={color} weight={isEmphasized ? "medium" : "normal"}>
        {label}
      </Text>
    </HStack>
  );
}

export type StateMarkForm = "badge" | "dot";

/** Matter status. Active is the emphasised one (see MATTER_STATUS_MARK). */
export function MatterStatusMark({
  status,
  form = "badge",
}: {
  status: MatterStatus;
  form?: StateMarkForm;
}) {
  const enumLabel = useEnumLabel();
  const mark = MATTER_STATUS_MARK[status];
  const label = enumLabel(status);
  return form === "badge" ? (
    <StateBadge mark={mark} label={label} />
  ) : (
    <StateDot mark={mark} label={label} isEmphasized={mark.isEmphasized} />
  );
}

/** Invoice status: draft, sent, paid, overdue. */
export function InvoiceStatusMark({
  status,
  form = "badge",
}: {
  status: InvoiceStatus;
  form?: StateMarkForm;
}) {
  const enumLabel = useEnumLabel();
  const mark = INVOICE_STATUS_MARK[status];
  const label = enumLabel(status);
  return form === "badge" ? (
    <StateBadge mark={mark} label={label} />
  ) : (
    <StateDot mark={mark} label={label} />
  );
}

// --- proximity ---------------------------------------------------------------

/**
 * The warning gradient for a dated commitment: nothing when it is more than a
 * week out, then "this week" (info) < "today" (warning) < "overdue" (error).
 * Renders null outside the bands so callers can drop it into a row
 * unconditionally.
 */
export function ProximityBadge({ date }: { date: string | null | undefined }) {
  const t = useTranslator();
  const band = proximityOf(date);
  if (!band) return null;
  const mark = PROXIMITY_MARK[band];
  return <StateBadge mark={mark} label={t(mark.labelKey)} />;
}
