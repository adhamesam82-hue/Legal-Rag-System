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

/**
 * The BCP 47 tag each UI locale formats with.
 *
 * Lives HERE rather than in format.ts because format.ts pulls in React and
 * this has to be importable from pin-intl.ts, which runs on the bare server
 * before any component does.
 *
 * `ar-EG-u-nu-latn`, not a bare `ar`: the extension pins Western numerals. A
 * bare tag leaves the numbering system to whatever the runtime decides, and
 * Node and the browser decide differently -- which is exactly the divergence
 * pin-intl.ts exists to close.
 */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-EG-u-nu-latn",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "ar";
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
