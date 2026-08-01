"use client";

import { useMemo, useState } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { TextInput } from "@astryxdesign/core/TextInput";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Link } from "@astryxdesign/core/Link";
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  ScaleIcon,
  BookOpenIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { KB_CATEGORIES, KB_ITEMS, AI_RECOMMENDATIONS, getKbItems, type KbItem, type KbCategory } from "./data";

const AI_ICON_CLASS = "text-purple-vivid";

const TYPE_ICON: Record<KbItem["type"], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  template: DocumentDuplicateIcon,
  precedent: ScaleIcon,
  guide: BookOpenIcon,
  policy: ShieldCheckIcon,
};

const CATEGORY_BADGE: Record<KbCategory, "blue" | "orange" | "teal" | "cyan" | "pink"> = {
  "Contract Templates": "blue",
  "Litigation Precedents": "orange",
  "Regulatory Guides": "teal",
  "Firm Policies & SOPs": "cyan",
  "Client Communication Templates": "pink",
};

function KbCard({ item }: { item: KbItem }) {
  const TypeIcon = TYPE_ICON[item.type];
  return (
    <Card>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="start">
          <Icon icon={TypeIcon} size="sm" color="secondary" />
          <Badge variant={CATEGORY_BADGE[item.category]} label={item.category} />
        </HStack>
        <VStack gap={1}>
          <Link href={`/knowledge-base/${item.id}`} isStandalone>
            {item.title}
          </Link>
          <Text type="supporting" color="secondary">
            {item.summary}
          </Text>
        </VStack>
        <HStack hAlign="between" vAlign="center">
          <HStack gap={2} vAlign="center">
            <Avatar name={item.author} size="xsm" tooltip={false} />
            <Text type="supporting" color="secondary">
              {item.author}
            </Text>
          </HStack>
          <Text type="supporting" color="secondary">
            Updated {item.updated}
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return KB_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [search]);

  const recommended = getKbItems(AI_RECOMMENDATIONS.map((r) => r.itemId));

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <HStack hAlign="between" vAlign="center">
              <VStack gap={1}>
                <Heading level={2}>Knowledge Base</Heading>
                <Text type="body" color="secondary">
                  Firm templates, precedents, and reference guides
                </Text>
              </VStack>
              <Button
                label="New template"
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                New template
              </Button>
            </HStack>

            <TextInput
              label="Search knowledge base"
              isLabelHidden
              value={search}
              onChange={setSearch}
              placeholder="Search templates, precedents, and guides"
              startIcon={MagnifyingGlassIcon}
              hasClear
              width={420}
            />

            {!filtered && (
              <Card variant="purple">
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                    <Heading level={4}>Related precedents for your current matter</Heading>
                  </HStack>
                  <Text type="body" color="secondary">
                    Showing recommendations for Nabil v. Nile Trading Co.
                  </Text>
                  <List hasDividers density="compact">
                    {recommended.map((item, i) => (
                      <ListItem
                        key={item.id}
                        label={item.title}
                        description={AI_RECOMMENDATIONS[i].reason}
                        href={`/knowledge-base/${item.id}`}
                        startContent={
                          <Icon icon={TYPE_ICON[item.type]} size="sm" color="secondary" />
                        }
                        endContent={<Badge variant={CATEGORY_BADGE[item.category]} label={item.category} />}
                      />
                    ))}
                  </List>
                </VStack>
              </Card>
            )}

            {filtered ? (
              filtered.length > 0 ? (
                <VStack gap={4}>
                  <Heading level={4}>
                    {filtered.length} result{filtered.length === 1 ? "" : "s"}
                  </Heading>
                  <Grid columns={{ minWidth: 280, repeat: "fit" }} gap={4}>
                    {filtered.map((item) => (
                      <KbCard key={item.id} item={item} />
                    ))}
                  </Grid>
                </VStack>
              ) : (
                <EmptyState
                  icon={<Icon icon={MagnifyingGlassIcon} size="lg" color="secondary" />}
                  title="No results found"
                  description="Try a different search term."
                  actions={
                    <Button label="Clear search" variant="secondary" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  }
                />
              )
            ) : (
              <VStack gap={8}>
                {KB_CATEGORIES.map((category) => {
                  const items = KB_ITEMS.filter((i) => i.category === category);
                  if (items.length === 0) return null;
                  return (
                    <VStack key={category} gap={4}>
                      <Heading level={4}>{category}</Heading>
                      <Grid columns={{ minWidth: 280, repeat: "fit" }} gap={4}>
                        {items.map((item) => (
                          <KbCard key={item.id} item={item} />
                        ))}
                      </Grid>
                    </VStack>
                  );
                })}
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
