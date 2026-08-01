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
  CreditCardIcon,
  KeyIcon,
  PaintBrushIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ai?: boolean;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "My account",
    items: [{ href: "/settings/profile", label: "Profile", icon: UserCircleIcon }],
  },
  {
    title: "Al-Sayed & Partners",
    items: [
      { href: "/settings", label: "Firm settings", icon: BuildingOffice2Icon },
      { href: "/settings/users", label: "Users & permissions", icon: UserGroupIcon },
      { href: "/settings/integrations", label: "Integrations", icon: PuzzlePieceIcon },
      { href: "/settings/branding", label: "Branding", icon: PaintBrushIcon },
      { href: "/settings/billing", label: "Billing", icon: CreditCardIcon },
      { href: "/settings/api-keys", label: "API keys", icon: KeyIcon },
      { href: "/settings/ai-models", label: "AI models", icon: SparklesIcon, ai: true },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Card padding={0} width="100%" height="100%">
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider>
            <Heading level={4}>Settings</Heading>
          </LayoutHeader>
        }
        start={
          <LayoutPanel hasDivider role="navigation" label="Settings sections" width={240}>
            <VStack gap={5}>
              {NAV_GROUPS.map((group) => (
                <VStack key={group.title} gap={1}>
                  <Text type="label" size="sm" color="secondary">
                    {group.title}
                  </Text>
                  <List density="compact" hasDividers={false}>
                    {group.items.map((item) => (
                      <ListItem
                        key={item.href}
                        label={item.label}
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
