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

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { ApiError } from "@/lib/api";
import { memberLabel, useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { MatterStatusMark, MatterTypeBadge } from "@/components/Distinction";
import { daysUntil } from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import {
  Panel,
  type TabProps,
  type WorkspaceData,
} from "@/components/matter/shared";
import { DashboardTab } from "@/components/matter/DashboardTab";
import { FinancialStrip } from "@/components/matter/FinancialStrip";
import { ActivitiesTab } from "@/components/matter/ActivitiesTab";
import { CalendarTab } from "@/components/matter/CalendarTab";
import { CommunicationsTab } from "@/components/matter/CommunicationsTab";
import { CustomFieldsTab } from "@/components/matter/CustomFieldsTab";
import { BillsTab, TransactionsTab } from "@/components/matter/FinanceTabs";

/**
 * The seven tabs that stay on the bar, and the four behind the overflow menu.
 *
 * All eleven were laid out in one row. At the layout floor that row is wider
 * than the content region, so the last of them ("الجدول الزمني") was cut off
 * mid-word with nothing to say the bar continued — a tab that exists and
 * cannot be read or reached. Which four moved is a frequency judgement: the
 * ones a lawyer opens a file to do are on the bar, and the ones consulted
 * occasionally are one click further away rather than invisible.
 */
const TABS = [
  { value: "dashboard", labelKey: "@legalos.matterWorkspace.tab.dashboard" },
  { value: "activities", labelKey: "@legalos.matterWorkspace.tab.activities" },
  { value: "calendar", labelKey: "@legalos.matterWorkspace.tab.calendar" },
  { value: "communications", labelKey: "@legalos.matterWorkspace.tab.communications" },
  { value: "documents", labelKey: "@legalos.matters.detail.tab.documents" },
  { value: "tasks", labelKey: "@legalos.matters.detail.tab.tasks" },
  { value: "bills", labelKey: "@legalos.matterWorkspace.tab.bills" },
] as const;

const OVERFLOW_TABS = [
  { value: "notes", labelKey: "@legalos.matters.detail.tab.notes" },
  { value: "customFields", labelKey: "@legalos.matterWorkspace.tab.customFields" },
  { value: "transactions", labelKey: "@legalos.matterWorkspace.tab.transactions" },
  { value: "timeline", labelKey: "@legalos.matters.detail.tab.timeline" },
] as const;

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

        const isOverflowActive = OVERFLOW_TABS.some((ot) => ot.value === tab);

        return (
          <div className="flex flex-col min-h-screen gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
            {/* Header section */}
            <div className="flex flex-col gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
              <Link
                href="/matters"
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline max-w-fit"
                style={{ color: "var(--text2)" }}
              >
                <Icon name="arrow_back" size={16} />
                <span>{t("@legalos.matters.heading")}</span>
              </Link>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: "var(--text)" }}>
                      {matter.matter_number}
                    </h1>
                    <MatterTypeBadge type={matter.matter_type} />
                    <MatterStatusMark status={matter.status} />
                  </div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    <span>{matter.name}</span>
                    <span>{" · "}</span>
                    <Link
                      href={`/clients/${matter.client_id}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--primary)" }}
                    >
                      {matter.client_name}
                    </Link>
                    <span>{" · "}</span>
                    <span>
                      {t("@legalos.distinction.matters.openedOn", {
                        date: formatDate(matter.opened_date),
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-36">
                    <Select
                      value={matter.status}
                      onChange={(e) => setStatus(e.target.value)}
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
                  </div>
                  <Button
                    variant="secondary"
                    onClick={duplicate}
                  >
                    {t("@legalos.matterWorkspace.action.duplicate")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setTab("communications")}
                  >
                    {t("@legalos.matterWorkspace.action.share")}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setEditOpen(true)}
                  >
                    {t("@legalos.matterWorkspace.action.edit")}
                  </Button>
                </div>
              </div>

              {/* Stays on screen whatever tab is open (spec §2, س-٢). */}
              <FinancialStrip
                data={data}
                onQuickBill={() => {
                  setTab("bills");
                  setQuickBillOpen(true);
                }}
                onOpenBills={() => setTab("bills")}
                onRecordDeposit={() => {
                  setTab("transactions");
                  setRecordFundsOpen(true);
                }}
              />

              {/* 11 Tabs Bar */}
              <div
                className="flex items-center gap-1 border-b overflow-x-auto pt-2"
                style={{ borderColor: "var(--border)" }}
              >
                {TABS.map((tabDef) => {
                  const isActive = tab === tabDef.value;
                  return (
                    <button
                      key={tabDef.value}
                      type="button"
                      onClick={() => setTab(tabDef.value)}
                      className="px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5"
                      style={{
                        borderColor: isActive ? "var(--primary)" : "transparent",
                        color: isActive ? "var(--primary)" : "var(--text2)",
                        backgroundColor: "transparent",
                      }}
                    >
                      <span>{t(tabDef.labelKey)}</span>
                      {tabDef.value === "tasks" && openTasks.length > 0 && (
                        <Badge color="neutral" variant="soft" size="sm">
                          {String(openTasks.length)}
                        </Badge>
                      )}
                      {tabDef.value === "communications" && unread > 0 && (
                        <Badge color="danger" variant="soft" size="sm">
                          {String(unread)}
                        </Badge>
                      )}
                    </button>
                  );
                })}

                {/* Overflow tabs menu */}
                <div className="relative inline-flex items-center ms-auto">
                  <div className="w-36">
                    <Select
                      value={isOverflowActive ? tab : ""}
                      onChange={(e) => {
                        if (e.target.value) setTab(e.target.value);
                      }}
                      options={[
                        {
                          value: "",
                          label: isOverflowActive
                            ? t(OVERFLOW_TABS.find((ot) => ot.value === tab)?.labelKey || "@legalos.matterWorkspace.tab.more")
                            : t("@legalos.matterWorkspace.tab.more"),
                        },
                        ...OVERFLOW_TABS.map((ot) => ({
                          value: ot.value,
                          label: t(ot.labelKey),
                        })),
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content section */}
            <div className="flex flex-col gap-6 flex-1">
              <InlineError message={error} onDismiss={() => setError(null)} />

              {tab === "dashboard" && <DashboardTab {...tabProps} />}

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
            </div>
          </div>
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
      <DialogHeader
        title={t("@legalos.matterWorkspace.action.edit")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Input
                label={t("@legalos.matterWorkspace.details.matterNumber")}
                value={matterNumber}
                onChange={(e) => setMatterNumber(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label={t("@legalos.matters.list.table.matter")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <Textarea
            label={t("@legalos.matters.field.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={t("@legalos.matters.field.responsible")}
              value={responsible}
              onChange={(e) => e.target.value && setResponsible(e.target.value)}
              options={members.map((member) => ({
                value: member.clerk_user_id,
                label: memberLabel(member),
              }))}
            />
            <Select
              label={t("@legalos.matters.field.billing")}
              value={billingType}
              onChange={(e) => e.target.value && setBillingType(e.target.value)}
              options={(["hourly", "fixed_fee", "retainer"] as const).map(
                (value) => ({ value, label: enumLabel(value) }),
              )}
            />
          </div>
          <Input
            label={t("@legalos.matterWorkspace.details.tags")}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={!name.trim() || !matterNumber.trim()}
          onClick={submit}
        >
          {saving
            ? t("@legalos.matterWorkspace.action.saving")
            : t("@legalos.matterWorkspace.action.save")}
        </Button>
      </DialogFooter>
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
      <div className="flex flex-col gap-3">
        <Textarea
          label={t("@legalos.matters.detail.notes.addLabel")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={t("@legalos.matters.detail.notes.placeholder")}
        />
        <div className="flex justify-end">
          <Button
            variant="primary"
            loading={saving}
            disabled={!note.trim()}
            onClick={addNote}
          >
            {saving
              ? t("@legalos.matters.savingEllipsis")
              : t("@legalos.matters.detail.notes.addButton")}
          </Button>
        </div>
      </div>
      {data.notes.length === 0 ? (
        <EmptyState
          icon={<Icon name="chat" size={24} />}
          title={t("@legalos.matters.detail.notes.emptyTitle")}
          description={t("@legalos.matters.detail.notes.emptyDescription")}
        />
      ) : (
        <div
          className="flex flex-col rounded-md border divide-y overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {data.notes.map((entry) => {
            const author = memberName(entry.author);
            return (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 p-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    title={author}
                    className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0 mt-0.5"
                    style={{
                      backgroundColor: "var(--surface3)",
                      borderColor: "var(--border)",
                      color: "var(--text2)",
                    }}
                  >
                    {author ? author.slice(0, 2).toUpperCase() : "?"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                      {author}
                    </span>
                    <p className="text-xs m-0 mt-1 leading-relaxed" style={{ color: "var(--text2)" }}>
                      {entry.content}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] shrink-0" style={{ color: "var(--text3)" }}>
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
            );
          })}
        </div>
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
        <Link
          href="/documents"
          className="text-xs font-semibold hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {t("@legalos.matters.detail.documents.allDocuments")}
        </Link>
      }
    >
      {data.documents.length === 0 ? (
        <EmptyState
          icon={<Icon name="description" size={24} />}
          title={t("@legalos.matters.detail.documents.emptyTitle")}
          description={t("@legalos.matters.detail.documents.emptyDescription")}
        />
      ) : (
        <div
          className="flex flex-col rounded-md border divide-y overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {data.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="description" size={16} style={{ color: "var(--text3)" }} />
                <div className="flex flex-col min-w-0">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="text-xs font-semibold hover:underline truncate"
                    style={{ color: "var(--primary)" }}
                  >
                    {doc.name}
                  </Link>
                  <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                    {t("@legalos.matters.detail.metaNameDate", {
                      name: memberName(doc.uploaded_by),
                      date: formatDate(doc.uploaded_at),
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge color="neutral" variant="soft">
                  {enumLabel(doc.status)}
                </Badge>
                <span className="text-xs" style={{ color: "var(--text3)" }}>
                  {/* Only for a record that actually holds a file; the
                    * seeded ones carry a size with nothing behind it. */}
                  {doc.storage_key && doc.size_bytes
                    ? formatBytes(doc.size_bytes)
                    : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
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
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
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
      <DialogHeader
        title={t("@legalos.matters.detail.tasks.newTask")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <InlineError message={error} onDismiss={() => setError(null)} />
          <Input
            label={t("@legalos.matters.detail.tasks.titleLabel")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Select
            label={t("@legalos.matters.detail.tasks.assigneeLabel")}
            value={assignee ?? ""}
            onChange={(e) => setAssignee(e.target.value || null)}
            required
            options={[
              { value: "", label: "—" },
              ...members.map((m) => ({
                value: m.clerk_user_id,
                label: memberLabel(m),
              })),
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label={t("@legalos.matters.detail.tasks.dueLabel")}
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value || undefined)}
            />
            <Select
              label={t("@legalos.matters.detail.tasks.priorityLabel")}
              value={priority}
              onChange={(e) => setPriority(e.target.value || "medium")}
              options={[
                { value: "low", label: t("@legalos.enum.low") },
                { value: "medium", label: t("@legalos.enum.medium") },
                { value: "high", label: t("@legalos.enum.high") },
              ]}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matters.dialog.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={!title.trim() || !assignee}
          onClick={submit}
        >
          {t("@legalos.matters.detail.tasks.create")}
        </Button>
      </DialogFooter>
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
        <div className="flex items-center gap-3">
          <Link
            href="/tasks"
            className="text-xs font-semibold hover:underline"
            style={{ color: "var(--primary)" }}
          >
            {t("@legalos.matters.detail.tasks.allTasks")}
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsNewOpen(true)}
          >
            {t("@legalos.matters.detail.tasks.newTask")}
          </Button>
        </div>
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
          icon={<Icon name="check_circle" size={24} />}
          title={t("@legalos.matters.detail.tasks.emptyTitle")}
          description={t("@legalos.matters.detail.tasks.emptyDescription")}
        />
      ) : (
        <div
          className="flex flex-col rounded-md border divide-y overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {data.tasks.map((task) => {
            const done = task.status === "done";
            const overdue = !done && daysUntil(task.due_date) < 0;
            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    name="check_circle"
                    size={16}
                    style={{
                      color: done ? "var(--success)" : "var(--text3)",
                    }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-xs font-semibold truncate"
                      style={{
                        color: "var(--text)",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {task.title}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                      {task.due_date
                        ? t("@legalos.matters.detail.tasks.dueDate", {
                            name: memberName(task.assignee),
                            date: formatDate(task.due_date),
                          })
                        : memberName(task.assignee)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {overdue && (
                    <Badge color="danger" variant="soft">
                      {t("@legalos.matters.detail.tasks.overdue")}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTask(task.id, !done)}
                  >
                    {done
                      ? t("@legalos.matters.detail.tasks.reopen")
                      : t("@legalos.matters.detail.tasks.markDone")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
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
          icon={<Icon name="schedule" size={24} />}
          title={t("@legalos.matters.detail.timeline.emptyTitle")}
          description={t("@legalos.matters.detail.timeline.emptyDescription")}
        />
      ) : (
        <div
          className="flex flex-col rounded-md border divide-y overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {data.timeline.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                  {event.label}
                </span>
                {event.detail && (
                  <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                    {event.detail}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge color="neutral" variant="soft">
                  {enumLabel(event.kind)}
                </Badge>
                <span className="text-xs" style={{ color: "var(--text3)" }}>
                  {formatDate(event.event_date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
