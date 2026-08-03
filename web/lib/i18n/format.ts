"use client";

import { useMemo } from "react";
import { useLocale } from "./provider";
import type { Locale } from "./locale";

/**
 * Dates, money and file sizes in the active locale.
 *
 * These used to live in lib/practice.ts as `toLocaleDateString("en-US")`
 * calls, which meant an Arabic screen still read "Aug 10, 2026" next to
 * "جلسة" — the one part of the interface the language toggle never reached.
 *
 * Numerals stay Western in both locales. `ar-EG` would otherwise select the
 * Arabic-Indic set (٤٥٬٥٠٠), and Egyptian legal and finance software is
 * written with Western digits: it keeps an invoice number, a case number and
 * an amount reading the same way in both languages, which is what a lawyer
 * cross-checking a figure against a paper file actually needs. `-u-nu-latn`
 * is what pins that; drop it and every number on every screen changes script.
 *
 * Callers use the `useFormat()` hook rather than these functions directly —
 * the locale then comes from context instead of being passed at each site.
 */
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-EG-u-nu-latn",
};

/** The BCP 47 tag to hand to Intl for a UI locale. */
export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

/**
 * Drops the bidi control characters Intl wraps Arabic output in (LRM, RLM,
 * ALM).
 *
 * They are invisible, but Node and the browser do not agree on emitting them:
 * SSR produced "‏1 مليون ج.م.‏" where the client produced
 * "1 مليون ج.م.‏", and React threw a hydration mismatch on every money
 * figure. The marks are not doing any work here either way — the whole
 * document is already dir="rtl" in Arabic and dir="ltr" in English, so the
 * surrounding direction is never ambiguous.
 */
const BIDI_MARKS = /[‎‏؜]/g;

function stripBidi(text: string): string {
  return text.replace(BIDI_MARKS, "");
}

/** Date-only columns arrive as YYYY-MM-DD; parsed bare they are read as UTC
 *  midnight, which renders as the previous day west of Greenwich. */
function parse(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

/** "10 أغسطس 2026" / "Aug 10, 2026". */
export function formatDate(
  iso: string | null | undefined,
  locale: Locale,
): string {
  if (!iso) return "—";
  const date = parse(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return stripBidi(
    date.toLocaleDateString(INTL_LOCALE[locale], {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  );
}

/** "10 أغسطس، 2:20 م" / "Aug 10, 2:20 PM". */
export function formatDateTime(
  iso: string | null | undefined,
  locale: Locale,
): string {
  if (!iso) return "—";
  const date = parse(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return stripBidi(
    date.toLocaleString(INTL_LOCALE[locale], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  );
}

/** Day heading: "الاثنين، 10 أغسطس" / "Monday, August 10". */
export function formatDayLong(
  iso: string | null | undefined,
  locale: Locale,
): string {
  if (!iso) return "—";
  const date = parse(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return stripBidi(
    date.toLocaleDateString(INTL_LOCALE[locale], {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
  );
}

/** Month heading: "أغسطس 2026" / "August 2026". */
export function formatMonth(
  iso: string | null | undefined,
  locale: Locale,
): string {
  if (!iso) return "—";
  const date = parse(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return stripBidi(
    date.toLocaleDateString(INTL_LOCALE[locale], {
      month: "long",
      year: "numeric",
    }),
  );
}

/** "45,500 ج.م" / "EGP 45,500". Intl places the symbol per locale, so the
 *  currency lands after the amount in Arabic and before it in English. */
export function formatMoney(
  amount: number | null | undefined,
  locale: Locale,
  currency = "EGP",
): string {
  if (amount === null || amount === undefined) return "—";
  return stripBidi(
    new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount)),
  );
}

/** "486 ألف ج.م" / "EGP 486K" — for tiles and axis ticks where the full
 *  figure would wrap. */
export function formatMoneyCompact(
  amount: number | null | undefined,
  locale: Locale,
  currency = "EGP",
): string {
  if (amount === null || amount === undefined) return "—";
  return stripBidi(
    new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(Number(amount)),
  );
}

const BYTE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;

/** "1.2 م.بايت" / "1.2 MB". */
export function formatBytes(bytes: number, locale: Locale): string {
  if (!bytes) return "—";
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return stripBidi(
    new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "unit",
      unit: BYTE_UNITS[exponent],
      unitDisplay: "short",
      maximumFractionDigits: value >= 10 || exponent === 0 ? 0 : 1,
    }).format(value),
  );
}

/**
 * The formatters bound to the active locale.
 *
 * Returns the same names the old `@/lib/practice` helpers had, so a component
 * swaps its import for one `const { … } = useFormat()` line and every call
 * site below it stays as it was.
 */
export function useFormat() {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      locale,
      intlLocale: INTL_LOCALE[locale],
      formatDate: (iso: string | null | undefined) => formatDate(iso, locale),
      formatDateTime: (iso: string | null | undefined) =>
        formatDateTime(iso, locale),
      formatDayLong: (iso: string | null | undefined) =>
        formatDayLong(iso, locale),
      formatMonth: (iso: string | null | undefined) => formatMonth(iso, locale),
      formatEGP: (amount: number | null | undefined, currency = "EGP") =>
        formatMoney(amount, locale, currency),
      formatEGPCompact: (amount: number | null | undefined, currency = "EGP") =>
        formatMoneyCompact(amount, locale, currency),
      formatBytes: (bytes: number) => formatBytes(bytes, locale),
    }),
    [locale],
  );
}
