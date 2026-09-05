import React from "react";

export type AlertType = "info" | "warn" | "danger" | "success" | "neutral";

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  type?: AlertType;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
}

/**
 * مكون التنبيه (Alert) في نظام السجل (LegalOS)
 * يعتمد على ألوان الحالات والحدود المشتقة عبر color-mix وحواف var(--rs).
 */
export function Alert({
  type = "info",
  title,
  children,
  icon,
  actions,
  onClose,
  className = "",
  style,
  ...props
}: AlertProps) {
  const typeConfig: Record<
    AlertType,
    { bg: string; border: string; defaultIcon: string; iconColor: string }
  > = {
    info: {
      bg: "var(--info-soft)",
      border: "1px solid color-mix(in oklab, var(--info) 26%, transparent)",
      defaultIcon: "info",
      iconColor: "var(--info)",
    },
    success: {
      bg: "var(--success-soft)",
      border: "1px solid color-mix(in oklab, var(--success) 26%, transparent)",
      defaultIcon: "check_circle",
      iconColor: "var(--success)",
    },
    warn: {
      bg: "var(--warn-soft)",
      border: "1px solid color-mix(in oklab, var(--warn) 26%, transparent)",
      defaultIcon: "warning",
      iconColor: "var(--warn)",
    },
    danger: {
      bg: "var(--danger-soft)",
      border: "1px solid color-mix(in oklab, var(--danger) 26%, transparent)",
      defaultIcon: "error",
      iconColor: "var(--danger)",
    },
    neutral: {
      bg: "var(--surface2)",
      border: "1px solid var(--border)",
      defaultIcon: "campaign",
      iconColor: "var(--text3)",
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      role="alert"
      className={`legalos-alert legalos-alert-${type} ${className}`.trim()}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "13px 14px",
        borderRadius: "var(--rs)",
        background: config.bg,
        border: config.border,
        color: "var(--text)",
        ...style,
      }}
      {...props}
    >
      <div style={{ flexShrink: 0, display: "grid", placeItems: "center" }}>
        {icon || (
          <span className="ms" style={{ fontSize: "20px", color: config.iconColor }}>
            {config.defaultIcon}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
        {title && (
          <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)" }}>
            {title}
          </div>
        )}
        {children && (
          <div style={{ fontSize: "11.5px", color: "var(--text2)", lineHeight: 1.6 }}>
            {children}
          </div>
        )}
        {actions && <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>{actions}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق التنبيه"
          style={{
            width: "26px",
            height: "26px",
            display: "grid",
            placeItems: "center",
            border: 0,
            borderRadius: "var(--rs)",
            background: "transparent",
            color: "var(--text3)",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
          }}
        >
          <span className="ms" style={{ fontSize: "17px" }}>
            close
          </span>
        </button>
      )}
    </div>
  );
}
