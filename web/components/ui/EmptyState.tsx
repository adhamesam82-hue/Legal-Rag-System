import React from "react";

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * مكون الحالة الفارغة (EmptyState) في نظام السجل (LegalOS)
 * يعرض أيقونة دلالية وعنواناً ورسالة إرشادية للمستخدم وزر إجراء اختياري.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
  style,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={`legalos-empty-state ${className}`.trim()}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: "24px 20px",
        border: "1px dashed var(--border2)",
        borderRadius: "var(--rs)",
        textAlign: "center",
        background: "transparent",
        width: "100%",
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "var(--r)",
          background: "var(--surface2)",
          color: "var(--text3)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon || (
          <span className="ms" style={{ fontSize: "24px" }} aria-hidden="true">
            folder_off
          </span>
        )}
      </div>

      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
        {title}
      </div>

      {description && (
        <div
          style={{
            fontSize: "11.5px",
            color: "var(--text3)",
            maxWidth: "260px",
            lineHeight: 1.6,
          }}
        >
          {description}
        </div>
      )}

      {action && <div style={{ marginTop: "4px" }}>{action}</div>}
    </div>
  );
}
