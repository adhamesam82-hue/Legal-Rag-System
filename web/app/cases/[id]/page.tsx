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
  ArrowRightIcon,
  ScaleIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";
import { useTranslator, useDirection, type TranslatorFn } from "@astryxdesign/core/i18n";
import { useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import { daysUntil } from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { enumLabelWith } from "@/lib/i18n/enum-label";
import { CaseRefItem, ParentLine, PrimaryBadge } from "@/components/matter/SubCases";

function statusVariant(status: string): "success" | "warning" | "neutral" {
  if (status.startsWith("Active")) return "success";
  if (status.startsWith("On Hold")) return "warning";
  return "neutral";
}

const SUBMITTED_BY_KEYS: Record<string, string> = {
  us: "@legalos.cases.detail.submittedBy.us",
  opposing_party: "@legalos.cases.detail.submittedBy.opposingParty",
  court: "@legalos.cases.detail.submittedBy.court",
};

function submittedByLabel(t: TranslatorFn, value: string | null | undefined): string {
  if (!value) return "—";
  const key = SUBMITTED_BY_KEYS[value];
  return key ? t(key) : enumLabelWith(t, value);
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { formatDate } = useFormat();
  const { id } = use(params);
  const caseId = Number(id);
  const t = useTranslator();
  const direction = useDirection();
  const BackIcon = direction === "rtl" ? ArrowRightIcon : ArrowLeftIcon;

  const resource = useResource((api) => api.cases.get(caseId), [caseId]);

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0} isScrollable>
          <DataView resource={resource} loadingLabel={t("@legalos.cases.detail.loading")}>
            {(record) => (
              <VStack gap={6}>
                <Link href="/cases">
                  <HStack gap={1.5} vAlign="center">
                    <Icon icon={BackIcon} size="sm" color="secondary" />
                    <Text type="body" color="secondary">
                      {t("@legalos.cases.detail.backLink")}
                    </Text>
                  </HStack>
                </Link>

                <VStack gap={1}>
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <Heading level={2}>{record.case_number || t("@legalos.cases.detail.unfiledHeading")}</Heading>
                    {record.status && (
                      <Badge
                        variant={statusVariant(record.status)}
                        label={record.status}
                      />
                    )}
                    <PrimaryBadge record={record} />
                  </HStack>
                  <Text type="body" color="secondary">
                    <Link href={`/matters/${record.matter_id}`}>
                      {record.matter_name}
                    </Link>
                    {record.court ? ` · ${record.court}` : ""}
                  </Text>
                  <ParentLine record={record} />
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
                          {t("@legalos.cases.detail.summaryHeading")}
                        </Text>
                      </HStack>
                      <Text type="body">{record.ai_summary}</Text>
                      <Text type="supporting" color="secondary">
                        {t("@legalos.cases.detail.summaryDisclaimer")}
                      </Text>
                    </VStack>
                  </Card>
                )}

                <Grid columns={3} gap={6}>
                  <GridSpan columns={2}>
                    <VStack gap={6}>
                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>{t("@legalos.cases.detail.timelineHeading")}</Heading>
                          {record.timeline.length === 0 ? (
                            <Text type="body" color="secondary">
                              {t("@legalos.cases.detail.timelineEmpty")}
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
                          <Heading level={4}>{t("@legalos.cases.detail.evidenceHeading")}</Heading>
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
                                        label={submittedByLabel(t, item.submitted_by)}
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
                          <Heading level={4}>{t("@legalos.cases.detail.courtDocumentsHeading")}</Heading>
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
                        <Heading level={4}>{t("@legalos.cases.detail.detailsHeading")}</Heading>
                        <MetadataList>
                          <MetadataListItem label={t("@legalos.cases.field.court")}>
                            {record.court || "—"}
                          </MetadataListItem>
                          <MetadataListItem label={t("@legalos.cases.field.judge")}>
                            {record.judge || "—"}
                          </MetadataListItem>
                          <MetadataListItem label={t("@legalos.cases.field.filed")}>
                            {record.filed_date ? formatDate(record.filed_date) : t("@legalos.cases.field.notFiled")}
                          </MetadataListItem>
                          <MetadataListItem label={t("@legalos.cases.field.opposingParty")}>
                            {record.opposing_party || "—"}
                          </MetadataListItem>
                          {record.opposing_counsel && (
                            <MetadataListItem label={t("@legalos.cases.field.opposingCounsel")}>
                              {record.opposing_counsel}
                            </MetadataListItem>
                          )}
                        </MetadataList>
                      </VStack>
                    </Card>

                    {/* Read-only here; linking and unlinking happen in the
                      * case file on the matter page, where the lawyer works. */}
                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>{t("@legalos.cases.related.heading")}</Heading>
                        {record.parent ? (
                          <Text type="body" color="secondary">
                            {t("@legalos.cases.related.childCannotParent")}
                          </Text>
                        ) : record.children.length === 0 ? (
                          <Text type="body" color="secondary">
                            {t("@legalos.cases.related.empty")}
                          </Text>
                        ) : (
                          <List hasDividers density="compact">
                            {record.children.map((child) => (
                              <CaseRefItem key={child.id} ref={child} />
                            ))}
                          </List>
                        )}
                        <Link href={`/matters/${record.matter_id}`}>
                          {t("@legalos.cases.related.manageOnMatter")}
                        </Link>
                      </VStack>
                    </Card>

                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>{t("@legalos.cases.detail.nextHearingHeading")}</Heading>
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
                        <Heading level={4}>{t("@legalos.cases.detail.deadlinesHeading")}</Heading>
                        {record.deadlines.length === 0 ? (
                          <EmptyState
                            icon={<Icon icon={ClockIcon} size="lg" color="secondary" />}
                            title={t("@legalos.cases.detail.deadlinesEmptyTitle")}
                            description={t("@legalos.cases.detail.deadlinesEmptyDescription")}
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
                                      <Badge variant="success" label={t("@legalos.cases.detail.deadlineDone")} />
                                    ) : days <= 3 ? (
                                      <Badge
                                        variant={days < 0 ? "error" : "warning"}
                                        label={t("@legalos.cases.detail.daysSuffix", { days })}
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
