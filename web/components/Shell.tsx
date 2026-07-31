"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { TopNav } from "@astryxdesign/core/TopNav";
import { Badge } from "@astryxdesign/core/Badge";
import { Text } from "@astryxdesign/core/Text";

const LINKS = [
  { href: "/", label: "Chat" },
  { href: "/search", label: "Search" },
  { href: "/library", label: "Library" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const nav = (
    <TopNav
      heading={
        <NextLink
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Text type="label" weight="bold">
            ⚖ LegalRAG
          </Text>
        </NextLink>
      }
      startContent={
        <div style={{ display: "flex", gap: 2 }}>
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <NextLink
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: active
                    ? "var(--color-background-wash)"
                    : "transparent",
                }}
              >
                <Text
                  type="label"
                  color={active ? "primary" : "secondary"}
                  weight={active ? "semibold" : "normal"}
                >
                  {link.label}
                </Text>
              </NextLink>
            );
          })}
        </div>
      }
      endContent={<Badge variant="neutral" label="Egypt · 6,985 articles" />}
    />
  );

  return (
    <AppShell topNav={nav} contentPadding={0} height="auto" variant="section">
      {children}
    </AppShell>
  );
}
