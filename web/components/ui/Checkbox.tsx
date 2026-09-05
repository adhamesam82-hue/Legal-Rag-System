import React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  indeterminate?: boolean;
  helperText?: React.ReactNode;
}

/**
 * مكون مربع الاختيار (Checkbox) في نظام السجل (LegalOS)
 * يدعم الحالات: محدد، غير محدد، معطل، وحالة التحديد غير المكتمل (indeterminate).
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, indeterminate, disabled, className = "", style, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;
    const internalRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    const setRefs = (elem: HTMLInputElement | null) => {
      internalRef.current = elem;
      if (typeof ref === "function") {
        ref(elem);
      } else if (ref) {
        ref.current = elem;
      }
    };

    return (
      <div style={{ display: "inline-flex", flexDirection: "column", gap: "2px" }}>
        <label
          htmlFor={checkboxId}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12.5px",
            color: disabled ? "var(--text3)" : "var(--text)",
            cursor: disabled ? "not-allowed" : "pointer",
            userSelect: "none",
          }}
        >
          <input
            ref={setRefs}
            id={checkboxId}
            type="checkbox"
            disabled={disabled}
            className={`legalos-checkbox ${className}`.trim()}
            style={{
              width: "17px",
              height: "17px",
              accentColor: "var(--primary)",
              cursor: disabled ? "not-allowed" : "pointer",
              margin: 0,
              ...style,
            }}
            {...props}
          />
          {label && <span>{label}</span>}
        </label>

        {helperText && (
          <span style={{ fontSize: "11px", color: "var(--text3)", marginInlineStart: "25px" }}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
}

/**
 * مكون زر الاختيار الأحادي (Radio)
 */
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, helperText, disabled, className = "", style, id, ...props }, ref) => {
    const generatedId = React.useId();
    const radioId = id || generatedId;

    return (
      <div style={{ display: "inline-flex", flexDirection: "column", gap: "2px" }}>
        <label
          htmlFor={radioId}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12.5px",
            color: disabled ? "var(--text3)" : "var(--text)",
            cursor: disabled ? "not-allowed" : "pointer",
            userSelect: "none",
          }}
        >
          <input
            ref={ref}
            id={radioId}
            type="radio"
            disabled={disabled}
            className={`legalos-radio ${className}`.trim()}
            style={{
              width: "17px",
              height: "17px",
              accentColor: "var(--primary)",
              cursor: disabled ? "not-allowed" : "pointer",
              margin: 0,
              ...style,
            }}
            {...props}
          />
          {label && <span>{label}</span>}
        </label>

        {helperText && (
          <span style={{ fontSize: "11px", color: "var(--text3)", marginInlineStart: "25px" }}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Radio.displayName = "Radio";
