"use client";

import { useMemo, useState } from "react";
import {
  Layout,
  LayoutHeader,
  LayoutContent,
  LayoutPanel,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import { VStack, HStack, StackItem } from "@astryxdesign/core/Stack";
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
import { useTranslator } from "@astryxdesign/core/i18n";
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
              <Heading level={2}>{t("@legalos.calendar.heading")}</Heading>
              <HStack gap={2} vAlign="center">
                <Selector
                  label={t("@legalos.calendar.filterByLawyer")}
                  value={ownerFilter}
                  onChange={(v) => setOwnerFilter(v ?? "all")}
                  options={[
                    { value: "all", label: t("@legalos.calendar.wholeFirm") },
                    ...members.map((m) => ({
                      value: m.clerk_user_id,
                      label: m.display_name ?? m.clerk_user_id,
                    })),
                  ]}
                />
                <Button
                  label={t("@legalos.calendar.scheduleHearing")}
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsCreating(true)}
                  isDisabled={!practice}
                >
                  {t("@legalos.calendar.scheduleHearing")}
                </Button>
              </HStack>
            </HStack>
          </LayoutHeader>
        }
        content={
          // Not scrollable: the month divides the height it is given (see the
          // grid below), so there is nothing to scroll past. The right rail is
          // the screen's one deliberate second scroll region.
          <LayoutContent padding={0}>
            <Card className="min-w-0" height="100%">
              <VStack gap={3} height="100%">
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>{monthLabel}</Heading>
                  <HStack gap={1}>
                    <Button
                      label={t("@legalos.calendar.previousMonth")}
                      variant="ghost"
                      isIconOnly
                      icon={<Icon icon={ChevronLeftIcon} size="sm" />}
                      onClick={() => shiftMonth(-1)}
                    />
                    <Button
                      label={t("@legalos.calendar.nextMonth")}
                      variant="ghost"
                      isIconOnly
                      icon={<Icon icon={ChevronRightIcon} size="sm" />}
                      onClick={() => shiftMonth(1)}
                    />
                  </HStack>
                </HStack>

                <DataView resource={resource} loadingLabel={t("@legalos.calendar.loading")}>
                  {() => (
                    <>
                      <Grid columns={7} gap={2} className="min-w-0">
                        {WEEKDAY_KEYS.map((key) => (
                          <Text
                            key={key}
                            type="supporting"
                            color="secondary"
                            weight="semibold"
                          >
                            {t(key)}
                          </Text>
                        ))}
                      </Grid>
                      {/* The six week rows divide whatever height is left
                       *  rather than each claiming a fixed 96px: with a fixed
                       *  height the last row was sliced off the bottom of the
                       *  viewport (30 and 31 half-visible) while weeks three
                       *  to five sat almost empty. `grid-rows-6` is Tailwind's
                       *  repeat(6, minmax(0, 1fr)); the minmax(0) is what lets
                       *  a row get shorter than the events inside it. */}
                      <StackItem size="fill">
                        <Grid columns={7} gap={2} className="grid-rows-6 h-full min-w-0">
                          {cells.map((date, index) => {
                            if (!date) {
                              return <VStack key={`pad-${index}`} gap={0} />;
                            }
                            const dayEvents = byDate[date] ?? [];
                            const isToday = date === today;
                            const isSelected = date === selectedDate;
                            return (
                              <Card
                                key={date}
                                padding={2}
                                variant={isSelected ? "muted" : "default"}
                                onClick={() => setSelectedDate(date)}
                                className="cursor-pointer min-w-0 min-h-0 overflow-hidden"
                              >
                                <VStack gap={0.5}>
                                  <Text
                                    type="label"
                                    weight={isToday ? "bold" : "normal"}
                                    color={isToday ? "accent" : "primary"}
                                  >
                                    {Number(date.slice(8))}
                                  </Text>
                                  {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
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
                                      {/* A day cell is ~90px wide at the 1280
                                       *  floor, so a matter name cannot fit
                                       *  whole here and never will; maxLines
                                       *  (rather than a CSS-only clamp) is
                                       *  what makes the full string
                                       *  recoverable, as a title attribute and
                                       *  a hover tooltip. The day's events are
                                       *  also listed in full in the rail. */}
                                      <Text
                                        size="xsm"
                                        color="secondary"
                                        maxLines={1}
                                        className="min-w-0"
                                      >
                                        {event.title}
                                      </Text>
                                    </HStack>
                                  ))}
                                  {dayEvents.length > MAX_CHIPS_PER_DAY && (
                                    <Text size="xsm" color="secondary">
                                      {t("@legalos.calendar.moreEvents", {
                                        count: dayEvents.length - MAX_CHIPS_PER_DAY,
                                      })}
                                    </Text>
                                  )}
                                </VStack>
                              </Card>
                            );
                          })}
                        </Grid>
                      </StackItem>
                    </>
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
                      title={t("@legalos.calendar.nothingScheduledTitle")}
                      description={t("@legalos.calendar.nothingScheduledDescription")}
                    />
                  ) : (
                    <List hasDividers density="compact">
                      {selectedEvents.map((event) => (
                        <ListItem
                          key={event.id}
                          // A plain string label is truncated to one line by
                          // ListItem, which left "Draft appeal brief respon…"
                          // in a 320px rail — the one place on this screen
                          // where the full title has to be readable, since it
                          // is where the month grid's chips send you. A node
                          // label opts out of that single-line rule.
                          label={
                            <Text type="label" weight="medium" maxLines={2}>
                              {event.title}
                            </Text>
                          }
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
                                {event.time || t("@legalos.calendar.allDay")}
                              </Text>
                              <Text type="supporting" color="secondary">
                                {t(KIND_LABEL_KEY[event.kind])}
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
                    <Heading level={4}>{t("@legalos.calendar.comingUp")}</Heading>
                    <Link href="/tasks">{t("@legalos.calendar.allTasksLink")}</Link>
                  </HStack>
                  {upcoming.length === 0 ? (
                    <Text type="body" color="secondary">
                      {t("@legalos.calendar.nothingUpcoming")}
                    </Text>
                  ) : (
                    <List hasDividers density="compact">
                      {upcoming.map((event) => (
                        <ListItem
                          key={event.id}
                          label={
                            <Text type="label" weight="medium" maxLines={2}>
                              {event.title}
                            </Text>
                          }
                          description={`${t(KIND_LABEL_KEY[event.kind])}${
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
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={<DialogHeader title={t("@legalos.calendar.dialog.title")} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <Selector
                label={t("@legalos.calendar.dialog.matterLabel")}
                hasClear
                isRequired
                value={matterId}
                onChange={setMatterId}
                placeholder={t("@legalos.calendar.dialog.matterPlaceholder")}
                options={matters.map((m) => ({ value: String(m.id), label: m.name }))}
              />
              <HStack gap={3}>
                <DateInput
                  label={t("@legalos.calendar.dialog.dateLabel")}
                  value={date}
                  onChange={(v) => setDate(v ?? date)}
                />
                <TextInput label={t("@legalos.calendar.dialog.timeLabel")} value={time} onChange={setTime} />
              </HStack>
              <TextInput
                label={t("@legalos.calendar.dialog.courtLabel")}
                value={court}
                onChange={setCourt}
                placeholder={t("@legalos.calendar.dialog.courtPlaceholder")}
              />
              <TextInput
                label={t("@legalos.calendar.dialog.purposeLabel")}
                value={purpose}
                onChange={setPurpose}
                placeholder={t("@legalos.calendar.dialog.purposePlaceholder")}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.calendar.dialog.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={saving ? t("@legalos.calendar.dialog.saving") : t("@legalos.calendar.dialog.schedule")}
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
