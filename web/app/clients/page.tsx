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
import { PlusIcon, MagnifyingGlassIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import {
  CLIENTS,
  MATTERS,
  ACTIVITY,
  formatDate,
  type Client,
} from "@/lib/legalos-data";

interface ClientRow extends Record<string, unknown> {
  id: string;
  name: string;
  type: Client["type"];
  industry: string;
  status: Client["status"];
  primaryContactName: string;
  primaryContactTitle: string;
  activeMatters: number;
  lastActivity: string | null;
}

function buildRows(): ClientRow[] {
  return CLIENTS.map((client) => {
    const primary = client.contacts.find((c) => c.isPrimary) ?? client.contacts[0];
    const activeMatters = MATTERS.filter(
      (m) => m.clientId === client.id && m.status === "Active",
    ).length;
    const activity = ACTIVITY.filter((a) => a.clientId === client.id).sort((a, b) =>
      a.when < b.when ? 1 : -1,
    );
    return {
      id: client.id,
      name: client.name,
      type: client.type,
      industry: client.industry,
      status: client.status,
      primaryContactName: primary?.name ?? "—",
      primaryContactTitle: primary?.title ?? "",
      activeMatters,
      lastActivity: activity[0]?.when.slice(0, 10) ?? client.since,
    };
  });
}

const ALL_ROWS = buildRows();

export default function ClientsPage() {
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
          !row.industry.toLowerCase().includes(q) &&
          !row.primaryContactName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [query, typeFilter, statusFilter]);

  const columns: TableColumn<ClientRow>[] = [
    {
      key: "name",
      header: "Client",
      width: proportional(2.5),
      renderCell: (row) => (
        <Link href={`/clients/${row.id}`}>
          <VStack gap={0}>
            <Text type="body" weight="semibold">
              {row.name}
            </Text>
            <Text type="supporting" color="secondary">
              {row.industry}
            </Text>
          </VStack>
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      width: pixel(120),
      renderCell: (row) => <Text type="body">{row.type}</Text>,
    },
    {
      key: "primaryContactName",
      header: "Primary contact",
      width: proportional(1.6),
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Avatar name={row.primaryContactName} size="sm" tooltip={false} />
          <VStack gap={0}>
            <Text type="body">{row.primaryContactName}</Text>
            {row.primaryContactTitle && (
              <Text type="supporting" color="secondary">
                {row.primaryContactTitle}
              </Text>
            )}
          </VStack>
        </HStack>
      ),
    },
    {
      key: "activeMatters",
      header: "Active matters",
      width: pixel(130),
      renderCell: (row) =>
        row.activeMatters > 0 ? (
          <Text type="body">{row.activeMatters}</Text>
        ) : (
          <Text type="body" color="secondary">
            None
          </Text>
        ),
    },
    {
      key: "lastActivity",
      header: "Last activity",
      width: pixel(140),
      renderCell: (row) => (
        <Text type="body" color="secondary">
          {row.lastActivity ? formatDate(row.lastActivity) : "—"}
        </Text>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: pixel(110),
      renderCell: (row) =>
        row.status === "Inactive" ? (
          <Badge variant="neutral" label="Inactive" />
        ) : (
          <Text type="body" color="secondary">
            Active
          </Text>
        ),
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
                <Heading level={2}>Clients</Heading>
                <Text type="body" color="secondary">
                  {CLIENTS.length} clients at Al-Sayed &amp; Partners
                </Text>
              </VStack>
              <Button
                label="New client"
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                New client
              </Button>
            </HStack>
            <HStack gap={3} wrap="wrap">
              <TextInput
                label="Search clients"
                isLabelHidden
                value={query}
                onChange={setQuery}
                placeholder="Search by name, industry, or contact"
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
                  { value: "Company", label: "Company" },
                  { value: "Individual", label: "Individual" },
                ]}
                width={160}
              />
              <Selector
                label="Status"
                isLabelHidden
                value={statusFilter}
                onChange={(v) => setStatusFilter(v ?? "all")}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
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
            <Table<ClientRow> data={rows} columns={columns} idKey="id" hasHover />
          ) : (
            <EmptyState
              icon={<Icon icon={UserGroupIcon} size="lg" color="secondary" />}
              title="No clients match your filters"
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
