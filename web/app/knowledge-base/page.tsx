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
import { useTranslator } from "@astryxdesign/core/i18n";
import { KB_CATEGORIES, KB_ITEMS, AI_RECOMMENDATIONS, getKbItems, type KbItem, type KbCategory } from "./data";

const AI_ICON_CLASS = "text-purple-vivid";

const TYPE_ICON: Record<KbItem["type"], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  template: DocumentDuplicateIcon,
  precedent: ScaleIcon,
  guide: BookOpenIcon,
  policy: ShieldCheckIcon,
};

/** KbCategory's members are English strings (they discriminate the union in
 *  data.ts); this maps each to its catalog key so the badge and filter render
 *  in the active locale without changing the data model. */
const CATEGORY_KEY: Record<KbCategory, string> = {
  "Contract Templates": "@legalos.knowledgeBase.category.contractTemplates",
  "Litigation Precedents": "@legalos.knowledgeBase.category.litigationPrecedents",
  "Regulatory Guides": "@legalos.knowledgeBase.category.regulatoryGuides",
  "Firm Policies & SOPs": "@legalos.knowledgeBase.category.firmPolicies",
  "Client Communication Templates": "@legalos.knowledgeBase.category.clientCommunication",
};

const CATEGORY_BADGE: Record<KbCategory, "blue" | "orange" | "teal" | "cyan" | "pink"> = {
  "Contract Templates": "blue",
  "Litigation Precedents": "orange",
  "Regulatory Guides": "teal",
  "Firm Policies & SOPs": "cyan",
  "Client Communication Templates": "pink",
};

function KbCard({ item }: { item: KbItem }) {
  const t = useTranslator();
  const TypeIcon = TYPE_ICON[item.type];
  return (
    <Card>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="start">
          <Icon icon={TypeIcon} size="sm" color="secondary" />
          <Badge variant={CATEGORY_BADGE[item.category]} label={t(CATEGORY_KEY[item.category])} />
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
            {t("@legalos.knowledgeBase.updated", { date: item.updated })}
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}

export default function KnowledgeBasePage() {
  const t = useTranslator();
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
                <Heading level={2}>{t("@legalos.knowledgeBase.heading")}</Heading>
              </VStack>
              <Button
                label={t("@legalos.knowledgeBase.newTemplate")}
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                {t("@legalos.knowledgeBase.newTemplate")}
              </Button>
            </HStack>

            <TextInput
              label={t("@legalos.knowledgeBase.search.label")}
              isLabelHidden
              value={search}
              onChange={setSearch}
              placeholder={t("@legalos.knowledgeBase.search.placeholder")}
              startIcon={MagnifyingGlassIcon}
              hasClear
              width={420}
            />

            {!filtered && (
              <Card variant="purple">
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                    <Heading level={4}>{t("@legalos.knowledgeBase.relatedPrecedents")}</Heading>
                  </HStack>
                  <Text type="body" color="secondary">
                    {t("@legalos.knowledgeBase.showingFor", {
                      // The matter these mock recommendations pretend to be
                      // scoped to; same name the seeded firm carries.
                      matter: "نبيل ضد شركة النيل للتجارة",
                    })}
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
                        endContent={
                          <Badge
                            variant={CATEGORY_BADGE[item.category]}
                            label={t(CATEGORY_KEY[item.category])}
                          />
                        }
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
                    {t("@legalos.knowledgeBase.resultCount", { count: filtered.length })}
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
                  title={t("@legalos.knowledgeBase.empty.title")}
                  description={t("@legalos.knowledgeBase.empty.description")}
                  actions={
                    <Button
                      label={t("@legalos.knowledgeBase.clearSearch")}
                      variant="secondary"
                      onClick={() => setSearch("")}
                    >
                      {t("@legalos.knowledgeBase.clearSearch")}
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
                      <Heading level={4}>{t(CATEGORY_KEY[category])}</Heading>
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
