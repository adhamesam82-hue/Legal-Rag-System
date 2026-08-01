"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Theme } from "@astryxdesign/core/theme";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import {
  SideNav,
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
import { legalosTheme } from "@/lib/legalos";
import { useThemeMode } from "@/app/providers";

// stylex.create() isn't compiled by this app's build (see globals.css); AI
// accent color goes through the Tailwind token bridge instead.
const AI_ICON_CLASS = "text-purple-vivid";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ai?: boolean;
};

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: Squares2X2Icon }],
  },
  {
    title: "Clients",
    items: [
      { href: "/crm", label: "CRM", icon: UserGroupIcon },
      { href: "/clients", label: "Clients", icon: BuildingOffice2Icon },
    ],
  },
  {
    title: "Practice",
    items: [
      { href: "/matters", label: "Matters", icon: BriefcaseIcon },
      { href: "/cases", label: "Cases", icon: ScaleIcon },
      { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
      { href: "/tasks", label: "Tasks", icon: CheckCircleIcon },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/documents", label: "Documents", icon: FolderIcon },
      { href: "/knowledge-base", label: "Knowledge Base", icon: LightBulbIcon },
    ],
  },
  {
    title: "AI",
    items: [
      { href: "/ai-assistant", label: "AI Assistant", icon: SparklesIcon, ai: true },
      { href: "/legal-research", label: "Legal Research", icon: BookOpenIcon, ai: true },
      {
        href: "/contract-review",
        label: "Contract Review",
        icon: DocumentMagnifyingGlassIcon,
        ai: true,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/time-tracking", label: "Time Tracking", icon: ClockIcon },
      { href: "/billing", label: "Billing", icon: CreditCardIcon },
      { href: "/accounting", label: "Accounting", icon: BanknotesIcon },
      { href: "/reports", label: "Reports", icon: ChartBarIcon },
    ],
  },
  {
    title: "Team",
    items: [
      { href: "/messages", label: "Messages", icon: ChatBubbleLeftRightIcon },
      { href: "/automation", label: "Automation", icon: BoltIcon },
    ],
  },
];

const FIRMS = [
  { id: "al-sayed", name: "Al-Sayed & Partners" },
  { id: "cairo-legal", name: "Cairo Legal Group" },
];

function useCommandSource() {
  return useMemo(
    () =>
      createStaticSource(
        NAV_SECTIONS.flatMap((section) =>
          section.items.map((item) => ({
            id: item.href,
            label: item.label,
            auxiliaryData: { group: section.title, href: item.href },
          })),
        ),
      ),
    [],
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
  const isDark = mode === "dark";
  return (
    <Button
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      variant="ghost"
      isIconOnly
      icon={<Icon icon={isDark ? SunIcon : MoonIcon} size="sm" />}
      onClick={() => setMode(isDark ? "light" : "dark")}
    />
  );
}

/** Routes rendered without app chrome — a signed-out visitor has no firm,
 *  no matters and nothing to navigate to, so the nav would be dead links. */
const BARE_ROUTES = ["/sign-in", "/sign-up", "/invite"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const commandSource = useCommandSource();

  if (BARE_ROUTES.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  const sideNav = (
    <Theme theme={legalosTheme} mode="dark">
      <SideNav
        resizable={{ defaultWidth: 248, minWidth: 220, maxWidth: 320, autoSaveId: "legalos-sidenav" }}
        header={
          <SideNavHeading
            heading="LegalOS"
            icon={<LegalOSLogo />}
            menu={
              <NavHeadingMenu size="lg">
                {FIRMS.map((firm) => (
                  <NavHeadingMenuItem key={firm.id} label={firm.name} href="#" />
                ))}
              </NavHeadingMenu>
            }
          />
        }
      >
        {NAV_SECTIONS.map((section) => (
          <SideNavSection key={section.title} title={section.title}>
            {section.items.map((item) => {
              const isSelected = pathname.startsWith(item.href);
              return (
                <SideNavItem
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  isSelected={isSelected}
                  icon={<Icon icon={item.icon} size="sm" className={item.ai ? AI_ICON_CLASS : undefined} />}
                />
              );
            })}
          </SideNavSection>
        ))}
      </SideNav>
    </Theme>
  );

  const topNav = (
    <TopNav
      label="Main navigation"
      heading={<TopNavHeading heading="" logo={<NavIcon icon={<LegalOSLogo />} />} href="/dashboard" />}
      endContent={
        <HStack gap={1} align="center">
          <Button
            label="Search LegalOS and ask AI"
            variant="ghost"
            icon={<Icon icon="search" color="inherit" />}
            onClick={() => setIsSearchOpen(true)}
          >
            Search or ask AI
          </Button>
          <ThemeToggle />
          <DropdownMenu
            button={{
              label: "Notifications",
              variant: "ghost",
              isIconOnly: true,
              icon: <Icon icon={BellIcon} size="sm" />,
            }}
            hasChevron={false}
            items={[
              {
                type: "section",
                title: "Today",
                items: [
                  { label: "Hearing reminder — Nabil vs. Nile Trading, 2:00 PM" },
                  { label: "Mona Farouk accepted your invite" },
                  { label: "Contract review finished: NDA — Delta Foods" },
                ],
              },
            ]}
          />
          <DropdownMenu
            button={{
              label: "Ahmed Al-Sayed account menu",
              variant: "ghost",
              isIconOnly: true,
              icon: <Avatar name="Ahmed Al-Sayed" size="sm" tooltip={false} />,
            }}
            hasChevron={false}
            items={[
              {
                type: "section",
                items: [
                  { label: "Profile", onClick: () => router.push("/settings/profile") },
                  { label: "Firm settings", onClick: () => router.push("/settings") },
                ],
              },
              { type: "divider" },
              {
                label: "Sign out",
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
        emptyBootstrapText="Search matters, clients, documents — or ask AI a legal question"
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
