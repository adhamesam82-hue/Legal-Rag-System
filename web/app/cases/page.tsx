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
import { useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import { formatDate, todayIso } from "@/lib/practice";

interface CaseRow extends Record<string, unknown> {
  id: number;
  caseNumber: string;
  matterName: string;
  court: string;
  judge: string;
  opposingParty: string;
  status: string;
  nextHearingDate: string | null;
  nextHearingTime: string | null;
}

function statusVariant(status: string): "success" | "warning" | "neutral" {
  if (status.startsWith("Active")) return "success";
  if (status.startsWith("On Hold")) return "warning";
  return "neutral";
}

export default function CasesPage() {
  const [query, setQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState<string>("all");

  // The case list endpoint returns summaries without child collections, so
  // upcoming hearings come from the hearings endpoint and are joined by
  // matter here rather than fetching each case in full.
  const resource = useResource(
    async (api) => {
      const [cases, hearings] = await Promise.all([
        api.cases.list(),
        api.hearings.list({ since: todayIso() }),
      ]);
      return { cases, hearings };
    },
    [],
  );

  const allRows = useMemo<CaseRow[]>(() => {
    if (!resource.data) return [];
    const { cases, hearings } = resource.data;
    return cases.map((record) => {
      const next = hearings
        .filter((h) => h.matter_id === record.matter_id)
        .sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))[0];
      return {
        id: record.id,
        caseNumber: record.case_number,
        matterName: record.matter_name,
        court: record.court,
        judge: record.judge,
        opposingParty: record.opposing_party,
        status: record.status,
        nextHearingDate: next?.hearing_date ?? null,
        nextHearingTime: next?.hearing_time ?? null,
      };
    });
  }, [resource.data]);

  const courts = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.court))),
    [allRows],
  );

  const rows = useMemo(
    () =>
      allRows.filter((row) => {
        if (courtFilter !== "all" && row.court !== courtFilter) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          row.caseNumber.toLowerCase().includes(q) ||
          row.matterName.toLowerCase().includes(q) ||
          row.opposingParty.toLowerCase().includes(q) ||
          row.judge.toLowerCase().includes(q)
        );
      }),
    [allRows, query, courtFilter],
  );

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
      renderCell: (row) => (
        <Badge variant={statusVariant(row.status)} label={row.status || "—"} />
      ),
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
                {allRows.length} litigation{" "}
                {allRows.length === 1 ? "case" : "cases"} on file
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
                  ...courts.map((c) => ({ value: c, label: c })),
                ]}
                width={220}
              />
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          <DataView resource={resource} loadingLabel="Loading cases…">
            {() =>
              rows.length > 0 ? (
                <Table<CaseRow> data={rows} columns={columns} idKey="id" hasHover />
              ) : (
                <EmptyState
                  icon={<Icon icon={ScaleIcon} size="lg" color="secondary" />}
                  title={
                    allRows.length === 0
                      ? "No cases on file"
                      : "No cases match your filters"
                  }
                  description={
                    allRows.length === 0
                      ? "A case is added to a matter once it goes into litigation."
                      : "Try a different search term or clear the court filter."
                  }
                  actions={
                    allRows.length > 0 ? (
                      <Button
                        label="Clear filters"
                        variant="secondary"
                        onClick={() => {
                          setQuery("");
                          setCourtFilter("all");
                        }}
                      />
                    ) : undefined
                  }
                />
              )
            }
          </DataView>
        </LayoutContent>
      }
    />
  );
}
