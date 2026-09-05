import React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "soft"
  | "accent"
  | "danger"
  | "outline-danger"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm" | "icon-lg";

export type ButtonState = "default" | "hover" | "focus" | "active" | "disabled" | "loading";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
  forceState?: ButtonState;
}

/**
 * مكون الزر الأساسي في نظام السجل (LegalOS)
 * يغطي الأنماط الـ 8 والحالات الـ 6 لمصفوفة القالب بدقة كاملة.
 * لا يحتوي على أي ألوان مدمجة نهائياً، ويعتمد على الرموز الدلالية.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      loadingText = "جاري…",
      startIcon,
      endIcon,
      fullWidth = false,
      forceState,
      disabled,
      className = "",
      style,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isEffectiveLoading = forceState === "loading" || (loading && forceState !== "disabled");
    const isEffectiveDisabled = forceState === "disabled" || (disabled && !isEffectiveLoading);

    // حساب الحشوات والأبعاد طبقاً للحجم
    const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
      xs: {
        height: "26px",
        padding: "0 10px",
        fontSize: "11px",
        borderRadius: "var(--rs)",
      },
      sm: {
        height: "32px",
        padding: "0 12px",
        fontSize: "12px",
        borderRadius: "var(--rs)",
      },
      md: {
        height: "36px",
        padding: "0 16px",
        fontSize: "13px",
        borderRadius: "var(--rs)",
      },
      lg: {
        height: "46px",
        padding: "0 22px",
        fontSize: "14.5px",
        borderRadius: "var(--r)",
      },
      icon: {
        width: "36px",
        height: "36px",
        padding: "0",
        borderRadius: "var(--rs)",
      },
      "icon-sm": {
        width: "30px",
        height: "30px",
        padding: "0",
        borderRadius: "var(--rs)",
      },
      "icon-lg": {
        width: "44px",
        height: "44px",
        padding: "0",
        borderRadius: "50%",
      },
    };

    // القواعد الأساسية لكل نمط
    const variantBaseStyles: Record<ButtonVariant, React.CSSProperties> = {
      primary: {
        background: "var(--primary)",
        color: "var(--primary-fg)",
        border: "0",
      },
      secondary: {
        background: "var(--surface)",
        color: "var(--text)",
        border: "1px solid var(--border2)",
      },
      ghost: {
        background: "transparent",
        color: "var(--text2)",
        border: "0",
      },
      soft: {
        background: "var(--primary-soft)",
        color: "var(--primary)",
        border: "0",
      },
      accent: {
        background: "var(--accent)",
        color: "var(--accent-fg)",
        border: "0",
      },
      danger: {
        background: "var(--danger)",
        color: "var(--primary-fg)",
        border: "0",
      },
      "outline-danger": {
        background: "transparent",
        color: "var(--danger)",
        border: "1px solid var(--danger)",
      },
      link: {
        background: "transparent",
        color: "var(--primary)",
        border: "0",
        padding: "0 4px",
      },
    };

    // التجاوزات عند محاكاة حالة معينة (للمعاينة الصريحة)
    let stateOverrideStyles: React.CSSProperties = {};
    if (forceState === "hover") {
      switch (variant) {
        case "primary":
          stateOverrideStyles = { background: "var(--primary-h)" };
          break;
        case "secondary":
          stateOverrideStyles = { background: "var(--surface2)" };
          break;
        case "ghost":
          stateOverrideStyles = { background: "var(--surface2)", color: "var(--text)" };
          break;
        case "soft":
          stateOverrideStyles = {
            background: "color-mix(in oklab, var(--primary) 22%, var(--surface))",
          };
          break;
        case "accent":
          stateOverrideStyles = { filter: "brightness(0.93)" };
          break;
        case "danger":
          stateOverrideStyles = { filter: "brightness(0.9)" };
          break;
        case "outline-danger":
          stateOverrideStyles = { background: "var(--danger-soft)" };
          break;
        case "link":
          stateOverrideStyles = { color: "var(--primary-h)", textDecoration: "underline" };
          break;
      }
    } else if (forceState === "focus") {
      const ringColor =
        variant === "accent"
          ? "color-mix(in oklab, var(--accent) 40%, transparent)"
          : variant === "danger"
          ? "color-mix(in oklab, var(--danger) 38%, transparent)"
          : variant === "outline-danger"
          ? "color-mix(in oklab, var(--danger) 34%, transparent)"
          : "var(--ring)";

      stateOverrideStyles = {
        boxShadow: `0 0 0 3px ${ringColor}`,
        outline: "none",
        ...(variant === "secondary" ? { borderColor: "var(--primary)" } : {}),
      };
    } else if (forceState === "active") {
      switch (variant) {
        case "primary":
          stateOverrideStyles = {
            background: "var(--primary-h)",
            transform: "translateY(1px)",
            boxShadow: "var(--shadow)",
          };
          break;
        case "secondary":
          stateOverrideStyles = {
            background: "var(--surface3)",
            transform: "translateY(1px)",
          };
          break;
        case "ghost":
          stateOverrideStyles = {
            background: "var(--surface3)",
            transform: "translateY(1px)",
          };
          break;
        case "soft":
          stateOverrideStyles = {
            background: "color-mix(in oklab, var(--primary) 30%, var(--surface))",
            transform: "translateY(1px)",
          };
          break;
        case "accent":
          stateOverrideStyles = {
            filter: "brightness(0.86)",
            transform: "translateY(1px)",
          };
          break;
        case "danger":
          stateOverrideStyles = {
            filter: "brightness(0.82)",
            transform: "translateY(1px)",
          };
          break;
        case "outline-danger":
          stateOverrideStyles = {
            background: "color-mix(in oklab, var(--danger) 26%, var(--surface))",
            transform: "translateY(1px)",
          };
          break;
        case "link":
          stateOverrideStyles = {
            color: "var(--primary-h)",
            textDecoration: "underline",
            transform: "translateY(1px)",
          };
          break;
      }
    } else if (isEffectiveDisabled) {
      switch (variant) {
        case "primary":
        case "accent":
        case "danger":
          stateOverrideStyles = { opacity: 0.42, cursor: "not-allowed" };
          break;
        case "secondary":
        case "outline-danger":
        case "link":
          stateOverrideStyles = {
            opacity: 0.6,
            color: "var(--text3)",
            borderColor: "var(--border)",
            cursor: "not-allowed",
          };
          break;
        case "ghost":
          stateOverrideStyles = { opacity: 0.55, color: "var(--text3)", cursor: "not-allowed" };
          break;
        case "soft":
          stateOverrideStyles = {
            background: "var(--surface3)",
            color: "var(--text3)",
            cursor: "not-allowed",
          };
          break;
      }
    } else if (isEffectiveLoading) {
      stateOverrideStyles = {
        cursor: "progress",
        opacity: variant === "primary" || variant === "accent" || variant === "danger" ? 0.85 : 1,
      };
    }

    const baseInlineStyles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontWeight: 600,
      cursor: isEffectiveDisabled ? "not-allowed" : isEffectiveLoading ? "progress" : "pointer",
      userSelect: "none",
      transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease, transform 0.1s ease",
      width: fullWidth ? "100%" : undefined,
      textDecoration: "none",
      ...sizeStyles[size],
      ...variantBaseStyles[variant],
      ...stateOverrideStyles,
      ...style,
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isEffectiveDisabled}
        aria-busy={isEffectiveLoading}
        aria-disabled={isEffectiveDisabled || isEffectiveLoading}
        className={`legalos-btn legalos-btn-${variant} legalos-btn-${size} ${className}`.trim()}
        style={baseInlineStyles}
        {...props}
      >
        {isEffectiveLoading ? (
          <>
            <span
              style={{
                width: "14px",
                height: "14px",
                border: "2px solid currentColor",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span>{loadingText}</span>
          </>
        ) : (
          <>
            {startIcon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{startIcon}</span>}
            {children}
            {endIcon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{endIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
