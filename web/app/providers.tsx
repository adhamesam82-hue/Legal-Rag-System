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
import { setClerkPublishableKey, usingClerk } from "@/lib/auth-mode";
import { setEnabledFeatures } from "@/lib/features";
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
  clerkPublishableKey,
  features,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
  /** Read from the environment by the server-rendered layout on every request.
   *  Not read from process.env here: Next inlines NEXT_PUBLIC_* into the client
   *  bundle at build time, and the image is built once with no Clerk key so the
   *  same artefact can serve staging and production. See lib/auth-mode.ts. */
  clerkPublishableKey?: string | null;
  /** NEXT_PUBLIC_LEGALOS_FEATURES, read by the server layout on each request.
   *  Same reason as the Clerk key: inlining it at build time would tie the
   *  image to one environment, and staging exists to show every screen. */
  features?: string | null;
}) {
  // During render, not in an effect: children read usingClerk() while they
  // render, and an effect would run after they had already decided.
  setClerkPublishableKey(clerkPublishableKey);
  setEnabledFeatures(features);
  const clerkIsConfigured = usingClerk();
  const [mode, setMode] = useState<ColorMode>("system");
  const ctxValue = useMemo(() => ({ mode, setMode }), [mode]);

  const inner = (
    <LocaleProvider initialLocale={initialLocale}>
      <ThemeModeContext.Provider value={ctxValue}>
        <Theme theme={legalosTheme} mode={mode}>
          {/* Routes every Astryx Link through the Next router. */}
          <LinkProvider component={Link}>
            {clerkIsConfigured && <AuthTokenBridge />}
            <OrgProvider>{children}</OrgProvider>
          </LinkProvider>
        </Theme>
      </ThemeModeContext.Provider>
    </LocaleProvider>
  );

  // ClerkProvider throws without a publishable key, so it is only mounted
  // when one is configured; see lib/auth-mode.ts.
  return clerkIsConfigured ? (
    // publishableKey passed explicitly: ClerkProvider would otherwise look for
    // the build-time inlined value, which is absent in this image by design.
    //
    // The four URLs are passed for the same reason, and they are literals
    // rather than configuration because they are the same in both
    // environments: this app has its own /sign-in and /sign-up screens. Clerk
    // otherwise falls back to its hosted Account Portal, and a visitor to
    // alsigil.com/dashboard is sent to accounts.alsigil.com -- a different
    // origin, outside this repository, that has to be separately provisioned,
    // and which sends them back with a redirect_url round trip. Observed in
    // production on 1 September 2026, where that hostname did not yet resolve
    // at all, so signing in ended nowhere.
    <ClerkProvider
      publishableKey={clerkPublishableKey ?? undefined}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      {inner}
    </ClerkProvider>
  ) : (
    inner
  );
}

