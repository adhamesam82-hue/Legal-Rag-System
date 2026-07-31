"use client";

import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { AuthTokenBridge } from "@/components/AuthTokenBridge";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <Theme theme={neutralTheme}>
        {/* Routes every Astryx Link through the Next router. */}
        <LinkProvider component={Link}>
          <AuthTokenBridge />
          {children}
        </LinkProvider>
      </Theme>
    </ClerkProvider>
  );
}
