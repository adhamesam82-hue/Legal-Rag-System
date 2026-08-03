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
  BriefcaseIcon,
  CheckCircleIcon,
  BanknotesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import {
  daysUntil,
  todayIso,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useEnumLabel } from "@/lib/i18n/enum-label";

// Every figure here comes from the practice tables. The concept build's
// invented KPIs (revenue targets, message previews, utilization goals) are
// gone rather than kept as decoration: a dashboard that mixes real and
// fabricated numbers is worse than one that shows fewer, true ones.

export default function DashboardPage() {
  const { formatDate, formatDateTime, formatEGP, intlLocale, formatEGPCompact } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
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
        month: new Date(`${key}-01T00:00:00`).toLocaleDateString(intlLocale, {
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
              <Heading level={2}>{t("@legalos.dashboard.heading")}</Heading>
              <Text type="body" color="secondary">
                {organizationName ?? t("@legalos.dashboard.orgFallback")} · {formatDate(todayIso())}
              </Text>
            </VStack>

            <DataView resource={resource} loadingLabel={t("@legalos.dashboard.loading")}>
              {({ board }) => {
                const kpis = [
                  {
                    label: t("@legalos.dashboard.kpi.activeMatters"),
                    value: String(board.active_matters),
                    detail: t("@legalos.dashboard.kpi.activeMattersDetail", {
                      count: board.active_clients,
                    }),
                    icon: BriefcaseIcon,
                    warn: false,
                  },
                  {
                    label: t("@legalos.dashboard.kpi.openTasks"),
                    value: String(board.open_tasks),
                    detail:
                      board.overdue_tasks > 0
                        ? t("@legalos.dashboard.kpi.overdueDetail", {
                            count: board.overdue_tasks,
                          })
                        : t("@legalos.dashboard.kpi.noneOverdue"),
                    icon: CheckCircleIcon,
                    warn: board.overdue_tasks > 0,
                  },
                  {
                    label: t("@legalos.dashboard.kpi.unbilledTime"),
                    value: formatEGP(board.unbilled_amount),
                    detail: t("@legalos.dashboard.kpi.hoursLoggedDetail", {
                      hours: Number(board.hours_this_month).toFixed(1),
                    }),
                    icon: ClockIcon,
                    warn: false,
                  },
                  {
                    label: t("@legalos.dashboard.kpi.outstanding"),
                    value: formatEGP(board.outstanding_amount),
                    detail: t("@legalos.dashboard.kpi.outstandingDetail"),
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
                            {/* The glyph is kept only where it carries the
                              * warning; as decoration on every card it made
                              * four identical rows of ornament and left
                              * nothing for the one card that needs attention
                              * to stand out with. */}
                            <HStack gap={1.5} vAlign="center">
                              {kpi.warn && (
                                <Icon icon={kpi.icon} size="sm" color="warning" />
                              )}
                              <Text type="label" color="secondary">
                                {kpi.label}
                              </Text>
                            </HStack>
                            <Text size="2xl" weight="semibold">{kpi.value}</Text>
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
                              <Heading level={4}>{t("@legalos.dashboard.next30.heading")}</Heading>
                              <Link href="/calendar">{t("@legalos.dashboard.next30.calendarLink")}</Link>
                            </HStack>
                            {board.upcoming.length === 0 ? (
                              <EmptyState
                                title={t("@legalos.dashboard.next30.empty.title")}
                                description={t("@legalos.dashboard.next30.empty.description")}
                              />
                            ) : (
                              <List hasDividers density="compact">
                                {board.upcoming.slice(0, 8).map((item, index) => {
                                  const days = daysUntil(item.due_date);
                                  return (
                                    <ListItem
                                      key={`${item.kind}-${item.label}-${index}`}
                                      label={item.label}
                                      description={item.matter_name ?? t("@legalos.dashboard.firmWide")}
                                      href={
                                        item.matter_id
                                          ? `/matters/${item.matter_id}`
                                          : undefined
                                      }
                                      endContent={
                                        <HStack gap={3} vAlign="center">
                                          <Text type="supporting" color="secondary">
                                            {enumLabel(item.kind)}
                                          </Text>
                                          {/* Only what is already late gets a
                                            * badge. Marking everything inside
                                            * three days meant seven of the
                                            * eight rows carried one, so the
                                            * mark stopped meaning "look at
                                            * this" and became the row style;
                                            * the countdown alone says the
                                            * same thing in plain text. */}
                                          {days < 0 ? (
                                            <Badge
                                              variant="error"
                                              label={t(
                                                "@legalos.matters.list.deadlineBadgeOverdue",
                                                {
                                                  date: formatDate(item.due_date),
                                                  days: Math.abs(days),
                                                },
                                              )}
                                            />
                                          ) : (
                                            <Text type="supporting" color="secondary">
                                              {days <= 3
                                                ? t("@legalos.matters.list.deadlineBadge", {
                                                    date: formatDate(item.due_date),
                                                    days,
                                                  })
                                                : formatDate(item.due_date)}
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
                            <Heading level={4}>{t("@legalos.dashboard.recentActivity.heading")}</Heading>
                            <Link href="/matters">{t("@legalos.dashboard.recentActivity.mattersLink")}</Link>
                          </HStack>
                          {board.recent_activity.length === 0 ? (
                            <Text type="body" color="secondary">
                              {t("@legalos.dashboard.recentActivity.empty")}
                            </Text>
                          ) : (
                            <List hasDividers density="compact">
                              {board.recent_activity.slice(0, 8).map((entry) => (
                                <ListItem
                                  key={entry.id}
                                  label={memberName(entry.actor)}
                                  // What was done is the point of the row, and
                                  // a one-third-width rail leaves it about 25
                                  // characters — "started drafting the ap…"
                                  // names no matter and no document. A node
                                  // description opts out of ListItem's
                                  // single-line rule; two lines carry the
                                  // whole entry for all but the longest, and
                                  // those keep a tooltip.
                                  description={
                                    <Text type="supporting" color="secondary" maxLines={2}>
                                      {entry.action}
                                    </Text>
                                  }
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
                            <Heading level={4}>{t("@legalos.dashboard.collections.heading")}</Heading>
                            <Link href="/billing">{t("@legalos.dashboard.collections.billingLink")}</Link>
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
                                tick={{ fontSize: "var(--font-size-sm)", fill: "var(--color-text-secondary)" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tickFormatter={(v: number) => formatEGPCompact(v)}
                                tick={{ fontSize: "var(--font-size-sm)", fill: "var(--color-text-secondary)" }}
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
                                name={t("@legalos.dashboard.collections.seriesName")}
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
