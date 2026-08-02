"use client";

import { useMemo, useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Avatar } from "@astryxdesign/core/Avatar";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { PlusIcon, MagnifyingGlassIcon, BriefcaseIcon } from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  daysUntil,
  formatDate,
  todayIso,
  type ISODateString,
  type MatterStatus,
  type MatterType,
} from "@/lib/practice";

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

const MATTER_TYPES: MatterType[] = [
  "litigation",
  "corporate",
  "tax",
  "labour",
  "family_probate",
  "contract_review",
];

const STATUS_VARIANT: Record<MatterStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  on_hold: "warning",
  closed: "neutral",
};

const MATTER_STATUS_KEY: Record<MatterStatus, string> = {
  active: "@legalos.matters.status.active",
  on_hold: "@legalos.matters.status.onHold",
  closed: "@legalos.matters.status.closed",
};

const MATTER_TYPE_KEY: Record<MatterType, string> = {
  litigation: "@legalos.matters.type.litigation",
  corporate: "@legalos.matters.type.corporate",
  tax: "@legalos.matters.type.tax",
  labour: "@legalos.matters.type.labour",
  family_probate: "@legalos.matters.type.familyProbate",
  contract_review: "@legalos.matters.type.contractReview",
};

export default function MattersPage() {
  const { practice } = useOrg();
  const memberName = useMemberName();
  const t = useTranslator();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);

  const resource = useResource(
    (api) =>
      api.matters.list({
        q: query.trim() || undefined,
        matter_type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    [query, typeFilter, statusFilter],
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

  const columns: TableColumn<MatterRow>[] = [
    {
      key: "name",
      header: t("@legalos.matters.list.table.matter"),
      width: proportional(2.8),
      renderCell: (row) => (
        <Link href={`/matters/${row.id}`}>
          <Text type="body" weight="semibold" maxLines={2}>
            {row.name}
          </Text>
        </Link>
      ),
    },
    {
      key: "clientName",
      header: t("@legalos.matters.field.client"),
      width: proportional(1.5),
      renderCell: (row) => (
        <Text type="body" maxLines={2}>
          {row.clientName}
        </Text>
      ),
    },
    {
      key: "matter_type",
      header: t("@legalos.matters.field.type"),
      width: pixel(140),
      renderCell: (row) => <Text type="body">{t(MATTER_TYPE_KEY[row.matter_type])}</Text>,
    },
    {
      key: "responsibleName",
      header: t("@legalos.matters.field.responsible"),
      width: pixel(200),
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Avatar name={row.responsibleName} size="sm" tooltip={false} />
          <Text type="body" maxLines={1}>
            {row.responsibleName}
          </Text>
        </HStack>
      ),
    },
    {
      key: "deadlineLabel",
      header: t("@legalos.matters.field.nextDeadline"),
      width: proportional(1.6),
      renderCell: (row) => {
        if (!row.deadlineDate) {
          return (
            <Text type="body" color="secondary">
              {t("@legalos.matters.list.noDeadline")}
            </Text>
          );
        }
        const days = daysUntil(row.deadlineDate);
        const overdue = days < 0;
        const deadlineText = t("@legalos.matters.list.deadlineBadge", {
          date: formatDate(row.deadlineDate),
          days,
        });
        return (
          <VStack gap={0}>
            <Text type="body" maxLines={2}>
              {row.deadlineLabel}
            </Text>
            {overdue ? (
              <Badge variant="error" label={deadlineText} />
            ) : (
              <Text type="supporting" color="secondary">
                {deadlineText}
              </Text>
            )}
          </VStack>
        );
      },
    },
    {
      key: "status",
      header: t("@legalos.matters.field.status"),
      width: pixel(110),
      // A pill on every row makes the column a block of colour and says
      // nothing: a dot plus the word is the same information at a whisper,
      // and it lines up with the other text columns instead of floating.
      renderCell: (row) => (
        <HStack gap={1.5} vAlign="center">
          <StatusDot
            variant={STATUS_VARIANT[row.status]}
            label={t(MATTER_STATUS_KEY[row.status])}
          />
          <Text type="body" color="secondary">
            {t(MATTER_STATUS_KEY[row.status])}
          </Text>
        </HStack>
      ),
    },
  ];

  return (
    <>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={0}>
            <VStack gap={4}>
              <HStack hAlign="between" vAlign="center">
                <VStack gap={1}>
                  <Heading level={2}>{t("@legalos.matters.heading")}</Heading>
                  <Text type="body" color="secondary">
                    {t("@legalos.matters.count", { count: rows.length })}
                  </Text>
                </VStack>
                <Button
                  label={t("@legalos.matters.newMatter")}
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsCreating(true)}
                  isDisabled={!practice}
                >
                  {t("@legalos.matters.newMatter")}
                </Button>
              </HStack>
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={t("@legalos.matters.list.search.label")}
                  isLabelHidden
                  value={query}
                  onChange={setQuery}
                  placeholder={t("@legalos.matters.list.search.placeholder")}
                  startIcon={MagnifyingGlassIcon}
                  width={320}
                />
                <Selector
                  label={t("@legalos.matters.field.type")}
                  isLabelHidden
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v ?? "all")}
                  options={[
                    { value: "all", label: t("@legalos.matters.list.filter.allTypes") },
                    ...MATTER_TYPES.map((type) => ({
                      value: type,
                      label: t(MATTER_TYPE_KEY[type]),
                    })),
                  ]}
                  width={180}
                />
                <Selector
                  label={t("@legalos.matters.field.status")}
                  isLabelHidden
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v ?? "all")}
                  options={[
                    { value: "all", label: t("@legalos.matters.list.filter.allStatuses") },
                    { value: "active", label: t("@legalos.matters.status.active") },
                    { value: "on_hold", label: t("@legalos.matters.status.onHold") },
                    { value: "closed", label: t("@legalos.matters.status.closed") },
                  ]}
                  width={160}
                />
              </HStack>
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent padding={0}>
            <DataView resource={resource} loadingLabel={t("@legalos.matters.list.loading")}>
              {() =>
                rows.length > 0 ? (
                  <Table<MatterRow> data={rows} columns={columns} idKey="id" hasHover />
                ) : (
                  <EmptyState
                    icon={<Icon icon={BriefcaseIcon} size="lg" color="secondary" />}
                    title={t("@legalos.matters.list.emptyTitle")}
                    description={t("@legalos.matters.list.emptyDescription")}
                    actions={
                      <Button
                        label={t("@legalos.matters.list.clearFilters")}
                        variant="secondary"
                        onClick={() => {
                          setQuery("");
                          setTypeFilter("all");
                          setStatusFilter("all");
                        }}
                      />
                    }
                  />
                )
              }
            </DataView>
          </LayoutContent>
        }
      />
      <NewMatterDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onCreated={resource.reload}
      />
    </>
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
  const [matterType, setMatterType] = useState<MatterType>("litigation");
  const [billingType, setBillingType] = useState("hourly");
  const [responsible, setResponsible] = useState<string | null>(null);
  const [openedDate, setOpenedDate] = useState<ISODateString>(todayIso);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only loaded while the dialog is open; the picker is the only thing that
  // needs the full client list.
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
        opened_date: openedDate,
        description,
      });
      setName("");
      setDescription("");
      setClientId(null);
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.matters.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(name.trim() && clientId && responsible && openedDate);

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={
          <DialogHeader title={t("@legalos.matters.newMatter")} onOpenChange={onOpenChange} />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <TextInput
                label={t("@legalos.matters.dialog.nameLabel")}
                value={name}
                onChange={setName}
                placeholder={t("@legalos.matters.dialog.namePlaceholder")}
                isRequired
              />
              <Selector
                label={t("@legalos.matters.field.client")}
                hasClear
                value={clientId}
                onChange={setClientId}
                isRequired
                placeholder={
                  clients.loading
                    ? t("@legalos.matters.dialog.clientsLoading")
                    : t("@legalos.matters.dialog.selectClient")
                }
                options={(clients.data ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              />
              <HStack gap={3}>
                <Selector
                  label={t("@legalos.matters.field.type")}
                  value={matterType}
                  onChange={(v) => setMatterType((v as MatterType) ?? "litigation")}
                  options={MATTER_TYPES.map((type) => ({
                    value: type,
                    label: t(MATTER_TYPE_KEY[type]),
                  }))}
                />
                <Selector
                  label={t("@legalos.matters.field.billing")}
                  value={billingType}
                  onChange={(v) => setBillingType(v ?? "hourly")}
                  options={[
                    { value: "hourly", label: t("@legalos.matters.billing.hourly") },
                    { value: "fixed_fee", label: t("@legalos.matters.billing.fixedFee") },
                    { value: "retainer", label: t("@legalos.matters.billing.retainer") },
                  ]}
                />
              </HStack>
              <HStack gap={3}>
                <Selector
                  label={t("@legalos.matters.field.responsible")}
                  hasClear
                  value={responsible}
                  onChange={setResponsible}
                  isRequired
                  placeholder={t("@legalos.matters.dialog.selectLawyer")}
                  options={members.map((m) => ({
                    value: m.clerk_user_id,
                    label: m.display_name ?? m.clerk_user_id,
                  }))}
                />
                <DateInput
                  label={t("@legalos.matters.field.opened")}
                  value={openedDate}
                  onChange={(v) => setOpenedDate(v ?? openedDate)}
                />
              </HStack>
              <TextArea
                label={t("@legalos.matters.field.description")}
                value={description}
                onChange={setDescription}
                rows={4}
              />
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
              />
              <Button
                label={saving ? t("@legalos.matters.savingEllipsis") : t("@legalos.matters.dialog.submit")}
                variant="primary"
                onClick={submit}
                isDisabled={saving || !canSave}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
