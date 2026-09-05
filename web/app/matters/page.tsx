"use client";

/**
 * Matters page (T-053 / Wave 2).
 *
 * This route lists legal matters: filtering by type, status, and query,
 * creating new matters, and presenting court/deadline distinction marks.
 *
 * All state, hooks, and practice contract bindings are preserved verbatim.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";
import { memberLabel, useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { MatterStatusMark, MatterTypeBadge } from "@/components/Distinction";
import {
  daysUntil,
  todayIso,
  type ISODateString,
  type MatterStatus,
  type MatterType,
  MATTER_TYPES,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";

interface MatterRow extends Record<string, unknown> {
  id: number;
  name: string;
  clientName: string;
  matter_type: MatterType;
  status: MatterStatus;
  responsibleName: string;
  deadlineLabel: string | null;
  deadlineDate: string | null;
}

const MATTER_TYPE_KEY = (type: MatterType) => `@legalos.enum.${type}`;

export default function MattersPage() {
  const { formatDate } = useFormat();
  const { practice } = useOrg();
  const memberName = useMemberName();
  const t = useTranslator();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);

  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const resource = useResource(
    (api) =>
      api.matters.list({
        q: debouncedQuery || undefined,
        matter_type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    [debouncedQuery, typeFilter, statusFilter],
  );

  const rows = useMemo<MatterRow[]>(
    () =>
      (resource.data ?? []).map((matter) => ({
        id: matter.id,
        name: matter.name,
        clientName: matter.client_name,
        matter_type: matter.matter_type,
        status: matter.status,
        responsibleName: memberName(matter.responsible_user),
        deadlineLabel: matter.next_deadline?.label ?? null,
        deadlineDate: matter.next_deadline?.due_date ?? null,
      })),
    [resource.data, memberName],
  );

  const anyFilter = query !== "" || typeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {t("@legalos.matters.heading")}
            </h1>
            <span className="text-xs font-medium" style={{ color: "var(--text2)" }}>
              {t("@legalos.matters.count", { count: rows.length })}
            </span>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsCreating(true)}
            disabled={!practice}
            startIcon={<Icon name="add" size={16} />}
          >
            {t("@legalos.matters.newMatter")}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-72">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("@legalos.matters.list.search.placeholder")}
              startIcon={<Icon name="search" size={16} />}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value || "all")}
              options={[
                { value: "all", label: t("@legalos.matters.list.filter.allTypes") },
                ...MATTER_TYPES.map((type) => ({
                  value: type,
                  label: t(MATTER_TYPE_KEY(type)),
                })),
              ]}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value || "all")}
              options={[
                { value: "all", label: t("@legalos.matters.list.filter.allStatuses") },
                { value: "active", label: t("@legalos.matters.status.active") },
                { value: "on_hold", label: t("@legalos.matters.status.onHold") },
                { value: "closed", label: t("@legalos.matters.status.closed") },
              ]}
            />
          </div>
          {anyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
            >
              {t("@legalos.matters.list.clearFilters")}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <DataView resource={resource} loadingLabel={t("@legalos.matters.list.loading")}>
        {() =>
          rows.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("@legalos.matters.list.table.matter")}</TableHead>
                    <TableHead>{t("@legalos.matters.field.client")}</TableHead>
                    <TableHead>{t("@legalos.matters.field.type")}</TableHead>
                    <TableHead>{t("@legalos.matters.field.responsible")}</TableHead>
                    <TableHead>{t("@legalos.matters.field.nextDeadline")}</TableHead>
                    <TableHead>{t("@legalos.matters.field.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={`/matters/${row.id}`}
                          className="font-semibold text-xs hover:underline line-clamp-2"
                          style={{ color: "var(--primary)" }}
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs line-clamp-2" style={{ color: "var(--text)" }}>
                          {row.clientName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <MatterTypeBadge type={row.matter_type} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            title={row.responsibleName}
                            className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0"
                            style={{
                              backgroundColor: "var(--surface3)",
                              borderColor: "var(--border)",
                              color: "var(--text2)",
                            }}
                          >
                            {row.responsibleName ? row.responsibleName.slice(0, 2).toUpperCase() : "?"}
                          </div>
                          <span className="text-xs truncate max-w-[140px]" style={{ color: "var(--text)" }}>
                            {row.responsibleName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          if (!row.deadlineDate) {
                            return (
                              <span className="text-xs" style={{ color: "var(--text3)" }}>
                                {t("@legalos.matters.list.noDeadline")}
                              </span>
                            );
                          }
                          const days = daysUntil(row.deadlineDate);
                          const overdue = days < 0;
                          const deadlineText = t(
                            overdue
                              ? "@legalos.matters.list.deadlineBadgeOverdue"
                              : "@legalos.matters.list.deadlineBadge",
                            { date: formatDate(row.deadlineDate), days: Math.abs(days) },
                          );
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs line-clamp-1" style={{ color: "var(--text)" }}>
                                {row.deadlineLabel}
                              </span>
                              {overdue ? (
                                <Badge color="danger" variant="soft">
                                  {deadlineText}
                                </Badge>
                              ) : (
                                <span className="text-[11px]" style={{ color: "var(--text2)" }}>
                                  {deadlineText}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <MatterStatusMark status={row.status} form="dot" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState
              icon="work_outline"
              title={t(
                anyFilter
                  ? "@legalos.matters.list.emptyTitle"
                  : "@legalos.distinction.matters.emptyTitle",
              )}
              description={t(
                anyFilter
                  ? "@legalos.matters.list.emptyDescription"
                  : "@legalos.distinction.matters.emptyDescription",
              )}
              action={
                anyFilter ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setTypeFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    {t("@legalos.matters.list.clearFilters")}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    startIcon={<Icon name="add" size={16} />}
                    onClick={() => setIsCreating(true)}
                  >
                    {t("@legalos.distinction.matters.openFirst")}
                  </Button>
                )
              }
            />
          )
        }
      </DataView>

      <NewMatterDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onCreated={resource.reload}
      />
    </div>
  );
}

function NewMatterDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { practice, members } = useOrg();
  const t = useTranslator();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [matterType, setMatterType] = useState<MatterType>("civil");
  const [billingType, setBillingType] = useState("hourly");
  const [responsible, setResponsible] = useState<string | null>(null);
  const [staff, setStaff] = useState<string[]>([]);
  const [openedDate, setOpenedDate] = useState<ISODateString>(todayIso);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clients = useResource(
    (api) => (isOpen ? api.clients.list() : Promise.resolve([])),
    [isOpen],
  );

  async function submit() {
    if (!practice || !name.trim() || !clientId || !responsible) return;
    setSaving(true);
    setError(null);
    try {
      await practice.matters.create({
        name: name.trim(),
        client_id: Number(clientId),
        matter_type: matterType,
        billing_type: billingType,
        responsible_user: responsible,
        staff: Array.from(new Set([responsible, ...staff])),
        opened_date: openedDate,
        description,
      });
      setName("");
      setDescription("");
      setClientId(null);
      setStaff([]);
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.matters.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(name.trim() && clientId && responsible && openedDate);
  const availableStaff = members.filter((m) => m.clerk_user_id !== responsible);

  const toggleStaffMember = (userId: string) => {
    setStaff((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={540}>
      <DialogHeader
        title={t("@legalos.matters.newMatter")}
        onOpenChange={onOpenChange}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <DialogContent>
          <div className="flex flex-col gap-4">
            <InlineError message={error} onDismiss={() => setError(null)} />
            <Input
              label={t("@legalos.matters.dialog.nameLabel")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("@legalos.matters.dialog.namePlaceholder")}
              required
            />
            <Select
              label={t("@legalos.matters.field.client")}
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value || null)}
              required
              options={[
                {
                  value: "",
                  label: clients.loading
                    ? t("@legalos.matters.dialog.clientsLoading")
                    : t("@legalos.matters.dialog.selectClient"),
                },
                ...(clients.data ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.name,
                })),
              ]}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label={t("@legalos.matters.field.type")}
                value={matterType}
                onChange={(e) => setMatterType((e.target.value as MatterType) ?? "civil")}
                options={MATTER_TYPES.map((type) => ({
                  value: type,
                  label: t(MATTER_TYPE_KEY(type)),
                }))}
              />
              <Select
                label={t("@legalos.matters.field.billing")}
                value={billingType}
                onChange={(e) => setBillingType(e.target.value || "hourly")}
                options={[
                  { value: "hourly", label: t("@legalos.matters.billing.hourly") },
                  { value: "fixed_fee", label: t("@legalos.matters.billing.fixedFee") },
                  { value: "retainer", label: t("@legalos.matters.billing.retainer") },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label={t("@legalos.matters.field.responsible")}
                value={responsible ?? ""}
                onChange={(e) => setResponsible(e.target.value || null)}
                required
                options={[
                  { value: "", label: t("@legalos.matters.dialog.selectLawyer") },
                  ...members.map((m) => ({
                    value: m.clerk_user_id,
                    label: memberLabel(m),
                  })),
                ]}
              />
              <Input
                type="date"
                label={t("@legalos.matters.field.opened")}
                value={openedDate}
                onChange={(e) => setOpenedDate((e.target.value || todayIso) as ISODateString)}
                required
              />
            </div>

            {/* Staff Multi-Select (تعددية الفلترة واختيار المعاونين) */}
            {availableStaff.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                  {t("@legalos.matters.field.staff")}
                </label>
                <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                  {t("@legalos.matters.field.staffHint")}
                </span>
                <div
                  className="flex flex-col gap-1 p-2 rounded-lg border max-h-32 overflow-y-auto"
                  style={{
                    backgroundColor: "var(--surface2)",
                    borderColor: "var(--border)",
                    borderRadius: "var(--rs)",
                  }}
                >
                  {availableStaff.map((m) => {
                    const isChecked = staff.includes(m.clerk_user_id);
                    return (
                      <label
                        key={m.clerk_user_id}
                        className="flex items-center gap-2 p-1 text-xs rounded hover:bg-[var(--surface3)] cursor-pointer select-none"
                        style={{ color: "var(--text)" }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleStaffMember(m.clerk_user_id)}
                        />
                        <span>{memberLabel(m)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                {t("@legalos.matters.field.description")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs outline-none transition-all resize-y border"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--rs)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              {t("@legalos.matters.dialog.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving || !canSave}
            >
              {t("@legalos.matters.dialog.submit")}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

