"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PrefetchedNavLink, useThemeMode } from "@/app/providers";
import { useLocale } from "@/lib/i18n/provider";
import { useTranslator, type TranslatorFn } from "@astryxdesign/core/i18n";
import { useOrg } from "@/lib/org";
import { useFormat } from "@/lib/i18n/format";
import type { PracticeApi } from "@/lib/practice";
import { isPathEnabled, featureForPath } from "@/lib/features";
import { useAppearance } from "@/lib/appearance";
import { Icon } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import {
  CommandPalette,
  CommandPaletteFooter,
  CommandPaletteInput,
} from "@astryxdesign/core/CommandPalette";
import { Kbd } from "@astryxdesign/core/Kbd";
import { HStack } from "@astryxdesign/core/Stack";

/**
 * الأنماط الأربعة المدعومة في نظام السجل (T-051 / E-5):
 * - light: واجهة وقائمة فاتحتان
 * - dark: واجهة وقائمة داكنتان
 * - mixed: واجهة فاتحة وقائمة جانبية داكنة
 * - mixed-inv: واجهة داكنة وقائمة جانبية فاتحة
 */
export type ShellThemeMode = "light" | "dark" | "mixed" | "mixed-inv";

const THEME_MODE_KEY = "legalos-theme-mode";
const SIDENAV_COLLAPSED_KEY = "sidebarCollapsed";
const SIDENAV_COLLAPSED_LEGACY_KEY = "legalos-sidenav-collapsed";

interface NavItemDef {
  href: string;
  labelKey: string;
  iconName: string;
  ai?: boolean;
  alsoMatch?: string[];
}

interface NavSectionDef {
  titleKey: string;
  items: NavItemDef[];
}

/**
 * تنظيم المجموعات السبع للشريط الجانبي وفقاً لقرار المالك وقالب السجل (T-051 / E-5):
 * 1. عام (لوحة التحكم)
 * 2. الموكّلون (الموكّلون، إدارة العلاقات 🔒)
 * 3. الممارسة القانونية (القضايا، يوميّة الجلسات، التقويم، المهام)
 * 4. المحتوى والمدوّنة (المستندات، مكتبة القوانين 🔒، النماذج والقوالب 🔒)
 * 5. الذكاء الاصطناعي (السؤال القانوني، المساعد الذكي 🔒، البحث القانوني 🔒، مراجعة العقود 🔒)
 * 6. الشؤون المالية (تتبّع الوقت، الفوترة، المحاسبة 🔒، التقارير 🔒)
 * 7. الفريق والنظام (الرسائل 🔒، الأتمتة 🔒، الإعدادات)
 */
export const SHELL_NAV_SECTIONS: NavSectionDef[] = [
  {
    titleKey: "@legalos.shell.nav.section.overview",
    items: [
      {
        href: "/dashboard",
        labelKey: "@legalos.shell.nav.dashboard",
        iconName: "space_dashboard",
      },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.clients",
    items: [
      {
        href: "/clients",
        labelKey: "@legalos.shell.nav.clients",
        iconName: "groups",
      },
      {
        href: "/crm",
        labelKey: "@legalos.shell.nav.crm",
        iconName: "hub",
      },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.practice",
    items: [
      {
        href: "/matters",
        labelKey: "@legalos.shell.nav.matters",
        iconName: "folder_open",
        alsoMatch: ["/cases"],
      },
      {
        href: "/hearings",
        labelKey: "@legalos.shell.nav.hearings",
        iconName: "gavel",
      },
      {
        href: "/calendar",
        labelKey: "@legalos.shell.nav.calendar",
        iconName: "calendar_month",
      },
      {
        href: "/tasks",
        labelKey: "@legalos.shell.nav.tasks",
        iconName: "task_alt",
      },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.content",
    items: [
      {
        href: "/documents",
        labelKey: "@legalos.shell.nav.documents",
        iconName: "description",
      },
      {
        href: "/library",
        labelKey: "@legalos.shell.nav.lawLibrary",
        iconName: "menu_book",
        alsoMatch: ["/article"],
      },
      {
        href: "/knowledge-base",
        labelKey: "@legalos.shell.nav.knowledgeBase",
        iconName: "content_paste",
      },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.ai",
    items: [
      {
        href: "/ai-assistant",
        labelKey: "@legalos.shell.nav.legalQuestion",
        iconName: "psychology",
        ai: true,
      },
      {
        href: "/ai-assistant",
        labelKey: "@legalos.shell.nav.aiAssistant",
        iconName: "smart_toy",
        ai: true,
      },
      {
        href: "/legal-research",
        labelKey: "@legalos.shell.nav.legalResearch",
        iconName: "travel_explore",
        ai: true,
        alsoMatch: ["/search"],
      },
      {
        href: "/contract-review",
        labelKey: "@legalos.shell.nav.contractReview",
        iconName: "rule",
        ai: true,
      },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.finance",
    items: [
      {
        href: "/time-tracking",
        labelKey: "@legalos.shell.nav.timeTracking",
        iconName: "timer",
      },
      {
        href: "/billing",
        labelKey: "@legalos.shell.nav.billing",
        iconName: "receipt_long",
      },
      {
        href: "/accounting",
        labelKey: "@legalos.shell.nav.accounting",
        iconName: "account_balance",
      },
      {
        href: "/reports",
        labelKey: "@legalos.shell.nav.reports",
        iconName: "monitoring",
      },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.team",
    items: [
      {
        href: "/messages",
        labelKey: "@legalos.shell.nav.messages",
        iconName: "forum",
      },
      {
        href: "/automation",
        labelKey: "@legalos.shell.nav.automation",
        iconName: "bolt",
      },
      {
        href: "/settings",
        labelKey: "@legalos.shell.nav.settings",
        iconName: "settings",
      },
    ],
  },
];

/**
 * دالة استرجاع أقسام التنقل بعد معالجة الميزات وقت التشغيل.
 * يتم استدعاؤها أثناء التصيير (Render-time) وليس في نطاق الموديول الثابت،
 * لضمان وصول قيم الميزات من المزود (Providers) بدلاً من تجميدها وقت البناء.
 */
export function navSections(): NavSectionDef[] {
  return SHELL_NAV_SECTIONS;
}

/** أيقونة المطرقة القضائية للعلامة الرسمية */
function GavelIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M1 21h12v2H1v-2zM5.245 8.05l2.83-2.83 9.9 9.9-2.83 2.83-9.9-9.9zM12.317 3.808l2.828-2.829 5.657 5.657-2.828 2.829-5.657-5.657zM3.832 12.293l2.829-2.828 5.656 5.657-2.828 2.828-5.657-5.657z" />
    </svg>
  );
}

/**
 * علامة «السِّجل» الرسمية:
 * مربع بزوايا --rs وخلفية --primary مع أيقونة gavel،
 * وبجوارها نص «السِّجل» بخط عريض والسطر الوصفي بـ --text3.
 * تنكمش للأيقونة وحدها عند طي الشريط.
 */
function SijilBrand({ collapsed = false }: { collapsed?: boolean }) {
  const t = useTranslator();
  const brandName = t("@legalos.shell.brand");
  const brandTagline = t("@legalos.shell.brandTagline");
  const fullLabel = `${brandName} — ${brandTagline}`;

  return (
    <div
      role="img"
      aria-label={fullLabel}
      className="flex items-center gap-2.5 overflow-hidden text-start"
    >
      <div
        className="grid place-items-center flex-none"
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "var(--rs, 10px)",
          background: "var(--primary)",
          color: "var(--primary-fg)",
          boxShadow: "var(--shadow)",
        }}
        aria-hidden="true"
      >
        <GavelIcon size={20} />
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[15px] font-bold text-[var(--text)] whitespace-nowrap leading-tight">
            {brandName}
          </span>
          <span
            className="text-[10.5px] font-medium text-[var(--text3)] whitespace-nowrap leading-tight"
            style={{ letterSpacing: "0.2px" }}
          >
            {brandTagline}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * شريط التنبيه بانتهاء الفترة التجريبية (T-041)
 */
function TrialBar() {
  const { memberships, organizationId } = useOrg();
  const t = useTranslator();
  const { formatDate } = useFormat();
  const active = memberships.find((m) => m.organization_id === organizationId);
  if (!active || active.plan !== "trial") return null;

  const daysLeft = Math.ceil(
    (new Date(active.trial_ends_at).getTime() - Date.now()) / 86_400_000,
  );

  return (
    <Banner
      container="section"
      status={active.trial_expired ? "error" : daysLeft <= 3 ? "warning" : "info"}
      title={
        active.trial_expired
          ? t("@legalos.plans.trialBar.expired")
          : t("@legalos.plans.trialBar.daysLeft", { days: Math.max(daysLeft, 0) })
      }
      description={t("@legalos.plans.trialBar.until", { date: formatDate(active.trial_ends_at) })}
      endContent={
        <Button
          label={t("@legalos.plans.trialBar.viewPlans")}
          variant="secondary"
          size="sm"
          as={PrefetchedNavLink}
          href="/plans"
        >
          {t("@legalos.plans.trialBar.viewPlans")}
        </Button>
      }
    />
  );
}

const SEARCH_LIMIT = 5;
const MIN_QUERY = 2;

type CommandItem = {
  id: string;
  label: string;
  auxiliaryData: { group: string; href: string };
};

function useCommandSource(t: TranslatorFn, practice: PracticeApi | null) {
  return useMemo(() => {
    const navItems: CommandItem[] = SHELL_NAV_SECTIONS.flatMap((section) =>
      section.items
        .filter((item) => isPathEnabled(item.href))
        .map((item) => ({
          id: item.href,
          label: t(item.labelKey),
          auxiliaryData: {
            group: t("@legalos.shell.search.group.navigation"),
            href: item.href,
          },
        })),
    );

    const rows = (
      items: { id: number; label: string }[],
      path: string,
      groupKey: string,
    ): CommandItem[] =>
      items.slice(0, SEARCH_LIMIT).map((item) => ({
        id: `${path}/${item.id}`,
        label: item.label,
        auxiliaryData: { group: t(groupKey), href: `${path}/${item.id}` },
      }));

    return {
      bootstrap: () => navItems,
      async search(query: string): Promise<CommandItem[]> {
        const q = query.trim();
        const folded = q.toLowerCase();
        const nav = navItems.filter((item) =>
          item.label.toLowerCase().includes(folded),
        );
        if (!practice || q.length < MIN_QUERY) return nav;

        const [clients, matters, documents] = await Promise.all([
          practice.clients.list({ q }).catch(() => []),
          practice.matters.list({ q }).catch(() => []),
          practice.documents.list({ q }).catch(() => []),
        ]);

        return [
          ...nav,
          ...rows(
            matters.map((m) => ({ id: m.id, label: m.name })),
            "/matters",
            "@legalos.shell.search.group.matters",
          ),
          ...rows(
            clients.map((c) => ({ id: c.id, label: c.name })),
            "/clients",
            "@legalos.shell.search.group.clients",
          ),
          ...rows(
            documents.map((d) => ({ id: d.id, label: d.name })),
            "/documents",
            "@legalos.shell.search.group.documents",
          ),
        ];
      },
    };
  }, [t, practice]);
}

/** المسارات التي لا تظهر فيها القشرة للمستخدمين غير المسجلين */
const BARE_ROUTES = ["/sign-in", "/sign-up", "/invite"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslator();
  const { locale, setLocale } = useLocale();
  const { mode: parentMode, setMode: setParentMode } = useThemeMode();
  const { practice, organizationName } = useOrg();

  // ربط القشرة بكائن التخزين الموحد لإعدادات المظهر (T-054)
  const { settings: appearance, updateSettings } = useAppearance();
  const isCollapsed = appearance.sidebarCollapsed;
  const themeMode = appearance.theme as ShellThemeMode;

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // مزامنة نمط القشرة مع ثيم Astryx العام
  useEffect(() => {
    const targetShellTheme =
      appearance.theme === "dark" || appearance.theme === "mixed-inv" ? "dark" : "light";
    setParentMode(targetShellTheme);
  }, [appearance.theme, setParentMode]);

  // التحقق والتوافق المباشر مع التخزين المحلي (T-051 / T-054)
  useEffect(() => {
    try {
      const savedCollapsed = window.localStorage.getItem("sidebarCollapsed");
      if (savedCollapsed === "true" && !appearance.sidebarCollapsed) {
        updateSettings({ sidebarCollapsed: true });
      }
    } catch {
      // تجاهل أخطاء التخزين المحجوب
    }
  }, [appearance.sidebarCollapsed, updateSettings]);

  // حفظ حالة الطي وتحديث كائن التخزين الموحد والتوافق العكسي المباشر
  const handleToggleCollapse = useCallback(() => {
    const next = !appearance.sidebarCollapsed;
    updateSettings({ sidebarCollapsed: next });
    try {
      window.localStorage.setItem("sidebarCollapsed", String(next));
    } catch {
      // تجاهل أخطاء التخزين
    }
  }, [appearance.sidebarCollapsed, updateSettings]);

  // تبديل النمط وحفظه ومزامنته مع كائن التخزين الموحد
  const handleThemeChange = useCallback(
    (newMode: ShellThemeMode) => {
      updateSettings({ theme: newMode });
      const targetShellTheme = newMode === "dark" || newMode === "mixed-inv" ? "dark" : "light";
      setParentMode(targetShellTheme);
    },
    [setParentMode, updateSettings],
  );

  const commandSource = useCommandSource(t, practice);

  // إغلاق قائمة الجوال عند تغيير المسار
  useEffect(() => {
    setIsMobileOpen(false);
    setIsAccountMenuOpen(false);
  }, [pathname]);

  if (BARE_ROUTES.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  // حساب ثيم القشرة وثيم الشريط الجانبي المستقلين لدعم الأوضاع الأربعة
  const shellTheme = themeMode === "dark" || themeMode === "mixed-inv" ? "dark" : "light";
  const navTheme = themeMode === "dark" || themeMode === "mixed" ? "dark" : "light";

  const isRtl = locale === "ar";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      data-theme={shellTheme}
      className="flex min-h-screen w-full"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-family-body)",
      }}
    >
      {/* خلفية معتمة للجوال عند فتح القائمة */}
      {isMobileOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* الشريط الجانبي (Aside Navigation) */}
      <aside
        data-theme={navTheme}
        aria-label={t("@legalos.shell.mainNavAriaLabel")}
        className={`fixed inset-y-0 start-0 z-50 flex flex-col transition-all duration-200 ease-in-out md:sticky md:top-0 md:h-screen ${
          isMobileOpen
            ? "translate-x-0"
            : isRtl
            ? "translate-x-full md:translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width: isCollapsed ? "66px" : "248px",
          backgroundColor: "var(--surface)",
          borderInlineEnd: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        {/* ترويسة الشريط الجانبي: العلامة وزر الإغلاق في الجوال */}
        <div
          className="flex flex-none items-center justify-between gap-2 px-4"
          style={{
            height: "66px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <SijilBrand collapsed={isCollapsed} />
          {/* زر إغلاق القائمة في الشاشات الصغيرة */}
          <button
            type="button"
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md md:hidden"
            style={{
              color: "var(--text2)",
              backgroundColor: "transparent",
            }}
            onClick={() => setIsMobileOpen(false)}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* قائمة المجموعات والبنود السبعة */}
        <nav
          className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-1"
          style={{
            scrollbarWidth: "thin",
          }}
        >
          {SHELL_NAV_SECTIONS.map((section) => (
            <div key={section.titleKey} className="pt-2">
              {!isCollapsed && (
                <div
                  className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-start"
                  style={{ color: "var(--text3)" }}
                >
                  {t(section.titleKey)}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isLocked = !isPathEnabled(item.href);
                  const feature = featureForPath(item.href);
                  const isSelected =
                    !isLocked &&
                    ([item.href, ...(item.alsoMatch ?? [])].some((prefix) =>
                      prefix === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname === prefix || pathname.startsWith(`${prefix}/`),
                    ));

                  const label = t(item.labelKey);
                  const lockedTitle = isLocked
                    ? `${item.href} — محجوبة بمفتاح ${feature ?? ""}`
                    : label;

                  // حالة البند المقفول
                  if (isLocked) {
                    return (
                      <div
                        key={`${item.href}-${item.labelKey}`}
                        title={lockedTitle}
                        role="link"
                        aria-disabled="true"
                        className="group relative flex w-full items-center gap-3 rounded-[var(--rs,10px)] px-3 py-2 text-start text-[13px] font-medium transition-colors"
                        style={{
                          backgroundColor: "transparent",
                          color: "var(--text3)",
                          cursor: "not-allowed",
                          opacity: 0.72,
                        }}
                      >
                        <Icon
                          name={item.iconName}
                          size={20}
                          className="flex-none opacity-80"
                        />
                        {!isCollapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate">{label}</span>
                            <Icon
                              name="lock"
                              size={15}
                              className="flex-none opacity-70"
                            />
                          </>
                        )}
                      </div>
                    );
                  }

                  // حالة البند النشط والمفتوح
                  return (
                    <PrefetchedNavLink
                      key={`${item.href}-${item.labelKey}`}
                      href={item.href}
                      title={label}
                      className="group relative flex w-full items-center gap-3 rounded-[var(--rs,10px)] px-3 py-2 text-start text-[13px] font-medium transition-colors"
                      style={{
                        backgroundColor: isSelected ? "var(--surface2)" : "transparent",
                        color: isSelected ? "var(--text)" : "var(--text2)",
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      <Icon
                        name={item.iconName}
                        size={20}
                        className={`flex-none ${
                          item.ai ? "text-[var(--accent)]" : ""
                        }`}
                        style={{
                          color: isSelected
                            ? "var(--primary)"
                            : item.ai
                            ? "var(--accent)"
                            : "currentColor",
                        }}
                      />
                      {!isCollapsed && (
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      )}

                      {/* شريط الإشارة للبند النشط في نهاية العنصر كما في القالب */}
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute rounded-full"
                          style={{
                            insetInlineEnd: "6px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "3px",
                            height: "18px",
                            backgroundColor: "var(--accent)",
                          }}
                        />
                      )}
                    </PrefetchedNavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* تذييل الشريط الجانبي: زر الطي والتوسيع المستمر */}
        <div
          className="flex flex-none items-center justify-between p-2.5"
          style={{
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={handleToggleCollapse}
            title={isCollapsed ? t("@legalos.shell.expand") : t("@legalos.shell.collapse")}
            aria-label={isCollapsed ? t("@legalos.shell.expand") : t("@legalos.shell.collapse")}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--rs,10px)] px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--surface2)]"
            style={{
              color: "var(--text2)",
            }}
          >
            <Icon
              name={
                isCollapsed
                  ? isRtl
                    ? "keyboard_double_arrow_left"
                    : "keyboard_double_arrow_right"
                  : isRtl
                  ? "keyboard_double_arrow_right"
                  : "keyboard_double_arrow_left"
              }
              size={18}
            />
            {!isCollapsed && <span>{t("@legalos.shell.collapse")}</span>}
          </button>
        </div>
      </aside>

      {/* منطقة المحتوى الرئيسي والشريط العلوي */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* الشريط العلوي الملتصق (Sticky Header) */}
        <header
          className="sticky top-0 z-30 flex min-h-[66px] flex-none flex-wrap items-center gap-3 px-5 py-2.5 backdrop-blur-md"
          style={{
            backgroundColor: "color-mix(in oklab, var(--surface) 88%, transparent)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* زر فتح القائمة في الشاشات الصغيرة */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open Navigation"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-[var(--rs,10px)] border md:hidden"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text2)",
            }}
          >
            <Icon name="menu" size={20} />
          </button>

          {/* زر طي القائمة في سطح المكتب كما في القالب */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            title={isCollapsed ? t("@legalos.shell.expand") : t("@legalos.shell.collapse")}
            className="hidden h-9 w-9 flex-none items-center justify-center rounded-[var(--rs,10px)] border md:flex"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text2)",
            }}
          >
            <Icon name={isCollapsed ? "menu" : "menu_open"} size={20} />
          </button>

          {/* حقل البحث السريع مع زر Ctrl K */}
          <div className="relative flex flex-1 items-center max-w-md min-w-[180px]">
            <span
              className="pointer-events-none absolute start-3 flex items-center justify-center"
              style={{ color: "var(--text3)" }}
            >
              <Icon name="search" size={18} />
            </span>
            <input
              type="text"
              readOnly
              onClick={() => setIsSearchOpen(true)}
              placeholder={t("@legalos.shell.search.placeholder")}
              className="w-full cursor-pointer rounded-full border py-1.5 pe-16 ps-9 text-[13px] outline-none transition-all"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface2)",
                color: "var(--text)",
              }}
            />
            <span
              onClick={() => setIsSearchOpen(true)}
              className="absolute end-2.5 cursor-pointer rounded-md border px-1.5 py-0.5 text-[10.5px]"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text3)",
              }}
            >
              Ctrl K
            </span>
          </div>

          <div className="flex-1" />

          {/* أزرار تبديل الأنماط الأربعة كما في القالب (T-051 / E-5) */}
          <div
            className="flex flex-none items-center gap-0.5 rounded-full border p-0.5"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface2)",
            }}
          >
            {/* فاتح */}
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              title={t("@legalos.shell.theme.light")}
              aria-label={t("@legalos.shell.theme.light")}
              className="flex h-7 w-8 items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: themeMode === "light" ? "var(--surface)" : "transparent",
                color: themeMode === "light" ? "var(--primary)" : "var(--text3)",
                boxShadow: themeMode === "light" ? "var(--shadow)" : "none",
              }}
            >
              <Icon name="light_mode" size={16} />
            </button>

            {/* داكن */}
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              title={t("@legalos.shell.theme.dark")}
              aria-label={t("@legalos.shell.theme.dark")}
              className="flex h-7 w-8 items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: themeMode === "dark" ? "var(--surface)" : "transparent",
                color: themeMode === "dark" ? "var(--primary)" : "var(--text3)",
                boxShadow: themeMode === "dark" ? "var(--shadow)" : "none",
              }}
            >
              <Icon name="dark_mode" size={16} />
            </button>

            {/* مختلط: قائمة داكنة */}
            <button
              type="button"
              onClick={() => handleThemeChange("mixed")}
              title={t("@legalos.shell.theme.mixed")}
              aria-label={t("@legalos.shell.theme.mixed")}
              className="flex h-7 w-8 items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: themeMode === "mixed" ? "var(--surface)" : "transparent",
                color: themeMode === "mixed" ? "var(--primary)" : "var(--text3)",
                boxShadow: themeMode === "mixed" ? "var(--shadow)" : "none",
              }}
            >
              <Icon name="contrast" size={16} />
            </button>

            {/* مختلط عكسي: قائمة فاتحة */}
            <button
              type="button"
              onClick={() => handleThemeChange("mixed-inv")}
              title={t("@legalos.shell.theme.mixedInv")}
              aria-label={t("@legalos.shell.theme.mixedInv")}
              className="flex h-7 w-8 items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: themeMode === "mixed-inv" ? "var(--surface)" : "transparent",
                color: themeMode === "mixed-inv" ? "var(--primary)" : "var(--text3)",
                boxShadow: themeMode === "mixed-inv" ? "var(--shadow)" : "none",
              }}
            >
              <Icon name="invert_colors" size={16} />
            </button>
          </div>

          {/* زر تبديل اللغة */}
          <button
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="flex h-8.5 flex-none items-center gap-1.5 rounded-[var(--rs,10px)] border px-3 text-[12px] font-semibold transition-colors hover:bg-[var(--surface2)]"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text2)",
            }}
          >
            <Icon name="translate" size={16} />
            <span>{locale === "ar" ? "EN" : "العربية"}</span>
          </button>

          {/* زر الإشعارات */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 flex-none items-center justify-center rounded-[var(--rs,10px)] border transition-colors hover:bg-[var(--surface2)]"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text2)",
            }}
          >
            <Icon name="notifications" size={20} />
            <span
              className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full"
              style={{
                backgroundColor: "var(--danger)",
                boxShadow: "0 0 0 2px var(--surface)",
              }}
            />
          </button>

          {/* خط فاصل صغير */}
          <div
            className="h-6 w-[1px] flex-none"
            style={{ backgroundColor: "var(--border)" }}
          />

          {/* زر وقائمة المستخدم */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              aria-label={t("@legalos.shell.account.menuAriaLabel")}
              aria-expanded={isAccountMenuOpen}
              className="flex items-center gap-2 rounded-full p-1 text-start transition-colors hover:bg-[var(--surface2)]"
            >
              <div
                className="grid h-8 w-8 flex-none place-items-center rounded-full text-[12px] font-bold"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                أح
              </div>
              <div className="hidden flex-col md:flex">
                <span className="text-[12.5px] font-semibold leading-tight text-[var(--text)]">
                  {organizationName ?? "أ. أحمد الحسيني"}
                </span>
                <span className="text-[10.5px] text-[var(--text3)] leading-tight">
                  شريك مؤسس
                </span>
              </div>
              <Icon name="expand_more" size={16} className="text-[var(--text3)]" />
            </button>

            {/* القائمة المنسدلة للحساب */}
            {isAccountMenuOpen && (
              <div
                className="absolute end-0 top-full mt-2 w-48 rounded-[var(--r,14px)] border p-1 shadow-lg z-50"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    router.push("/settings/profile");
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-[13px] hover:bg-[var(--surface2)]"
                >
                  <Icon name="person" size={16} />
                  <span>{t("@legalos.shell.account.profile")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-[13px] hover:bg-[var(--surface2)]"
                >
                  <Icon name="settings" size={16} />
                  <span>{t("@legalos.shell.account.firmSettings")}</span>
                </button>
                <div
                  className="my-1 h-[1px] w-full"
                  style={{ backgroundColor: "var(--border)" }}
                />
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-[13px] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                >
                  <Icon name="logout" size={16} />
                  <span>{t("@legalos.shell.account.signOut")}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* شريط الأيام المتبقية في الفترة التجريبية */}
        <TrialBar />

        {/* جسم الصفحة الرئيسي */}
        <main
          className="flex-1 p-6"
          style={{
            backgroundColor: "var(--bg)",
          }}
        >
          {/* شريط المسار فوق عنوان كل شاشة (T-060 / E-5) */}
          <Breadcrumb />
          {children}
        </main>
      </div>

      {/* لوحة الأوامر والبحث (Command Palette) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        searchSource={commandSource}
        label={t("@legalos.shell.search.ariaLabel")}
        emptyBootstrapText={t("@legalos.shell.search.emptyBootstrap")}
        emptySearchText={t("@legalos.shell.search.empty")}
        input={
          <CommandPaletteInput
            placeholder={t("@legalos.shell.search.placeholder")}
            label={t("@legalos.shell.search.ariaLabel")}
          />
        }
        footer={
          <CommandPaletteFooter>
            <HStack gap={4} vAlign="center">
              <HStack gap={1} vAlign="center">
                <Kbd keys="up" />
                <Kbd keys="down" />
                {t("@legalos.shell.search.hint.navigate")}
              </HStack>
              <HStack gap={1} vAlign="center">
                <Kbd keys="enter" />
                {t("@legalos.shell.search.hint.select")}
              </HStack>
              <HStack gap={1} vAlign="center">
                <Kbd keys="escape" />
                {t("@legalos.shell.search.hint.close")}
              </HStack>
            </HStack>
          </CommandPaletteFooter>
        }
        onValueChange={(value) => {
          if (!value) return;
          router.push(value);
          setIsSearchOpen(false);
        }}
      />
    </div>
  );
}
