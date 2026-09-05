import React from "react";

export type SwitchSize = "sm" | "md";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
  color?: "primary" | "success";
  label?: React.ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * مكون مفتاح التبديل (Switch) في نظام السجل (LegalOS)
 * يدعم الأحجام والألوان الدلالية والتفاعل الميسر بلوحة المفاتيح
 */
export function Switch({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  size = "md",
  color = "primary",
  label,
  id,
  className = "",
  style,
}: SwitchProps) {
  const isControlled = controlledChecked !== undefined;
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  const isSmall = size === "sm";
  const trackWidth = isSmall ? 36 : 46;
  const trackHeight = isSmall ? 21 : 26;
  const thumbSize = isSmall ? 15 : 20;
  const offset = 3;
  const activeOffset = trackWidth - thumbSize - offset;

  const activeColor = color === "success" ? "var(--success)" : "var(--primary)";
  const trackBg = disabled
    ? "var(--surface3)"
    : isChecked
    ? activeColor
    : "var(--border2)";

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={isChecked}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={`legalos-switch ${className}`.trim()}
        style={{
          width: `${trackWidth}px`,
          height: `${trackHeight}px`,
          flexShrink: 0,
          border: 0,
          borderRadius: "999px",
          background: trackBg,
          position: "relative",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.18s ease",
          padding: 0,
          outline: "none",
          ...style,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: `${offset}px`,
            insetInlineStart: isChecked ? `${activeOffset}px` : `${offset}px`,
            width: `${thumbSize}px`,
            height: `${thumbSize}px`,
            borderRadius: "50%",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
            transition: "inset-inline-start 0.18s ease",
          }}
        />
      </button>

      {label && (
        <span style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text)" }}>
          {label}
        </span>
      )}
    </label>
  );
}
