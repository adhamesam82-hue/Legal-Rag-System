"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, useAppShellMobile } from "@astryxdesign/core/AppShell";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import {
  SideNav,
  SideNavCollapseButton,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
  useSideNavCollapse,
} from "@astryxdesign/core/SideNav";
import { NavHeadingMenu, NavHeadingMenuItem } from "@astryxdesign/core/NavMenu";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Avatar } from "@astryxdesign/core/Avatar";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import {
  CommandPalette,
  CommandPaletteFooter,
  CommandPaletteInput,
} from "@astryxdesign/core/CommandPalette";
import { Kbd } from "@astryxdesign/core/Kbd";
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
  BuildingLibraryIcon,
  DocumentMagnifyingGlassIcon,
  ClockIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChartBarIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { useTranslator, type TranslatorFn } from "@astryxdesign/core/i18n";
import { PrefetchedNavLink, useThemeMode } from "@/app/providers";
import { useLocale } from "@/lib/i18n/provider";
import { useOrg } from "@/lib/org";
import type { PracticeApi } from "@/lib/practice";
import { isPathEnabled } from "@/lib/features";
import { Alsigil, AlsigilPunch } from "@/components/brand/Alsigil";

// stylex.create() isn't compiled by this app's build (see globals.css); AI
// accent color goes through the Tailwind token bridge instead.
const AI_ICON_CLASS = "text-purple-vivid";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ai?: boolean;
  /** Extra path prefixes that belong to this item. Article pages live at
   *  /article/:id rather than under /library, but they are reached from the
   *  library and from every citation, so the rail should still point there
   *  instead of showing nothing selected. */
  alsoMatch?: string[];
};

const ALL_NAV_SECTIONS: { titleKey: string; items: NavItem[] }[] = [
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
      {
        // The statute corpus itself — the source every AI citation resolves
        // to. Distinct from Knowledge Base, which is the firm's own material.
        href: "/library",
        labelKey: "@legalos.shell.nav.lawLibrary",
        icon: BuildingLibraryIcon,
        alsoMatch: ["/article"],
      },
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

// Hidden screens leave the nav here and the router in middleware.ts; see
// lib/features.ts for what is off and why. Filtered once at module scope --
// the enabled set is fixed at build time, so per-render work would buy
// nothing. A section whose every item is gated off disappears with them
// rather than leaving an empty heading.
const NAV_SECTIONS = ALL_NAV_SECTIONS.map((section) => ({
  ...section,
  items: section.items.filter((item) => isPathEnabled(item.href)),
})).filter((section) => section.items.length > 0);

const FIRMS = [
  { id: "al-sayed", nameKey: "@legalos.shell.firm.alSayed" },
  { id: "cairo-legal", nameKey: "@legalos.shell.firm.cairoLegal" },
];

/** How many rows of each kind the palette shows before it stops listing. */
const SEARCH_LIMIT = 5;

/** Below this a query matches most of the practice, so it stays local to the
 *  nav rather than sending three requests per keystroke. */
const MIN_QUERY = 2;

type CommandItem = {
  id: string;
  label: string;
  auxiliaryData: { group: string; href: string };
};

/**
 * What the command palette searches.
 *
 * It used to search the navigation headings and nothing else, under a button
 * that said "search LegalOS": typing a client's name — a client who was in
 * the database, with a matter open — returned "No results". The nav is still
 * matched, because "take me to Billing" is a real use of this box, but the
 * firm's own records are the point of it.
 *
 * Records are fetched per query rather than pre-loaded: the server already
 * has a `q` filter on each of these lists, and a practice with three years of
 * files is not something to hold in a palette's memory.
 */
function useCommandSource(t: TranslatorFn, practice: PracticeApi | null) {
  return useMemo(() => {
    const navItems: CommandItem[] = NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => ({
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

        // One slow or failing list must not empty the whole palette, so each
        // falls back to no rows of its own kind.
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

/** The mark in the rail's brand slot.
 *
 *  SideNavHeading renders its `heading` as interface text, which is the right
 *  treatment for a product name and the wrong one for a wordmark — the whole
 *  point of the sheet is that the word *is* the mark. So the mark goes in the
 *  icon slot and the heading is left empty; the anchor takes its accessible
 *  name from the mark's own `aria-label` either way.
 *
 *  Collapsed, the rail is far narrower than the lockup's 64px floor, so it
 *  gets the punch alone rather than a lockup squeezed under its minimum. */
function SideNavBrand() {
  const { isCollapsed } = useSideNavCollapse();
  return isCollapsed ? (
    <AlsigilPunch size={18} />
  ) : (
    <Alsigil width={112} tone="auto" />
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
  const t = useTranslator();
  if (!isMobile) return null;
  // No `heading`: the wordmark is the heading. 96px is the sheet's recommended
  // screen size for the lockup, and the bar has room for it.
  return (
    <TopNavHeading
      logo={<Alsigil width={96} tone="auto" />}
      logoLabel={t("@legalos.shell.brand")}
      headingHref="/dashboard"
    />
  );
}

/** Search, language, appearance, notifications, account — the controls that
 *  belong to the app rather than to any screen. Rendered floating over the
 *  content on desktop and inside the mobile bar below the breakpoint, so
 *  there is one definition of them either way. */
function UtilityControls({ onSearch }: { onSearch: () => void }) {
  const t = useTranslator();
  const router = useRouter();
  return (
    <HStack gap={0.5} vAlign="center">
      <Button
        label={t("@legalos.shell.search.ariaLabel")}
        variant="ghost"
        size="sm"
        icon={<Icon icon="search" color="inherit" />}
        onClick={onSearch}
      >
        {t("@legalos.shell.search.button")}
      </Button>
      <LanguageToggle />
      <ThemeToggle />
      {/* The bell used to open three fixed notifications — a hearing reminder,
        * an accepted invite, a finished contract review — none of them from
        * any API, because there is no notifications table yet (phase 1). They
        * named real seeded people and a real seeded case, so they read as
        * genuine, and a lawyer who trusts a reminder that was never generated
        * is worse off than one who has no bell at all. It comes back when
        * something is behind it. */}
      <DropdownMenu
        button={{
          label: t("@legalos.shell.account.menuAriaLabel"),
          variant: "ghost",
          isIconOnly: true,
          icon: <Avatar name="أحمد السيد" size="sm" tooltip={false} />,
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
  );
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

/** AppShell's own default breakpoint, below which the sidebar becomes a drawer
 *  and a docked top bar is the only place left for the brand and the
 *  hamburger. Kept in step with AppShell's `md` by hand — the component reads
 *  it from its own constant, and exposes it only through context. */
const MOBILE_BAR_QUERY = "(max-width: 768px)";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslator();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false);
  const isBelowFloor = useMediaQuery(BELOW_FLOOR_QUERY);
  const isMobileBar = useMediaQuery(MOBILE_BAR_QUERY);
  const { practice } = useOrg();
  const commandSource = useCommandSource(t, practice);

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

  // The rail follows the app's own light/dark mode rather than being forced
  // dark for the brand navy. A permanently dark column against a white content
  // area split the screen into two planes and spent the strongest contrast on
  // the part of the interface nobody is reading; on the wash background it
  // recedes, and the only marked item is the selected one.
  const sideNav = (
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
          heading=""
          icon={<SideNavBrand />}
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
            const isSelected = [item.href, ...(item.alsoMatch ?? [])].some((prefix) =>
              pathname.startsWith(prefix),
            );
            return (
              <SideNavItem
                key={item.href}
                label={t(item.labelKey)}
                href={item.href}
                // Warms the whole route payload so a click does not pay for
                // one; see PrefetchedNavLink for why the default prefetch cannot.
                // Scoped to the sidebar rather than set on LinkProvider: these
                // are a bounded, known set, where a table's row links are not.
                as={PrefetchedNavLink}
                isSelected={isSelected}
                icon={<Icon icon={item.icon} size="sm" className={item.ai ? AI_ICON_CLASS : undefined} />}
              />
            );
          })}
        </SideNavSection>
      ))}
    </SideNav>
  );

  // The top bar is a row in the shell grid only where it has to be. Below the
  // breakpoint the sidebar is a drawer, so that row carries the brand and the
  // hamburger and earns its 48px; above it, the controls float over the
  // content instead (see below) and the content region gets the full height.
  const topNav = isMobileBar ? (
    <TopNav
      label={t("@legalos.shell.mainNavAriaLabel")}
      heading={<TopNavBrand />}
      endContent={<UtilityControls onSearch={() => setIsSearchOpen(true)} />}
    />
  ) : undefined;

  return (
    <>
      <AppShell topNav={topNav} sideNav={sideNav} contentPadding={6}>
        {children}
      </AppShell>
      {/* Floating, not docked: the content region owns the whole viewport
       *  height and scrolls underneath this, which is why the pill is
       *  translucent and blurred rather than opaque. #astryx-app-shell-main
       *  keeps a matching top inset (globals.css) so the first screenful of a
       *  page starts below it instead of under it. */}
      {!isMobileBar && (
        <HStack
          gap={0.5}
          vAlign="center"
          className="fixed top-2 end-3 z-40 rounded-full border border-border bg-surface/75 px-1 py-0.5 backdrop-blur-md"
        >
          <UtilityControls onSearch={() => setIsSearchOpen(true)} />
        </HStack>
      )}
      <CommandPalette
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        searchSource={commandSource}
        label={t("@legalos.shell.search.ariaLabel")}
        emptyBootstrapText={t("@legalos.shell.search.emptyBootstrap")}
        emptySearchText={t("@legalos.shell.search.empty")}
        // The input's own placeholder and the footer's hints are the two
        // strings the design system hardcodes in English rather than
        // resolving through the catalog (see lib/i18n/catalogs/astryx.ts for
        // everything that does resolve), so both slots are passed explicitly.
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
        // Every id IS the route to open, records included, so the palette no
        // longer has to find the value in the nav list to act on it.
        onValueChange={(value) => {
          if (!value) return;
          router.push(value);
          setIsSearchOpen(false);
        }}
      />
    </>
  );
}
