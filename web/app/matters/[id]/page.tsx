"use client";

/**
 * The matter workspace — the screen a firm actually runs a file from.
 *
 * Eleven tabs, matching what a practice-management product is expected to
 * carry: the dashboard, the firm's own custom fields, activities (time and
 * expenses), the calendar, communications, notes, documents, tasks, bills,
 * client-funds transactions, and the client portal.
 *
 * Everything loads once into one snapshot (see components/matter/shared.tsx)
 * and every tab reads from it, so the financial strip and the Activities tab
 * can never disagree about what is unbilled.
 */

import { use, useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { DateInput } from "@astryxdesign/core/DateInput";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { Link } from "@astryxdesign/core/Link";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  daysUntil,
  type MatterStatus,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import {
  Panel,
  type TabProps,
  type WorkspaceData,
} from "@/components/matter/shared";
import { DashboardTab } from "@/components/matter/DashboardTab";
import { ActivitiesTab } from "@/components/matter/ActivitiesTab";
import { CalendarTab } from "@/components/matter/CalendarTab";
import { CommunicationsTab } from "@/components/matter/CommunicationsTab";
import { CustomFieldsTab } from "@/components/matter/CustomFieldsTab";
import { BillsTab, TransactionsTab } from "@/components/matter/FinanceTabs";

const TABS = [
  { value: "dashboard", labelKey: "@legalos.matterWorkspace.tab.dashboard" },
  { value: "customFields", labelKey: "@legalos.matterWorkspace.tab.customFields" },
  { value: "activities", labelKey: "@legalos.matterWorkspace.tab.activities" },
  { value: "calendar", labelKey: "@legalos.matterWorkspace.tab.calendar" },
  { value: "communications", labelKey: "@legalos.matterWorkspace.tab.communications" },
  { value: "notes", labelKey: "@legalos.matters.detail.tab.notes" },
  { value: "documents", labelKey: "@legalos.matters.detail.tab.documents" },
  { value: "tasks", labelKey: "@legalos.matters.detail.tab.tasks" },
  { value: "bills", labelKey: "@legalos.matterWorkspace.tab.bills" },
  { value: "transactions", labelKey: "@legalos.matterWorkspace.tab.transactions" },
  { value: "timeline", labelKey: "@legalos.matters.detail.tab.timeline" },
] as const;

const STATUS_VARIANT: Record<MatterStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  on_hold: "warning",
  closed: "neutral",
};

export default function MatterWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { formatDate } = useFormat();
  const { id } = use(params);
  const matterId = Number(id);
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const router = useRouter();
  const { practice } = useOrg();
  const [tab, setTab] = useState<string>("dashboard");
  const [error, setError] = useState<string | null>(null);

  // Dialogs the header and the dashboard open on tabs other than their own.
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [quickBillOpen, setQuickBillOpen] = useState(false);
  const [recordFundsOpen, setRecordFundsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const resource = useResource<WorkspaceData>(
    async (api) => {
      const matter = await api.matters.get(matterId);
      // A matter without litigation has no case, and the API 404s for it.
      // Only that 404 becomes null — any other failure is a real one and must
      // surface as an error rather than as "this matter has no case".
      const [
        linkedCase,
        contacts,
        client,
        customFields,
        conflictChecks,
        documents,
        tasks,
        time,
        expenses,
        invoices,
        notes,
        timeline,
        hearings,
        activity,
        trustBalance,
        trustTransactions,
        trustAccounts,
        communications,
        threads,
        portals,
      ] = await Promise.all([
        api.matters.case(matterId).catch((exc: unknown) => {
          if (exc instanceof ApiError && exc.status === 404) return null;
          throw exc;
        }),
        api.matters.contacts(matterId),
        api.clients.get(matter.client_id),
        api.matters.customFields(matterId),
        api.matters.conflictChecks(matterId),
        api.documents.list({ matter_id: matterId }),
        api.tasks.list({ matter_id: matterId }),
        api.time.list({ matter_id: matterId }),
        api.expenses.list({ matter_id: matterId }),
        api.invoices.list({ matter_id: matterId }),
        api.matters.notes(matterId),
        api.matters.timeline(matterId),
        api.hearings.list({ matter_id: matterId }),
        api.activity({ matter_id: matterId, limit: 20 }),
        api.matters.trustBalance(matterId),
        api.trust.transactions({ matter_id: matterId }),
        api.trust.accounts(),
        api.communications.list({ matter_id: matterId }),
        api.matters.threads(matterId),
        api.matters.portals(matterId),
      ]);

      return {
        matter,
        linkedCase,
        contacts,
        clientContacts: client.contacts,
        customFields,
        conflictChecks,
        documents,
        tasks,
        time,
        expenses,
        invoices,
        notes,
        timeline,
        hearings,
        activity,
        trustBalance,
        trustTransactions,
        trustAccounts,
        communications,
        threads,
        portals,
      };
    },
    [matterId],
  );

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

  async function duplicate() {
    if (!practice) return;
    setError(null);
    try {
      const copy = await practice.matters.duplicate(matterId);
      router.push(`/matters/${copy.id}`);
    } catch (exc) {
      setError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matterWorkspace.errors.duplicate"),
      );
    }
  }

  return (
    <DataView
      resource={resource}
      loadingLabel={t("@legalos.matters.detail.loading")}
    >
      {(data) => {
        const { matter } = data;
        const openTasks = data.tasks.filter((task) => task.status !== "done");
        const unread = data.threads.reduce(
          (sum, thread) => sum + thread.unread_count,
          0,
        );
        const tabProps = {
          data,
          reload: resource.reload,
          onError: setError,
        };

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
                        {/* The number leads, the way a firm refers to the file. */}
                        <Heading level={2}>{matter.matter_number}</Heading>
                        <Badge
                          variant={STATUS_VARIANT[matter.status]}
                          label={enumLabel(matter.status)}
                        />
                      </HStack>
                      <Text type="body" color="secondary">
                        {matter.name}
                        {" · "}
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

                    <HStack gap={2} vAlign="center" wrap="wrap">
                      <Selector
                        label={t("@legalos.matters.field.status")}
                        isLabelHidden
                        value={matter.status}
                        onChange={setStatus}
                        width={150}
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
                      <Button
                        label={t("@legalos.matterWorkspace.action.duplicate")}
                        variant="secondary"
                        onClick={duplicate}
                      />
                      <Button
                        label={t("@legalos.matterWorkspace.action.share")}
                        variant="secondary"
                        onClick={() => setTab("communications")}
                      />
                      <Button
                        label={t("@legalos.matterWorkspace.action.edit")}
                        variant="primary"
                        onClick={() => setEditOpen(true)}
                      />
                    </HStack>
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
                          ) : tabDef.value === "communications" && unread > 0 ? (
                            <Badge variant="error" label={String(unread)} />
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

                  {tab === "dashboard" && (
                    <DashboardTab
                      {...tabProps}
                      // Each quick action's dialog is owned by the tab that
                      // owns the data, so the action navigates there and opens
                      // it — otherwise the button would do nothing until the
                      // user had already gone to that tab themselves.
                      onQuickBill={() => {
                        setTab("bills");
                        setQuickBillOpen(true);
                      }}
                      onAddTime={() => {
                        setTab("activities");
                        setAddTimeOpen(true);
                      }}
                      onAddExpense={() => {
                        setTab("activities");
                        setAddExpenseOpen(true);
                      }}
                      onRecordDeposit={() => {
                        setTab("transactions");
                        setRecordFundsOpen(true);
                      }}
                      onOpenBills={() => setTab("bills")}
                    />
                  )}

                  {tab === "customFields" && <CustomFieldsTab {...tabProps} />}

                  {tab === "activities" && (
                    <ActivitiesTab
                      {...tabProps}
                      addTimeOpen={addTimeOpen}
                      addExpenseOpen={addExpenseOpen}
                      onAddTimeChange={setAddTimeOpen}
                      onAddExpenseChange={setAddExpenseOpen}
                    />
                  )}

                  {tab === "calendar" && <CalendarTab {...tabProps} />}

                  {tab === "communications" && <CommunicationsTab {...tabProps} />}

                  {tab === "notes" && <NotesTab {...tabProps} />}

                  {tab === "documents" && <DocumentsTab {...tabProps} />}

                  {tab === "tasks" && <TasksTab {...tabProps} />}

                  {tab === "bills" && (
                    <BillsTab
                      {...tabProps}
                      quickBillOpen={quickBillOpen}
                      onQuickBillChange={setQuickBillOpen}
                    />
                  )}

                  {tab === "transactions" && (
                    <TransactionsTab
                      {...tabProps}
                      recordOpen={recordFundsOpen}
                      onRecordChange={setRecordFundsOpen}
                    />
                  )}

                  {tab === "timeline" && <TimelineTab {...tabProps} />}

                  <EditMatterDialog
                    isOpen={editOpen}
                    onOpenChange={setEditOpen}
                    {...tabProps}
                  />
                </VStack>
              </LayoutContent>
            }
          />
        );
      }}
    </DataView>
  );
}

/**
 * Edits the fields that describe the engagement. Status has its own control in
 * the header and is not repeated here; the matter number is editable because a
 * firm's own numbering convention outranks the one we generated.
 */
function EditMatterDialog({
  isOpen,
  onOpenChange,
  data,
  reload,
  onError,
}: TabProps & {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice, members } = useOrg();
  const { matter } = data;
  const [name, setName] = useState(matter.name);
  const [matterNumber, setMatterNumber] = useState(matter.matter_number);
  const [description, setDescription] = useState(matter.description);
  // Both always hold a value, so neither Selector is clearable.
  const [responsible, setResponsible] = useState(matter.responsible_user);
  const [billingType, setBillingType] = useState<string>(matter.billing_type);
  const [tags, setTags] = useState(matter.tags.join(", "));
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!practice) return;
    setSaving(true);
    try {
      await practice.matters.update(matter.id, {
        name: name.trim(),
        matter_number: matterNumber.trim(),
        description,
        responsible_user: responsible,
        billing_type: billingType,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      reload();
      onOpenChange(false);
    } catch (exc) {
      onError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matters.detail.errors.status"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={520}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.action.edit")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <TextInput
                  label={t("@legalos.matterWorkspace.details.matterNumber")}
                  value={matterNumber}
                  onChange={setMatterNumber}
                  width={160}
                />
                <TextInput
                  label={t("@legalos.matters.list.table.matter")}
                  value={name}
                  onChange={setName}
                  isRequired
                />
              </HStack>
              <TextArea
                label={t("@legalos.matters.field.description")}
                value={description}
                onChange={setDescription}
                rows={3}
              />
              <HStack gap={3}>
                <Selector
                  label={t("@legalos.matters.field.responsible")}
                  value={responsible}
                  onChange={(value) => value && setResponsible(value)}
                  options={members.map((member) => ({
                    value: member.clerk_user_id,
                    label: member.display_name ?? member.clerk_user_id,
                  }))}
                />
                <Selector
                  label={t("@legalos.matters.field.billing")}
                  value={billingType}
                  onChange={(value) => value && setBillingType(value)}
                  options={(["hourly", "fixed_fee", "retainer"] as const).map(
                    (value) => ({ value, label: enumLabel(value) }),
                  )}
                />
              </HStack>
              <TextInput
                label={t("@legalos.matterWorkspace.details.tags")}
                value={tags}
                onChange={setTags}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.matterWorkspace.action.saving")
                    : t("@legalos.matterWorkspace.action.save")
                }
                variant="primary"
                isDisabled={saving || !name.trim() || !matterNumber.trim()}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

// --- tabs that read straight from the snapshot ------------------------------

function NotesTab({ data, reload, onError }: TabProps) {
  const { formatDateTime } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const { practice } = useOrg();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!practice || !note.trim()) return;
    setSaving(true);
    try {
      await practice.matters.addNote(data.matter.id, note.trim());
      setNote("");
      reload();
    } catch (exc) {
      onError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matters.detail.errors.note"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title={t("@legalos.matters.detail.notes.heading")}>
      <VStack gap={3}>
        <TextArea
          label={t("@legalos.matters.detail.notes.addLabel")}
          value={note}
          onChange={setNote}
          rows={3}
          placeholder={t("@legalos.matters.detail.notes.placeholder")}
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
      {data.notes.length === 0 ? (
        <EmptyState
          icon={
            <Icon icon={ChatBubbleLeftRightIcon} size="lg" color="secondary" />
          }
          title={t("@legalos.matters.detail.notes.emptyTitle")}
          description={t("@legalos.matters.detail.notes.emptyDescription")}
        />
      ) : (
        <List hasDividers density="compact">
          {data.notes.map((entry) => (
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
    </Panel>
  );
}

function DocumentsTab({ data }: TabProps) {
  const { formatDate, formatBytes } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const memberName = useMemberName();

  return (
    <Panel
      title={t("@legalos.matters.detail.documents.heading")}
      action={
        <Link href="/documents">
          {t("@legalos.matters.detail.documents.allDocuments")}
        </Link>
      }
    >
      {data.documents.length === 0 ? (
        <EmptyState
          icon={<Icon icon={DocumentTextIcon} size="lg" color="secondary" />}
          title={t("@legalos.matters.detail.documents.emptyTitle")}
          description={t("@legalos.matters.detail.documents.emptyDescription")}
        />
      ) : (
        <List hasDividers density="compact">
          {data.documents.map((doc) => (
            <ListItem
              key={doc.id}
              label={doc.name}
              href={`/documents/${doc.id}`}
              description={t("@legalos.matters.detail.metaNameDate", {
                name: memberName(doc.uploaded_by),
                date: formatDate(doc.uploaded_at),
              })}
              startContent={
                <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
              }
              endContent={
                <HStack gap={3} vAlign="center">
                  <Badge variant="neutral" label={enumLabel(doc.status)} />
                  <Text type="supporting" color="secondary">
                    {doc.size_bytes ? formatBytes(doc.size_bytes) : "—"}
                  </Text>
                </HStack>
              }
            />
          ))}
        </List>
      )}
    </Panel>
  );
}

function NewMatterTaskDialog({
  isOpen,
  onOpenChange,
  matterId,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  matterId: number;
  onCreated: () => void;
}) {
  const t = useTranslator();
  const { practice, members } = useOrg();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<ISODateString | undefined>(undefined);
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!practice || !title.trim() || !assignee) return;
    setSaving(true);
    setError(null);
    try {
      // matter_id is fixed, not offered: the task is being created from
      // inside a case, so asking which case it belongs to would be asking a
      // question already answered.
      await practice.tasks.create({
        title: title.trim(),
        assignee,
        matter_id: matterId,
        due_date: dueDate ?? null,
        priority,
      });
      setTitle("");
      setDueDate(undefined);
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(
        exc instanceof Error ? exc.message : t("@legalos.matters.detail.errors.task"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matters.detail.tasks.newTask")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <TextInput
                label={t("@legalos.matters.detail.tasks.titleLabel")}
                value={title}
                onChange={setTitle}
                isRequired
              />
              <Selector
                label={t("@legalos.matters.detail.tasks.assigneeLabel")}
                value={assignee}
                onChange={setAssignee}
                isRequired
                hasClear
                options={members.map((m) => ({
                  value: m.clerk_user_id,
                  label: m.display_name ?? m.clerk_user_id,
                }))}
              />
              <HStack gap={3}>
                <DateInput
                  label={t("@legalos.matters.detail.tasks.dueLabel")}
                  value={dueDate}
                  onChange={setDueDate}
                />
                <Selector
                  label={t("@legalos.matters.detail.tasks.priorityLabel")}
                  value={priority}
                  onChange={(v) => setPriority(v ?? "medium")}
                  options={[
                    { value: "low", label: t("@legalos.enum.low") },
                    { value: "medium", label: t("@legalos.enum.medium") },
                    { value: "high", label: t("@legalos.enum.high") },
                  ]}
                />
              </HStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matters.dialog.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                {t("@legalos.matters.dialog.cancel")}
              </Button>
              <Button
                label={t("@legalos.matters.detail.tasks.create")}
                variant="primary"
                isDisabled={saving || !title.trim() || !assignee}
                onClick={submit}
              >
                {t("@legalos.matters.detail.tasks.create")}
              </Button>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

function TasksTab({ data, reload, onError }: TabProps) {
  const { formatDate } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const { practice } = useOrg();
  const [isNewOpen, setIsNewOpen] = useState(false);

  async function toggleTask(taskId: number, done: boolean) {
    if (!practice) return;
    try {
      await practice.tasks.update(taskId, { status: done ? "done" : "todo" });
      reload();
    } catch (exc) {
      onError(
        exc instanceof Error
          ? exc.message
          : t("@legalos.matters.detail.errors.task"),
      );
    }
  }

  return (
    <Panel
      title={t("@legalos.matters.detail.tasks.heading")}
      action={
        <HStack gap={3} vAlign="center">
          <Link href="/tasks">{t("@legalos.matters.detail.tasks.allTasks")}</Link>
          <Button
            label={t("@legalos.matters.detail.tasks.newTask")}
            variant="secondary"
            size="sm"
            onClick={() => setIsNewOpen(true)}
          >
            {t("@legalos.matters.detail.tasks.newTask")}
          </Button>
        </HStack>
      }
    >
      <NewMatterTaskDialog
        isOpen={isNewOpen}
        onOpenChange={setIsNewOpen}
        matterId={data.matter.id}
        onCreated={reload}
      />
      {data.tasks.length === 0 ? (
        <EmptyState
          icon={<Icon icon={CheckCircleIcon} size="lg" color="secondary" />}
          title={t("@legalos.matters.detail.tasks.emptyTitle")}
          description={t("@legalos.matters.detail.tasks.emptyDescription")}
        />
      ) : (
        <List hasDividers density="compact">
          {data.tasks.map((task) => {
            const done = task.status === "done";
            const overdue = !done && daysUntil(task.due_date) < 0;
            return (
              <ListItem
                key={task.id}
                label={task.title}
                description={
                  task.due_date
                    ? t("@legalos.matters.detail.tasks.dueDate", {
                        name: memberName(task.assignee),
                        date: formatDate(task.due_date),
                      })
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
                        label={t("@legalos.matters.detail.tasks.overdue")}
                      />
                    )}
                    <Button
                      label={
                        done
                          ? t("@legalos.matters.detail.tasks.reopen")
                          : t("@legalos.matters.detail.tasks.markDone")
                      }
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTask(task.id, !done)}
                    />
                  </HStack>
                }
              />
            );
          })}
        </List>
      )}
    </Panel>
  );
}

function TimelineTab({ data }: TabProps) {
  const { formatDate } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();

  return (
    <Panel title={t("@legalos.matters.detail.timeline.heading")}>
      {data.timeline.length === 0 ? (
        <EmptyState
          icon={<Icon icon={DocumentTextIcon} size="lg" color="secondary" />}
          title={t("@legalos.matters.detail.timeline.emptyTitle")}
          description={t("@legalos.matters.detail.timeline.emptyDescription")}
        />
      ) : (
        <List hasDividers density="compact">
          {data.timeline.map((event) => (
            <ListItem
              key={event.id}
              label={event.label}
              description={event.detail ?? undefined}
              endContent={
                <HStack gap={3} vAlign="center">
                  <Badge variant="neutral" label={enumLabel(event.kind)} />
                  <Text type="supporting" color="secondary">
                    {formatDate(event.event_date)}
                  </Text>
                </HStack>
              }
            />
          ))}
        </List>
      )}
    </Panel>
  );
}
