"use client";

import React, { useEffect, useRef } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Icon } from "./Icon";

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  width?: number | string;
  purpose?: "form" | "confirm" | "info";
  children?: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

/**
 * مكون النافذة المنبثقة (Dialog) في نظام السجل (LegalOS).
 * يعتمد على الحواف var(--r) والخلفيات الدلالية، ويوفر إدارة تركيز صارمة:
 * ١. تركيز ابتدائي عند الفتح (Initial Focus)
 * ٢. حبس التنقل بمفتاح Tab داخل النافذة (Focus Trap)
 * ٣. استرجاع التركيز إلى العنصر الذي فتح النافذة عند الإغلاق (Focus Restoration)
 */
export function Dialog({
  isOpen,
  onOpenChange,
  width = 520,
  purpose = "form",
  children,
  initialFocusRef,
  restoreFocus = true,
  className = "",
  style,
  ...props
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // ١ و ٣: التركيز الابتدائي واسترجاع التركيز عند الإغلاق
  useEffect(() => {
    if (!isOpen) return;

    // حفظ العنصر النشط قبل فتح النافذة لاسترجاع التركيز إليه لاحقاً
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    // تعيين التركيز الابتدائي عند الفتح
    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      // استرجاع التركيز إلى العنصر الذي فتح النافذة
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    };
  }, [isOpen, initialFocusRef, restoreFocus]);

  // ٢: حبس التركيز وإغلاق النافذة عند الضغط على Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // إغلاق بمفتاح Escape
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }

      // حبس مفتاح Tab و Shift+Tab داخل النافذة الحاجزة
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusable.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (e.shiftKey) {
          // Shift + Tab: الرجوع للخلف
          if (
            activeElement === firstElement ||
            activeElement === dialogRef.current ||
            !dialogRef.current.contains(activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: التقدم للأمام
          if (activeElement === lastElement || !dialogRef.current.contains(activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
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
        tabIndex={-1}
        className={`legalos-dialog relative flex flex-col w-full max-h-[90vh] overflow-hidden border shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-150 ${className}`.trim()}
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
  closeAriaLabel?: string;
}

export function DialogHeader({
  title,
  description,
  onOpenChange,
  onClose,
  closeAriaLabel,
  className = "",
  style,
  ...props
}: DialogHeaderProps) {
  const t = useTranslator();
  const defaultCloseLabel = t("@astryx.dialog.close");
  const computedCloseLabel = closeAriaLabel || defaultCloseLabel || "Close";

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
          aria-label={computedCloseLabel}
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

