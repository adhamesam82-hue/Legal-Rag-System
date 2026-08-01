"use client";

import { use } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  SparklesIcon,
  DocumentDuplicateIcon,
  ScaleIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { getKbItem, getKbItems, type KbItem, type KbCategory } from "../data";

const AI_ICON_CLASS = "text-purple-vivid";

const TYPE_ICON: Record<KbItem["type"], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  template: DocumentDuplicateIcon,
  precedent: ScaleIcon,
  guide: BookOpenIcon,
  policy: ShieldCheckIcon,
};

/** KbCategory's members are English strings (they discriminate the union in
 *  data.ts); this maps each to its catalog key so badges render in the active
 *  locale without changing the data model. */
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

export default function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslator();
  const { id } = use(params);
  const item = getKbItem(id);

  if (!item) {
    return (
      <Layout
        height="fill"
        content={
          <LayoutContent padding={0}>
            <EmptyState
              icon={<Icon icon={BookOpenIcon} size="lg" color="secondary" />}
              title={t("@legalos.knowledgeBase.detail.notFoundTitle")}
              description={t("@legalos.knowledgeBase.detail.notFoundDescription")}
              actions={
                <Link href="/knowledge-base" isStandalone>
                  {t("@legalos.knowledgeBase.detail.backToKb")}
                </Link>
              }
            />
          </LayoutContent>
        }
      />
    );
  }

  const related = getKbItems(item.relatedIds);
  const TypeIcon = TYPE_ICON[item.type];

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <VStack gap={4}>
              <Breadcrumbs variant="supporting">
                <BreadcrumbItem href="/knowledge-base">
                  {t("@legalos.knowledgeBase.detail.breadcrumb")}
                </BreadcrumbItem>
                <BreadcrumbItem href="/knowledge-base">{item.category}</BreadcrumbItem>
                <BreadcrumbItem isCurrent>{item.title}</BreadcrumbItem>
              </Breadcrumbs>

              <HStack hAlign="between" vAlign="start">
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={TypeIcon} size="sm" color="secondary" />
                    <Heading level={2}>{item.title}</Heading>
                  </HStack>
                  <HStack gap={2} vAlign="center">
                    <Badge
                      variant={CATEGORY_BADGE[item.category]}
                      label={t(CATEGORY_KEY[item.category])}
                    />
                    <Text type="supporting" color="secondary">
                      {t("@legalos.knowledgeBase.updatedBy", {
                        date: item.updated,
                        author: item.author,
                      })}
                    </Text>
                  </HStack>
                </VStack>
                <HStack gap={2}>
                  <Button
                    label={t("@legalos.knowledgeBase.detail.edit")}
                    variant="secondary"
                    icon={<Icon icon={PencilSquareIcon} size="sm" color="inherit" />}
                  >
                    {t("@legalos.knowledgeBase.detail.edit")}
                  </Button>
                  {item.type === "template" ? (
                    <Button
                      label={t("@legalos.knowledgeBase.detail.useTemplate")}
                      variant="primary"
                      icon={<Icon icon={DocumentDuplicateIcon} size="sm" color="inherit" />}
                    >
                      {t("@legalos.knowledgeBase.detail.useTemplate")}
                    </Button>
                  ) : (
                    <Button
                      label={t("@legalos.knowledgeBase.detail.download")}
                      variant="primary"
                      icon={<Icon icon={ArrowDownTrayIcon} size="sm" color="inherit" />}
                    >
                      {t("@legalos.knowledgeBase.detail.download")}
                    </Button>
                  )}
                </HStack>
              </HStack>
            </VStack>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <Card padding={8}>
                  <VStack gap={5}>
                    <Text type="body" color="secondary">
                      {item.summary}
                    </Text>
                    <Divider />
                    <VStack gap={5}>
                      {item.body.map((section) => (
                        <VStack key={section.heading} gap={1}>
                          <Heading level={4}>{section.heading}</Heading>
                          <Text type="body" color="secondary">
                            {section.text}
                          </Text>
                        </VStack>
                      ))}
                    </VStack>
                  </VStack>
                </Card>
              </GridSpan>

              <VStack gap={6}>
                <Card variant="purple">
                  <VStack gap={3}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                      <Heading level={4}>{t("@legalos.knowledgeBase.detail.aiHeading")}</Heading>
                    </HStack>
                    <Text type="body">
                      {item.relatedMatter
                        ? t("@legalos.knowledgeBase.detail.aiForMatter", {
                            matter: item.relatedMatter,
                          })
                        : t("@legalos.knowledgeBase.detail.aiGeneric")}
                    </Text>
                    <Link href="/ai-assistant" isStandalone>
                      {t("@legalos.knowledgeBase.detail.askAi")}
                    </Link>
                  </VStack>
                </Card>

                {item.relatedMatter && (
                  <Card>
                    <VStack gap={3}>
                      <Heading level={4}>{t("@legalos.knowledgeBase.detail.relatedMatter")}</Heading>
                      <List hasDividers density="compact">
                        <ListItem
                          label={item.relatedMatter}
                          description={t("@legalos.knowledgeBase.detail.viewMatter")}
                          href="/matters"
                          startContent={<Icon icon={ScaleIcon} size="sm" color="secondary" />}
                        />
                      </List>
                    </VStack>
                  </Card>
                )}

                <Card>
                  <VStack gap={3}>
                    <Heading level={4}>{t("@legalos.knowledgeBase.detail.relatedItems")}</Heading>
                    {related.length > 0 ? (
                      <List hasDividers density="compact">
                        {related.map((r) => (
                          <ListItem
                            key={r.id}
                            label={r.title}
                            description={t(CATEGORY_KEY[r.category])}
                            href={`/knowledge-base/${r.id}`}
                            startContent={<Icon icon={TYPE_ICON[r.type]} size="sm" color="secondary" />}
                          />
                        ))}
                      </List>
                    ) : (
                      <Text type="body" color="secondary">
                        No related items yet.
                      </Text>
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={3}>
                    <Heading level={4}>{t("@legalos.knowledgeBase.detail.detailsHeading")}</Heading>
                    <VStack gap={2}>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          {t("@legalos.knowledgeBase.detail.author")}
                        </Text>
                        <HStack gap={2} vAlign="center">
                          <Avatar name={item.author} size="xsm" tooltip={false} />
                          <Text type="supporting">{item.author}</Text>
                        </HStack>
                      </HStack>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          {t("@legalos.knowledgeBase.detail.lastUpdated")}
                        </Text>
                        <Text type="supporting">{item.updated}</Text>
                      </HStack>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          {t("@legalos.knowledgeBase.detail.tags")}
                        </Text>
                        <HStack gap={1}>
                          {item.tags.map((t) => (
                            <Badge key={t} variant="neutral" label={t} />
                          ))}
                        </HStack>
                      </HStack>
                    </VStack>
                  </VStack>
                </Card>
              </VStack>
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
