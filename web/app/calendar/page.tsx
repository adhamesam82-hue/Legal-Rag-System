"use client";

import { useMemo, useState } from "react";
import {
  Layout,
  LayoutHeader,
  LayoutContent,
  LayoutPanel,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ScaleIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  formatDate,
  todayIso,
  type ISODateString,
  type Matter,
} from "@/lib/practice";

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

const KIND_ICON = {
  hearing: ScaleIcon,
  deadline: ClockIcon,
  task: CheckCircleIcon,
} as const;

const KIND_LABEL = {
  hearing: "Hearing",
  deadline: "Case deadline",
  task: "Task",
} as const;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default function CalendarPage() {
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
        detail: task.matter_name ?? "Firm task",
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
          detail: `${record.case_number} · ${record.matter_name}`,
          kind: "deadline",
          owner: matterById.get(record.matter_id)?.responsible_user ?? "",
          matterId: record.matter_id,
        })),
    );

    return [...hearingEvents, ...taskEvents, ...deadlineEvents];
  }, [resource.data]);

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

  const monthLabel = new Date(`${monthStart}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={0}>
            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
              <VStack gap={1}>
                <Heading level={2}>Calendar</Heading>
                <Text type="body" color="secondary">
                  Hearings, case deadlines and task due dates
                </Text>
              </VStack>
              <HStack gap={2} vAlign="center">
                <Selector
                  label="Filter by lawyer"
                  value={ownerFilter}
                  onChange={(v) => setOwnerFilter(v ?? "all")}
                  options={[
                    { value: "all", label: "Whole firm" },
                    ...members.map((m) => ({
                      value: m.clerk_user_id,
                      label: m.display_name ?? m.clerk_user_id,
                    })),
                  ]}
                />
                <Button
                  label="Schedule hearing"
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsCreating(true)}
                  isDisabled={!practice}
                >
                  Schedule hearing
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
                  <Heading level={4}>{monthLabel}</Heading>
                  <HStack gap={1}>
                    <Button
                      label="Previous month"
                      variant="ghost"
                      isIconOnly
                      icon={<Icon icon={ChevronLeftIcon} size="sm" />}
                      onClick={() => shiftMonth(-1)}
                    />
                    <Button
                      label="Next month"
                      variant="ghost"
                      isIconOnly
                      icon={<Icon icon={ChevronRightIcon} size="sm" />}
                      onClick={() => shiftMonth(1)}
                    />
                  </HStack>
                </HStack>

                <DataView resource={resource} loadingLabel="Loading calendar…">
                  {() => (
                    <Grid columns={7} gap={2} className="min-w-0">
                      {WEEKDAYS.map((d) => (
                        <Text
                          key={d}
                          type="supporting"
                          color="secondary"
                          weight="semibold"
                        >
                          {d}
                        </Text>
                      ))}
                      {cells.map((date, index) => {
                        if (!date) {
                          return (
                            <VStack key={`pad-${index}`} gap={0} minHeight={96} />
                          );
                        }
                        const dayEvents = byDate[date] ?? [];
                        const isToday = date === today;
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
                              {dayEvents.slice(0, 2).map((event) => (
                                <HStack
                                  key={event.id}
                                  gap={1}
                                  vAlign="center"
                                  className="min-w-0"
                                >
                                  <Icon
                                    icon={KIND_ICON[event.kind]}
                                    size="xsm"
                                    color="secondary"
                                  />
                                  <Text
                                    type="supporting"
                                    color="secondary"
                                    className="truncate min-w-0"
                                  >
                                    {event.title}
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
                  )}
                </DataView>
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
                    <EmptyState
                      title="Nothing scheduled"
                      description="No events on this day."
                    />
                  ) : (
                    <List hasDividers density="compact">
                      {selectedEvents.map((event) => (
                        <ListItem
                          key={event.id}
                          label={event.title}
                          description={event.detail}
                          href={
                            event.matterId ? `/matters/${event.matterId}` : undefined
                          }
                          startContent={
                            <Icon
                              icon={KIND_ICON[event.kind]}
                              size="sm"
                              color="secondary"
                            />
                          }
                          endContent={
                            <VStack gap={0} align="end">
                              <Text type="supporting" color="secondary">
                                {event.time || "All day"}
                              </Text>
                              <Text type="supporting" color="secondary">
                                {KIND_LABEL[event.kind]}
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
                  {upcoming.length === 0 ? (
                    <Text type="body" color="secondary">
                      Nothing upcoming.
                    </Text>
                  ) : (
                    <List hasDividers density="compact">
                      {upcoming.map((event) => (
                        <ListItem
                          key={event.id}
                          label={event.title}
                          description={`${KIND_LABEL[event.kind]}${
                            event.owner ? ` · ${memberName(event.owner)}` : ""
                          }`}
                          startContent={
                            <Icon
                              icon={KIND_ICON[event.kind]}
                              size="sm"
                              color="secondary"
                            />
                          }
                          endContent={
                            <Text type="supporting" color="secondary">
                              {event.date.slice(5)}
                            </Text>
                          }
                        />
                      ))}
                    </List>
                  )}
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
                    <Text type="body">Case deadline</Text>
                  </HStack>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={CheckCircleIcon} size="sm" color="secondary" />
                    <Text type="body">Task due</Text>
                  </HStack>
                </VStack>
              </Card>
            </VStack>
          </LayoutPanel>
        }
      />
      <NewHearingDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        matters={resource.data?.matters ?? []}
        defaultDate={selectedDate}
        onCreated={resource.reload}
      />
    </>
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
        exc instanceof Error ? exc.message : "Could not schedule this hearing.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title="Schedule hearing" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <Selector
                label="Matter"
                hasClear
                isRequired
                value={matterId}
                onChange={setMatterId}
                placeholder="Select a matter"
                options={matters.map((m) => ({ value: String(m.id), label: m.name }))}
              />
              <HStack gap={3}>
                <DateInput
                  label="Date"
                  value={date}
                  onChange={(v) => setDate(v ?? date)}
                />
                <TextInput label="Time" value={time} onChange={setTime} />
              </HStack>
              <TextInput
                label="Court"
                value={court}
                onChange={setCourt}
                placeholder="Cairo Economic Court"
              />
              <TextInput
                label="Purpose"
                value={purpose}
                onChange={setPurpose}
                placeholder="Evidence submission review"
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label="Cancel"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={saving ? "Saving…" : "Schedule"}
                variant="primary"
                onClick={submit}
                isDisabled={saving || !matterId}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
