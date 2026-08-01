"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { InternationalizationProvider, getLocaleDirection } from "@astryxdesign/core/i18n";
import { messages } from "./messages";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./locale";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    // Cookie (not localStorage) so the server can render the correct <html
    // lang/dir> on the next request — without it, Arabic visitors would see
    // an LTR flash on every load before hydration corrected it client-side.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = getLocaleDirection(next);
  };

  const ctxValue = useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <LocaleContext.Provider value={ctxValue}>
      <InternationalizationProvider locale={locale} messages={messages}>
        {children}
      </InternationalizationProvider>
    </LocaleContext.Provider>
  );
}
