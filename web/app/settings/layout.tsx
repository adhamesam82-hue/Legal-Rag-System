"use client";

import { usePathname } from "next/navigation";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
} from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import {
  BuildingOffice2Icon,
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

/** The firm group's title is the firm's own name, so it carries no key --
 *  it is resolved from the active organization at render time. */
const NAV_GROUPS: { titleKey?: string; items: NavItem[] }[] = [
  {
    titleKey: "@legalos.settings.group.myAccount",
    items: [
      { href: "/settings/profile", labelKey: "@legalos.settings.nav.profile", icon: UserCircleIcon },
    ],
  },
  {
    items: [
      { href: "/settings", labelKey: "@legalos.settings.nav.firmSettings", icon: BuildingOffice2Icon },
      { href: "/settings/users", labelKey: "@legalos.settings.nav.users", icon: UserGroupIcon },
      // Integrations, Branding, Billing, API keys and AI models were listed
      // here with no page behind any of them. Each one landed on Next's own
      // default 404 — English, outside the app shell entirely, with no way
      // back — which is a worse answer than not offering the link. They come
      // back with the screens, as entries beside the two that exist; the
      // labels are kept in the catalog so that is a one-line change.
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslator();
  const { organizationName } = useOrg();

  return (
    <Card padding={0} width="100%" height="100%">
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider>
            <Heading level={4}>{t("@legalos.settings.heading")}</Heading>
          </LayoutHeader>
        }
        start={
          <LayoutPanel
            hasDivider
            role="navigation"
            label={t("@legalos.settings.sectionsNavLabel")}
            width={240}
          >
            <VStack gap={5}>
              {NAV_GROUPS.map((group, index) => (
                <VStack key={group.titleKey ?? `firm-${index}`} gap={1}>
                  <Text type="label" size="sm" color="secondary">
                    {group.titleKey ? t(group.titleKey) : organizationName}
                  </Text>
                  <List density="compact" hasDividers={false}>
                    {group.items.map((item) => (
                      <ListItem
                        key={item.href}
                        label={t(item.labelKey)}
                        href={item.href}
                        isSelected={pathname === item.href}
                        startContent={
                          <Icon
                            icon={item.icon}
                            size="sm"
                            className={item.ai ? "text-purple-vivid" : undefined}
                            color={item.ai ? undefined : "secondary"}
                          />
                        }
                      />
                    ))}
                  </List>
                </VStack>
              ))}
            </VStack>
          </LayoutPanel>
        }
        content={<LayoutContent>{children}</LayoutContent>}
      />
    </Card>
  );
}
