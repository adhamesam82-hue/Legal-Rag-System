"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, useAppShellMobile } from "@astryxdesign/core/AppShell";
import { Theme } from "@astryxdesign/core/theme";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import {
  SideNav,
  SideNavCollapseButton,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import { NavHeadingMenu, NavHeadingMenuItem } from "@astryxdesign/core/NavMenu";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Avatar } from "@astryxdesign/core/Avatar";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { CommandPalette } from "@astryxdesign/core/CommandPalette";
import { createStaticSource } from "@astryxdesign/core/Typeahead";
import { HStack } from "@astryxdesign/core/Stack";
import {
  ScaleIcon,
  Squares2X2Icon,
  UserGroupIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  FolderIcon,
  SparklesIcon,
  BookOpenIcon,
  DocumentMagnifyingGlassIcon,
  ClockIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChartBarIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { useTranslator, type TranslatorFn } from "@astryxdesign/core/i18n";
import { legalosTheme } from "@/lib/legalos";
import { useThemeMode } from "@/app/providers";
import { useLocale } from "@/lib/i18n/provider";

// stylex.create() isn't compiled by this app's build (see globals.css); AI
// accent color goes through the Tailwind token bridge instead.
const AI_ICON_CLASS = "text-purple-vivid";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ai?: boolean;
};

const NAV_SECTIONS: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "@legalos.shell.nav.section.overview",
    items: [{ href: "/dashboard", labelKey: "@legalos.shell.nav.dashboard", icon: Squares2X2Icon }],
  },
  {
    titleKey: "@legalos.shell.nav.section.clients",
    items: [
      { href: "/crm", labelKey: "@legalos.shell.nav.crm", icon: UserGroupIcon },
      { href: "/clients", labelKey: "@legalos.shell.nav.clients", icon: BuildingOffice2Icon },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.practice",
    items: [
      { href: "/matters", labelKey: "@legalos.shell.nav.matters", icon: BriefcaseIcon },
      { href: "/cases", labelKey: "@legalos.shell.nav.cases", icon: ScaleIcon },
      { href: "/calendar", labelKey: "@legalos.shell.nav.calendar", icon: CalendarDaysIcon },
      { href: "/tasks", labelKey: "@legalos.shell.nav.tasks", icon: CheckCircleIcon },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.content",
    items: [
      { href: "/documents", labelKey: "@legalos.shell.nav.documents", icon: FolderIcon },
      { href: "/knowledge-base", labelKey: "@legalos.shell.nav.knowledgeBase", icon: LightBulbIcon },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.ai",
    items: [
      { href: "/ai-assistant", labelKey: "@legalos.shell.nav.aiAssistant", icon: SparklesIcon, ai: true },
      { href: "/legal-research", labelKey: "@legalos.shell.nav.legalResearch", icon: BookOpenIcon, ai: true },
      {
        href: "/contract-review",
        labelKey: "@legalos.shell.nav.contractReview",
        icon: DocumentMagnifyingGlassIcon,
        ai: true,
      },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.finance",
    items: [
      { href: "/time-tracking", labelKey: "@legalos.shell.nav.timeTracking", icon: ClockIcon },
      { href: "/billing", labelKey: "@legalos.shell.nav.billing", icon: CreditCardIcon },
      { href: "/accounting", labelKey: "@legalos.shell.nav.accounting", icon: BanknotesIcon },
      { href: "/reports", labelKey: "@legalos.shell.nav.reports", icon: ChartBarIcon },
    ],
  },
  {
    titleKey: "@legalos.shell.nav.section.team",
    items: [
      { href: "/messages", labelKey: "@legalos.shell.nav.messages", icon: ChatBubbleLeftRightIcon },
      { href: "/automation", labelKey: "@legalos.shell.nav.automation", icon: BoltIcon },
    ],
  },
];

const FIRMS = [
  { id: "al-sayed", nameKey: "@legalos.shell.firm.alSayed" },
  { id: "cairo-legal", nameKey: "@legalos.shell.firm.cairoLegal" },
];

function useCommandSource(t: TranslatorFn) {
  return useMemo(
    () =>
      createStaticSource(
        NAV_SECTIONS.flatMap((section) =>
          section.items.map((item) => ({
            id: item.href,
            label: t(item.labelKey),
            auxiliaryData: { group: t(section.titleKey), href: item.href },
          })),
        ),
      ),
    [t],
  );
}

function LegalOSLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v18M5 8h14M5 8l-2 5a3.5 3.5 0 0 0 7 0l-2-5m9 0l-2 5a3.5 3.5 0 0 0 7 0l-2-5"
      />
    </svg>
  );
}

function ThemeToggle() {
  const { mode, setMode } = useThemeMode();
  const t = useTranslator();
  const isDark = mode === "dark";
  return (
    <Button
      label={t(isDark ? "@legalos.shell.themeToggle.toLight" : "@legalos.shell.themeToggle.toDark")}
      variant="ghost"
      isIconOnly
      icon={<Icon icon={isDark ? SunIcon : MoonIcon} size="sm" />}
      onClick={() => setMode(isDark ? "light" : "dark")}
    />
  );
}

/** Switches the whole app between English and Arabic, which also flips the
 *  page between LTR and RTL. Shown as the target language's own endonym
 *  ("العربية" / "EN") rather than an icon: a globe glyph says a language
 *  menu exists but not which language you would get, and with only two
 *  locales the direct swap is one click instead of two. */
function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const t = useTranslator();
  const toArabic = locale === "en";
  return (
    <Button
      label={t(
        toArabic
          ? "@legalos.shell.languageToggle.toArabic"
          : "@legalos.shell.languageToggle.toEnglish",
      )}
      variant="ghost"
      size="sm"
      onClick={() => setLocale(toArabic ? "ar" : "en")}
    >
      {toArabic ? "العربية" : "EN"}
    </Button>
  );
}

/** The brand lives in one place: the workspace switcher at the top of the
 *  sidebar. Below AppShell's mobile breakpoint the sidebar becomes a drawer
 *  and that switcher goes off-screen, so the mark reappears in the top bar —
 *  the only case where two brand elements can't both be visible at once. */
function TopNavBrand() {
  const { isMobile } = useAppShellMobile();
  if (!isMobile) return null;
  return <TopNavHeading heading="" logo={<NavIcon icon={<LegalOSLogo />} />} href="/dashboard" />;
}

/** Routes rendered without app chrome — a signed-out visitor has no firm,
 *  no matters and nothing to navigate to, so the nav would be dead links. */
const BARE_ROUTES = ["/sign-in", "/sign-up", "/invite"];

const SIDENAV_COLLAPSED_KEY = "legalos-sidenav-collapsed";

/** 1280×720 is the layout floor every screen is designed to hold. Under it the
 *  rail gives its 248px back to the content rather than letting the screens
 *  compress: at 1024 a calendar month cell is otherwise about 50px wide. The
 *  saved preference is left untouched, so widening the window restores whatever
 *  the user last chose. */
const BELOW_FLOOR_QUERY = "(max-width: 1279px)";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslator();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false);
  const isBelowFloor = useMediaQuery(BELOW_FLOOR_QUERY);
  const commandSource = useCommandSource(t);

  // Read the saved preference after mount rather than lazily in useState, so
  // server and first client render agree (no localStorage on the server) and
  // React doesn't flag a hydration mismatch.
  useEffect(() => {
    setIsSideNavCollapsed(window.localStorage.getItem(SIDENAV_COLLAPSED_KEY) === "1");
  }, []);

  const handleCollapsedChange = (collapsed: boolean) => {
    setIsSideNavCollapsed(collapsed);
    window.localStorage.setItem(SIDENAV_COLLAPSED_KEY, collapsed ? "1" : "0");
  };

  if (BARE_ROUTES.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  const sideNav = (
    <Theme theme={legalosTheme} mode="dark">
      {/* AppShell paints the nav rail's surface using the *ambient* (outer)
       * theme before this Theme override ever runs, and SideNav itself
       * inherits its background rather than setting one — so without an
       * explicit repaint here the rail stays the outer light/dark surface
       * color while its text switches to dark-mode tokens, i.e. unreadable
       * near-white text on a near-white rail. Painting the surface color
       * explicitly, inside the override, is what actually makes the rail
       * render as the brand's deep-navy regardless of the app's own mode. */}
      <div style={{ backgroundColor: "var(--color-background-surface)", height: "100%" }}>
        <SideNav
          resizable={{ defaultWidth: 248, minWidth: 220, maxWidth: 320, autoSaveId: "legalos-sidenav" }}
          collapsible={{
            isCollapsed: isSideNavCollapsed || isBelowFloor,
            onCollapsedChange: handleCollapsedChange,
            hasButton: false,
          }}
          footerIcons={
            <SideNavCollapseButton
              label={isSideNavCollapsed ? undefined : t("@legalos.shell.collapse")}
            />
          }
          header={
            <SideNavHeading
              heading={t("@legalos.shell.brand")}
              icon={<LegalOSLogo />}
              menu={
                <NavHeadingMenu size="lg">
                  {FIRMS.map((firm) => (
                    <NavHeadingMenuItem key={firm.id} label={t(firm.nameKey)} href="#" />
                  ))}
                </NavHeadingMenu>
              }
            />
          }
        >
          {NAV_SECTIONS.map((section) => (
            <SideNavSection key={section.titleKey} title={t(section.titleKey)}>
              {section.items.map((item) => {
                const isSelected = pathname.startsWith(item.href);
                return (
                  <SideNavItem
                    key={item.href}
                    label={t(item.labelKey)}
                    href={item.href}
                    isSelected={isSelected}
                    icon={<Icon icon={item.icon} size="sm" className={item.ai ? AI_ICON_CLASS : undefined} />}
                  />
                );
              })}
            </SideNavSection>
          ))}
        </SideNav>
      </div>
    </Theme>
  );

  const topNav = (
    <TopNav
      label={t("@legalos.shell.mainNavAriaLabel")}
      heading={<TopNavBrand />}
      endContent={
        <HStack gap={1} align="center">
          <Button
            label={t("@legalos.shell.search.ariaLabel")}
            variant="ghost"
            icon={<Icon icon="search" color="inherit" />}
            onClick={() => setIsSearchOpen(true)}
          >
            {t("@legalos.shell.search.button")}
          </Button>
          <LanguageToggle />
          <ThemeToggle />
          <DropdownMenu
            button={{
              label: t("@legalos.shell.notifications.button"),
              variant: "ghost",
              isIconOnly: true,
              icon: <Icon icon={BellIcon} size="sm" />,
            }}
            hasChevron={false}
            items={[
              {
                type: "section",
                title: t("@legalos.shell.notifications.today"),
                items: [
                  { label: t("@legalos.shell.notifications.hearingReminder") },
                  { label: t("@legalos.shell.notifications.inviteAccepted") },
                  { label: t("@legalos.shell.notifications.contractReviewFinished") },
                ],
              },
            ]}
          />
          <DropdownMenu
            button={{
              label: t("@legalos.shell.account.menuAriaLabel"),
              variant: "ghost",
              isIconOnly: true,
              icon: <Avatar name="Ahmed Al-Sayed" size="sm" tooltip={false} />,
            }}
            hasChevron={false}
            items={[
              {
                type: "section",
                items: [
                  { label: t("@legalos.shell.account.profile"), onClick: () => router.push("/settings/profile") },
                  { label: t("@legalos.shell.account.firmSettings"), onClick: () => router.push("/settings") },
                ],
              },
              { type: "divider" },
              {
                label: t("@legalos.shell.account.signOut"),
                icon: <Icon icon={ArrowRightOnRectangleIcon} size="sm" />,
                onClick: () => {},
              },
            ]}
          />
        </HStack>
      }
    />
  );

  return (
    <>
      <AppShell topNav={topNav} sideNav={sideNav} contentPadding={6}>
        {children}
      </AppShell>
      <CommandPalette
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        searchSource={commandSource}
        emptyBootstrapText={t("@legalos.shell.search.emptyBootstrap")}
        renderItem={(item) => (
          <HStack gap={2} align="center">
            <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
            {item.label}
          </HStack>
        )}
        onValueChange={(value) => {
          const target = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.href === value);
          if (target) {
            router.push(target.href);
            setIsSearchOpen(false);
          }
        }}
      />
    </>
  );
}
