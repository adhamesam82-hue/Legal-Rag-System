// FIRST, and for effect only: pins Intl's default locale before any
// component formats a date. Astryx's calendar calls Intl with no locale at
// all, and Node and the browser default differently -- see pin-intl.ts.
import "@/lib/i18n/pin-intl";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocaleDirection } from "@astryxdesign/core/i18n";
import "./globals.css";
import { Providers } from "./providers";
import { Shell } from "@/components/Shell";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "@/lib/i18n/locale";

// The tab title and the share preview are the first text a visitor reads, so
// they follow the locale too — a static English `metadata` export would have
// been the one string the language cookie could not reach.
const METADATA: Record<Locale, Metadata> = {
  ar: {
    title: "السِّجل — إدارة مكاتب المحاماة",
    description:
      "القضايا والعملاء والمستندات والوقت والفوترة لمكاتب المحاماة في مصر والمنطقة العربية — مبنية حول بحث قانوني مستند إلى نصوص التشريعات، مع التحقق من كل استشهاد في مقابل النصوص الأصلية.",
  },
  en: {
    title: "Al-Sijil — Law Firm Management",
    description:
      "Matters, clients, documents, time and billing for Egyptian and MENA law firms — built around legal research grounded in statute text, with every citation verified against the corpus.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  return METADATA[resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value)];
}

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
        {/* Read here, on the server, on every request. NEXT_PUBLIC_* is
            inlined into the client bundle at build time, and this image is
            built once with no Clerk key so the same artefact can be promoted
            from staging to production -- where the two Clerk instances differ.
            Reading it in a client module instead left the browser believing
            Clerk was unconfigured while the server rendered it as configured,
            and every API call went out unauthenticated. */}
        <Providers
          initialLocale={locale}
          clerkPublishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? null}
          features={process.env.NEXT_PUBLIC_LEGALOS_FEATURES ?? null}
        >
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
