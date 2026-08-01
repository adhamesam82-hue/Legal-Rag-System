"use client";

import { use, useState } from "react";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  ArrowLeftIcon,
  ScaleIcon,
  ClockIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CheckCircleIcon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import {
  useOrg,
  useMemberName,
  useResource,
  useOptionalResource,
} from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  daysUntil,
  formatBytes,
  formatDate,
  formatDateTime,
  formatEGP,
  type MatterStatus,
} from "@/lib/practice";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";

const TABS = [
  { value: "overview", labelKey: "@legalos.matters.detail.tab.overview" },
  { value: "timeline", labelKey: "@legalos.matters.detail.tab.timeline" },
  { value: "documents", labelKey: "@legalos.matters.detail.tab.documents" },
  { value: "tasks", labelKey: "@legalos.matters.detail.tab.tasks" },
  { value: "time", labelKey: "@legalos.matters.detail.tab.time" },
  { value: "notes", labelKey: "@legalos.matters.detail.tab.notes" },
] as const;

const STATUS_VARIANT: Record<MatterStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  on_hold: "warning",
  closed: "neutral",
};

export default function MatterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const matterId = Number(id);
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice } = useOrg();
  const memberName = useMemberName();
  const [tab, setTab] = useState("overview");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resource = useResource(
    async (api) => {
      const matter = await api.matters.get(matterId);
      const [
        documents,
        tasks,
        time,
        invoices,
        notes,
        timeline,
        hearings,
        activity,
      ] = await Promise.all([
        api.documents.list({ matter_id: matterId }),
        api.tasks.list({ matter_id: matterId }),
        api.time.list({ matter_id: matterId }),
        api.invoices.list({ matter_id: matterId }),
        api.matters.notes(matterId),
        api.matters.timeline(matterId),
        api.hearings.list({ matter_id: matterId }),
        api.activity({ matter_id: matterId, limit: 20 }),
      ]);
      return {
        matter,
        documents,
        tasks,
        time,
        invoices,
        notes,
        timeline,
        hearings,
        activity,
      };
    },
    [matterId],
  );

  // A matter without litigation has no case; a 404 there is expected, not an error.
  const caseResource = useOptionalResource(
    (api) => api.matters.case(matterId),
    [matterId],
  );

  async function addNote() {
    if (!practice || !note.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await practice.matters.addNote(matterId, note.trim());
      setNote("");
      resource.reload();
    } catch (exc) {
      setError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matters.detail.errors.note"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: string | null) {
    if (!practice || !status) return;
    setError(null);
    try {
      await practice.matters.update(matterId, { status });
      resource.reload();
    } catch (exc) {
      setError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matters.detail.errors.status"),
      );
    }
  }

  async function toggleTask(taskId: number, done: boolean) {
    if (!practice) return;
    try {
      await practice.tasks.update(taskId, { status: done ? "done" : "todo" });
      resource.reload();
    } catch (exc) {
      setError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matters.detail.errors.task"),
      );
    }
  }

  return (
    <DataView
      resource={resource}
      loadingLabel={t("@legalos.matters.detail.loading")}
    >
      {({
        matter,
        documents,
        tasks,
        time,
        invoices,
        notes,
        timeline,
        hearings,
        activity,
      }) => {
        const openTasks = tasks.filter((t) => t.status !== "done");
        const billableAmount = time
          .filter((t) => t.billable)
          .reduce((sum, t) => sum + Number(t.hours) * Number(t.rate), 0);
        const unbilledAmount = time
          .filter((t) => t.billable && t.invoice_id === null)
          .reduce((sum, t) => sum + Number(t.hours) * Number(t.rate), 0);
        const totalHours = time.reduce((sum, t) => sum + Number(t.hours), 0);
        const linkedCase = caseResource.data;

        return (
          <Layout
            height="fill"
            header={
              <LayoutHeader hasDivider padding={0}>
                <VStack gap={4}>
                  <Link href="/matters">
                    <HStack gap={1.5} vAlign="center">
                      <Icon icon={ArrowLeftIcon} size="sm" color="secondary" />
                      <Text type="body" color="secondary">
                        {t("@legalos.matters.heading")}
                      </Text>
                    </HStack>
                  </Link>

                  <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
                    <VStack gap={1}>
                      <HStack gap={3} vAlign="center" wrap="wrap">
                        <Heading level={2}>{matter.name}</Heading>
                        <Badge
                          variant={STATUS_VARIANT[matter.status]}
                          label={enumLabel(matter.status)}
                        />
                      </HStack>
                      <Text type="body" color="secondary">
                        <Link href={`/clients/${matter.client_id}`}>
                          {matter.client_name}
                        </Link>
                        {" · "}
                        {t("@legalos.matters.detail.subtitle", {
                          type: enumLabel(matter.matter_type),
                          date: formatDate(matter.opened_date),
                        })}
                      </Text>
                    </VStack>
                    <Selector
                      label={t("@legalos.matters.field.status")}
                      isLabelHidden
                      value={matter.status}
                      onChange={setStatus}
                      width={160}
                      options={[
                        {
                          value: "active",
                          label: t("@legalos.matters.status.active"),
                        },
                        {
                          value: "on_hold",
                          label: t("@legalos.matters.status.onHold"),
                        },
                        {
                          value: "closed",
                          label: t("@legalos.matters.status.closed"),
                        },
                      ]}
                    />
                  </HStack>

                  <TabList value={tab} onChange={setTab} hasDivider>
                    {TABS.map((tabDef) => (
                      <Tab
                        key={tabDef.value}
                        value={tabDef.value}
                        label={t(tabDef.labelKey)}
                        endContent={
                          tabDef.value === "tasks" && openTasks.length > 0 ? (
                            <Badge
                              variant="neutral"
                              label={String(openTasks.length)}
                            />
                          ) : undefined
                        }
                      />
                    ))}
                  </TabList>
                </VStack>
              </LayoutHeader>
            }
            content={
              <LayoutContent padding={0} isScrollable>
                <VStack gap={6}>
                  <InlineError message={error} onDismiss={() => setError(null)} />

                  {tab === "overview" && (
                    <Grid columns={3} gap={6}>
                      <GridSpan columns={2}>
                        <VStack gap={6}>
                          <Card>
                            <VStack gap={3}>
                              <Heading level={4}>
                                {t("@legalos.matters.detail.summary.heading")}
                              </Heading>
                              <Text type="body">
                                {matter.description ||
                                  t(
                                    "@legalos.matters.detail.summary.noDescription",
                                  )}
                              </Text>
                              {matter.tags.length > 0 && (
                                <HStack gap={2} wrap="wrap">
                                  {matter.tags.map((tag) => (
                                    <Badge key={tag} variant="neutral" label={tag} />
                                  ))}
                                </HStack>
                              )}
                            </VStack>
                          </Card>

                          {linkedCase && (
                            <Card>
                              <VStack gap={4}>
                                <HStack hAlign="between" vAlign="center">
                                  <Heading level={4}>
                                    {t(
                                      "@legalos.matters.detail.linkedCase.heading",
                                    )}
                                  </Heading>
                                  <Link href={`/cases/${linkedCase.id}`}>
                                    {t(
                                      "@legalos.matters.detail.linkedCase.openCase",
                                    )}
                                  </Link>
                                </HStack>
                                <MetadataList>
                                  <MetadataListItem
                                    label={t(
                                      "@legalos.matters.detail.linkedCase.caseNumber",
                                    )}
                                  >
                                    {linkedCase.case_number}
                                  </MetadataListItem>
                                  <MetadataListItem
                                    label={t(
                                      "@legalos.matters.detail.linkedCase.court",
                                    )}
                                  >
                                    {linkedCase.court}
                                  </MetadataListItem>
                                  <MetadataListItem
                                    label={t(
                                      "@legalos.matters.detail.linkedCase.opposingParty",
                                    )}
                                  >
                                    {linkedCase.opposing_party || "—"}
                                  </MetadataListItem>
                                </MetadataList>
                              </VStack>
                            </Card>
                          )}

                          <Card>
                            <VStack gap={4}>
                              <Heading level={4}>
                                {t("@legalos.matters.detail.openTasks.heading")}
                              </Heading>
                              {openTasks.length === 0 ? (
                                <Text type="body" color="secondary">
                                  {t("@legalos.matters.detail.openTasks.empty")}
                                </Text>
                              ) : (
                                <List hasDividers density="compact">
                                  {openTasks.map((task) => (
                                    <ListItem
                                      key={task.id}
                                      label={task.title}
                                      description={memberName(task.assignee)}
                                      startContent={
                                        <Icon
                                          icon={CheckCircleIcon}
                                          size="sm"
                                          color="secondary"
                                        />
                                      }
                                      endContent={
                                        task.due_date ? (
                                          <Text type="supporting" color="secondary">
                                            {formatDate(task.due_date)}
                                          </Text>
                                        ) : undefined
                                      }
                                    />
                                  ))}
                                </List>
                              )}
                            </VStack>
                          </Card>

                          <Card>
                            <VStack gap={4}>
                              <Heading level={4}>
                                {t("@legalos.matters.detail.activity.heading")}
                              </Heading>
                              {activity.length === 0 ? (
                                <Text type="body" color="secondary">
                                  {t("@legalos.matters.detail.activity.empty")}
                                </Text>
                              ) : (
                                <List hasDividers density="compact">
                                  {activity.map((entry) => (
                                    <ListItem
                                      key={entry.id}
                                      label={memberName(entry.actor)}
                                      description={entry.action}
                                      startContent={
                                        <Avatar
                                          name={memberName(entry.actor)}
                                          size="sm"
                                          tooltip={false}
                                        />
                                      }
                                      endContent={
                                        <Text type="supporting" color="secondary">
                                          {formatDateTime(entry.occurred_at)}
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
                            <Heading level={4}>
                              {t("@legalos.matters.detail.glance.heading")}
                            </Heading>
                            <MetadataList>
                              <MetadataListItem
                                label={t("@legalos.matters.field.billing")}
                              >
                                {enumLabel(matter.billing_type)}
                              </MetadataListItem>
                              {matter.budget_amount !== null && (
                                <MetadataListItem
                                  label={t(
                                    "@legalos.matters.detail.glance.budget",
                                  )}
                                >
                                  {formatEGP(Number(matter.budget_amount))}
                                  {matter.budget_is_estimate
                                    ? t(
                                        "@legalos.matters.detail.glance.estimateSuffix",
                                      )
                                    : ""}
                                </MetadataListItem>
                              )}
                              <MetadataListItem
                                label={t(
                                  "@legalos.matters.detail.glance.hoursLogged",
                                )}
                              >
                                {t("@legalos.matters.detail.hoursValue", {
                                  hours: totalHours.toFixed(1),
                                })}
                              </MetadataListItem>
                              <MetadataListItem
                                label={t(
                                  "@legalos.matters.detail.glance.unbilled",
                                )}
                              >
                                {formatEGP(unbilledAmount)}
                              </MetadataListItem>
                              {matter.next_deadline && (
                                <MetadataListItem
                                  label={t("@legalos.matters.field.nextDeadline")}
                                >
                                  {t("@legalos.matters.detail.metaNameDate", {
                                    name: matter.next_deadline.label,
                                    date: formatDate(
                                      matter.next_deadline.due_date,
                                    ),
                                  })}
                                </MetadataListItem>
                              )}
                              {matter.closed_date && (
                                <MetadataListItem
                                  label={t("@legalos.matters.field.closed")}
                                >
                                  {formatDate(matter.closed_date)}
                                </MetadataListItem>
                              )}
                            </MetadataList>
                          </VStack>
                        </Card>

                        <Card>
                          <VStack gap={4}>
                            <Heading level={4}>
                              {t("@legalos.matters.detail.team.heading")}
                            </Heading>
                            <List hasDividers density="compact">
                              <ListItem
                                label={memberName(matter.responsible_user)}
                                description={t(
                                  "@legalos.matters.field.responsible",
                                )}
                                startContent={
                                  <Avatar
                                    name={memberName(matter.responsible_user)}
                                    size="sm"
                                    tooltip={false}
                                  />
                                }
                              />
                              {matter.staff.map((userId) => (
                                <ListItem
                                  key={userId}
                                  label={memberName(userId)}
                                  description={t(
                                    "@legalos.matters.detail.team.supporting",
                                  )}
                                  startContent={
                                    <Avatar
                                      name={memberName(userId)}
                                      size="sm"
                                      tooltip={false}
                                    />
                                  }
                                />
                              ))}
                            </List>
                          </VStack>
                        </Card>

                        <Card>
                          <VStack gap={4}>
                            <Heading level={4}>
                              {t("@legalos.matters.detail.hearings.heading")}
                            </Heading>
                            {hearings.length === 0 ? (
                              <Text type="body" color="secondary">
                                {t("@legalos.matters.detail.hearings.empty")}
                              </Text>
                            ) : (
                              <List hasDividers density="compact">
                                {hearings.map((hearing) => (
                                  <ListItem
                                    key={hearing.id}
                                    label={
                                      hearing.purpose ||
                                      t(
                                        "@legalos.matters.detail.hearings.defaultPurpose",
                                      )
                                    }
                                    description={hearing.court}
                                    startContent={
                                      <Icon
                                        icon={ScaleIcon}
                                        size="sm"
                                        color="secondary"
                                      />
                                    }
                                    endContent={
                                      <Text type="supporting" color="secondary">
                                        {formatDate(hearing.hearing_date)}
                                      </Text>
                                    }
                                  />
                                ))}
                              </List>
                            )}
                          </VStack>
                        </Card>
                      </VStack>
                    </Grid>
                  )}

                  {tab === "timeline" && (
                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>
                          {t("@legalos.matters.detail.timeline.heading")}
                        </Heading>
                        {timeline.length === 0 ? (
                          <EmptyState
                            icon={<Icon icon={FlagIcon} size="lg" color="secondary" />}
                            title={t(
                              "@legalos.matters.detail.timeline.emptyTitle",
                            )}
                            description={t(
                              "@legalos.matters.detail.timeline.emptyDescription",
                            )}
                          />
                        ) : (
                          <List hasDividers density="compact">
                            {timeline.map((event) => (
                              <ListItem
                                key={event.id}
                                label={event.label}
                                description={event.detail ?? undefined}
                                startContent={
                                  <Icon icon={FlagIcon} size="sm" color="secondary" />
                                }
                                endContent={
                                  <HStack gap={3} vAlign="center">
                                    <Badge
                                      variant="neutral"
                                      label={enumLabel(event.kind)}
                                    />
                                    <Text type="supporting" color="secondary">
                                      {formatDate(event.event_date)}
                                    </Text>
                                  </HStack>
                                }
                              />
                            ))}
                          </List>
                        )}
                      </VStack>
                    </Card>
                  )}

                  {tab === "documents" && (
                    <Card>
                      <VStack gap={4}>
                        <HStack hAlign="between" vAlign="center">
                          <Heading level={4}>
                            {t("@legalos.matters.detail.documents.heading")}
                          </Heading>
                          <Link href="/documents">
                            {t("@legalos.matters.detail.documents.allDocuments")}
                          </Link>
                        </HStack>
                        {documents.length === 0 ? (
                          <EmptyState
                            icon={
                              <Icon
                                icon={DocumentTextIcon}
                                size="lg"
                                color="secondary"
                              />
                            }
                            title={t(
                              "@legalos.matters.detail.documents.emptyTitle",
                            )}
                            description={t(
                              "@legalos.matters.detail.documents.emptyDescription",
                            )}
                          />
                        ) : (
                          <List hasDividers density="compact">
                            {documents.map((doc) => (
                              <ListItem
                                key={doc.id}
                                label={doc.name}
                                href={`/documents/${doc.id}`}
                                description={t(
                                  "@legalos.matters.detail.metaNameDate",
                                  {
                                    name: memberName(doc.uploaded_by),
                                    date: formatDate(doc.uploaded_at),
                                  },
                                )}
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
                                      label={enumLabel(doc.status)}
                                    />
                                    <Text type="supporting" color="secondary">
                                      {doc.size_bytes
                                        ? formatBytes(doc.size_bytes)
                                        : "—"}
                                    </Text>
                                  </HStack>
                                }
                              />
                            ))}
                          </List>
                        )}
                      </VStack>
                    </Card>
                  )}

                  {tab === "tasks" && (
                    <Card>
                      <VStack gap={4}>
                        <HStack hAlign="between" vAlign="center">
                          <Heading level={4}>
                            {t("@legalos.matters.detail.tasks.heading")}
                          </Heading>
                          <Link href="/tasks">
                            {t("@legalos.matters.detail.tasks.allTasks")}
                          </Link>
                        </HStack>
                        {tasks.length === 0 ? (
                          <EmptyState
                            icon={
                              <Icon
                                icon={CheckCircleIcon}
                                size="lg"
                                color="secondary"
                              />
                            }
                            title={t("@legalos.matters.detail.tasks.emptyTitle")}
                            description={t(
                              "@legalos.matters.detail.tasks.emptyDescription",
                            )}
                          />
                        ) : (
                          <List hasDividers density="compact">
                            {tasks.map((task) => {
                              const done = task.status === "done";
                              const overdue = !done && daysUntil(task.due_date) < 0;
                              return (
                                <ListItem
                                  key={task.id}
                                  label={task.title}
                                  description={
                                    task.due_date
                                      ? t(
                                          "@legalos.matters.detail.tasks.dueDate",
                                          {
                                            name: memberName(task.assignee),
                                            date: formatDate(task.due_date),
                                          },
                                        )
                                      : memberName(task.assignee)
                                  }
                                  startContent={
                                    <Icon
                                      icon={CheckCircleIcon}
                                      size="sm"
                                      color={done ? "success" : "secondary"}
                                    />
                                  }
                                  endContent={
                                    <HStack gap={3} vAlign="center">
                                      {overdue && (
                                        <Badge
                                          variant="error"
                                          label={t(
                                            "@legalos.matters.detail.tasks.overdue",
                                          )}
                                        />
                                      )}
                                      <Button
                                        label={
                                          done
                                            ? t(
                                                "@legalos.matters.detail.tasks.reopen",
                                              )
                                            : t(
                                                "@legalos.matters.detail.tasks.markDone",
                                              )
                                        }
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleTask(task.id, !done)}
                                      >
                                        {done
                                          ? t(
                                              "@legalos.matters.detail.tasks.reopen",
                                            )
                                          : t(
                                              "@legalos.matters.detail.tasks.markDone",
                                            )}
                                      </Button>
                                    </HStack>
                                  }
                                />
                              );
                            })}
                          </List>
                        )}
                      </VStack>
                    </Card>
                  )}

                  {tab === "time" && (
                    <Grid columns={3} gap={6}>
                      <GridSpan columns={2}>
                        <Card>
                          <VStack gap={4}>
                            <HStack hAlign="between" vAlign="center">
                              <Heading level={4}>
                                {t("@legalos.matters.detail.time.heading")}
                              </Heading>
                              <Link href="/time-tracking">
                                {t("@legalos.matters.detail.time.link")}
                              </Link>
                            </HStack>
                            {time.length === 0 ? (
                              <Text type="body" color="secondary">
                                {t("@legalos.matters.detail.time.empty")}
                              </Text>
                            ) : (
                              <List hasDividers density="compact">
                                {time.map((entry) => (
                                  <ListItem
                                    key={entry.id}
                                    label={
                                      entry.description ||
                                      t(
                                        "@legalos.matters.detail.time.defaultDescription",
                                      )
                                    }
                                    description={t(
                                      "@legalos.matters.detail.metaNameDate",
                                      {
                                        name: memberName(entry.clerk_user_id),
                                        date: formatDate(entry.entry_date),
                                      },
                                    )}
                                    startContent={
                                      <Icon
                                        icon={ClockIcon}
                                        size="sm"
                                        color="secondary"
                                      />
                                    }
                                    endContent={
                                      <HStack gap={3} vAlign="center">
                                        {entry.invoice_id && (
                                          <Badge
                                            variant="info"
                                            label={t(
                                              "@legalos.matters.detail.time.invoiced",
                                            )}
                                          />
                                        )}
                                        <Text type="body" weight="semibold">
                                          {t(
                                            "@legalos.matters.detail.hoursValue",
                                            {
                                              hours: Number(
                                                entry.hours,
                                              ).toFixed(1),
                                            },
                                          )}
                                        </Text>
                                      </HStack>
                                    }
                                  />
                                ))}
                              </List>
                            )}
                          </VStack>
                        </Card>
                      </GridSpan>

                      <VStack gap={6}>
                        <Card>
                          <VStack gap={4}>
                            <Heading level={4}>
                              {t("@legalos.matters.field.billing")}
                            </Heading>
                            <MetadataList>
                              <MetadataListItem
                                label={t(
                                  "@legalos.matters.detail.billing.hours",
                                )}
                              >
                                {t("@legalos.matters.detail.hoursValue", {
                                  hours: totalHours.toFixed(1),
                                })}
                              </MetadataListItem>
                              <MetadataListItem
                                label={t(
                                  "@legalos.matters.detail.billing.billableValue",
                                )}
                              >
                                {formatEGP(billableAmount)}
                              </MetadataListItem>
                              <MetadataListItem
                                label={t(
                                  "@legalos.matters.detail.glance.unbilled",
                                )}
                              >
                                {formatEGP(unbilledAmount)}
                              </MetadataListItem>
                            </MetadataList>
                          </VStack>
                        </Card>

                        <Card>
                          <VStack gap={4}>
                            <Heading level={4}>
                              {t("@legalos.matters.detail.invoices.heading")}
                            </Heading>
                            {invoices.length === 0 ? (
                              <Text type="body" color="secondary">
                                {t("@legalos.matters.detail.invoices.empty")}
                              </Text>
                            ) : (
                              <List hasDividers density="compact">
                                {invoices.map((invoice) => (
                                  <ListItem
                                    key={invoice.id}
                                    label={invoice.number}
                                    href={`/billing/${invoice.id}`}
                                    description={formatDate(invoice.issued_date)}
                                    startContent={
                                      <Icon
                                        icon={BanknotesIcon}
                                        size="sm"
                                        color="secondary"
                                      />
                                    }
                                    endContent={
                                      <Text type="body" weight="semibold">
                                        {formatEGP(Number(invoice.amount))}
                                      </Text>
                                    }
                                  />
                                ))}
                              </List>
                            )}
                          </VStack>
                        </Card>
                      </VStack>
                    </Grid>
                  )}

                  {tab === "notes" && (
                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>
                          {t("@legalos.matters.detail.notes.heading")}
                        </Heading>
                        <VStack gap={3}>
                          <TextArea
                            label={t("@legalos.matters.detail.notes.addLabel")}
                            value={note}
                            onChange={setNote}
                            rows={3}
                            placeholder={t(
                              "@legalos.matters.detail.notes.placeholder",
                            )}
                          />
                          <HStack hAlign="end">
                            <Button
                              label={
                                saving
                                  ? t("@legalos.matters.savingEllipsis")
                                  : t("@legalos.matters.detail.notes.addButton")
                              }
                              variant="primary"
                              isDisabled={saving || !note.trim()}
                              onClick={addNote}
                            />
                          </HStack>
                        </VStack>
                        {notes.length === 0 ? (
                          <EmptyState
                            icon={
                              <Icon
                                icon={ChatBubbleLeftRightIcon}
                                size="lg"
                                color="secondary"
                              />
                            }
                            title={t("@legalos.matters.detail.notes.emptyTitle")}
                            description={t(
                              "@legalos.matters.detail.notes.emptyDescription",
                            )}
                          />
                        ) : (
                          <List hasDividers density="compact">
                            {notes.map((entry) => (
                              <ListItem
                                key={entry.id}
                                label={memberName(entry.author)}
                                description={entry.content}
                                startContent={
                                  <Avatar
                                    name={memberName(entry.author)}
                                    size="sm"
                                    tooltip={false}
                                  />
                                }
                                endContent={
                                  <Text type="supporting" color="secondary">
                                    {formatDateTime(entry.created_at)}
                                  </Text>
                                }
                              />
                            ))}
                          </List>
                        )}
                      </VStack>
                    </Card>
                  )}
                </VStack>
              </LayoutContent>
            }
          />
        );
      }}
    </DataView>
  );
}
