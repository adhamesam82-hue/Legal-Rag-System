export type Locale = "en" | "ar";

export const LOCALES: Locale[] = ["en", "ar"];

/**
 * Arabic first.
 *
 * The product is aimed at Egyptian and MENA firms, whose files, filings and
 * court papers are written in Arabic — so a visitor with no saved preference
 * gets Arabic and RTL, and English is the deliberate switch rather than the
 * default. The Flutter app has always started here (LocaleCubit in
 * mobile/lib/app.dart); this is the web catching up to it.
 *
 * Changing this changes what a *new* visitor sees. Anyone who has already
 * used the language toggle carries a cookie and keeps their choice.
 */
export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_COOKIE = "legalos-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "ar";
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
