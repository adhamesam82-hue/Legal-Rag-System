"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { legalosTheme } from "@/lib/legalos";
import { USING_CLERK } from "@/lib/auth-mode";
import { AuthTokenBridge } from "@/components/AuthTokenBridge";
import { OrgProvider } from "@/lib/org";
import { LocaleProvider } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/locale";

type ColorMode = "light" | "dark" | "system";

const ThemeModeContext = createContext<{
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
} | null>(null);

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within Providers");
  }
  return ctx;
}

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [mode, setMode] = useState<ColorMode>("system");
  const ctxValue = useMemo(() => ({ mode, setMode }), [mode]);

  const inner = (
    <LocaleProvider initialLocale={initialLocale}>
      <ThemeModeContext.Provider value={ctxValue}>
        <Theme theme={legalosTheme} mode={mode}>
          {/* Routes every Astryx Link through the Next router. */}
          <LinkProvider component={Link}>
            {USING_CLERK && <AuthTokenBridge />}
            <OrgProvider>{children}</OrgProvider>
          </LinkProvider>
        </Theme>
      </ThemeModeContext.Provider>
    </LocaleProvider>
  );

  // ClerkProvider throws without a publishable key, so it is only mounted
  // when one is configured; see lib/auth-mode.ts.
  return USING_CLERK ? <ClerkProvider>{inner}</ClerkProvider> : inner;
}
