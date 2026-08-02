"use client";

/**
 * The matter's calendar: every dated commitment on this file in one list.
 *
 * Composed rather than stored. Hearings, case deadlines and task due dates are
 * already recorded by the pillars that own them; a separate matter-events
 * table would be a fourth place for the same facts to be wrong in.
 */

import { useMemo } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  FlagIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import { useMemberName } from "@/lib/org";
import { daysUntil, formatDate } from "@/lib/practice";
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

const ICONS = {
  hearing: ScaleIcon,
  deadline: FlagIcon,
  task: CheckCircleIcon,
} as const;

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
          icon={<Icon icon={CalendarDaysIcon} size="lg" color="secondary" />}
          title={t("@legalos.matterWorkspace.calendar.emptyTitle")}
          description={t("@legalos.matterWorkspace.calendar.emptyDescription")}
        />
      </Panel>
    );
  }

  return (
    <VStack gap={6}>
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
    </VStack>
  );
}

function EventList({
  events,
  isPast = false,
}: {
  events: CalendarEvent[];
  isPast?: boolean;
}) {
  const t = useTranslator();

  return (
    <List hasDividers density="compact">
      {events.map((event) => {
        const days = daysUntil(event.date);
        const overdue = !isPast && days < 0;
        return (
          <ListItem
            key={event.key}
            label={event.label}
            description={event.detail || undefined}
            startContent={
              <Icon
                icon={ICONS[event.kind]}
                size="sm"
                color={event.done ? "success" : "secondary"}
              />
            }
            endContent={
              <HStack gap={3} vAlign="center">
                <Badge
                  variant="neutral"
                  label={t(`@legalos.matterWorkspace.calendar.kind.${event.kind}`)}
                />
                {overdue && (
                  <Badge
                    variant="error"
                    label={t("@legalos.matterWorkspace.calendar.overdue")}
                  />
                )}
                <VStack gap={0} hAlign="end">
                  <Text type="supporting" color="secondary">
                    {formatDate(event.date)}
                  </Text>
                  {!isPast && !event.done && days >= 0 && (
                    <Text type="supporting" color="secondary">
                      {days === 0
                        ? t("@legalos.matterWorkspace.calendar.today")
                        : t("@legalos.matterWorkspace.calendar.inDays", {
                            count: days,
                          })}
                    </Text>
                  )}
                </VStack>
              </HStack>
            }
          />
        );
      })}
    </List>
  );
}
