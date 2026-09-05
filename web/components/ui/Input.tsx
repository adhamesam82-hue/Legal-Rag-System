import React from "react";

export type InputState = "default" | "focus" | "filled" | "error" | "success" | "disabled" | "readonly";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorMessage?: React.ReactNode;
  successMessage?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
  forceState?: InputState;
  fullWidth?: boolean;
}

/**
 * مكون حقل الإدخال الأساسي في نظام السجل (LegalOS)
 * يدعم الحالات السبع (Default, Focus, Filled, Error, Success, Disabled, Readonly)
 * مع الأيقونات واللواحق والنصوص المساعدة والتسميات بدون ألوان مدمجة.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      successMessage,
      startIcon,
      endIcon,
      prefixNode,
      suffixNode,
      forceState,
      fullWidth = true,
      disabled,
      readOnly,
      className = "",
      style,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    const isEffectiveDisabled = forceState === "disabled" || disabled;
    const isEffectiveReadOnly = forceState === "readonly" || readOnly;
    const isError = forceState === "error" || Boolean(errorMessage);
    const isSuccess = forceState === "success" || Boolean(successMessage);
    const isForcedFocus = forceState === "focus";

    // تحديد ألوان الحدود والخلفية والحلقة طبقاً للحالة
    let borderColor = "var(--border)";
    let background = "var(--surface2)";
    let color = "var(--text)";
    let boxShadow = "none";
    let cursor = "text";
    let borderStyle = "solid";

    if (isForcedFocus) {
      borderColor = "var(--primary)";
      background = "var(--surface)";
      boxShadow = "0 0 0 3px var(--ring)";
    } else if (isError) {
      borderColor = "var(--danger)";
      background = "var(--danger-soft)";
    } else if (isSuccess) {
      borderColor = "var(--success)";
      background = "var(--success-soft)";
    } else if (isEffectiveDisabled) {
      borderColor = "var(--border)";
      background = "var(--surface3)";
      color = "var(--text3)";
      cursor = "not-allowed";
    } else if (isEffectiveReadOnly) {
      borderColor = "var(--border2)";
      background = "var(--surface2)";
      color = "var(--text2)";
      borderStyle = "dashed";
      cursor = "default";
    } else if (forceState === "filled") {
      borderColor = "var(--border2)";
      background = "var(--surface)";
    }

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
            htmlFor={inputId}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text2)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {label}
          </label>
        )}

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "stretch",
            width: "100%",
            borderRadius: "var(--rs)",
            border: `1px ${borderStyle} ${borderColor}`,
            background,
            boxShadow,
            transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
          }}
        >
          {startIcon && (
            <span
              style={{
                display: "grid",
                placeItems: "center",
                paddingInlineStart: "11px",
                paddingInlineEnd: "4px",
                color: "var(--text3)",
                pointerEvents: "none",
                flexShrink: 0,
              }}
            >
              {startIcon}
            </span>
          )}

          {prefixNode && (
            <span
              style={{
                display: "grid",
                placeItems: "center",
                padding: "0 12px",
                background: "var(--surface3)",
                color: "var(--text2)",
                fontSize: "12px",
                fontWeight: 600,
                borderInlineEnd: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {prefixNode}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={isEffectiveDisabled}
            readOnly={isEffectiveReadOnly}
            className={`legalos-input ${className}`.trim()}
            style={{
              flex: 1,
              minWidth: 0,
              height: "38px",
              padding: "0 12px",
              border: 0,
              background: "transparent",
              color,
              fontSize: "13px",
              outline: "none",
              cursor,
              ...style,
            }}
            {...props}
          />

          {suffixNode && (
            <span
              style={{
                display: "grid",
                placeItems: "center",
                padding: "0 12px",
                background: "var(--surface3)",
                color: "var(--text2)",
                fontSize: "12px",
                fontWeight: 600,
                borderInlineStart: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {suffixNode}
            </span>
          )}

          {endIcon && (
            <span
              style={{
                display: "grid",
                placeItems: "center",
                paddingInlineEnd: "11px",
                paddingInlineStart: "4px",
                color: isError ? "var(--danger)" : isSuccess ? "var(--success)" : "var(--text3)",
                pointerEvents: "none",
                flexShrink: 0,
              }}
            >
              {endIcon}
            </span>
          )}
        </div>

        {/* الرسائل المساعدة وأخطاء التحقق */}
        {isError && errorMessage ? (
          <span
            style={{
              fontSize: "11px",
              color: "var(--danger)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {errorMessage}
          </span>
        ) : isSuccess && successMessage ? (
          <span
            style={{
              fontSize: "11px",
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {successMessage}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: "11px", color: "var(--text3)" }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorMessage?: React.ReactNode;
  characterCount?: { current: number; max: number };
  fullWidth?: boolean;
}

/**
 * مكون منطقة النص الممتدة (Textarea)
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      characterCount,
      fullWidth = true,
      className = "",
      style,
      id,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
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
            htmlFor={textareaId}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text2)",
            }}
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`legalos-textarea ${className}`.trim()}
          style={{
            padding: "10px 12px",
            border: `1px solid ${isError ? "var(--danger)" : "var(--border)"}`,
            borderRadius: "var(--rs)",
            background: isError ? "var(--danger-soft)" : "var(--surface2)",
            color: "var(--text)",
            fontSize: "13px",
            outline: "none",
            resize: "vertical",
            lineHeight: 1.8,
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            ...style,
          }}
          {...props}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {errorMessage ? (
            <span style={{ fontSize: "11px", color: "var(--danger)" }}>{errorMessage}</span>
          ) : helperText ? (
            <span style={{ fontSize: "11px", color: "var(--text3)" }}>{helperText}</span>
          ) : (
            <span />
          )}

          {characterCount && (
            <span style={{ fontSize: "11px", color: "var(--text3)", fontVariantNumeric: "tabular-nums" }}>
              {characterCount.current} / {characterCount.max} حرف
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
