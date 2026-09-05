import React from "react";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * مكون الأيقونة الموحد لنظام السجل (LegalOS)
 * يعتمد على خط Material Symbols Rounded ويدعم الحجم الدلالي واللون الموروث
 */
export function Icon({ name, size = 20, className = "", style, ...props }: IconProps) {
  const sizeStyle: React.CSSProperties = {
    fontSize: typeof size === "number" ? `${size}px` : size,
    ...style,
  };

  return (
    <span
      className={`ms ${className}`.trim()}
      style={sizeStyle}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
