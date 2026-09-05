"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

export interface ChatLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  emptyState?: React.ReactNode;
  composer?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * حاوية تخطيط المحادثة (ChatLayout) في نظام السجل (LegalOS)
 * ترتب قائمة الرسائل وتثبّت حقل الإدخال في الأسفل
 */
export function ChatLayout({
  emptyState,
  composer,
  children,
  className = "",
  style,
  ...props
}: ChatLayoutProps) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div
      className={`legalos-chat-layout flex flex-col flex-1 h-full w-full justify-between overflow-hidden ${className}`.trim()}
      style={{
        minHeight: 0,
        ...style,
      }}
      {...props}
    >
      <div
        className="flex-1 overflow-y-auto py-4 px-2 flex flex-col justify-start"
        style={{
          scrollBehavior: "smooth",
        }}
      >
        {hasChildren ? children : emptyState}
      </div>

      {composer && (
        <div
          className="pt-2 pb-4 sticky bottom-0 bg-transparent"
          style={{
            backdropFilter: "blur(8px)",
          }}
        >
          {composer}
        </div>
      )}
    </div>
  );
}

export interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  density?: "comfortable" | "balanced" | "compact";
}

/**
 * قائمة الرسائل (ChatMessageList)
 */
export function ChatMessageList({
  children,
  density = "comfortable",
  className = "",
  style,
  ...props
}: ChatMessageListProps) {
  const gap = density === "compact" ? "8px" : density === "balanced" ? "14px" : "20px";

  return (
    <div
      className={`legalos-chat-message-list flex flex-col w-full ${className}`.trim()}
      style={{
        gap,
        ...style,
      }}
      role="log"
      aria-live="polite"
      {...props}
    >
      {children}
    </div>
  );
}

export interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  sender?: "user" | "assistant" | "system";
  avatar?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * مكوّن الرسالة الواحدة (ChatMessage)
 */
export function ChatMessage({
  sender = "user",
  avatar,
  children,
  className = "",
  style,
  ...props
}: ChatMessageProps) {
  const isUser = sender === "user";
  const isSystem = sender === "system";

  if (isSystem) {
    return (
      <div
        className={`flex items-center justify-center my-2 text-xs font-medium text-center ${className}`.trim()}
        style={{
          color: "var(--text3)",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`legalos-chat-message flex w-full gap-3 ${
        isUser ? "justify-end" : "justify-start"
      } ${className}`.trim()}
      style={{
        ...style,
      }}
      {...props}
    >
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            borderRadius: "var(--rs)",
            backgroundColor: "var(--primary-soft)",
            color: "var(--primary)",
          }}
          aria-hidden="true"
        >
          {avatar || <Icon name="gavel" size={18} />}
        </div>
      )}

      <div
        className="flex flex-col max-w-[85%] sm:max-w-[75%]"
        style={{
          alignItems: isUser ? "flex-end" : "flex-start",
        }}
      >
        {children}
      </div>

      {isUser && avatar && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
          {avatar}
        </div>
      )}
    </div>
  );
}

export interface ChatComposerProps {
  onSubmit: (text: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * مكوّن كتابة وإرسال الرسائل (ChatComposer)
 */
export function ChatComposer({
  onSubmit,
  isDisabled = false,
  placeholder = "اكتب سؤالك القانوني هنا…",
  autoFocus = false,
  className = "",
  style,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    onSubmit(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  return (
    <div
      className={`legalos-chat-composer relative flex items-end gap-2 p-2 border shadow-sm transition-all focus-within:ring-2 focus-within:ring-[var(--primary)] ${className}`.trim()}
      style={{
        borderRadius: "var(--r)",
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
        ...style,
      }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        aria-label={placeholder}
        className="w-full resize-none bg-transparent px-3 py-2 text-sm focus:outline-none"
        style={{
          color: "var(--text)",
          minHeight: "40px",
          maxHeight: "180px",
        }}
      />

      <Button
        variant="primary"
        size="sm"
        disabled={isDisabled || !value.trim()}
        onClick={handleSubmit}
        aria-label="إرسال"
        style={{
          borderRadius: "var(--rs)",
          flexShrink: 0,
        }}
      >
        <Icon name="send" size={16} />
      </Button>
    </div>
  );
}
