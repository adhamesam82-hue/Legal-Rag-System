"use client";

import { useMemo, useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
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
import { PlusIcon, MagnifyingGlassIcon, BriefcaseIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  daysUntil,
  formatDate,
  label,
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
  hasCase: boolean;
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

export default function MattersPage() {
  const { practice } = useOrg();
  const memberName = useMemberName();
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
        hasCase: matter.case_id !== null,
        deadlineLabel: matter.next_deadline?.label ?? null,
        deadlineDate: matter.next_deadline?.due_date ?? null,
      })),
    [resource.data, memberName],
  );

  const columns: TableColumn<MatterRow>[] = [
    {
      key: "name",
      header: "Matter",
      width: proportional(2.4),
      renderCell: (row) => (
        <Link href={`/matters/${row.id}`}>
          <HStack gap={1.5} vAlign="center">
            {row.hasCase && <Icon icon={ScaleIcon} size="xsm" color="secondary" />}
            <Text type="body" weight="semibold">
              {row.name}
            </Text>
          </HStack>
        </Link>
      ),
    },
    {
      key: "clientName",
      header: "Client",
      width: proportional(1.6),
      renderCell: (row) => <Text type="body">{row.clientName}</Text>,
    },
    {
      key: "matter_type",
      header: "Type",
      width: pixel(150),
      renderCell: (row) => <Text type="body">{label(row.matter_type)}</Text>,
    },
    {
      key: "responsibleName",
      header: "Responsible",
      width: pixel(170),
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Avatar name={row.responsibleName} size="sm" tooltip={false} />
          <Text type="body">{row.responsibleName}</Text>
        </HStack>
      ),
    },
    {
      key: "deadlineLabel",
      header: "Next deadline",
      width: proportional(1.6),
      renderCell: (row) => {
        if (!row.deadlineDate) {
          return (
            <Text type="body" color="secondary">
              None scheduled
            </Text>
          );
        }
        const days = daysUntil(row.deadlineDate);
        const urgent = days <= 3;
        return (
          <VStack gap={0}>
            <Text type="body" maxLines={1}>
              {row.deadlineLabel}
            </Text>
            {urgent ? (
              <Badge
                variant={days < 0 ? "error" : "warning"}
                label={`${formatDate(row.deadlineDate)} · ${days}d`}
              />
            ) : (
              <Text type="supporting" color="secondary">
                {formatDate(row.deadlineDate)} · {days}d
              </Text>
            )}
          </VStack>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: pixel(110),
      renderCell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status]} label={label(row.status)} />
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
                  <Heading level={2}>Matters</Heading>
                  <Text type="body" color="secondary">
                    {rows.length} {rows.length === 1 ? "matter" : "matters"}
                  </Text>
                </VStack>
                <Button
                  label="New matter"
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsCreating(true)}
                  isDisabled={!practice}
                >
                  New matter
                </Button>
              </HStack>
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label="Search matters"
                  isLabelHidden
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by matter or client"
                  startIcon={MagnifyingGlassIcon}
                  width={320}
                />
                <Selector
                  label="Type"
                  isLabelHidden
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v ?? "all")}
                  options={[
                    { value: "all", label: "All types" },
                    ...MATTER_TYPES.map((t) => ({ value: t, label: label(t) })),
                  ]}
                  width={180}
                />
                <Selector
                  label="Status"
                  isLabelHidden
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v ?? "all")}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "active", label: "Active" },
                    { value: "on_hold", label: "On Hold" },
                    { value: "closed", label: "Closed" },
                  ]}
                  width={160}
                />
              </HStack>
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent padding={0}>
            <DataView resource={resource} loadingLabel="Loading matters…">
              {() =>
                rows.length > 0 ? (
                  <Table<MatterRow> data={rows} columns={columns} idKey="id" hasHover />
                ) : (
                  <EmptyState
                    icon={<Icon icon={BriefcaseIcon} size="lg" color="secondary" />}
                    title="No matters match your filters"
                    description="Try a different search term, or open a new matter."
                    actions={
                      <Button
                        label="Clear filters"
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
      setError(exc instanceof Error ? exc.message : "Could not open this matter.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(name.trim() && clientId && responsible && openedDate);

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title="New matter" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <TextInput
                label="Matter name"
                value={name}
                onChange={setName}
                placeholder="Nabil v. Nile Trading Co."
                isRequired
              />
              <Selector
                label="Client"
                hasClear
                value={clientId}
                onChange={setClientId}
                isRequired
                placeholder={
                  clients.loading ? "Loading clients…" : "Select a client"
                }
                options={(clients.data ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              />
              <HStack gap={3}>
                <Selector
                  label="Type"
                  value={matterType}
                  onChange={(v) => setMatterType((v as MatterType) ?? "litigation")}
                  options={MATTER_TYPES.map((t) => ({ value: t, label: label(t) }))}
                />
                <Selector
                  label="Billing"
                  value={billingType}
                  onChange={(v) => setBillingType(v ?? "hourly")}
                  options={[
                    { value: "hourly", label: "Hourly" },
                    { value: "fixed_fee", label: "Fixed Fee" },
                    { value: "retainer", label: "Retainer" },
                  ]}
                />
              </HStack>
              <HStack gap={3}>
                <Selector
                  label="Responsible"
                  hasClear
                  value={responsible}
                  onChange={setResponsible}
                  isRequired
                  placeholder="Select a lawyer"
                  options={members.map((m) => ({
                    value: m.clerk_user_id,
                    label: m.display_name ?? m.clerk_user_id,
                  }))}
                />
                <DateInput
                  label="Opened"
                  value={openedDate}
                  onChange={(v) => setOpenedDate(v ?? openedDate)}
                />
              </HStack>
              <TextArea
                label="Description"
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
                label="Cancel"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={saving ? "Saving…" : "Open matter"}
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
