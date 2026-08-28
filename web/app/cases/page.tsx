"use client";

/**
 * The hearings diary.
 *
 * This route used to list litigation records under a heading that says
 * الجلسات, which is not what a lawyer opens that tab for. What they want is
 * the sittings: what is coming, what happened at the last one, and where an
 * adjournment sent the case.
 *
 * Filtering happens on the SERVER, not on a page of rows already fetched.
 * A practice with three years of sittings is thousands of them, and a filter
 * that only narrows what happens to be loaded is a filter that lies.
 *
 * "Not ruled on yet" is its own control rather than a value in the outcome
 * list, because it is the absence of an outcome and it is the question asked
 * most often.
 */

import { useState } from "react";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { LayoutFooter } from "@astryxdesign/core/Layout";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { MagnifyingGlassIcon, PlusIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { useFormat } from "@/lib/i18n/format";
import { HEARING_OUTCOMES, todayIso, type Hearing, type HearingOutcome } from "@/lib/practice";

const ANY = "any";
const UNDECIDED = "undecided";

function outcomeVariant(outcome: string | null): "success" | "warning" | "neutral" | "blue" {
  if (outcome === null) return "neutral";
  if (outcome === "judgment") return "success";
  if (outcome === "adjourned") return "warning";
  if (outcome === "struck_out") return "neutral";
  return "blue";
}

interface Row extends Record<string, unknown> {
  id: number;
  date: string;
  time: string;
  matter: string;
  court: string;
  circuit: string;
  outcome: HearingOutcome | null;
  note: string;
  next: string | null;
}

function NewHearingDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const [matterId, setMatterId] = useState<string | null>(null);
  const [hearingDate, setHearingDate] = useState<ISODateString>(todayIso);
  const [hearingTime, setHearingTime] = useState("");
  const [court, setCourt] = useState("");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matters = useResource(
    (api) => (isOpen ? api.matters.list({ status: "active" }) : Promise.resolve([])),
    [isOpen],
  );

  async function submit() {
    if (!practice || !matterId) return;
    setSaving(true);
    setError(null);
    try {
      await practice.hearings.create({
        matter_id: Number(matterId),
        hearing_date: hearingDate,
        hearing_time: hearingTime,
        court,
        purpose,
      });
      setCourt("");
      setPurpose("");
      setMatterId(null);
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.hearings.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={460}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.hearings.newHearing")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <Selector
                label={t("@legalos.hearings.field.matter")}
                value={matterId}
                onChange={setMatterId}
                isRequired
                hasClear
                placeholder={
                  matters.loading
                    ? t("@legalos.hearings.dialog.loadingMatters")
                    : t("@legalos.hearings.dialog.selectMatter")
                }
                options={(matters.data ?? []).map((m) => ({
                  value: String(m.id),
                  label: m.name,
                }))}
              />
              <HStack gap={3}>
                <DateInput
                  label={t("@legalos.hearings.field.date")}
                  value={hearingDate}
                  onChange={(v) => setHearingDate(v ?? hearingDate)}
                />
                <TextInput
                  label={t("@legalos.hearings.field.time")}
                  value={hearingTime}
                  onChange={setHearingTime}
                  placeholder="10:00"
                />
              </HStack>
              <TextInput
                label={t("@legalos.hearings.field.court")}
                value={court}
                onChange={setCourt}
              />
              <TextInput
                label={t("@legalos.hearings.field.purpose")}
                value={purpose}
                onChange={setPurpose}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.hearings.dialog.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                {t("@legalos.hearings.dialog.cancel")}
              </Button>
              <Button
                label={t("@legalos.hearings.dialog.submit")}
                variant="primary"
                isDisabled={saving || !matterId}
                onClick={submit}
              >
                {t("@legalos.hearings.dialog.submit")}
              </Button>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

export default function HearingsPage() {
  const { formatDate } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();

  const [query, setQuery] = useState("");
  const [court, setCourt] = useState("");
  const [circuit, setCircuit] = useState("");
  const [outcome, setOutcome] = useState<string>(ANY);
  const [since, setSince] = useState<ISODateString | undefined>(undefined);
  const [until, setUntil] = useState<ISODateString | undefined>(undefined);
  const [isNewOpen, setIsNewOpen] = useState(false);

  // Every filter is a dependency: the server does the narrowing, so a changed
  // control means a new request rather than a re-filter of stale rows.
  const hearings = useResource(
    (api) =>
      api.hearings.list({
        q: query || undefined,
        court: court || undefined,
        judge: circuit || undefined,
        outcome: outcome !== ANY && outcome !== UNDECIDED
          ? (outcome as HearingOutcome)
          : undefined,
        undecided: outcome === UNDECIDED ? true : undefined,
        since,
        until,
      }),
    [query, court, circuit, outcome, since, until],
  );

  const columns: TableColumn<Row>[] = [
    {
      key: "date",
      header: t("@legalos.hearings.column.date"),
      width: pixel(130),
      renderCell: (row) => (
        <Text type="body" weight="semibold">
          {row.date}
        </Text>
      ),
    },
    { key: "matter", header: t("@legalos.hearings.column.matter"), width: proportional(2) },
    { key: "court", header: t("@legalos.hearings.column.court"), width: proportional(2) },
    { key: "circuit", header: t("@legalos.hearings.column.circuit"), width: proportional(1) },
    {
      key: "outcome",
      header: t("@legalos.hearings.column.outcome"),
      width: pixel(170),
      renderCell: (row) => (
        <VStack gap={1}>
          <Badge
            variant={outcomeVariant(row.outcome)}
            label={row.outcome ? enumLabel(row.outcome) : enumLabel("undecided")}
          />
          {row.note ? (
            <Text type="supporting" color="secondary">
              {row.note}
            </Text>
          ) : null}
        </VStack>
      ),
    },
    {
      key: "next",
      header: t("@legalos.hearings.column.next"),
      width: pixel(120),
      renderCell: (row) => (
        <Text type="body" color={row.next ? "primary" : "secondary"}>
          {row.next ?? "—"}
        </Text>
      ),
    },
  ];

  const anyFilter =
    Boolean(query || court || circuit || since || until) || outcome !== ANY;

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="start">
              <VStack gap={1}>
                <Heading level={3}>{t("@legalos.hearings.heading")}</Heading>
                <Text type="body" color="secondary">
                  {t("@legalos.hearings.subtitle")}
                </Text>
              </VStack>
              <Button
                label={t("@legalos.hearings.newHearing")}
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                onClick={() => setIsNewOpen(true)}
              >
                {t("@legalos.hearings.newHearing")}
              </Button>
            </HStack>

            <HStack gap={3} wrap="wrap">
              <TextInput
                label={t("@legalos.hearings.search.label")}
                isLabelHidden
                value={query}
                onChange={setQuery}
                placeholder={t("@legalos.hearings.search.placeholder")}
                startIcon={MagnifyingGlassIcon}
              />
              <TextInput
                label={t("@legalos.hearings.column.court")}
                value={court}
                onChange={setCourt}
                size="sm"
              />
              <TextInput
                label={t("@legalos.hearings.column.circuit")}
                value={circuit}
                onChange={setCircuit}
                size="sm"
              />
              <Selector
                label={t("@legalos.hearings.column.outcome")}
                value={outcome}
                onChange={(v) => setOutcome(v ?? ANY)}
                size="sm"
                options={[
                  { value: ANY, label: t("@legalos.hearings.filter.anyOutcome") },
                  { value: UNDECIDED, label: enumLabel("undecided") },
                  ...HEARING_OUTCOMES.map((o) => ({ value: o, label: enumLabel(o) })),
                ]}
              />
              <DateInput
                label={t("@legalos.hearings.filter.from")}
                value={since}
                onChange={setSince}
                size="sm"
              />
              <DateInput
                label={t("@legalos.hearings.filter.to")}
                value={until}
                onChange={setUntil}
                size="sm"
              />
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <DataView resource={hearings}>
            {(rows: Hearing[]) => {
              if (rows.length === 0) {
                return (
                  <EmptyState
                    icon={<Icon icon={ScaleIcon} size="lg" color="secondary" />}
                    title={
                      anyFilter
                        ? t("@legalos.hearings.empty.noMatchTitle")
                        : t("@legalos.hearings.empty.noneTitle")
                    }
                    description={
                      anyFilter
                        ? t("@legalos.hearings.empty.noMatchDescription")
                        : t("@legalos.hearings.empty.noneDescription")
                    }
                  />
                );
              }
              const data: Row[] = rows.map((h) => ({
                id: h.id,
                date: formatDate(h.hearing_date) + (h.hearing_time ? ` · ${h.hearing_time}` : ""),
                time: h.hearing_time,
                matter: h.matter_name ?? "—",
                court: h.court || "—",
                circuit: h.judge || "—",
                outcome: h.outcome,
                note: h.outcome_note ?? "",
                next: h.next_hearing_date ? formatDate(h.next_hearing_date) : null,
              }));
              return <Table<Row> data={data} columns={columns} idKey="id" hasHover />;
            }}
          </DataView>
        </LayoutContent>
      }
      footer={
        <NewHearingDialog
          isOpen={isNewOpen}
          onOpenChange={setIsNewOpen}
          onCreated={hearings.reload}
        />
      }
    />
  );
}
