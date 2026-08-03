"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import {
  PlayIcon,
  StopIcon,
  ClockIcon,
  BriefcaseIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  todayIso,
  type ISODateString,
  type Matter,
  type TimeEntry,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";

const WEEKLY_TARGET_HOURS = 40;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAY_KEYS)[number];

/** Monday-anchored week containing `iso`. */
function weekDays(
  iso: string,
  intlLocale: string,
): { dayKey: DayKey; date: string; iso: string }[] {
  const anchor = new Date(`${iso}T00:00:00`);
  const offsetToMonday = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - offsetToMonday);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
    return {
      dayKey: DAY_KEYS[date.getDay()],
      date: date.toLocaleDateString(intlLocale, { month: "short", day: "numeric" }),
      iso: key,
    };
  });
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

interface EntryRow extends Record<string, unknown> {
  id: number;
  date: string;
  matter: string;
  description: string;
  lawyer: string;
  billable: boolean;
  hours: number;
  amount: number;
  invoiced: boolean;
}

export default function TimeTrackingPage() {
  const { formatDate, formatEGP, intlLocale } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const [view, setView] = useState<"day" | "week">("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const today = todayIso();
  const week = useMemo(() => weekDays(today, intlLocale), [today, intlLocale]);
  const weekStart = week[0].iso;
  const weekEnd = week[6].iso;

  const resource = useResource(
    async (api) => {
      const [entries, matters] = await Promise.all([
        api.time.list({ since: weekStart, until: weekEnd }),
        api.matters.list({ status: "active" }),
      ]);
      return { entries, matters };
    },
    [weekStart, weekEnd],
  );

  const entries = resource.data?.entries ?? [];
  const matters = resource.data?.matters ?? [];

  const chartData = useMemo(
    () =>
      week.map((d) => {
        const forDay = entries.filter((e) => e.entry_date === d.iso);
        return {
          day: t(`@legalos.timeTracking.day.${d.dayKey}`),
          billable: forDay
            .filter((e) => e.billable)
            .reduce((sum, e) => sum + Number(e.hours), 0),
          nonBillable: forDay
            .filter((e) => !e.billable)
            .reduce((sum, e) => sum + Number(e.hours), 0),
        };
      }),
    [week, entries, t],
  );

  const visibleEntries = useMemo<EntryRow[]>(() => {
    const day = selectedDay ?? (view === "day" ? today : null);
    return entries
      .filter((e) => !day || e.entry_date === day)
      .map((e) => ({
        id: e.id,
        date: formatDate(e.entry_date),
        matter: e.matter_name,
        description: e.description,
        lawyer: memberName(e.clerk_user_id),
        billable: e.billable,
        hours: Number(e.hours),
        amount: e.billable ? Number(e.hours) * Number(e.rate) : 0,
        invoiced: e.invoice_id !== null,
      }));
  }, [entries, selectedDay, view, today, memberName]);

  const perMember = useMemo(() => {
    const totals = new Map<string, { billable: number; nonBillable: number }>();
    for (const entry of entries) {
      const current = totals.get(entry.clerk_user_id) ?? {
        billable: 0,
        nonBillable: 0,
      };
      if (entry.billable) current.billable += Number(entry.hours);
      else current.nonBillable += Number(entry.hours);
      totals.set(entry.clerk_user_id, current);
    }
    return [...totals.entries()]
      .map(([userId, hours]) => ({ name: memberName(userId), ...hours }))
      .sort((a, b) => b.billable - a.billable);
  }, [entries, memberName]);

  const columns: TableColumn<EntryRow>[] = [
    {
      key: "date",
      header: t("@legalos.timeTracking.table.date"),
      width: pixel(110),
      renderCell: (item) => (
        <Text type="body" color="secondary">
          {item.date}
        </Text>
      ),
    },
    {
      key: "matter",
      header: t("@legalos.timeTracking.table.matter"),
      width: proportional(2),
      renderCell: (item) => (
        <Text type="body" weight="semibold" maxLines={2}>
          {item.matter}
        </Text>
      ),
    },
    {
      key: "description",
      header: t("@legalos.timeTracking.table.description"),
      width: proportional(3),
      renderCell: (item) => <Text type="body">{item.description || "—"}</Text>,
    },
    {
      key: "lawyer",
      header: t("@legalos.timeTracking.table.lawyer"),
      width: proportional(1.5),
      renderCell: (item) => (
        <Text type="body" color="secondary">
          {item.lawyer}
        </Text>
      ),
    },
    {
      key: "billable",
      header: t("@legalos.timeTracking.table.billable"),
      width: pixel(150),
      renderCell: (item) =>
        !item.billable ? (
          <Badge variant="neutral" label={t("@legalos.timeTracking.badge.nonBillable")} />
        ) : item.invoiced ? (
          <Badge variant="info" label={t("@legalos.timeTracking.badge.invoiced")} />
        ) : (
          <Text type="body" color="secondary">
            {formatEGP(item.amount)}
          </Text>
        ),
    },
    {
      key: "hours",
      header: t("@legalos.timeTracking.table.duration"),
      width: pixel(90),
      align: "end",
      renderCell: (item) => (
        <Text type="body" weight="semibold">
          {t("@legalos.timeTracking.hoursShort", { hours: item.hours.toFixed(1) })}
        </Text>
      ),
    },
  ];

  return (
    <>
      <Layout
        height="fill"
        content={
          <LayoutContent padding={0}>
            <VStack gap={6}>
              <HStack hAlign="between" vAlign="center">
                <VStack gap={1}>
                  <Heading level={2}>{t("@legalos.timeTracking.heading")}</Heading>
                  <Text type="body" color="secondary">
                    {t("@legalos.timeTracking.weekOf", {
                      start: week[0].date,
                      end: week[6].date,
                    })}
                  </Text>
                </VStack>
                <Button
                  label={t("@legalos.timeTracking.newTimeEntry")}
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsCreating(true)}
                >
                  {t("@legalos.timeTracking.newTimeEntry")}
                </Button>
              </HStack>

              <DataView resource={resource} loadingLabel={t("@legalos.timeTracking.loading")}>
                {() => (
                  <VStack gap={6}>
                    <Grid columns={3} gap={6}>
                      <LiveTimer matters={matters} onLogged={resource.reload} />
                      <GridSpan columns={2}>
                        <Card>
                          <VStack gap={4}>
                            <HStack hAlign="between" vAlign="center">
                              <Heading level={4}>
                                {t("@legalos.timeTracking.chart.heading")}
                              </Heading>
                              <Text type="supporting" color="secondary">
                                {t("@legalos.timeTracking.chart.thisWeek")}
                              </Text>
                            </HStack>
                            <ResponsiveContainer width="100%" height={220}>
                              <BarChart
                                data={chartData}
                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                              >
                                <CartesianGrid
                                  horizontal
                                  vertical={false}
                                  stroke="var(--color-border)"
                                />
                                <XAxis
                                  dataKey="day"
                                  tick={{ fontSize: "var(--font-size-sm)", fill: "var(--color-text-secondary)" }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  tick={{ fontSize: "var(--font-size-sm)", fill: "var(--color-text-secondary)" }}
                                  axisLine={false}
                                  tickLine={false}
                                  width={32}
                                />
                                <Tooltip
                                  formatter={(value, name) => [
                                    t("@legalos.timeTracking.hoursShort", { hours: value }),
                                    name,
                                  ]}
                                  contentStyle={{
                                    background: "var(--color-background-popover)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "var(--radius-element)",
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: "var(--font-size-sm)" }} />
                                <Bar
                                  dataKey="billable"
                                  name={t("@legalos.timeTracking.chart.billable")}
                                  fill="var(--color-accent)"
                                  radius={[4, 4, 0, 0]}
                                  stackId="hours"
                                />
                                <Bar
                                  dataKey="nonBillable"
                                  name={t("@legalos.timeTracking.chart.nonBillable")}
                                  fill="var(--color-border-strong)"
                                  radius={[4, 4, 0, 0]}
                                  stackId="hours"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </VStack>
                        </Card>
                      </GridSpan>
                    </Grid>

                    <Card>
                      <VStack gap={4}>
                        <HStack hAlign="between" vAlign="center">
                          <Heading level={4}>
                            {t("@legalos.timeTracking.weekOverview.heading")}
                          </Heading>
                          <SegmentedControl
                            label={t("@legalos.timeTracking.weekOverview.calendarViewLabel")}
                            value={view}
                            onChange={(v) => {
                              setView(v as "day" | "week");
                              if (v === "week") setSelectedDay(null);
                            }}
                            size="sm"
                          >
                            <SegmentedControlItem
                              value="week"
                              label={t("@legalos.timeTracking.weekOverview.week")}
                            />
                            <SegmentedControlItem
                              value="day"
                              label={t("@legalos.timeTracking.weekOverview.day")}
                            />
                          </SegmentedControl>
                        </HStack>
                        <Grid columns={7} gap={2}>
                          {week.map((d) => {
                            const total = entries
                              .filter((e) => e.entry_date === d.iso)
                              .reduce((sum, e) => sum + Number(e.hours), 0);
                            const isSelected = selectedDay === d.iso;
                            const isToday = d.iso === today;
                            const dayLabel = t(`@legalos.timeTracking.day.${d.dayKey}`);
                            return (
                              <Card
                                key={d.iso}
                                variant={
                                  isSelected ? "green" : isToday ? "muted" : "default"
                                }
                              >
                                <VStack gap={2}>
                                  <HStack hAlign="between" vAlign="center">
                                    <Text type="label" weight="semibold">
                                      {dayLabel}
                                    </Text>
                                    {isToday && (
                                      <Badge
                                        variant="info"
                                        label={t("@legalos.timeTracking.weekOverview.today")}
                                      />
                                    )}
                                  </HStack>
                                  <Text type="supporting" color="secondary">
                                    {d.date}
                                  </Text>
                                  <Divider />
                                  <Text type="body" weight="semibold">
                                    {total > 0
                                      ? t("@legalos.timeTracking.hoursShort", {
                                          hours: total.toFixed(1),
                                        })
                                      : "—"}
                                  </Text>
                                  <Button
                                    label={t("@legalos.timeTracking.weekOverview.viewDay", {
                                      day: dayLabel,
                                    })}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setSelectedDay(isSelected ? null : d.iso)
                                    }
                                  >
                                    {isSelected
                                      ? t("@legalos.timeTracking.weekOverview.clear")
                                      : t("@legalos.timeTracking.weekOverview.view")}
                                  </Button>
                                </VStack>
                              </Card>
                            );
                          })}
                        </Grid>
                      </VStack>
                    </Card>

                    <Grid columns={3} gap={6}>
                      <GridSpan columns={2}>
                        <Card>
                          <VStack gap={4}>
                            <HStack hAlign="between" vAlign="center">
                              <Heading level={4}>
                                {t("@legalos.timeTracking.entries.heading")}
                              </Heading>
                              <Text type="supporting" color="secondary">
                                {selectedDay
                                  ? t("@legalos.timeTracking.entries.showingDate", {
                                      date: formatDate(selectedDay),
                                    })
                                  : view === "day"
                                    ? t("@legalos.timeTracking.entries.showingToday", {
                                        date: formatDate(today),
                                      })
                                    : t("@legalos.timeTracking.entries.showingFullWeek")}
                              </Text>
                            </HStack>
                            {visibleEntries.length > 0 ? (
                              <Table<EntryRow>
                                data={visibleEntries}
                                columns={columns}
                                idKey="id"
                                hasHover
                                density="compact"
                              />
                            ) : (
                              <Text type="body" color="secondary">
                                {t("@legalos.timeTracking.entries.empty")}
                              </Text>
                            )}
                          </VStack>
                        </Card>
                      </GridSpan>

                      <Card>
                        <VStack gap={4}>
                          <HStack hAlign="between" vAlign="center">
                            <Heading level={4}>
                              {t("@legalos.timeTracking.summary.heading")}
                            </Heading>
                            <Link href="/reports">
                              {t("@legalos.timeTracking.summary.fullReport")}
                            </Link>
                          </HStack>
                          <Text type="supporting" color="secondary">
                            {t("@legalos.timeTracking.summary.targetLabel", {
                              hours: WEEKLY_TARGET_HOURS,
                            })}
                          </Text>
                          {perMember.length === 0 ? (
                            <Text type="body" color="secondary">
                              {t("@legalos.timeTracking.summary.empty")}
                            </Text>
                          ) : (
                            <VStack gap={4}>
                              {perMember.map((member) => (
                                <VStack key={member.name} gap={1}>
                                  <HStack hAlign="between" vAlign="center">
                                    <HStack gap={2} vAlign="center">
                                      <Icon
                                        icon={BriefcaseIcon}
                                        size="sm"
                                        color="secondary"
                                      />
                                      <Text type="label">{member.name}</Text>
                                    </HStack>
                                    <Text type="supporting" color="secondary">
                                      {t("@legalos.timeTracking.summary.billableHours", {
                                        hours: member.billable.toFixed(1),
                                      })}
                                      {member.nonBillable > 0
                                        ? ` · ${t("@legalos.timeTracking.summary.otherHours", {
                                            hours: member.nonBillable.toFixed(1),
                                          })}`
                                        : ""}
                                    </Text>
                                  </HStack>
                                  <ProgressBar
                                    label={t(
                                      "@legalos.timeTracking.summary.utilizationAriaLabel",
                                      { name: member.name },
                                    )}
                                    isLabelHidden
                                    value={Math.round(
                                      (member.billable / WEEKLY_TARGET_HOURS) * 100,
                                    )}
                                    max={100}
                                    hasValueLabel
                                    variant="accent"
                                  />
                                </VStack>
                              ))}
                            </VStack>
                          )}
                        </VStack>
                      </Card>
                    </Grid>
                  </VStack>
                )}
              </DataView>
            </VStack>
          </LayoutContent>
        }
      />
      <TimeEntryDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        matters={matters}
        onSaved={resource.reload}
      />
    </>
  );
}

/** Wall-clock timer that writes a real entry when stopped. */
function LiveTimer({
  matters,
  onLogged,
}: {
  matters: Matter[];
  onLogged: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [matterId, setMatterId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  async function stopAndLog() {
    setIsRunning(false);
    if (!practice || !matterId || seconds < 1) {
      setSeconds(0);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await practice.time.create({
        matter_id: Number(matterId),
        entry_date: todayIso(),
        // Billed to two decimals; anything under 36 seconds would round to
        // zero and the API rejects a zero-hour entry.
        hours: Math.max(0.01, Math.round((seconds / 3600) * 100) / 100),
        description,
      });
      setSeconds(0);
      setDescription("");
      onLogged();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.timeTracking.timer.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <VStack gap={4}>
        <HStack hAlign="between" vAlign="center">
          <Heading level={4}>{t("@legalos.timeTracking.timer.heading")}</Heading>
          {isRunning && (
            <Badge
              variant="success"
              label={t("@legalos.timeTracking.timer.running")}
              icon={<Icon icon={ClockIcon} size="xsm" color="inherit" />}
            />
          )}
        </HStack>
        <InlineError message={error} onDismiss={() => setError(null)} />
        <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={3}>
          <Selector
            label={t("@legalos.timeTracking.timer.matterLabel")}
            hasClear
            options={matters.map((m) => ({ value: String(m.id), label: m.name }))}
            value={matterId}
            onChange={setMatterId}
            placeholder={t("@legalos.timeTracking.timer.matterPlaceholder")}
          />
          <TextInput
            label={t("@legalos.timeTracking.timer.descriptionLabel")}
            value={description}
            onChange={setDescription}
            placeholder={t("@legalos.timeTracking.timer.descriptionPlaceholder")}
          />
        </Grid>
        <HStack hAlign="between" vAlign="center">
          <Text type="body" size="4xl" weight="bold" hasTabularNumbers>
            {formatDuration(seconds)}
          </Text>
          <Button
            label={
              isRunning
                ? t("@legalos.timeTracking.timer.stopAndLog")
                : t("@legalos.timeTracking.timer.start")
            }
            variant={isRunning ? "destructive" : "primary"}
            icon={
              <Icon icon={isRunning ? StopIcon : PlayIcon} size="sm" color="inherit" />
            }
            isDisabled={saving || (!isRunning && !matterId)}
            onClick={() => (isRunning ? stopAndLog() : setIsRunning(true))}
          >
            {isRunning
              ? t("@legalos.timeTracking.timer.stopShort")
              : t("@legalos.timeTracking.timer.startShort")}
          </Button>
        </HStack>
        {!matterId && !isRunning && (
          <Text type="supporting" color="secondary">
            {t("@legalos.timeTracking.timer.pickMatterHint")}
          </Text>
        )}
      </VStack>
    </Card>
  );
}

function TimeEntryDialog({
  isOpen,
  onOpenChange,
  matters,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  matters: Matter[];
  onSaved: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const [matterId, setMatterId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState<ISODateString>(todayIso);
  const [hours, setHours] = useState(1);
  const [rate, setRate] = useState(0);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!practice || !matterId || hours <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await practice.time.create({
        matter_id: Number(matterId),
        entry_date: entryDate,
        hours,
        rate,
        description,
        billable,
      });
      setDescription("");
      setHours(1);
      onOpenChange(false);
      onSaved();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.timeTracking.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.timeTracking.dialog.title")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <Selector
                label={t("@legalos.timeTracking.dialog.matterLabel")}
                hasClear
                isRequired
                value={matterId}
                onChange={setMatterId}
                placeholder={t("@legalos.timeTracking.dialog.matterPlaceholder")}
                options={matters.map((m) => ({ value: String(m.id), label: m.name }))}
              />
              <HStack gap={3}>
                <DateInput
                  label={t("@legalos.timeTracking.dialog.dateLabel")}
                  value={entryDate}
                  onChange={(v) => setEntryDate(v ?? entryDate)}
                />
                <NumberInput
                  label={t("@legalos.timeTracking.dialog.hoursLabel")}
                  value={hours}
                  onChange={(v) => setHours(v ?? 0)}
                  min={0.25}
                  max={24}
                  step={0.25}
                />
                <NumberInput
                  label={t("@legalos.timeTracking.dialog.rateLabel")}
                  value={rate}
                  onChange={(v) => setRate(v ?? 0)}
                  min={0}
                  step={50}
                />
              </HStack>
              <TextInput
                label={t("@legalos.timeTracking.dialog.descriptionLabel")}
                value={description}
                onChange={setDescription}
                placeholder={t("@legalos.timeTracking.dialog.descriptionPlaceholder")}
              />
              <CheckboxInput
                label={t("@legalos.timeTracking.dialog.billableLabel")}
                value={billable}
                onChange={setBillable}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.timeTracking.dialog.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.timeTracking.dialog.saving")
                    : t("@legalos.timeTracking.dialog.logTime")
                }
                variant="primary"
                onClick={submit}
                isDisabled={saving || !matterId || hours <= 0}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
