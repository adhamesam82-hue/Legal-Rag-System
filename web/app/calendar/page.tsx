"use client";

/**
 * Calendar page (T-053 / Wave 3).
 *
 * This route displays the month calendar with hearings, tasks, and deadlines.
 * All state, hooks, and practice contract bindings are preserved verbatim.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { ProximityBadge } from "@/components/Distinction";
import { useTranslator } from "@astryxdesign/core/i18n";
import { memberLabel, useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  todayIso,
  type ISODateString,
  type Matter,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";

type EventKind = "hearing" | "deadline" | "task";

interface CalendarEvent {
  id: string;
  date: string;
  time?: string;
  title: string;
  detail: string;
  kind: EventKind;
  owner: string;
  matterId?: number;
}

const KIND_ICON_NAME: Record<EventKind, string> = {
  hearing: "balance",
  deadline: "schedule",
  task: "check_circle",
};

const KIND_LABEL_KEY = {
  hearing: "@legalos.calendar.kind.hearing",
  deadline: "@legalos.calendar.kind.deadline",
  task: "@legalos.calendar.kind.task",
} as const;

const WEEKDAY_KEYS = [
  "@legalos.calendar.weekday.sun",
  "@legalos.calendar.weekday.mon",
  "@legalos.calendar.weekday.tue",
  "@legalos.calendar.weekday.wed",
  "@legalos.calendar.weekday.thu",
  "@legalos.calendar.weekday.fri",
  "@legalos.calendar.weekday.sat",
] as const;

/** Chips a day cell shows before collapsing the rest into "+N more". Two fits
 *  a sixth of the calendar body at the 1280×720 floor with the date above it. */
const MAX_CHIPS_PER_DAY = 2;

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { formatDate, formatMonth } = useFormat();
  const t = useTranslator();
  const { practice, members } = useOrg();
  const memberName = useMemberName();
  const today = todayIso();

  const [cursor, setCursor] = useState(() => {
    const now = new Date(`${today}T00:00:00`);
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isCreating, setIsCreating] = useState(false);

  const monthStart = `${monthKey(cursor.year, cursor.month)}-01`;
  const monthEnd = `${monthKey(cursor.year, cursor.month)}-${String(
    new Date(cursor.year, cursor.month + 1, 0).getDate(),
  ).padStart(2, "0")}`;

  // Cases carry their deadlines only on the detail route, so the month's
  // deadlines are collected from each case that has any.
  const resource = useResource(
    async (api) => {
      const [hearings, tasks, matters, caseList] = await Promise.all([
        api.hearings.list({ since: monthStart, until: monthEnd }),
        api.tasks.list(),
        api.matters.list(),
        api.cases.list(),
      ]);
      const cases = await Promise.all(
        caseList.map((record) => api.cases.get(record.id)),
      );
      return { hearings, tasks, matters, cases };
    },
    [monthStart, monthEnd],
  );

  const events = useMemo<CalendarEvent[]>(() => {
    if (!resource.data) return [];
    const { hearings, tasks, matters, cases } = resource.data;
    const matterById = new Map(matters.map((m) => [m.id, m]));

    const hearingEvents = hearings.map<CalendarEvent>((hearing) => {
      const matter = matterById.get(hearing.matter_id);
      return {
        id: `hearing-${hearing.id}`,
        date: hearing.hearing_date,
        time: hearing.hearing_time,
        title: matter?.name ?? hearing.purpose,
        detail: [hearing.court, hearing.purpose].filter(Boolean).join(" · "),
        kind: "hearing",
        owner: matter?.responsible_user ?? "",
        matterId: hearing.matter_id,
      };
    });

    const taskEvents = tasks
      .filter((task) => task.status !== "done" && task.due_date)
      .map<CalendarEvent>((task) => ({
        id: `task-${task.id}`,
        date: task.due_date as string,
        title: task.title,
        detail: task.matter_name ?? t("@legalos.calendar.firmTask"),
        kind: "task",
        owner: task.assignee,
        matterId: task.matter_id ?? undefined,
      }));

    const deadlineEvents = cases.flatMap((record) =>
      record.deadlines
        .filter((deadline) => !deadline.completed)
        .map<CalendarEvent>((deadline) => ({
          id: `deadline-${deadline.id}`,
          date: deadline.due_date,
          title: deadline.label,
          detail: [record.case_number, record.matter_name].filter(Boolean).join(" · "),
          kind: "deadline",
          owner: matterById.get(record.matter_id)?.responsible_user ?? "",
          matterId: record.matter_id,
        })),
    );

    return [...hearingEvents, ...taskEvents, ...deadlineEvents];
  }, [resource.data, t]);

  const filtered = useMemo(
    () =>
      ownerFilter === "all"
        ? events
        : events.filter((event) => event.owner === ownerFilter),
    [events, ownerFilter],
  );

  const byDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of filtered) (map[event.date] ??= []).push(event);
    return map;
  }, [filtered]);

  // Month grid padded to the Sunday before the 1st so weekday columns line up.
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const daysInMonth = new Date(
      Date.UTC(cursor.year, cursor.month + 1, 0),
    ).getUTCDate();
    const out: (string | null)[] = Array(first.getUTCDay()).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push(
        `${monthKey(cursor.year, cursor.month)}-${String(day).padStart(2, "0")}`,
      );
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const selectedEvents = (byDate[selectedDate] ?? []).sort((a, b) =>
    (a.time ?? "zz").localeCompare(b.time ?? "zz"),
  );

  const upcoming = filtered
    .filter((event) => event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const monthLabel = formatMonth(monthStart);

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {t("@legalos.calendar.heading")}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-56">
              <Select
                aria-label={t("@legalos.calendar.filterByLawyer")}
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value ?? "all")}
                options={[
                  { value: "all", label: t("@legalos.calendar.wholeFirm") },
                  ...members.map((m) => ({
                    value: m.clerk_user_id,
                    label: memberLabel(m),
                  })),
                ]}
              />
            </div>
            <Button
              variant="primary"
              startIcon={<Icon name="add" size={16} />}
              onClick={() => setIsCreating(true)}
              disabled={!practice}
            >
              {t("@legalos.calendar.scheduleHearing")}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar + Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Month Calendar Section */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          <Card padding="20px" className="min-w-0 w-full">
            <div className="flex flex-col gap-4">
              {/* Navigation & Month Title */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  {monthLabel}
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t("@legalos.calendar.previousMonth")}
                    onClick={() => shiftMonth(-1)}
                  >
                    <Icon name="chevron_left" size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t("@legalos.calendar.nextMonth")}
                    onClick={() => shiftMonth(1)}
                  >
                    <Icon name="chevron_right" size={18} />
                  </Button>
                </div>
              </div>

              <DataView resource={resource} loadingLabel={t("@legalos.calendar.loading")}>
                {() => (
                  <div className="flex flex-col gap-2">
                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 gap-2 min-w-0 text-center">
                      {WEEKDAY_KEYS.map((key) => (
                        <span
                          key={key}
                          className="text-xs font-semibold py-1"
                          style={{ color: "var(--text2)" }}
                        >
                          {t(key)}
                        </span>
                      ))}
                    </div>

                    {/* Day Cells Grid */}
                    <div className="grid grid-cols-7 gap-2 min-w-0">
                      {cells.map((date, index) => {
                        if (!date) {
                          return (
                            <div
                              key={`pad-${index}`}
                              className="min-h-[85px] rounded-lg border border-transparent"
                            />
                          );
                        }
                        const dayEvents = byDate[date] ?? [];
                        const isToday = date === today;
                        const isSelected = date === selectedDate;

                        return (
                          <button
                            key={date}
                            type="button"
                            onClick={() => setSelectedDate(date)}
                            className="flex flex-col gap-1 p-2 rounded-lg text-left transition-all min-h-[85px] overflow-hidden focus:outline-none focus:ring-1"
                            style={{
                              backgroundColor: isSelected
                                ? "var(--surface2)"
                                : isToday
                                  ? "var(--surface3)"
                                  : "var(--surface)",
                              border: isSelected
                                ? "1px solid var(--primary)"
                                : isToday
                                  ? "1px solid var(--border2)"
                                  : "1px solid var(--border)",
                              boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`text-xs ${isToday ? "font-bold" : "font-medium"}`}
                                style={{
                                  color: isToday
                                    ? "var(--accent)"
                                    : isSelected
                                      ? "var(--primary)"
                                      : "var(--text)",
                                }}
                              >
                                {Number(date.slice(8))}
                              </span>
                              {dayEvents.length > 0 && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: "var(--primary)" }}
                                />
                              )}
                            </div>

                            {/* Event Chips */}
                            <div className="flex flex-col gap-1 w-full min-w-0">
                              {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
                                <div
                                  key={event.id}
                                  title={event.title}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium truncate w-full"
                                  style={{
                                    backgroundColor: "var(--surface3)",
                                    color: "var(--text2)",
                                  }}
                                >
                                  <Icon
                                    name={KIND_ICON_NAME[event.kind]}
                                    size={12}
                                    className="shrink-0"
                                    style={{ color: "var(--text3)" }}
                                  />
                                  <span className="truncate">{event.title}</span>
                                </div>
                              ))}
                              {dayEvents.length > MAX_CHIPS_PER_DAY && (
                                <span
                                  className="text-[10px] font-medium px-1 truncate"
                                  style={{ color: "var(--text3)" }}
                                >
                                  {t("@legalos.calendar.moreEvents", {
                                    count: dayEvents.length - MAX_CHIPS_PER_DAY,
                                  })}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </DataView>
            </div>
          </Card>
        </div>

        {/* Right Sidebar Rail */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          {/* Selected Date Details */}
          <Card padding="20px">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {formatDate(selectedDate)}
              </h3>

              {selectedEvents.length === 0 ? (
                <EmptyState
                  icon={<Icon name="calendar_today" size={24} style={{ color: "var(--text2)" }} />}
                  title={t("@legalos.calendar.nothingScheduledTitle")}
                  description={t("@legalos.distinction.calendar.emptyDescription")}
                />
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                  {selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 mt-0.5"
                          style={{ backgroundColor: "var(--surface2)", color: "var(--text2)" }}
                        >
                          <Icon name={KIND_ICON_NAME[event.kind]} size={16} />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          {event.matterId ? (
                            <Link
                              href={`/matters/${event.matterId}`}
                              className="text-xs font-semibold hover:underline line-clamp-2"
                              style={{ color: "var(--text)" }}
                            >
                              {event.title}
                            </Link>
                          ) : (
                            <span
                              className="text-xs font-semibold line-clamp-2"
                              style={{ color: "var(--text)" }}
                            >
                              {event.title}
                            </span>
                          )}
                          {event.detail && (
                            <span className="text-[11px] truncate" style={{ color: "var(--text3)" }}>
                              {event.detail}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-[11px]" style={{ color: "var(--text2)" }}>
                        <span>{event.time || t("@legalos.calendar.allDay")}</span>
                        <Badge color="neutral" variant="soft" size="sm">
                          {t(KIND_LABEL_KEY[event.kind])}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Coming Up */}
          <Card padding="20px">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {t("@legalos.calendar.comingUp")}
                </h3>
                <Link
                  href="/tasks"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  {t("@legalos.calendar.allTasksLink")}
                </Link>
              </div>

              {upcoming.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text3)" }}>
                  {t("@legalos.calendar.nothingUpcoming")}
                </p>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                  {upcoming.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 mt-0.5"
                          style={{ backgroundColor: "var(--surface2)", color: "var(--text2)" }}
                        >
                          <Icon name={KIND_ICON_NAME[event.kind]} size={16} />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span
                            className="text-xs font-semibold line-clamp-2"
                            style={{ color: "var(--text)" }}
                          >
                            {event.title}
                          </span>
                          <span className="text-[11px] truncate" style={{ color: "var(--text3)" }}>
                            {`${t(KIND_LABEL_KEY[event.kind])}${
                              event.owner ? ` · ${memberName(event.owner)}` : ""
                            }`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ProximityBadge date={event.date} />
                        <span className="text-[11px]" style={{ color: "var(--text2)" }}>
                          {event.date.slice(5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <NewHearingDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        matters={resource.data?.matters ?? []}
        defaultDate={selectedDate}
        onCreated={resource.reload}
      />
    </div>
  );
}

function NewHearingDialog({
  isOpen,
  onOpenChange,
  matters,
  defaultDate,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  matters: Matter[];
  defaultDate: string;
  onCreated: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const [matterId, setMatterId] = useState<string | null>(null);
  const [date, setDate] = useState<ISODateString>(defaultDate as ISODateString);
  const [time, setTime] = useState("10:00 AM");
  const [court, setCourt] = useState("");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!practice || !matterId) return;
    setSaving(true);
    setError(null);
    try {
      await practice.hearings.create({
        matter_id: Number(matterId),
        hearing_date: date,
        hearing_time: time,
        court,
        purpose,
      });
      setPurpose("");
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(
        exc instanceof Error ? exc.message : t("@legalos.calendar.dialog.error"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={500}>
      <DialogHeader
        title={t("@legalos.calendar.dialog.title")}
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
            <Select
              label={t("@legalos.calendar.dialog.matterLabel")}
              value={matterId ?? ""}
              onChange={(e) => setMatterId(e.target.value || null)}
              required
              options={[
                { value: "", label: t("@legalos.calendar.dialog.matterPlaceholder") },
                ...matters.map((m) => ({ value: String(m.id), label: m.name })),
              ]}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="date"
                label={t("@legalos.calendar.dialog.dateLabel")}
                value={date}
                onChange={(e) => setDate((e.target.value || defaultDate) as ISODateString)}
                required
              />
              <Input
                label={t("@legalos.calendar.dialog.timeLabel")}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <Input
              label={t("@legalos.calendar.dialog.courtLabel")}
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              placeholder={t("@legalos.calendar.dialog.courtPlaceholder")}
            />
            <Input
              label={t("@legalos.calendar.dialog.purposeLabel")}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t("@legalos.calendar.dialog.purposePlaceholder")}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              {t("@legalos.calendar.dialog.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving || !matterId}
            >
              {saving ? t("@legalos.calendar.dialog.saving") : t("@legalos.calendar.dialog.schedule")}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
