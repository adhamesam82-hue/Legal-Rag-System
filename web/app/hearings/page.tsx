"use client";

/**
 * The hearings diary (T-053 / Wave 2).
 *
 * This route lists court sittings: upcoming hearings, past rulings,
 * and adjournment tracking.
 *
 * Filtering happens on the SERVER, preserving all hooks, parameters,
 * and contract layer interfaces.
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { useFormat } from "@/lib/i18n/format";
import { ProximityBadge } from "@/components/Distinction";
import { HEARING_OUTCOMES, todayIso, type Hearing, type HearingOutcome } from "@/lib/practice";

const ANY = "any";
const UNDECIDED = "undecided";

function outcomeColor(outcome: string | null): "success" | "warn" | "neutral" | "info" {
  if (outcome === null) return "neutral";
  if (outcome === "judgment") return "success";
  if (outcome === "adjourned") return "warn";
  if (outcome === "struck_out") return "neutral";
  return "info";
}

interface Row extends Record<string, unknown> {
  id: number;
  date: string;
  /** The raw hearing date, for the proximity band; `date` is already formatted. */
  dateIso: string;
  nextIso: string | null;
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
      setHearingTime("");
      setHearingDate(todayIso);
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
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <DialogHeader
        title={t("@legalos.hearings.newHearing")}
        onOpenChange={onOpenChange}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <DialogContent>
          <InlineError message={error} onDismiss={() => setError(null)} />
          <Select
            label={t("@legalos.hearings.field.matter")}
            value={matterId ?? ""}
            onChange={(e) => setMatterId(e.target.value || null)}
            required
            options={[
              {
                value: "",
                label: matters.loading
                  ? t("@legalos.hearings.dialog.loadingMatters")
                  : t("@legalos.hearings.dialog.selectMatter"),
              },
              ...(matters.data ?? []).map((m) => ({
                value: String(m.id),
                label: m.name,
              })),
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label={t("@legalos.hearings.field.date")}
              value={hearingDate}
              onChange={(e) => setHearingDate((e.target.value || todayIso) as ISODateString)}
              required
            />
            <Input
              label={t("@legalos.hearings.field.time")}
              value={hearingTime}
              onChange={(e) => setHearingTime(e.target.value)}
              helperText={t("@legalos.hearings.field.timeHint")}
              placeholder="10:00"
            />
          </div>
          <Input
            label={t("@legalos.hearings.field.court")}
            value={court}
            onChange={(e) => setCourt(e.target.value)}
          />
          <Input
            label={t("@legalos.hearings.field.purpose")}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("@legalos.hearings.dialog.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={saving || !matterId}
          >
            {t("@legalos.hearings.dialog.submit")}
          </Button>
        </DialogFooter>
      </form>
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

  const anyFilter =
    Boolean(query || court || circuit || since || until) || outcome !== ANY;

  return (
    <div
      className="w-full flex flex-col gap-6"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      {/* رأس الصفحة وأزرار الإجراءات */}
      <header
        className="flex flex-col gap-4 pb-5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center w-9 h-9"
                style={{
                  borderRadius: "var(--rs)",
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
              >
                <Icon name="event" size={20} />
              </div>
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: "var(--text)" }}
              >
                {t("@legalos.hearings.heading")}
              </h1>
            </div>
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              {t("@legalos.hearings.subtitle")}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewOpen(true)}
            startIcon={<Icon name="add" size={16} />}
          >
            {t("@legalos.hearings.newHearing")}
          </Button>
        </div>

        {/* شريط الفلاتر والبحث */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("@legalos.hearings.search.placeholder")}
              aria-label={t("@legalos.hearings.search.label")}
              startIcon={<Icon name="search" size={18} />}
            />
          </div>
          <div>
            <Input
              label={t("@legalos.hearings.column.court")}
              value={court}
              onChange={(e) => setCourt(e.target.value)}
            />
          </div>
          <div>
            <Input
              label={t("@legalos.hearings.column.circuit")}
              value={circuit}
              onChange={(e) => setCircuit(e.target.value)}
            />
          </div>
          <div>
            <Select
              label={t("@legalos.hearings.column.outcome")}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value || ANY)}
              options={[
                { value: ANY, label: t("@legalos.hearings.filter.anyOutcome") },
                { value: UNDECIDED, label: enumLabel("undecided") },
                ...HEARING_OUTCOMES.map((o) => ({ value: o, label: enumLabel(o) })),
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              label={t("@legalos.hearings.filter.from")}
              value={since ?? ""}
              onChange={(e) => setSince(e.target.value ? (e.target.value as ISODateString) : undefined)}
            />
            <Input
              type="date"
              label={t("@legalos.hearings.filter.to")}
              value={until ?? ""}
              onChange={(e) => setUntil(e.target.value ? (e.target.value as ISODateString) : undefined)}
            />
          </div>
        </div>
      </header>

      {/* منطقة عرض البيانات والجدول */}
      <DataView resource={hearings}>
        {(rows: Hearing[]) => {
          if (rows.length === 0) {
            return (
              <EmptyState
                icon={<Icon name="balance" size={32} />}
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
            dateIso: h.hearing_date,
            nextIso: h.next_hearing_date,
            time: h.hearing_time,
            matter: h.matter_name ?? "—",
            court: h.court || "—",
            circuit: h.judge || "—",
            outcome: h.outcome,
            note: h.outcome_note ?? "",
            next: h.next_hearing_date ? formatDate(h.next_hearing_date) : null,
          }));

          return (
            <Card padding={0} bordered shadow className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ minWidth: "160px" }}>{t("@legalos.hearings.column.date")}</TableHead>
                    <TableHead style={{ minWidth: "220px" }}>{t("@legalos.hearings.column.matter")}</TableHead>
                    <TableHead style={{ minWidth: "180px" }}>{t("@legalos.hearings.column.court")}</TableHead>
                    <TableHead style={{ minWidth: "140px" }}>{t("@legalos.hearings.column.circuit")}</TableHead>
                    <TableHead style={{ minWidth: "170px" }}>{t("@legalos.hearings.column.outcome")}</TableHead>
                    <TableHead style={{ minWidth: "140px" }}>{t("@legalos.hearings.column.next")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                            {row.date}
                          </span>
                          <ProximityBadge date={row.dateIso} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-xs" style={{ color: "var(--text)" }}>
                          {row.matter}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs" style={{ color: "var(--text2)" }}>
                          {row.court}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs" style={{ color: "var(--text2)" }}>
                          {row.circuit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge color={outcomeColor(row.outcome)} variant="soft">
                            {row.outcome ? enumLabel(row.outcome) : enumLabel("undecided")}
                          </Badge>
                          {row.note && (
                            <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                              {row.note}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span
                            className="text-xs font-medium"
                            style={{ color: row.next ? "var(--primary)" : "var(--text3)" }}
                          >
                            {row.next ?? "—"}
                          </span>
                          <ProximityBadge date={row.nextIso} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          );
        }}
      </DataView>

      <NewHearingDialog
        isOpen={isNewOpen}
        onOpenChange={setIsNewOpen}
        onCreated={hearings.reload}
      />
    </div>
  );
}
