import React from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorMessage?: React.ReactNode;
  options?: SelectOption[];
  fullWidth?: boolean;
}

/**
 * مكون القائمة المنسدلة في نظام السجل (LegalOS)
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      children,
      label,
      helperText,
      errorMessage,
      options,
      fullWidth = true,
      className = "",
      style,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const isError = Boolean(errorMessage);

    return (
      <div
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: "6px",
          width: fullWidth ? "100%" : "auto",
        }}
      >
        {label && (
          <label
            htmlFor={selectId}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text2)",
            }}
          >
            {label}
          </label>
        )}

        <div style={{ position: "relative", width: "100%" }}>
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`legalos-select ${className}`.trim()}
            style={{
              width: "100%",
              height: "38px",
              paddingInlineStart: "12px",
              paddingInlineEnd: "32px",
              border: `1px solid ${isError ? "var(--danger)" : "var(--border)"}`,
              borderRadius: "var(--rs)",
              background: isError ? "var(--danger-soft)" : "var(--surface2)",
              color: disabled ? "var(--text3)" : "var(--text)",
              fontSize: "13px",
              outline: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              appearance: "none",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              ...style,
            }}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* سهم القائمة المنسدلة الدلالي */}
          <span
            style={{
              position: "absolute",
              insetInlineEnd: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--text3)",
              display: "grid",
              placeItems: "center",
            }}
            aria-hidden="true"
          >
            <span className="ms" style={{ fontSize: "18px" }}>
              expand_more
            </span>
          </span>
        </div>

        {errorMessage ? (
          <span style={{ fontSize: "11px", color: "var(--danger)" }}>{errorMessage}</span>
        ) : helperText ? (
          <span style={{ fontSize: "11px", color: "var(--text3)" }}>{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";

export interface MultiSelectTag {
  value: string;
  label: string;
  color?: "primary" | "accent" | "info" | "success" | "warn";
}

export interface MultiSelectProps {
  label?: React.ReactNode;
  tags: MultiSelectTag[];
  onRemoveTag?: (value: string) => void;
  onAddTag?: (label: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
}

/**
 * مكون الاختيار المتعدد بالوسوم (Multi-Select with Tags)
 * يدعم مبدأ تعددية الفلترة (Multi-Value Filtering) وحذف الوسوم
 */
export function MultiSelect({
  label,
  tags,
  onRemoveTag,
  onAddTag,
  placeholder = "أضف نوعاً…",
  fullWidth = true,
}: MultiSelectProps) {
  const [inputValue, setInputValue] = React.useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      onAddTag?.(inputValue.trim());
      setInputValue("");
    }
  };

  const getTagColors = (color?: string) => {
    switch (color) {
      case "accent":
        return { bg: "var(--accent-soft)", fg: "var(--accent)" };
      case "info":
        return { bg: "var(--info-soft)", fg: "var(--info)" };
      case "success":
        return { bg: "var(--success-soft)", fg: "var(--success)" };
      case "warn":
        return { bg: "var(--warn-soft)", fg: "var(--warn)" };
      default:
        return { bg: "var(--primary-soft)", fg: "var(--primary)" };
    }
  };

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "6px",
        width: fullWidth ? "100%" : "auto",
      }}
    >
      {label && (
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)" }}>
          {label}
        </span>
      )}

      <div
        style={{
          minHeight: "40px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "6px",
          padding: "7px 9px",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          background: "var(--surface2)",
        }}
      >
        {tags.map((tag) => {
          const colors = getTagColors(tag.color);
          return (
            <span
              key={tag.value}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11.5px",
                fontWeight: 600,
                background: colors.bg,
                color: colors.fg,
                padding: "4px 8px",
                borderRadius: "var(--rs)",
              }}
            >
              {tag.label}
              {onRemoveTag && (
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag.value)}
                  style={{
                    background: "transparent",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    color: "inherit",
                  }}
                  aria-label={`إزالة ${tag.label}`}
                >
                  <span className="ms" style={{ fontSize: "14px" }}>
                    close
                  </span>
                </button>
              )}
            </span>
          );
        })}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: "80px",
            height: "24px",
            border: 0,
            background: "transparent",
            color: "var(--text)",
            fontSize: "12.5px",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}
