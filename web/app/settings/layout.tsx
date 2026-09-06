"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  BuildingOffice2Icon,
  PaintBrushIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg } from "@/lib/org";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ai?: boolean;
};

const NAV_GROUPS: { titleKey?: string; items: NavItem[] }[] = [
  {
    titleKey: "@legalos.settings.group.myAccount",
    items: [
      { href: "/settings/profile", labelKey: "@legalos.settings.nav.profile", icon: UserCircleIcon },
      { href: "/settings/appearance", labelKey: "@legalos.settings.nav.appearance", icon: PaintBrushIcon },
    ],
  },
  {
    items: [
      { href: "/settings", labelKey: "@legalos.settings.nav.firmSettings", icon: BuildingOffice2Icon },
      { href: "/settings/users", labelKey: "@legalos.settings.nav.users", icon: UserGroupIcon },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslator();
  const { organizationName } = useOrg();

  return (
    <Card padding={0} bordered shadow className="w-full h-full flex flex-col">
      {/* الترويسة Header */}
      <div
        className="flex items-center px-6 py-4 border-b flex-none"
        style={{ borderColor: "var(--border)" }}
      >
        <h1
          className="text-lg font-bold"
          style={{ color: "var(--text)" }}
        >
          {t("@legalos.settings.heading")}
        </h1>
      </div>

      {/* الجسم الرئيسي: لوحة التنقل الجانبية والمحتوى */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* اللوحة الجانبية لأقسام الإعدادات */}
        <aside
          role="navigation"
          aria-label={t("@legalos.settings.sectionsNavLabel")}
          className="w-full md:w-[240px] flex-none border-b md:border-b-0 md:border-inline-end p-4 overflow-y-auto"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="flex flex-col gap-5">
            {NAV_GROUPS.map((group, index) => (
              <div key={group.titleKey ?? `firm-${index}`} className="flex flex-col gap-1">
                <span
                  className="px-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text2)" }}
                >
                  {group.titleKey ? t(group.titleKey) : organizationName}
                </span>
                <nav className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const isSelected = pathname === item.href;
                    const IconComp = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-[var(--rs,10px)] text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: isSelected ? "var(--surface2)" : "transparent",
                          color: isSelected ? "var(--text)" : "var(--text2)",
                          fontWeight: isSelected ? 600 : 500,
                        }}
                      >
                        <IconComp
                          className={`h-5 w-5 flex-none ${
                            item.ai ? "text-purple-vivid" : ""
                          }`}
                          style={{
                            color: isSelected
                              ? "var(--primary)"
                              : item.ai
                              ? undefined
                              : "var(--text2)",
                          }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        {/* المحتوى الرئيسي */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </Card>
  );
}
