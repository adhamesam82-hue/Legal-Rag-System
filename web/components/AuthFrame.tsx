"use client";

import { getLocaleDirection } from "@astryxdesign/core/i18n";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { useLocale } from "@/lib/i18n/provider";

/**
 * The narrow centred card the sign-in, sign-up and invitation screens share.
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
      <Heading level={1}>{title}</Heading>
      <div style={{ marginBlockStart: 20 }}>
        <Card padding={4}>{children}</Card>
      </div>
    </div>
  );
}
