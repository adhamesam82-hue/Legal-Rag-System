import React from "react";

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  align?: "between" | "start" | "end";
}

/**
 * مكون شريط الأدوات الرئيسي (Toolbar) في نظام السجل (LegalOS)
 */
export function Toolbar({
  children,
  align = "between",
  className = "",
  style,
  ...props
}: ToolbarProps) {
  const justifyMap = {
    between: "space-between",
    start: "flex-start",
    end: "flex-end",
  };

  return (
    <div
      className={`legalos-toolbar ${className}`.trim()}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: justifyMap[align],
        gap: "12px",
        flexWrap: "wrap",
        width: "100%",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  shortcut?: string;
  onClear?: () => void;
}

/**
 * حقل البحث المخصص لشريط الأدوات
 */
export function SearchInput({
  shortcut = "Ctrl K",
  value,
  onChange,
  onClear,
  placeholder = "ابحث برقم القضية أو اسم الموكّل…",
  className = "",
  style,
  ...props
}: SearchInputProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        flex: "1 1 220px",
        minWidth: "180px",
        maxWidth: "420px",
      }}
    >
      <span
        className="ms"
        style={{
          position: "absolute",
          insetInlineStart: "12px",
          fontSize: "19px",
          color: "var(--text3)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        search
      </span>

      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`legalos-search-input ${className}`.trim()}
        style={{
          width: "100%",
          height: "38px",
          paddingInline: "40px 76px",
          border: "1px solid var(--border)",
          borderRadius: "999px",
          background: "var(--surface2)",
          color: "var(--text)",
          fontSize: "13px",
          outline: "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
          ...style,
        }}
        {...props}
      />

      {shortcut && (
        <span
          style={{
            position: "absolute",
            insetInlineEnd: "10px",
            fontSize: "10.5px",
            color: "var(--text3)",
            border: "1px solid var(--border)",
            borderRadius: "var(--rs)",
            padding: "2px 6px",
            background: "var(--surface)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
}

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * مجموعة الأزرار المتصلة (Button Group)
 */
export function ButtonGroup({ children, className = "", style, ...props }: ButtonGroupProps) {
  return (
    <div
      className={`legalos-btn-group ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid var(--border)",
        borderRadius: "var(--rs)",
        overflow: "hidden",
        width: "fit-content",
        ...style,
      }}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        const element = child as React.ReactElement<{ style?: React.CSSProperties }>;
        return React.cloneElement(element, {
          style: {
            border: 0,
            borderRadius: 0,
            borderInlineEnd: "1px solid var(--border)",
            ...(element.props.style || {}),
          },
        });
      })}
    </div>
  );
}
