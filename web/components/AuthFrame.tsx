"use client";

import { getLocaleDirection } from "@astryxdesign/core/i18n";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/lib/i18n/provider";

/**
 * إطار بطاقة التوثيق الموحد للشاشات العامة (تسجيل الدخول، إنشاء الحساب، الدعوات).
 *
 * Direction comes from the current locale, not from a hard-coded dir="rtl":
 * these screens render outside the Shell, so nothing else would flip them
 * when the language is English.
 */
export function AuthFrame({
  title,
  width = 420,
  children,
}: {
  title: string;
  width?: number;
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  return (
    <div
      dir={getLocaleDirection(locale)}
      style={{ maxWidth: width, margin: "64px auto", padding: "0 20px" }}
    >
      <h1
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--text)",
          margin: 0,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>
      <div style={{ marginBlockStart: 20 }}>
        <Card padding="24px">{children}</Card>
      </div>
    </div>
  );
}
