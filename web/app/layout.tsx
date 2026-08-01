import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocaleDirection } from "@astryxdesign/core/i18n";
import "./globals.css";
import { Providers } from "./providers";
import { Shell } from "@/components/Shell";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "LegalOS — Practice management for Egyptian & MENA law firms",
  description:
    "Matters, clients, documents, time and billing for Egyptian and MENA law firms — built around legal research grounded in statute text, with every citation verified against the corpus.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale lives in a cookie (not localStorage) specifically so it is
  // readable here on the server — the initial <html lang/dir> already
  // matches the visitor's saved language, no LTR-then-RTL flash on load.
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} dir={getLocaleDirection(locale)} suppressHydrationWarning>
      <body>
        <Providers initialLocale={locale}>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
