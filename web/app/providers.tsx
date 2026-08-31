"use client";

// Same pin as layout.tsx, for the browser half of the render. Both
// sides must agree or the calendar hydrates with different digits.
import "@/lib/i18n/pin-intl";
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

/**
 * next/link that prefetches the whole route, not just part of it.
 *
 * Every screen here is a dynamic route: the root layout reads the locale cookie
 * so the first `<html dir>` is already correct, and that opts the whole tree
 * out of static rendering. Next's default prefetch for a dynamic route only
 * reaches the nearest `loading.js` boundary, and there is none by design -- a
 * route-level loading boundary would be a second spinner stacked on the one the
 * data layer already owns. So the default cached nothing usable, and a click
 * paid a round trip for the route payload before the new screen rendered at
 * all. Measured at 150ms of latency, that round trip *was* what remained of a
 * navigation once the data was already in hand: 212ms of it.
 *
 * `prefetch` brings a return navigation to ~67ms. The alternatives were
 * measured and do not: `router.prefetch()` on pointer-enter leaves it at 214ms
 * and `unstable_dynamicOnHover` at 198ms, both because a hover cannot download
 * a route in the time a pointer rests on a menu item.
 *
 * The cost is 713KB of route chunks on top of a 434KB cold load, for screens
 * the visitor may never open. Accepted because Next serves those chunks under
 * immutable URLs: it is paid once per deploy, not once per session, against
 * ~145ms saved on every click for as long as the app stays open. Should that
 * balance ever change, the charting library is where to look first -- it was
 * 467KB of the 713, reachable from five screens, and `next/dynamic` would keep
 * it out of the prefetch.
 *
 * `to` is dropped: Astryx passes it alongside `href` for `to`-based routers
 * (React Router, TanStack), and next/link would forward it to the DOM.
 */
export function PrefetchedNavLink({
  to: _to,
  ...props
}: React.ComponentProps<typeof Link> & { to?: string }) {
  return <Link {...props} prefetch />;
}

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
