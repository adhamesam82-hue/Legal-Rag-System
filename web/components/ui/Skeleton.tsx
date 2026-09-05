import React from "react";

export type SkeletonVariant = "text" | "circular" | "rectangular";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

/**
 * مكون هيكل التحميل (Skeleton) في نظام السجل (LegalOS)
 * يعتمد على تدرج الوميض (Shimmer) والمتغيرات الدلالية var(--surface3) و var(--border2).
 */
export function Skeleton({
  variant = "text",
  width,
  height,
  borderRadius,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  let defaultWidth: string | number = "100%";
  let defaultHeight: string | number = "12px";
  let defaultRadius: string | number = "4px";

  if (variant === "circular") {
    defaultWidth = width || "36px";
    defaultHeight = height || defaultWidth;
    defaultRadius = "50%";
  } else if (variant === "rectangular") {
    defaultHeight = height || "80px";
    defaultRadius = "var(--rs)";
  } else if (variant === "text") {
    defaultHeight = height || "10px";
    defaultRadius = "5px";
  }

  return (
    <div
      className={`legalos-skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{
        width: width !== undefined ? width : defaultWidth,
        height: height !== undefined ? height : defaultHeight,
        borderRadius: borderRadius !== undefined ? borderRadius : defaultRadius,
        background:
          "linear-gradient(90deg, var(--surface3) 25%, var(--border2) 37%, var(--surface3) 63%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s linear infinite",
        display: "inline-block",
        ...style,
      }}
      {...props}
    />
  );
}
