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
import { getKbItem, getKbItems, type KbItem, type KbCategory } from "../data";

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

export default function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
              title="Item not found"
              description="This knowledge base entry may have been moved or the link is out of date."
              actions={
                <Link href="/knowledge-base" isStandalone>
                  Back to Knowledge Base
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
                <BreadcrumbItem href="/knowledge-base">Knowledge Base</BreadcrumbItem>
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
                    <Badge variant={CATEGORY_BADGE[item.category]} label={item.category} />
                    <Text type="supporting" color="secondary">
                      Updated {item.updated} · {item.author}
                    </Text>
                  </HStack>
                </VStack>
                <HStack gap={2}>
                  <Button
                    label="Edit"
                    variant="secondary"
                    icon={<Icon icon={PencilSquareIcon} size="sm" color="inherit" />}
                  >
                    Edit
                  </Button>
                  {item.type === "template" ? (
                    <Button
                      label="Use this template"
                      variant="primary"
                      icon={<Icon icon={DocumentDuplicateIcon} size="sm" color="inherit" />}
                    >
                      Use this template
                    </Button>
                  ) : (
                    <Button
                      label="Download"
                      variant="primary"
                      icon={<Icon icon={ArrowDownTrayIcon} size="sm" color="inherit" />}
                    >
                      Download
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
                      <Heading level={4}>AI recommendations</Heading>
                    </HStack>
                    <Text type="body">
                      {item.relatedMatter
                        ? `Surfaced for matters like ${item.relatedMatter} based on similar fact patterns and clause structure.`
                        : "Surfaced based on matters and documents your team is currently working on."}
                    </Text>
                    <Link href="/ai-assistant" isStandalone>
                      Ask AI Assistant about this
                    </Link>
                  </VStack>
                </Card>

                {item.relatedMatter && (
                  <Card>
                    <VStack gap={3}>
                      <Heading level={4}>Related matter</Heading>
                      <List hasDividers density="compact">
                        <ListItem
                          label={item.relatedMatter}
                          description="View matter"
                          href="/matters"
                          startContent={<Icon icon={ScaleIcon} size="sm" color="secondary" />}
                        />
                      </List>
                    </VStack>
                  </Card>
                )}

                <Card>
                  <VStack gap={3}>
                    <Heading level={4}>Related items</Heading>
                    {related.length > 0 ? (
                      <List hasDividers density="compact">
                        {related.map((r) => (
                          <ListItem
                            key={r.id}
                            label={r.title}
                            description={r.category}
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
                    <Heading level={4}>Details</Heading>
                    <VStack gap={2}>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          Author
                        </Text>
                        <HStack gap={2} vAlign="center">
                          <Avatar name={item.author} size="xsm" tooltip={false} />
                          <Text type="supporting">{item.author}</Text>
                        </HStack>
                      </HStack>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          Last updated
                        </Text>
                        <Text type="supporting">{item.updated}</Text>
                      </HStack>
                      <HStack hAlign="between">
                        <Text type="supporting" color="secondary">
                          Tags
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
