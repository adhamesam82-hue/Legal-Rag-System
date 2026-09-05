import React from "react";

export type BadgeVariant = "soft" | "solid" | "outline" | "dot";

export type BadgeColor = "primary" | "success" | "warn" | "danger" | "info" | "accent" | "neutral";

export type DocumentStatus = "draft" | "review" | "signed" | "filed" | "final";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  documentStatus?: DocumentStatus;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

// توثيق حالات المستندات الخمس بحسب القالب المعماري
const DOCUMENT_STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; fg: string; bg: string; colorKey: BadgeColor }
> = {
  draft: {
    label: "مسودة",
    fg: "var(--text2)",
    bg: "var(--surface3)",
    colorKey: "neutral",
  },
  review: {
    label: "قيد المراجعة",
    fg: "var(--warn)",
    bg: "var(--warn-soft)",
    colorKey: "warn",
  },
  signed: {
    label: "موقَّع",
    fg: "var(--success)",
    bg: "var(--success-soft)",
    colorKey: "success",
  },
  filed: {
    label: "مودَع",
    fg: "var(--info)",
    bg: "var(--info-soft)",
    colorKey: "info",
  },
  final: {
    label: "نهائي",
    fg: "var(--primary)",
    bg: "var(--primary-soft)",
    colorKey: "primary",
  },
};

/**
 * مكون الشارة (Badge) في نظام السجل (LegalOS)
 * يدعم الشارات الدلالية وحالات المستندات الخمس دون أي اعتماد على اللون بمفرده.
 */
export function Badge({
  children,
  variant = "soft",
  color = "primary",
  documentStatus,
  size = "md",
  icon,
  className = "",
  style,
  ...props
}: BadgeProps) {
  let content = children;
  let effectiveColor = color;
  let customFg: string | undefined;
  let customBg: string | undefined;

  if (documentStatus) {
    const config = DOCUMENT_STATUS_CONFIG[documentStatus];
    if (!content) {
      content = config.label;
    }
    effectiveColor = config.colorKey;
    customFg = config.fg;
    customBg = config.bg;
  }

  // حساب الألوان طبقاً للنمط الدلالي
  const colorMap: Record<BadgeColor, { fg: string; bg: string; solidBg: string }> = {
    primary: {
      fg: "var(--primary)",
      bg: "var(--primary-soft)",
      solidBg: "var(--primary)",
    },
    success: {
      fg: "var(--success)",
      bg: "var(--success-soft)",
      solidBg: "var(--success)",
    },
    warn: {
      fg: "var(--warn)",
      bg: "var(--warn-soft)",
      solidBg: "var(--warn)",
    },
    danger: {
      fg: "var(--danger)",
      bg: "var(--danger-soft)",
      solidBg: "var(--danger)",
    },
    info: {
      fg: "var(--info)",
      bg: "var(--info-soft)",
      solidBg: "var(--info)",
    },
    accent: {
      fg: "var(--accent)",
      bg: "var(--accent-soft)",
      solidBg: "var(--accent)",
    },
    neutral: {
      fg: "var(--text2)",
      bg: "var(--surface3)",
      solidBg: "var(--surface3)",
    },
  };

  const currentScheme = colorMap[effectiveColor] || colorMap.primary;
  const fg = customFg || currentScheme.fg;
  const bg = customBg || currentScheme.bg;

  let computedStyle: React.CSSProperties = {};

  if (variant === "solid") {
    computedStyle = {
      background: currentScheme.solidBg,
      color: "var(--primary-fg)",
      border: 0,
      borderRadius: "var(--rs)",
    };
  } else if (variant === "outline") {
    computedStyle = {
      background: "transparent",
      color: fg,
      border: `1px solid var(--border2)`,
      borderRadius: "var(--rs)",
    };
  } else if (variant === "dot") {
    computedStyle = {
      background: bg,
      color: fg,
      border: 0,
      borderRadius: "var(--rs)",
    };
  } else {
    // soft (الافتراضي للقالب)
    computedStyle = {
      background: bg,
      color: fg,
      border: 0,
      borderRadius: "999px",
    };
  }

  const paddingStyle =
    size === "sm"
      ? { padding: "2px 7px", fontSize: "10px" }
      : { padding: "4px 10px", fontSize: "11px" };

  return (
    <span
      className={`legalos-badge legalos-badge-${variant} ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        ...paddingStyle,
        ...computedStyle,
        ...style,
      }}
      {...props}
    >
      {variant === "dot" && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "currentColor",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}
      {icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon}</span>}
      <span>{content}</span>
    </span>
  );
}
