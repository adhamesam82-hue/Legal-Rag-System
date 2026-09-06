"use client";

import React, { useState } from "react";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "start" | "end";
  className?: string;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (disabled || !content) {
    return <>{children}</>;
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    top: {
      bottom: "100%",
      insetInlineStart: "50%",
      transform: "translateX(50%) translateY(-6px)",
      marginBottom: "4px",
    },
    bottom: {
      top: "100%",
      insetInlineStart: "50%",
      transform: "translateX(50%) translateY(6px)",
      marginTop: "4px",
    },
    start: {
      top: "50%",
      insetInlineEnd: "100%",
      transform: "translateY(-50%)",
      marginInlineEnd: "6px",
    },
    end: {
      top: "50%",
      insetInlineStart: "100%",
      transform: "translateY(-50%)",
      marginInlineStart: "6px",
    },
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            ...positionStyles[position],
            zIndex: 50,
            pointerEvents: "none",
            backgroundColor: "var(--text)",
            color: "var(--surface)",
            fontSize: "11px",
            fontWeight: 600,
            padding: "5px 9px",
            borderRadius: "var(--rs)",
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-lg)",
            lineHeight: 1.2,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
