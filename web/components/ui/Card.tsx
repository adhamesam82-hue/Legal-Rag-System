import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  padding?: string | number;
  bordered?: boolean;
  shadow?: boolean;
}

/**
 * مكون البطاقة (Card) في نظام السجل (LegalOS)
 * يعتمد على الحواف الديناميكية var(--r) والظلال الدلالية
 */
export function Card({
  children,
  padding,
  bordered = true,
  shadow = true,
  className = "",
  style,
  ...props
}: CardProps) {
  return (
    <div
      className={`legalos-card ${className}`.trim()}
      style={{
        background: "var(--surface)",
        border: bordered ? "1px solid var(--border)" : 0,
        borderRadius: "var(--r)",
        boxShadow: shadow ? "var(--shadow)" : "none",
        padding: padding !== undefined ? padding : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  bordered?: boolean;
}

export function CardHeader({
  children,
  bordered = true,
  className = "",
  style,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`legalos-card-header ${className}`.trim()}
      style={{
        padding: "15px 18px",
        borderBottom: bordered ? "1px solid var(--border)" : 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`legalos-card-title ${className}`.trim()}
      style={{
        margin: 0,
        fontSize: "14.5px",
        fontWeight: 600,
        color: "var(--text)",
        ...style,
      }}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`legalos-card-description ${className}`.trim()}
      style={{
        margin: 0,
        fontSize: "11.5px",
        color: "var(--text3)",
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function CardContent({
  children,
  className = "",
  style,
  ...props
}: CardContentProps) {
  return (
    <div
      className={`legalos-card-content ${className}`.trim()}
      style={{
        padding: "18px",
        flex: 1,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  bordered?: boolean;
}

export function CardFooter({
  children,
  bordered = true,
  className = "",
  style,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`legalos-card-footer ${className}`.trim()}
      style={{
        padding: "14px 18px",
        borderTop: bordered ? "1px solid var(--border)" : 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
