"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import {
  ScaleIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  BanknotesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import {
  daysUntil,
  formatDate,
  formatDateTime,
  formatEGP,
  label,
  todayIso,
} from "@/lib/practice";

// Every figure here comes from the practice tables. The concept build's
// invented KPIs (revenue targets, message previews, utilization goals) are
// gone rather than kept as decoration: a dashboard that mixes real and
// fabricated numbers is worse than one that shows fewer, true ones.

const KIND_ICON = {
  hearing: ScaleIcon,
  deadline: ClockIcon,
  task: CheckCircleIcon,
} as const;

function egpShort(value: number) {
  return `EGP ${Math.round(value / 1000)}k`;
}

export default function DashboardPage() {
  const { organizationName } = useOrg();
  const memberName = useMemberName();

  const resource = useResource(
    async (api) => {
      const [board, invoices] = await Promise.all([
        api.dashboard(30),
        api.invoices.list(),
      ]);
      return { board, invoices };
    },
    [],
  );

  // Collections trend built from paid invoices rather than a hard-coded
  // series, so the chart cannot disagree with the billing page.
  const trend = useMemo(() => {
    const invoices = resource.data?.invoices ?? [];
    const byMonth = new Map<string, number>();
    for (const invoice of invoices) {
      if (invoice.status !== "paid") continue;
      const key = invoice.issued_date.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(invoice.amount));
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, collected]) => ({
        month: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
        }),
        collected,
      }));
  }, [resource.data]);

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6}>
            <VStack gap={1}>
              <Heading level={2}>Dashboard</Heading>
              <Text type="body" color="secondary">
                {organizationName ?? "Your firm"} · {formatDate(todayIso())}
              </Text>
            </VStack>

            <DataView resource={resource} loadingLabel="Loading your firm…">
              {({ board }) => {
                const kpis = [
                  {
                    label: "Active Matters",
                    value: String(board.active_matters),
                    detail: `${board.active_clients} active clients`,
                    icon: BriefcaseIcon,
                    warn: false,
                  },
                  {
                    label: "Open Tasks",
                    value: String(board.open_tasks),
                    detail:
                      board.overdue_tasks > 0
                        ? `${board.overdue_tasks} overdue`
                        : "None overdue",
                    icon: CheckCircleIcon,
                    warn: board.overdue_tasks > 0,
                  },
                  {
                    label: "Unbilled Time",
                    value: formatEGP(board.unbilled_amount),
                    detail: `${Number(board.hours_this_month).toFixed(1)}h logged this month`,
                    icon: ClockIcon,
                    warn: false,
                  },
                  {
                    label: "Outstanding",
                    value: formatEGP(board.outstanding_amount),
                    detail: "Sent and overdue invoices",
                    icon: BanknotesIcon,
                    warn: false,
                  },
                ];

                return (
                  <VStack gap={6}>
                    <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
                      {kpis.map((kpi) => (
                        <Card key={kpi.label}>
                          <VStack gap={2}>
                            <HStack gap={2} vAlign="center">
                              <Icon
                                icon={kpi.icon}
                                size="sm"
                                color={kpi.warn ? "warning" : "secondary"}
                              />
                              <Text type="label" color="secondary">
                                {kpi.label}
                              </Text>
                            </HStack>
                            <Heading level={2}>{kpi.value}</Heading>
                            <Text type="supporting" color="secondary">
                              {kpi.detail}
                            </Text>
                          </VStack>
                        </Card>
                      ))}
                    </Grid>

                    <Grid columns={3} gap={6}>
                      <GridSpan columns={2}>
                        <Card>
                          <VStack gap={4}>
                            <HStack hAlign="between" vAlign="center">
                              <Heading level={4}>Next 30 days</Heading>
                              <Link href="/calendar">Calendar</Link>
                            </HStack>
                            {board.upcoming.length === 0 ? (
                              <EmptyState
                                title="Nothing scheduled"
                                description="No hearings, deadlines or task due dates in the next 30 days."
                              />
                            ) : (
                              <List hasDividers density="compact">
                                {board.upcoming.slice(0, 8).map((item, index) => {
                                  const days = daysUntil(item.due_date);
                                  return (
                                    <ListItem
                                      key={`${item.kind}-${item.label}-${index}`}
                                      label={item.label}
                                      description={item.matter_name ?? "Firm-wide"}
                                      href={
                                        item.matter_id
                                          ? `/matters/${item.matter_id}`
                                          : undefined
                                      }
                                      startContent={
                                        <Icon
                                          icon={KIND_ICON[item.kind]}
                                          size="sm"
                                          color="secondary"
                                        />
                                      }
                                      endContent={
                                        <HStack gap={3} vAlign="center">
                                          <Text type="supporting" color="secondary">
                                            {label(item.kind)}
                                          </Text>
                                          {days <= 3 ? (
                                            <Badge
                                              variant={days < 0 ? "error" : "warning"}
                                              label={`${formatDate(item.due_date)} · ${days}d`}
                                            />
                                          ) : (
                                            <Text type="supporting" color="secondary">
                                              {formatDate(item.due_date)}
                                            </Text>
                                          )}
                                        </HStack>
                                      }
                                    />
                                  );
                                })}
                              </List>
                            )}
                          </VStack>
                        </Card>
                      </GridSpan>

                      <Card>
                        <VStack gap={4}>
                          <HStack hAlign="between" vAlign="center">
                            <Heading level={4}>Recent activity</Heading>
                            <Link href="/matters">Matters</Link>
                          </HStack>
                          {board.recent_activity.length === 0 ? (
                            <Text type="body" color="secondary">
                              Nothing has happened yet.
                            </Text>
                          ) : (
                            <List hasDividers density="compact">
                              {board.recent_activity.slice(0, 8).map((entry) => (
                                <ListItem
                                  key={entry.id}
                                  label={memberName(entry.actor)}
                                  description={entry.action}
                                  startContent={
                                    <Avatar
                                      name={memberName(entry.actor)}
                                      size="sm"
                                      tooltip={false}
                                    />
                                  }
                                  endContent={
                                    <Text type="supporting" color="secondary">
                                      {formatDateTime(entry.occurred_at)}
                                    </Text>
                                  }
                                />
                              ))}
                            </List>
                          )}
                        </VStack>
                      </Card>
                    </Grid>

                    {trend.length > 1 && (
                      <Card>
                        <VStack gap={4}>
                          <HStack hAlign="between" vAlign="center">
                            <Heading level={4}>Collections</Heading>
                            <Link href="/billing">Billing</Link>
                          </HStack>
                          <ResponsiveContainer width="100%" height={240}>
                            <LineChart
                              data={trend}
                              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid
                                horizontal
                                vertical={false}
                                stroke="var(--color-border)"
                              />
                              <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tickFormatter={egpShort}
                                tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                                axisLine={false}
                                tickLine={false}
                                width={72}
                              />
                              <Tooltip
                                formatter={(value) => formatEGP(Number(value))}
                                contentStyle={{
                                  background: "var(--color-background-popover)",
                                  border: "1px solid var(--color-border)",
                                  borderRadius: "var(--radius-element)",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="collected"
                                name="Collected"
                                stroke="var(--color-accent)"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </VStack>
                      </Card>
                    )}
                  </VStack>
                );
              }}
            </DataView>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
