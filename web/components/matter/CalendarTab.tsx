"use client";

/**
 * The matter's calendar: every dated commitment on this file in one list.
 *
 * Composed rather than stored. Hearings, case deadlines and task due dates are
 * already recorded by the pillars that own them; a separate matter-events
 * table would be a fourth place for the same facts to be wrong in.
 */

import React, { useMemo } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useMemberName } from "@/lib/org";
import { daysUntil } from "@/lib/practice";
import { ProximityBadge } from "@/components/Distinction";
import { useFormat } from "@/lib/i18n/format";
import { Panel, type TabProps } from "./shared";

type EventKind = "hearing" | "deadline" | "task";

interface CalendarEvent {
  key: string;
  kind: EventKind;
  date: string;
  label: string;
  detail: string;
  done: boolean;
}

const ICONS: Record<EventKind, string> = {
  hearing: "gavel",
  deadline: "flag",
  task: "check_circle",
};

export function CalendarTab({ data }: TabProps) {
  const t = useTranslator();
  const memberName = useMemberName();

  const events = useMemo<CalendarEvent[]>(() => {
    const hearings: CalendarEvent[] = data.hearings.map((hearing) => ({
      key: `hearing-${hearing.id}`,
      kind: "hearing",
      date: hearing.hearing_date,
      label:
        hearing.purpose || t("@legalos.matters.detail.hearings.defaultPurpose"),
      detail: [hearing.court, hearing.hearing_time].filter(Boolean).join(" · "),
      // A hearing with a recorded outcome has happened; one without has not.
      done: Boolean(hearing.outcome),
    }));

    const deadlines: CalendarEvent[] = (data.linkedCase?.deadlines ?? []).map(
      (deadline) => ({
        key: `deadline-${deadline.id}`,
        kind: "deadline",
        date: deadline.due_date,
        label: deadline.label,
        detail: data.linkedCase?.case_number ?? "",
        done: deadline.completed,
      }),
    );

    const tasks: CalendarEvent[] = data.tasks
      .filter((task) => task.due_date !== null)
      .map((task) => ({
        key: `task-${task.id}`,
        kind: "task",
        date: task.due_date as string,
        label: task.title,
        detail: memberName(task.assignee),
        done: task.status === "done",
      }));

    return [...hearings, ...deadlines, ...tasks].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [data.hearings, data.linkedCase, data.tasks, memberName, t]);

  // Anything still open, or dated today or later, is something to act on.
  const upcoming = events.filter((event) => !event.done && daysUntil(event.date) >= 0);
  const past = events.filter((event) => event.done || daysUntil(event.date) < 0);

  if (events.length === 0) {
    return (
      <Panel title={t("@legalos.matterWorkspace.calendar.heading")}>
        <EmptyState
          icon={<Icon name="calendar_today" size={24} />}
          title={t("@legalos.matterWorkspace.calendar.emptyTitle")}
          description={t("@legalos.matterWorkspace.calendar.emptyDescription")}
        />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {upcoming.length > 0 && (
        <Panel title={t("@legalos.matterWorkspace.calendar.upcoming")}>
          <EventList events={upcoming} />
        </Panel>
      )}
      {past.length > 0 && (
        <Panel title={t("@legalos.matterWorkspace.calendar.past")}>
          <EventList events={past} isPast />
        </Panel>
      )}
    </div>
  );
}

function EventList({
  events,
  isPast = false,
}: {
  events: CalendarEvent[];
  isPast?: boolean;
}) {
  const { formatDate } = useFormat();
  const t = useTranslator();

  return (
    <div
      className="flex flex-col rounded-md border divide-y overflow-hidden"
      style={{ borderColor: "var(--border)" }}
    >
      {events.map((event) => {
        const days = daysUntil(event.date);
        return (
          <div
            key={event.key}
            className="flex items-center justify-between gap-3 p-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon
                name={ICONS[event.kind]}
                size={16}
                style={{
                  color: event.done ? "var(--success)" : "var(--text3)",
                }}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                  {event.label}
                </span>
                {event.detail && (
                  <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                    {event.detail}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Badge color="neutral" variant="soft">
                {t(`@legalos.matterWorkspace.calendar.kind.${event.kind}`)}
              </Badge>
              {!isPast && !event.done && <ProximityBadge date={event.date} />}
              <div className="flex flex-col items-end">
                <span className="text-xs" style={{ color: "var(--text2)" }}>
                  {formatDate(event.date)}
                </span>
                {!isPast && !event.done && days > 0 && (
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                    {t("@legalos.matterWorkspace.calendar.inDays", { count: days })}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
