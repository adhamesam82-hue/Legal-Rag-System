"use client";

/**
 * Settings section layout (T-053).
 *
 * Side navigation for settings sections: profile, appearance, firm settings, and users.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg } from "@/lib/org";

type NavItem = {
  href: string;
  labelKey: string;
  iconName: string;
  ai?: boolean;
};

const NAV_GROUPS: { titleKey?: string; items: NavItem[] }[] = [
  {
    titleKey: "@legalos.settings.group.myAccount",
    items: [
      { href: "/settings/profile", labelKey: "@legalos.settings.nav.profile", iconName: "person" },
      { href: "/settings/appearance", labelKey: "@legalos.settings.nav.appearance", iconName: "palette" /* PaintBrushIcon */ },
    ],
  },
  {
    items: [
      { href: "/settings", labelKey: "@legalos.settings.nav.firmSettings", iconName: "domain" },
      { href: "/settings/users", labelKey: "@legalos.settings.nav.users", iconName: "group" },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslator();
  const { organizationName } = useOrg();

  return (
    <div
      className="w-full flex flex-col gap-6"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      <div className="pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          {t("@legalos.settings.heading")}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation panel */}
        <aside
          role="navigation"
          aria-label={t("@legalos.settings.sectionsNavLabel")}
          className="md:col-span-1 flex flex-col gap-6 p-4 rounded-lg border"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          {NAV_GROUPS.map((group, index) => (
            <div key={group.titleKey ?? `firm-${index}`} className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider px-2" style={{ color: "var(--text3)" }}>
                {group.titleKey ? t(group.titleKey) : organizationName}
              </span>
              <nav className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? "var(--primary-soft)" : "transparent",
                        color: isActive ? "var(--primary)" : "var(--text2)",
                      }}
                    >
                      <Icon name={item.iconName} size={18} />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        {/* Content area */}
        <main className="md:col-span-3">
          {children}
        </main>
      </div>
    </div>
  );
}
