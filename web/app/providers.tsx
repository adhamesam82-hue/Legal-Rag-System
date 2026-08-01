"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { legalosTheme } from "@/lib/legalos";

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

export function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ColorMode>("system");
  const ctxValue = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <ThemeModeContext.Provider value={ctxValue}>
      <Theme theme={legalosTheme} mode={mode}>
        {/* Routes every Astryx Link through the Next router. */}
        <LinkProvider component={Link}>{children}</LinkProvider>
      </Theme>
    </ThemeModeContext.Provider>
  );
}
