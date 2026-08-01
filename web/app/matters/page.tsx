"use client";

import { useMemo, useState } from "react";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { PlusIcon, MagnifyingGlassIcon, BriefcaseIcon, ScaleIcon } from "@heroicons/react/24/outline";
import {
  MATTERS,
  clientById,
  teamMember,
  formatDate,
  daysUntil,
  type Matter,
} from "@/lib/legalos-data";

interface MatterRow extends Record<string, unknown> {
  id: string;
  name: string;
  clientName: string;
  type: Matter["type"];
  status: Matter["status"];
  responsibleName: string;
  hasCase: boolean;
  deadlineLabel: string | null;
  deadlineDate: string | null;
}

const MATTER_TYPES: Matter["type"][] = [
  "Litigation",
  "Corporate",
  "Tax",
  "Labour",
  "Family / Probate",
  "Contract Review",
];

const STATUS_VARIANT: Record<Matter["status"], "success" | "warning" | "neutral"> = {
  Active: "success",
  "On Hold": "warning",
  Closed: "neutral",
};

function buildRows(): MatterRow[] {
  return MATTERS.map((matter) => ({
    id: matter.id,
    name: matter.name,
    clientName: clientById(matter.clientId)?.name ?? "—",
    type: matter.type,
    status: matter.status,
    responsibleName: teamMember(matter.responsibleLawyerId).name,
    hasCase: Boolean(matter.caseId),
    deadlineLabel: matter.nextDeadline?.label ?? null,
    deadlineDate: matter.nextDeadline?.date ?? null,
  }));
}

const ALL_ROWS = buildRows();

export default function MattersPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const rows = useMemo(() => {
    return ALL_ROWS.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !row.name.toLowerCase().includes(q) &&
          !row.clientName.toLowerCase().includes(q) &&
          !row.responsibleName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [query, typeFilter, statusFilter]);

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
      key: "type",
      header: "Type",
      width: pixel(150),
      renderCell: (row) => <Text type="body">{row.type}</Text>,
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
              <Badge variant="warning" label={`${formatDate(row.deadlineDate)} · ${days}d`} />
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
      renderCell: (row) => <Badge variant={STATUS_VARIANT[row.status]} label={row.status} />,
    },
  ];

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center">
              <VStack gap={1}>
                <Heading level={2}>Matters</Heading>
                <Text type="body" color="secondary">
                  {MATTERS.length} matters across all clients
                </Text>
              </VStack>
              <Button
                label="New matter"
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
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
                placeholder="Search by matter, client, or lawyer"
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
                  ...MATTER_TYPES.map((t) => ({ value: t, label: t })),
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
                  { value: "Active", label: "Active" },
                  { value: "On Hold", label: "On Hold" },
                  { value: "Closed", label: "Closed" },
                ]}
                width={160}
              />
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          {rows.length > 0 ? (
            <Table<MatterRow> data={rows} columns={columns} idKey="id" hasHover />
          ) : (
            <EmptyState
              icon={<Icon icon={BriefcaseIcon} size="lg" color="secondary" />}
              title="No matters match your filters"
              description="Try a different search term or clear the type and status filters."
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
          )}
        </LayoutContent>
      }
    />
  );
}
