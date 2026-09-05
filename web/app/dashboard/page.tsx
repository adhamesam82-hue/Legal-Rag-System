"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useOrg, useMemberName, useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import { ProximityBadge } from "@/components/Distinction";
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
  }, [resource.data, intlLocale]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          {t("@legalos.dashboard.heading")}
        </h1>
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {organizationName ?? t("@legalos.dashboard.orgFallback")} · {formatDate(todayIso())}
        </p>
      </div>

      <DataView resource={resource} loadingLabel={t("@legalos.dashboard.loading")}>
        {({ board }) => {
          // Each figure counts rows that live on one screen, so every
          // card is a link to that screen -- "8 overdue tasks" used to
          // be a dead end, and the whole point of a number on a
          // dashboard is that you can go and act on it.
          const overduePart =
            board.overdue_tasks > 0
              ? t("@legalos.dashboard.kpi.overdueDetail", {
                  count: board.overdue_tasks,
                })
              : null;
          const dueThisWeekPart =
            board.tasks_due_this_week > 0
              ? t("@legalos.dashboard.kpi.dueThisWeekDetail", {
                  count: board.tasks_due_this_week,
                })
              : null;
          const tasksDetail =
            overduePart && dueThisWeekPart
              ? `${overduePart} · ${dueThisWeekPart}`
              : overduePart
                ? overduePart
                : dueThisWeekPart
                  ? dueThisWeekPart
                  : t("@legalos.dashboard.kpi.noneOverdue");

          const kpis = [
            {
              label: t("@legalos.dashboard.kpi.activeMatters"),
              value: String(board.active_matters),
              detail: t("@legalos.dashboard.kpi.activeMattersDetail", {
                count: board.active_clients,
              }),
              iconName: "folder_open",
              iconFg: "var(--primary)",
              iconBg: "var(--primary-soft)",
              badge: null,
              href: "/matters",
            },
            {
              label: t("@legalos.dashboard.kpi.openTasks"),
              value: String(board.open_tasks),
              detail: tasksDetail,
              iconName: "task_alt",
              iconFg: board.overdue_tasks > 0 ? "var(--warn)" : "var(--primary)",
              iconBg: board.overdue_tasks > 0 ? "var(--warn-soft)" : "var(--primary-soft)",
              badge:
                board.overdue_tasks > 0 ? (
                  <Badge color="warn" size="sm">
                    {overduePart}
                  </Badge>
                ) : null,
              href: "/tasks",
            },
            {
              label: t("@legalos.dashboard.kpi.unbilledTime"),
              value: formatEGP(board.unbilled_amount),
              detail: t("@legalos.dashboard.kpi.hoursLoggedDetail", {
                hours: Number(board.hours_this_month).toFixed(1),
              }),
              iconName: "timer",
              iconFg: "var(--danger)",
              iconBg: "var(--danger-soft)",
              badge: null,
              href: "/time-tracking",
            },
            {
              label: t("@legalos.dashboard.kpi.outstanding"),
              value: formatEGP(board.outstanding_amount),
              detail: t("@legalos.dashboard.kpi.outstandingDetail"),
              iconName: "payments",
              iconFg: "var(--success)",
              iconBg: "var(--success-soft)",
              badge: null,
              href: "/billing",
            },
          ];

          return (
            <div className="flex flex-col gap-6">
              {/* 4 KPI Cards: No trend arrows, no fake metrics, strictly true data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                  <Link
                    key={kpi.label}
                    href={kpi.href}
                    className="no-underline block group"
                  >
                    <Card
                      className="transition-all hover:border-[var(--border2)] h-full"
                      padding="17px"
                    >
                      <div className="flex flex-col gap-3 h-full">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "11px",
                                background: kpi.iconBg,
                                color: kpi.iconFg,
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Icon name={kpi.iconName} size={21} />
                            </div>
                            <span
                              className="text-[12.5px] font-medium"
                              style={{ color: "var(--text2)" }}
                            >
                              {kpi.label}
                            </span>
                          </div>
                          {kpi.badge}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span
                            className="text-3xl font-semibold tracking-tight tabular-nums"
                            style={{ color: "var(--text)", lineHeight: 1 }}
                          >
                            {kpi.value}
                          </span>
                        </div>

                        <div
                          className="text-[11.5px] pt-2 border-t mt-auto"
                          style={{
                            color: "var(--text2)",
                            borderColor: "var(--border)",
                          }}
                        >
                          {kpi.detail}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Two columns: Upcoming Schedule and Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>{t("@legalos.dashboard.next30.heading")}</CardTitle>
                      <Link
                        href="/calendar"
                        className="text-xs font-semibold hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {t("@legalos.dashboard.next30.calendarLink")}
                      </Link>
                    </CardHeader>
                    <CardContent>
                      {board.upcoming.length === 0 ? (
                        <EmptyState
                          icon={<Icon name="calendar_today" size={24} style={{ color: "var(--text2)" }} />}
                          title={t("@legalos.dashboard.next30.empty.title")}
                          description={t("@legalos.dashboard.next30.empty.description")}
                        />
                      ) : (
                        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                          {board.upcoming.slice(0, 8).map((item, index) => {
                            const days = daysUntil(item.due_date);
                            return (
                              <div
                                key={`${item.kind}-${item.label}-${index}`}
                                className="flex items-center justify-between gap-3 py-3"
                              >
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                  {item.matter_id ? (
                                    <Link
                                      href={`/matters/${item.matter_id}`}
                                      className="text-xs font-semibold hover:underline truncate"
                                      style={{ color: "var(--text)" }}
                                    >
                                      {item.label}
                                    </Link>
                                  ) : (
                                    <span
                                      className="text-xs font-semibold truncate"
                                      style={{ color: "var(--text)" }}
                                    >
                                      {item.label}
                                    </span>
                                  )}
                                  <span
                                    className="text-[11.5px] truncate"
                                    style={{ color: "var(--text2)" }}
                                  >
                                    {item.matter_name ?? t("@legalos.dashboard.firmWide")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 flex-shrink-0">
                                  <span
                                    className="text-[11.5px] font-medium"
                                    style={{ color: "var(--text2)" }}
                                  >
                                    {enumLabel(item.kind)}
                                  </span>
                                  <ProximityBadge date={item.due_date} />
                                  <span
                                    className="text-[11.5px] font-medium tabular-nums"
                                    style={{ color: "var(--text2)" }}
                                  >
                                    {days < 0
                                      ? t("@legalos.matters.list.deadlineBadgeOverdue", {
                                          date: formatDate(item.due_date),
                                          days: Math.abs(days),
                                        })
                                      : days <= 3
                                        ? t("@legalos.matters.list.deadlineBadge", {
                                            date: formatDate(item.due_date),
                                            days,
                                          })
                                        : formatDate(item.due_date)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>{t("@legalos.dashboard.recentActivity.heading")}</CardTitle>
                      <Link
                        href="/matters"
                        className="text-xs font-semibold hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {t("@legalos.dashboard.recentActivity.mattersLink")}
                      </Link>
                    </CardHeader>
                    <CardContent>
                      {board.recent_activity.length === 0 ? (
                        <EmptyState
                          icon={<Icon name="history" size={24} style={{ color: "var(--text2)" }} />}
                          title={t("@legalos.dashboard.recentActivity.heading")}
                          description={t("@legalos.dashboard.recentActivity.empty")}
                        />
                      ) : (
                        <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                          {board.recent_activity.slice(0, 8).map((entry) => {
                            const name = memberName(entry.actor);
                            const initials = name
                              ? name
                                  .split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join("")
                              : "—";
                            return (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between gap-3 py-3"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div
                                    style={{
                                      width: "30px",
                                      height: "30px",
                                      borderRadius: "50%",
                                      background: "var(--primary-soft)",
                                      color: "var(--primary)",
                                      display: "grid",
                                      placeItems: "center",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                    aria-hidden="true"
                                  >
                                    {initials}
                                  </div>
                                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <span
                                      className="text-xs font-semibold truncate"
                                      style={{ color: "var(--text)" }}
                                    >
                                      {name}
                                    </span>
                                    <p
                                      className="text-[11.5px] line-clamp-2"
                                      style={{ color: "var(--text2)" }}
                                    >
                                      {entry.action}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className="text-[11.5px] whitespace-nowrap flex-shrink-0 tabular-nums"
                                  style={{ color: "var(--text2)" }}
                                >
                                  {formatDateTime(entry.occurred_at)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Collections Trend: Paid invoices aggregated by month */}
              {trend.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("@legalos.dashboard.collections.heading")}</CardTitle>
                    <Link
                      href="/billing"
                      className="text-xs font-semibold hover:underline"
                      style={{ color: "var(--primary)" }}
                    >
                      {t("@legalos.dashboard.collections.billingLink")}
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart
                        data={trend}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          horizontal
                          vertical={false}
                          stroke="var(--border)"
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: "11.5px", fill: "var(--text2)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v: number) => formatEGPCompact(v)}
                          tick={{ fontSize: "11.5px", fill: "var(--text2)" }}
                          axisLine={false}
                          tickLine={false}
                          width={72}
                        />
                        <Tooltip
                          formatter={(value) => formatEGP(Number(value))}
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--rs)",
                            color: "var(--text)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="collected"
                          name={t("@legalos.dashboard.collections.seriesName")}
                          stroke="var(--primary)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        }}
      </DataView>
    </div>
  );
}
