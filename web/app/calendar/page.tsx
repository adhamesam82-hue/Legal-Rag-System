"use client";

import { useMemo, useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { Link } from "@astryxdesign/core/Link";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Selector } from "@astryxdesign/core/Selector";
import {
  ScaleIcon,
  ClockIcon,
  UserGroupIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  HEARINGS,
  TASKS,
  TEAM,
  matterById,
  teamMember,
  formatDate,
} from "@/lib/legalos-data";

// The concept build is pinned to August 2026 so the mock hearings and
// deadlines land on a populated month rather than an empty grid.
const YEAR = 2026;
const MONTH = 7; // August (0-indexed)
const TODAY = "2026-08-01";

type EventKind = "hearing" | "deadline" | "internal";

interface CalendarEvent {
  id: string;
  date: string;
  time?: string;
  title: string;
  detail: string;
  kind: EventKind;
  lawyerId: string;
  matterId?: string;
}

const INTERNAL_EVENTS: CalendarEvent[] = [
  {
    id: "int-1",
    date: "2026-08-03",
    time: "9:00 AM",
    title: "Weekly matter review",
    detail: "All fee earners · Conference room",
    kind: "internal",
    lawyerId: "ahmed-al-sayed",
  },
  {
    id: "int-2",
    date: "2026-08-07",
    time: "2:00 PM",
    title: "Client intake call — Samir Nassar",
    detail: "Consulting agreement renewal",
    kind: "internal",
    lawyerId: "youssef-adel",
  },
  {
    id: "int-3",
    date: "2026-08-13",
    time: "11:00 AM",
    title: "Partner finance review",
    detail: "July collections and payouts",
    kind: "internal",
    lawyerId: "ahmed-al-sayed",
  },
];

const KIND_ICON = {
  hearing: ScaleIcon,
  deadline: ClockIcon,
  internal: UserGroupIcon,
} as const;

const KIND_LABEL = {
  hearing: "Hearing",
  deadline: "Deadline",
  internal: "Internal",
} as const;

function buildEvents(): CalendarEvent[] {
  const hearingEvents: CalendarEvent[] = HEARINGS.map((h) => {
    const matter = matterById(h.matterId);
    return {
      id: h.id,
      date: h.date,
      time: h.time,
      title: matter?.name ?? h.purpose,
      detail: `${h.court} · ${h.purpose}`,
      kind: "hearing" as const,
      lawyerId: matter?.responsibleLawyerId ?? "ahmed-al-sayed",
      matterId: h.matterId,
    };
  });

  const deadlineEvents: CalendarEvent[] = TASKS.filter((t) => t.status !== "Done").map((t) => {
    const matter = matterById(t.matterId);
    return {
      id: `task-${t.id}`,
      date: t.dueDate,
      title: t.title,
      detail: matter ? matter.name : "Firm task",
      kind: "deadline" as const,
      lawyerId: t.assigneeId,
      matterId: t.matterId,
    };
  });

  return [...hearingEvents, ...deadlineEvents, ...INTERNAL_EVENTS];
}

export default function CalendarPage() {
  const [lawyerFilter, setLawyerFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const events = useMemo(buildEvents, []);
  const filtered = useMemo(
    () => (lawyerFilter === "all" ? events : events.filter((e) => e.lawyerId === lawyerFilter)),
    [events, lawyerFilter],
  );

  const byDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filtered) {
      (map[e.date] ??= []).push(e);
    }
    return map;
  }, [filtered]);

  // Month grid: pad to the Sunday before the 1st so weekday columns line up.
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(YEAR, MONTH, 1));
    const daysInMonth = new Date(Date.UTC(YEAR, MONTH + 1, 0)).getUTCDate();
    const leading = first.getUTCDay();
    const out: (string | null)[] = Array(leading).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(`${YEAR}-${String(MONTH + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, []);

  const selectedEvents = (byDate[selectedDate] ?? []).sort((a, b) =>
    (a.time ?? "zz") < (b.time ?? "zz") ? -1 : 1,
  );

  const upcoming = filtered
    .filter((e) => e.date >= TODAY)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 6);

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
            <VStack gap={1}>
              <Heading level={2}>Calendar</Heading>
              <Text type="body" color="secondary">
                August 2026 · hearings, deadlines, and internal appointments
              </Text>
            </VStack>
            <HStack gap={2} vAlign="center">
              <Selector
                label="Filter by lawyer"
                value={lawyerFilter}
                onChange={setLawyerFilter}
                options={[
                  { value: "all", label: "Whole firm" },
                  ...TEAM.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
              <Button
                label="New event"
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                New event
              </Button>
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <Card className="min-w-0">
            <VStack gap={4}>
              <HStack hAlign="between" vAlign="center">
                <Heading level={4}>August 2026</Heading>
                <HStack gap={1}>
                  <Button
                    label="Previous month"
                    variant="ghost"
                    isIconOnly
                    isDisabled
                    icon={<Icon icon={ChevronLeftIcon} size="sm" />}
                  />
                  <Button
                    label="Next month"
                    variant="ghost"
                    isIconOnly
                    isDisabled
                    icon={<Icon icon={ChevronRightIcon} size="sm" />}
                  />
                </HStack>
              </HStack>

              <Grid columns={7} gap={2} className="min-w-0">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <Text key={d} type="supporting" color="secondary" weight="semibold">
                    {d}
                  </Text>
                ))}
                {cells.map((date, i) => {
                  if (!date) {
                    return <VStack key={`pad-${i}`} gap={0} minHeight={96} />;
                  }
                  const dayEvents = byDate[date] ?? [];
                  const isToday = date === TODAY;
                  const isSelected = date === selectedDate;
                  return (
                    <Card
                      key={date}
                      padding={2}
                      minHeight={96}
                      variant={isSelected ? "muted" : "default"}
                      onClick={() => setSelectedDate(date)}
                      className="cursor-pointer min-w-0 overflow-hidden"
                    >
                      <VStack gap={1}>
                        <Text
                          type="label"
                          weight={isToday ? "bold" : "normal"}
                          color={isToday ? "accent" : "primary"}
                        >
                          {Number(date.slice(8))}
                        </Text>
                        {dayEvents.slice(0, 2).map((e) => (
                          <HStack key={e.id} gap={1} vAlign="center" className="min-w-0">
                            <Icon icon={KIND_ICON[e.kind]} size="xsm" color="secondary" />
                            <Text
                              type="supporting"
                              color="secondary"
                              className="truncate min-w-0"
                            >
                              {e.title}
                            </Text>
                          </HStack>
                        ))}
                        {dayEvents.length > 2 && (
                          <Text type="supporting" color="secondary">
                            +{dayEvents.length - 2} more
                          </Text>
                        )}
                      </VStack>
                    </Card>
                  );
                })}
              </Grid>
            </VStack>
          </Card>
        </LayoutContent>
      }
      end={
        <LayoutPanel width={320} padding={0} isScrollable>
          <VStack gap={6}>
            <Card>
              <VStack gap={4}>
                <Heading level={4}>{formatDate(selectedDate)}</Heading>
                {selectedEvents.length === 0 ? (
                  <EmptyState title="Nothing scheduled" description="No events on this day." />
                ) : (
                  <List hasDividers density="compact">
                    {selectedEvents.map((e) => (
                      <ListItem
                        key={e.id}
                        label={e.title}
                        description={e.detail}
                        href={e.matterId ? `/matters/${e.matterId}` : undefined}
                        startContent={<Icon icon={KIND_ICON[e.kind]} size="sm" color="secondary" />}
                        endContent={
                          <VStack gap={0} align="end">
                            <Text type="supporting" color="secondary">
                              {e.time ?? "All day"}
                            </Text>
                            <Text type="supporting" color="secondary">
                              {KIND_LABEL[e.kind]}
                            </Text>
                          </VStack>
                        }
                      />
                    ))}
                  </List>
                )}
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>Coming up</Heading>
                  <Link href="/tasks">All tasks</Link>
                </HStack>
                <List hasDividers density="compact">
                  {upcoming.map((e) => (
                    <ListItem
                      key={e.id}
                      label={e.title}
                      description={`${KIND_LABEL[e.kind]} · ${teamMember(e.lawyerId).name}`}
                      startContent={<Icon icon={KIND_ICON[e.kind]} size="sm" color="secondary" />}
                      endContent={
                        <Text type="supporting" color="secondary">
                          {e.date.slice(5)}
                        </Text>
                      }
                    />
                  ))}
                </List>
              </VStack>
            </Card>

            <Card>
              <VStack gap={3}>
                <Heading level={4}>Legend</Heading>
                <HStack gap={2} vAlign="center">
                  <Icon icon={ScaleIcon} size="sm" color="secondary" />
                  <Text type="body">Court hearing</Text>
                </HStack>
                <HStack gap={2} vAlign="center">
                  <Icon icon={ClockIcon} size="sm" color="secondary" />
                  <Text type="body">Filing deadline</Text>
                </HStack>
                <HStack gap={2} vAlign="center">
                  <Icon icon={UserGroupIcon} size="sm" color="secondary" />
                  <Text type="body">Internal appointment</Text>
                </HStack>
              </VStack>
            </Card>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}
