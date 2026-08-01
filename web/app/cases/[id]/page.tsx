"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  ArrowLeftIcon,
  ScaleIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  DocumentMagnifyingGlassIcon,
  ClockIcon,
  SparklesIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import { caseById, matterById, clientById, formatDate, daysUntil } from "@/lib/legalos-data";

const AI_ICON_CLASS = "text-purple-vivid";

function statusVariant(status: string): "success" | "warning" | "neutral" {
  if (status.startsWith("Active")) return "success";
  if (status.startsWith("On Hold")) return "warning";
  return "neutral";
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const caseRecord = caseById(id);

  if (!caseRecord) {
    notFound();
  }

  const matter = matterById(caseRecord.matterId);
  const client = matter ? clientById(matter.clientId) : undefined;
  const timeline = [...caseRecord.timeline].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={3}>
            <Link href="/cases" color="secondary">
              <HStack gap={1} vAlign="center">
                <Icon icon={ArrowLeftIcon} size="sm" color="inherit" />
                All cases
              </HStack>
            </Link>
            <HStack hAlign="between" vAlign="start" wrap="wrap" gap={3}>
              <VStack gap={1}>
                <HStack gap={2} vAlign="center">
                  <Icon icon={ScaleIcon} size="sm" color="secondary" />
                  <Heading level={2}>{caseRecord.caseNumber}</Heading>
                  <Badge variant={statusVariant(caseRecord.status)} label={caseRecord.status} />
                </HStack>
                <Text type="body" color="secondary">
                  {caseRecord.court}
                  {matter && (
                    <>
                      {" · "}
                      {matter.name}
                    </>
                  )}
                </Text>
              </VStack>
              {matter && (
                <Button
                  label="Open matter"
                  variant="secondary"
                  icon={<Icon icon={BriefcaseIcon} size="sm" />}
                  onClick={() => {
                    window.location.href = `/matters/${matter.id}`;
                  }}
                >
                  Open matter
                </Button>
              )}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main">
          <Grid columns={3} gap={6}>
            <GridSpan columns={2}>
              <VStack gap={6}>
                <Card>
                  <VStack gap={4}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={CalendarDaysIcon} size="sm" color="secondary" />
                      <Heading level={4}>Case timeline</Heading>
                    </HStack>
                    {timeline.length > 0 ? (
                      <List density="balanced">
                        {timeline.map((event, i) => (
                          <ListItem
                            key={`${event.date}-${i}`}
                            label={event.label}
                            description={
                              event.detail ? (
                                <VStack gap={0}>
                                  <Text type="supporting" color="secondary">
                                    {event.detail}
                                  </Text>
                                  <Text type="supporting" color="secondary">
                                    {formatDate(event.date)}
                                  </Text>
                                </VStack>
                              ) : (
                                formatDate(event.date)
                              )
                            }
                            startContent={<Icon icon={ClockIcon} size="sm" color="secondary" />}
                          />
                        ))}
                      </List>
                    ) : (
                      <EmptyState isCompact title="No timeline events yet" />
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={DocumentMagnifyingGlassIcon} size="sm" color="secondary" />
                      <Heading level={4}>Evidence</Heading>
                      <Badge variant="neutral" label={`${caseRecord.evidence.length}`} />
                    </HStack>
                    {caseRecord.evidence.length > 0 ? (
                      <List hasDividers density="compact">
                        {caseRecord.evidence.map((e, i) => (
                          <ListItem
                            key={`${e.name}-${i}`}
                            label={e.name}
                            description={`${e.type} · submitted by ${e.submittedBy}`}
                            startContent={
                              <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                            }
                            endContent={
                              <Text type="supporting" color="secondary">
                                {formatDate(e.date)}
                              </Text>
                            }
                          />
                        ))}
                      </List>
                    ) : (
                      <EmptyState isCompact title="No evidence on file yet" />
                    )}
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                      <Heading level={4}>Court documents</Heading>
                      <Badge variant="neutral" label={`${caseRecord.courtDocuments.length}`} />
                    </HStack>
                    {caseRecord.courtDocuments.length > 0 ? (
                      <List hasDividers density="compact">
                        {caseRecord.courtDocuments.map((d, i) => (
                          <ListItem
                            key={`${d.name}-${i}`}
                            label={d.name}
                            description={d.type}
                            startContent={
                              <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                            }
                            endContent={
                              <Text type="supporting" color="secondary">
                                {formatDate(d.date)}
                              </Text>
                            }
                          />
                        ))}
                      </List>
                    ) : (
                      <EmptyState isCompact title="No court documents on file yet" />
                    )}
                  </VStack>
                </Card>
              </VStack>
            </GridSpan>

            <VStack gap={6}>
              <Card>
                <VStack gap={4}>
                  <Heading level={4}>Case details</Heading>
                  <MetadataList>
                    <MetadataListItem label="Court">{caseRecord.court}</MetadataListItem>
                    <MetadataListItem label="Judge">{caseRecord.judge}</MetadataListItem>
                    <MetadataListItem label="Case number">
                      {caseRecord.caseNumber}
                    </MetadataListItem>
                    <MetadataListItem label="Filed">
                      {formatDate(caseRecord.filedDate)}
                    </MetadataListItem>
                    <MetadataListItem label="Opposing party">
                      {caseRecord.opposingParty}
                    </MetadataListItem>
                    {caseRecord.opposingCounsel && (
                      <MetadataListItem label="Opposing counsel">
                        {caseRecord.opposingCounsel}
                      </MetadataListItem>
                    )}
                    {client && (
                      <MetadataListItem label="Client">
                        <Link href={`/clients/${client.id}`}>{client.name}</Link>
                      </MetadataListItem>
                    )}
                  </MetadataList>
                </VStack>
              </Card>

              <Card>
                <VStack gap={3}>
                  <Heading level={4}>Next hearing</Heading>
                  {caseRecord.nextHearing ? (
                    <VStack gap={1}>
                      <Text type="large" weight="semibold">
                        {formatDate(caseRecord.nextHearing.date)}
                      </Text>
                      <Text type="body" color="secondary">
                        {caseRecord.nextHearing.time} · {caseRecord.nextHearing.purpose}
                      </Text>
                      <Badge
                        variant={daysUntil(caseRecord.nextHearing.date) <= 3 ? "warning" : "neutral"}
                        label={`${daysUntil(caseRecord.nextHearing.date)}d away`}
                      />
                    </VStack>
                  ) : (
                    <Text type="body" color="secondary">
                      No hearing currently scheduled.
                    </Text>
                  )}
                </VStack>
              </Card>

              <Card>
                <VStack gap={3}>
                  <Heading level={4}>Deadlines</Heading>
                  {caseRecord.deadlines.length > 0 ? (
                    <List hasDividers density="compact">
                      {caseRecord.deadlines.map((d, i) => (
                        <ListItem
                          key={`${d.label}-${i}`}
                          label={d.label}
                          startContent={<Icon icon={ClockIcon} size="sm" color="secondary" />}
                          endContent={
                            <Badge
                              variant={daysUntil(d.date) <= 3 ? "warning" : "neutral"}
                              label={formatDate(d.date)}
                            />
                          }
                        />
                      ))}
                    </List>
                  ) : (
                    <Text type="body" color="secondary">
                      No open deadlines.
                    </Text>
                  )}
                </VStack>
              </Card>

              <Card variant="purple">
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                    <Heading level={4}>AI case summary</Heading>
                  </HStack>
                  <Text type="body">{caseRecord.aiSummary}</Text>
                  <Text type="supporting" color="secondary">
                    Generated from filings and evidence on this case. Review before relying on it.
                  </Text>
                </VStack>
              </Card>
            </VStack>
          </Grid>
        </LayoutContent>
      }
    />
  );
}
