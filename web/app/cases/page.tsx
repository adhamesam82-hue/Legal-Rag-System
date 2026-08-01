"use client";

import { useMemo, useState } from "react";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { MagnifyingGlassIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { CASES, matterById, formatDate } from "@/lib/legalos-data";

interface CaseRow extends Record<string, unknown> {
  id: string;
  caseNumber: string;
  matterName: string;
  court: string;
  judge: string;
  opposingParty: string;
  status: string;
  nextHearingDate: string | null;
  nextHearingTime: string | null;
}

const COURTS = Array.from(new Set(CASES.map((c) => c.court)));

function statusVariant(status: string): "success" | "warning" | "neutral" {
  if (status.startsWith("Active")) return "success";
  if (status.startsWith("On Hold")) return "warning";
  return "neutral";
}

function buildRows(): CaseRow[] {
  return CASES.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    matterName: matterById(c.matterId)?.name ?? "—",
    court: c.court,
    judge: c.judge,
    opposingParty: c.opposingParty,
    status: c.status,
    nextHearingDate: c.nextHearing?.date ?? null,
    nextHearingTime: c.nextHearing?.time ?? null,
  }));
}

const ALL_ROWS = buildRows();

export default function CasesPage() {
  const [query, setQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState<string>("all");

  const rows = useMemo(() => {
    return ALL_ROWS.filter((row) => {
      if (courtFilter !== "all" && row.court !== courtFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !row.caseNumber.toLowerCase().includes(q) &&
          !row.matterName.toLowerCase().includes(q) &&
          !row.opposingParty.toLowerCase().includes(q) &&
          !row.judge.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [query, courtFilter]);

  const columns: TableColumn<CaseRow>[] = [
    {
      key: "caseNumber",
      header: "Case",
      width: proportional(1.6),
      renderCell: (row) => (
        <Link href={`/cases/${row.id}`}>
          <VStack gap={0}>
            <Text type="body" weight="semibold">
              {row.caseNumber}
            </Text>
            <Text type="supporting" color="secondary">
              {row.matterName}
            </Text>
          </VStack>
        </Link>
      ),
    },
    {
      key: "court",
      header: "Court",
      width: proportional(1.6),
      renderCell: (row) => <Text type="body">{row.court}</Text>,
    },
    {
      key: "judge",
      header: "Judge",
      width: proportional(1.4),
      renderCell: (row) => <Text type="body">{row.judge}</Text>,
    },
    {
      key: "opposingParty",
      header: "Opposing party",
      width: proportional(1.8),
      renderCell: (row) => (
        <Text type="body" maxLines={1}>
          {row.opposingParty}
        </Text>
      ),
    },
    {
      key: "nextHearingDate",
      header: "Next hearing",
      width: pixel(150),
      renderCell: (row) =>
        row.nextHearingDate ? (
          <VStack gap={0}>
            <Text type="body">{formatDate(row.nextHearingDate)}</Text>
            <Text type="supporting" color="secondary">
              {row.nextHearingTime}
            </Text>
          </VStack>
        ) : (
          <Text type="body" color="secondary">
            None scheduled
          </Text>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: pixel(170),
      renderCell: (row) => <Badge variant={statusVariant(row.status)} label={row.status} />,
    },
  ];

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>Cases</Heading>
              <Text type="body" color="secondary">
                {CASES.length} litigation cases on file
              </Text>
            </VStack>
            <HStack gap={3} wrap="wrap">
              <TextInput
                label="Search cases"
                isLabelHidden
                value={query}
                onChange={setQuery}
                placeholder="Search by case number, matter, judge, or opposing party"
                startIcon={MagnifyingGlassIcon}
                width={360}
              />
              <Selector
                label="Court"
                isLabelHidden
                value={courtFilter}
                onChange={(v) => setCourtFilter(v ?? "all")}
                options={[
                  { value: "all", label: "All courts" },
                  ...COURTS.map((c) => ({ value: c, label: c })),
                ]}
                width={220}
              />
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          {rows.length > 0 ? (
            <Table<CaseRow> data={rows} columns={columns} idKey="id" hasHover />
          ) : (
            <EmptyState
              icon={<Icon icon={ScaleIcon} size="lg" color="secondary" />}
              title="No cases match your filters"
              description="Try a different search term or clear the court filter."
              actions={
                <Button
                  label="Clear filters"
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setCourtFilter("all");
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
