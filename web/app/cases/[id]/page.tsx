"use client";

import { use } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  ArrowLeftIcon,
  ScaleIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";
import { useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import { daysUntil, formatDate, label } from "@/lib/practice";

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
  const caseId = Number(id);

  const resource = useResource((api) => api.cases.get(caseId), [caseId]);

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0} isScrollable>
          <DataView resource={resource} loadingLabel="Loading case…">
            {(record) => (
              <VStack gap={6}>
                <Link href="/cases">
                  <HStack gap={1.5} vAlign="center">
                    <Icon icon={ArrowLeftIcon} size="sm" color="secondary" />
                    <Text type="body" color="secondary">
                      Cases
                    </Text>
                  </HStack>
                </Link>

                <VStack gap={1}>
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <Heading level={2}>{record.case_number}</Heading>
                    {record.status && (
                      <Badge
                        variant={statusVariant(record.status)}
                        label={record.status}
                      />
                    )}
                  </HStack>
                  <Text type="body" color="secondary">
                    <Link href={`/matters/${record.matter_id}`}>
                      {record.matter_name}
                    </Link>
                    {record.court ? ` · ${record.court}` : ""}
                  </Text>
                </VStack>

                {record.ai_summary && (
                  <Card variant="muted">
                    <VStack gap={2}>
                      <HStack gap={2} vAlign="center">
                        <Icon
                          icon={SparklesIcon}
                          size="sm"
                          className="text-purple-vivid"
                        />
                        <Text type="label" weight="semibold">
                          Case summary
                        </Text>
                      </HStack>
                      <Text type="body">{record.ai_summary}</Text>
                      <Text type="supporting" color="secondary">
                        A starting point for review, not final legal advice.
                      </Text>
                    </VStack>
                  </Card>
                )}

                <Grid columns={3} gap={6}>
                  <GridSpan columns={2}>
                    <VStack gap={6}>
                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>Timeline</Heading>
                          {record.timeline.length === 0 ? (
                            <Text type="body" color="secondary">
                              No events recorded yet.
                            </Text>
                          ) : (
                            <List hasDividers density="compact">
                              {record.timeline.map((event) => (
                                <ListItem
                                  key={event.id}
                                  label={event.label}
                                  description={event.detail ?? undefined}
                                  startContent={
                                    <Icon icon={FlagIcon} size="sm" color="secondary" />
                                  }
                                  endContent={
                                    <Text type="supporting" color="secondary">
                                      {formatDate(event.event_date)}
                                    </Text>
                                  }
                                />
                              ))}
                            </List>
                          )}
                        </VStack>
                      </Card>

                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>Evidence</Heading>
                          {record.evidence.length === 0 ? (
                            <Text type="body" color="secondary">
                              No evidence filed yet.
                            </Text>
                          ) : (
                            <List hasDividers density="compact">
                              {record.evidence.map((item) => (
                                <ListItem
                                  key={item.id}
                                  label={item.name}
                                  description={item.evidence_type || undefined}
                                  startContent={
                                    <Icon
                                      icon={DocumentTextIcon}
                                      size="sm"
                                      color="secondary"
                                    />
                                  }
                                  endContent={
                                    <HStack gap={3} vAlign="center">
                                      <Badge
                                        variant="neutral"
                                        label={label(item.submitted_by)}
                                      />
                                      <Text type="supporting" color="secondary">
                                        {formatDate(item.submitted_date)}
                                      </Text>
                                    </HStack>
                                  }
                                />
                              ))}
                            </List>
                          )}
                        </VStack>
                      </Card>

                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>Court documents</Heading>
                          {record.court_documents.length === 0 ? (
                            <Text type="body" color="secondary">
                              No court documents recorded.
                            </Text>
                          ) : (
                            <List hasDividers density="compact">
                              {record.court_documents.map((doc) => (
                                <ListItem
                                  key={doc.id}
                                  label={doc.name}
                                  description={doc.doc_type || undefined}
                                  startContent={
                                    <Icon
                                      icon={DocumentTextIcon}
                                      size="sm"
                                      color="secondary"
                                    />
                                  }
                                  endContent={
                                    <Text type="supporting" color="secondary">
                                      {formatDate(doc.doc_date)}
                                    </Text>
                                  }
                                />
                              ))}
                            </List>
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
                          <MetadataListItem label="Court">
                            {record.court || "—"}
                          </MetadataListItem>
                          <MetadataListItem label="Judge">
                            {record.judge || "—"}
                          </MetadataListItem>
                          <MetadataListItem label="Filed">
                            {formatDate(record.filed_date)}
                          </MetadataListItem>
                          <MetadataListItem label="Opposing party">
                            {record.opposing_party || "—"}
                          </MetadataListItem>
                          {record.opposing_counsel && (
                            <MetadataListItem label="Opposing counsel">
                              {record.opposing_counsel}
                            </MetadataListItem>
                          )}
                        </MetadataList>
                      </VStack>
                    </Card>

                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>Next hearing</Heading>
                        {record.next_hearing ? (
                          <VStack gap={2}>
                            <HStack gap={2} vAlign="center">
                              <Icon icon={ScaleIcon} size="sm" color="secondary" />
                              <Text type="body" weight="semibold">
                                {formatDate(record.next_hearing.hearing_date)}
                              </Text>
                            </HStack>
                            <Text type="body" color="secondary">
                              {record.next_hearing.hearing_time}
                              {record.next_hearing.purpose
                                ? ` · ${record.next_hearing.purpose}`
                                : ""}
                            </Text>
                          </VStack>
                        ) : (
                          <Text type="body" color="secondary">
                            None scheduled.
                          </Text>
                        )}
                      </VStack>
                    </Card>

                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>Deadlines</Heading>
                        {record.deadlines.length === 0 ? (
                          <EmptyState
                            icon={<Icon icon={ClockIcon} size="lg" color="secondary" />}
                            title="No deadlines"
                            description="Nothing outstanding on this case."
                          />
                        ) : (
                          <List hasDividers density="compact">
                            {record.deadlines.map((deadline) => {
                              const days = daysUntil(deadline.due_date);
                              return (
                                <ListItem
                                  key={deadline.id}
                                  label={deadline.label}
                                  description={formatDate(deadline.due_date)}
                                  startContent={
                                    <Icon
                                      icon={ClockIcon}
                                      size="sm"
                                      color="secondary"
                                    />
                                  }
                                  endContent={
                                    deadline.completed ? (
                                      <Badge variant="success" label="Done" />
                                    ) : days <= 3 ? (
                                      <Badge
                                        variant={days < 0 ? "error" : "warning"}
                                        label={`${days}d`}
                                      />
                                    ) : (
                                      <Text type="supporting" color="secondary">
                                        {days}d
                                      </Text>
                                    )
                                  }
                                />
                              );
                            })}
                          </List>
                        )}
                      </VStack>
                    </Card>
                  </VStack>
                </Grid>
              </VStack>
            )}
          </DataView>
        </LayoutContent>
      }
    />
  );
}
