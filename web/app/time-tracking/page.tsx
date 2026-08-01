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
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
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

// ---------------------------------------------------------------------------
// Mock data — no time-tracking backend exists yet; this is the UI concept
// pass. Week anchored on "today" as used on the dashboard (Wed, Jul 31).
// ---------------------------------------------------------------------------

const MATTERS = [
  "Nabil v. Nile Trading Co.",
  "Delta Foods Labour Dispute",
  "Khalil Holdings Contract Review",
  "El-Sayed Estate Partition",
  "Al Amal Trading Renewal",
];

interface TimeEntry extends Record<string, unknown> {
  id: string;
  day: string;
  date: string;
  matter: string;
  description: string;
  hours: number;
  lawyer: string;
  billable: boolean;
}

const TIME_ENTRIES: TimeEntry[] = [
  { id: "t1", day: "Mon", date: "Jul 29", matter: "Nabil v. Nile Trading Co.", description: "Drafted appeal brief", hours: 3.5, lawyer: "Ahmed Al-Sayed", billable: true },
  { id: "t2", day: "Mon", date: "Jul 29", matter: "Delta Foods Labour Dispute", description: "Reviewed witness statements", hours: 2.0, lawyer: "Mona Farouk", billable: true },
  { id: "t3", day: "Mon", date: "Jul 29", matter: "Khalil Holdings Contract Review", description: "Client call re: indemnity clause", hours: 1.0, lawyer: "Youssef Adel", billable: true },
  { id: "t4", day: "Mon", date: "Jul 29", matter: "Internal", description: "Filed court documents", hours: 1.5, lawyer: "Layla Hassan", billable: false },
  { id: "t5", day: "Tue", date: "Jul 30", matter: "Nabil v. Nile Trading Co.", description: "Hearing preparation", hours: 4.0, lawyer: "Ahmed Al-Sayed", billable: true },
  { id: "t6", day: "Tue", date: "Jul 30", matter: "El-Sayed Estate Partition", description: "Drafted partition agreement", hours: 3.0, lawyer: "Mona Farouk", billable: true },
  { id: "t7", day: "Tue", date: "Jul 30", matter: "Delta Foods Labour Dispute", description: "Research on labour law precedent", hours: 2.5, lawyer: "Youssef Adel", billable: true },
  { id: "t8", day: "Tue", date: "Jul 30", matter: "Internal", description: "Administrative filing", hours: 1.0, lawyer: "Layla Hassan", billable: false },
  { id: "t9", day: "Wed", date: "Jul 31", matter: "Al Amal Trading Renewal", description: "Reviewed commercial registration renewal", hours: 2.0, lawyer: "Ahmed Al-Sayed", billable: true },
  { id: "t10", day: "Wed", date: "Jul 31", matter: "Nabil v. Nile Trading Co.", description: "Client update call", hours: 0.5, lawyer: "Mona Farouk", billable: true },
  { id: "t11", day: "Wed", date: "Jul 31", matter: "Khalil Holdings Contract Review", description: "Drafted contract amendments", hours: 3.0, lawyer: "Youssef Adel", billable: true },
];

const WEEK_DAYS = [
  { day: "Mon", date: "Jul 29", billable: 6.5, nonBillable: 1.5 },
  { day: "Tue", date: "Jul 30", billable: 9.5, nonBillable: 1.0 },
  { day: "Wed", date: "Jul 31", billable: 5.5, nonBillable: 0 },
  { day: "Thu", date: "Aug 1", billable: 0, nonBillable: 0 },
  { day: "Fri", date: "Aug 2", billable: 0, nonBillable: 0 },
  { day: "Sat", date: "Aug 3", billable: 0, nonBillable: 0 },
  { day: "Sun", date: "Aug 4", billable: 0, nonBillable: 0 },
];

const TODAY = "Wed";

const TIMESHEET_SUMMARY = [
  { name: "Ahmed Al-Sayed", billable: 9.5, nonBillable: 0 },
  { name: "Mona Farouk", billable: 5.5, nonBillable: 0 },
  { name: "Youssef Adel", billable: 6.5, nonBillable: 0 },
  { name: "Layla Hassan", billable: 0, nonBillable: 2.5 },
];

const WEEKLY_TARGET_HOURS = 40;

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function TimeChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={WEEK_DAYS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          formatter={(value, name) => [`${value}h`, name]}
          contentStyle={{
            background: "var(--color-background-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-element)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="billable" name="Billable" fill="var(--color-accent)" radius={[4, 4, 0, 0]} stackId="hours" />
        <Bar dataKey="nonBillable" name="Non-billable" fill="var(--color-border-strong)" radius={[4, 4, 0, 0]} stackId="hours" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LiveTimer() {
  const [isRunning, setIsRunning] = useState(true);
  const [seconds, setSeconds] = useState(2538); // 00:42:18 already elapsed
  const [matter, setMatter] = useState(MATTERS[0]);
  const [description, setDescription] = useState("Drafting appeal brief — Section 4");

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <Card>
      <VStack gap={4}>
        <HStack hAlign="between" vAlign="center">
          <Heading level={4}>Timer</Heading>
          {isRunning && <Badge variant="success" label="Running" icon={<Icon icon={ClockIcon} size="xsm" color="inherit" />} />}
        </HStack>
        <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={3}>
          <Selector
            label="Matter"
            options={MATTERS.map((m) => ({ value: m, label: m }))}
            value={matter}
            onChange={(v) => setMatter(v)}
          />
          <TextInput
            label="Description"
            value={description}
            onChange={(v) => setDescription(v)}
            placeholder="What are you working on?"
          />
        </Grid>
        <HStack hAlign="between" vAlign="center">
          <Text type="body" size="4xl" weight="bold" hasTabularNumbers>
            {formatDuration(seconds)}
          </Text>
          <Button
            label={isRunning ? "Stop timer" : "Start timer"}
            variant={isRunning ? "destructive" : "primary"}
            icon={<Icon icon={isRunning ? StopIcon : PlayIcon} size="sm" color="inherit" />}
            onClick={() => setIsRunning((r) => !r)}
          >
            {isRunning ? "Stop" : "Start"}
          </Button>
        </HStack>
      </VStack>
    </Card>
  );
}

function WeekOverview({
  selectedDay,
  onSelectDay,
}: {
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}) {
  return (
    <Grid columns={7} gap={2}>
      {WEEK_DAYS.map((d) => {
        const total = d.billable + d.nonBillable;
        const isSelected = selectedDay === d.day;
        return (
          <Card
            key={d.day}
            variant={isSelected ? "green" : d.day === TODAY ? "muted" : "default"}
          >
            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center">
                <Text type="label" weight="semibold">
                  {d.day}
                </Text>
                {d.day === TODAY && <Badge variant="info" label="Today" />}
              </HStack>
              <Text type="supporting" color="secondary">
                {d.date}
              </Text>
              <Divider />
              <Text type="body" weight="semibold">
                {total > 0 ? `${total}h` : "—"}
              </Text>
              <Button
                label={`View ${d.day}`}
                variant="ghost"
                size="sm"
                onClick={() => onSelectDay(isSelected ? null : d.day)}
              >
                {isSelected ? "Clear" : "View"}
              </Button>
            </VStack>
          </Card>
        );
      })}
    </Grid>
  );
}

export default function TimeTrackingPage() {
  const [view, setView] = useState<"day" | "week">("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const visibleEntries = useMemo(() => {
    if (view === "day" || selectedDay) {
      const day = selectedDay ?? TODAY;
      return TIME_ENTRIES.filter((e) => e.day === day);
    }
    return TIME_ENTRIES;
  }, [view, selectedDay]);

  const columns: TableColumn<TimeEntry>[] = [
    {
      key: "date",
      header: "Date",
      width: pixel(90),
      renderCell: (item) => (
        <Text type="body" color="secondary">
          {item.date}
        </Text>
      ),
    },
    {
      key: "matter",
      header: "Matter",
      width: proportional(2),
      renderCell: (item) => (
        <Text type="body" weight="semibold" maxLines={1}>
          {item.matter}
        </Text>
      ),
    },
    {
      key: "description",
      header: "Description",
      width: proportional(3),
      renderCell: (item) => <Text type="body">{item.description}</Text>,
    },
    {
      key: "lawyer",
      header: "Lawyer",
      width: proportional(1.5),
      renderCell: (item) => (
        <Text type="body" color="secondary">
          {item.lawyer}
        </Text>
      ),
    },
    {
      key: "billable",
      header: "Billable",
      width: pixel(120),
      renderCell: (item) =>
        item.billable ? (
          <Text type="body" color="secondary">
            Billable
          </Text>
        ) : (
          <Badge variant="neutral" label="Non-billable" />
        ),
    },
    {
      key: "hours",
      header: "Duration",
      width: pixel(90),
      align: "end",
      renderCell: (item) => (
        <Text type="body" weight="semibold">
          {item.hours.toFixed(1)}h
        </Text>
      ),
    },
  ];

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <HStack hAlign="between" vAlign="center">
              <VStack gap={1}>
                <Heading level={2}>Time Tracking</Heading>
                <Text type="body" color="secondary">
                  Al-Sayed &amp; Partners · week of Jul 29 – Aug 4
                </Text>
              </VStack>
              <Button
                label="New time entry"
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                New time entry
              </Button>
            </HStack>

            <Grid columns={3} gap={6}>
              <LiveTimer />
              <GridSpan columns={2}>
                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <Heading level={4}>Billable vs. non-billable hours</Heading>
                      <Text type="supporting" color="secondary">
                        This week
                      </Text>
                    </HStack>
                    <TimeChart />
                  </VStack>
                </Card>
              </GridSpan>
            </Grid>

            <Card>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>Week overview</Heading>
                  <SegmentedControl
                    label="Calendar view"
                    value={view}
                    onChange={(v) => {
                      setView(v as "day" | "week");
                      if (v === "week") setSelectedDay(null);
                    }}
                    size="sm"
                  >
                    <SegmentedControlItem value="week" label="Week" />
                    <SegmentedControlItem value="day" label="Day" />
                  </SegmentedControl>
                </HStack>
                <WeekOverview selectedDay={selectedDay} onSelectDay={setSelectedDay} />
              </VStack>
            </Card>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <Heading level={4}>Time entries</Heading>
                      <Text type="supporting" color="secondary">
                        {selectedDay
                          ? `Showing ${selectedDay}, ${WEEK_DAYS.find((d) => d.day === selectedDay)?.date}`
                          : view === "day"
                            ? `Showing today, ${WEEK_DAYS.find((d) => d.day === TODAY)?.date}`
                            : "Showing full week"}
                      </Text>
                    </HStack>
                    {visibleEntries.length > 0 ? (
                      <Table<TimeEntry>
                        data={visibleEntries}
                        columns={columns}
                        idKey="id"
                        hasHover
                        density="compact"
                      />
                    ) : (
                      <Text type="body" color="secondary">
                        No time logged for this day yet.
                      </Text>
                    )}
                  </VStack>
                </Card>
              </GridSpan>

              <Card>
                <VStack gap={4}>
                  <HStack hAlign="between" vAlign="center">
                    <Heading level={4}>Timesheet summary</Heading>
                    <Link href="/reports">Full report</Link>
                  </HStack>
                  <Text type="supporting" color="secondary">
                    Week to date, target {WEEKLY_TARGET_HOURS}h billable
                  </Text>
                  <VStack gap={4}>
                    {TIMESHEET_SUMMARY.map((t) => {
                      const utilization = Math.round((t.billable / WEEKLY_TARGET_HOURS) * 100);
                      return (
                        <VStack key={t.name} gap={1}>
                          <HStack hAlign="between" vAlign="center">
                            <HStack gap={2} vAlign="center">
                              <Icon icon={BriefcaseIcon} size="sm" color="secondary" />
                              <Text type="label">{t.name}</Text>
                            </HStack>
                            <Text type="supporting" color="secondary">
                              {t.billable.toFixed(1)}h billable
                              {t.nonBillable > 0 ? ` · ${t.nonBillable.toFixed(1)}h other` : ""}
                            </Text>
                          </HStack>
                          <ProgressBar
                            label={`${t.name} weekly utilization`}
                            isLabelHidden
                            value={utilization}
                            max={100}
                            hasValueLabel
                            variant="accent"
                          />
                        </VStack>
                      );
                    })}
                  </VStack>
                </VStack>
              </Card>
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
