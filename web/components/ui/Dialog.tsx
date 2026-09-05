"use client";

import React, { useEffect, useRef } from "react";
import { Icon } from "./Icon";

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  width?: number | string;
  purpose?: "form" | "confirm" | "info";
  children?: React.ReactNode;
}

/**
 * مكون النافذة المنبثقة (Dialog) في نظام السجل (LegalOS)
 * يعتمد على الحواف var(--r) والخلفيات الدلالية ودعم إمكانية الوصول والتنقل
 */
export function Dialog({
  isOpen,
  onOpenChange,
  width = 520,
  purpose = "form",
  children,
  className = "",
  style,
  ...props
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // إغلاق النافذة عند الضغط على زر Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // منع التمرير في الخلفية أثناء فتح النافذة
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onOpenChange]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onOpenChange(false);
    }
  };

  const parsedWidth = typeof width === "number" ? `${width}px` : width;

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "color-mix(in oklab, var(--text) 40%, transparent)",
        backdropFilter: "blur(4px)",
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`legalos-dialog relative flex flex-col w-full max-h-[90vh] overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${className}`.trim()}
        style={{
          maxWidth: parsedWidth,
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          borderRadius: "var(--r)",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export interface DialogHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function DialogHeader({
  title,
  description,
  onOpenChange,
  onClose,
  className = "",
  style,
  ...props
}: DialogHeaderProps) {
  const handleClose = () => {
    if (onClose) onClose();
    else if (onOpenChange) onOpenChange(false);
  };

  return (
    <div
      className={`flex items-start justify-between gap-4 p-5 border-b ${className}`.trim()}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface2)",
        ...style,
      }}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold leading-none" style={{ color: "var(--text)" }}>
          {title}
        </h2>
        {description && (
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {description}
          </p>
        )}
      </div>

      {(onClose || onOpenChange) && (
        <button
          type="button"
          onClick={handleClose}
          aria-label="إغلاق"
          className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-[var(--surface3)]"
          style={{
            borderRadius: "var(--rs)",
            color: "var(--text2)",
          }}
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  );
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function DialogContent({
  children,
  className = "",
  style,
  ...props
}: DialogContentProps) {
  return (
    <div
      className={`p-5 overflow-y-auto flex-1 flex flex-col gap-4 ${className}`.trim()}
      style={{
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function DialogFooter({
  children,
  className = "",
  style,
  ...props
}: DialogFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 p-4 border-t ${className}`.trim()}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
