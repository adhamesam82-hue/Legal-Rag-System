"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { useFormat } from "@/lib/i18n/format";
import { useTranslator } from "@astryxdesign/core/i18n";

// ---------------------------------------------------------------------------
// Mock analytics. Revenue matches the dashboard and accounting pages
// (Feb 312k → Jul 486.2k); utilization matches the dashboard's workload card.
// ---------------------------------------------------------------------------

const MONTH_KEYS = [
  "@legalos.reports.month.feb",
  "@legalos.reports.month.mar",
  "@legalos.reports.month.apr",
  "@legalos.reports.month.may",
  "@legalos.reports.month.jun",
  "@legalos.reports.month.jul",
] as const;

const REVENUE = [
  { monthKey: MONTH_KEYS[0], revenue: 312000, collected: 288000 },
  { monthKey: MONTH_KEYS[1], revenue: 338000, collected: 310000 },
  { monthKey: MONTH_KEYS[2], revenue: 355000, collected: 341000 },
  { monthKey: MONTH_KEYS[3], revenue: 402000, collected: 372000 },
  { monthKey: MONTH_KEYS[4], revenue: 433000, collected: 408000 },
  { monthKey: MONTH_KEYS[5], revenue: 486200, collected: 432000 },
];

const UTILIZATION = [
  {
    nameKey: "@legalos.reports.person.ahmed",
    utilization: 88,
    billable: 148,
    target: 160,
  },
  {
    nameKey: "@legalos.reports.person.mona",
    utilization: 74,
    billable: 124,
    target: 160,
  },
  {
    nameKey: "@legalos.reports.person.youssef",
    utilization: 61,
    billable: 102,
    target: 160,
  },
  {
    nameKey: "@legalos.reports.person.layla",
    utilization: 52,
    billable: 78,
    target: 150,
  },
];

const OUTCOMES = [
  { labelKey: "@legalos.reports.outcome.settled", value: 14, color: "var(--primary)" },
  {
    labelKey: "@legalos.reports.outcome.wonAtJudgment",
    value: 8,
    color: "var(--info)",
  },
  {
    labelKey: "@legalos.reports.outcome.withdrawn",
    value: 3,
    color: "var(--surface3)",
  },
  { labelKey: "@legalos.reports.outcome.lost", value: 2, color: "var(--danger)" },
];

const COMPLETION = [
  { monthKey: MONTH_KEYS[0], opened: 6, closed: 4 },
  { monthKey: MONTH_KEYS[1], opened: 5, closed: 5 },
  { monthKey: MONTH_KEYS[2], opened: 8, closed: 6 },
  { monthKey: MONTH_KEYS[3], opened: 7, closed: 5 },
  { monthKey: MONTH_KEYS[4], opened: 6, closed: 7 },
  { monthKey: MONTH_KEYS[5], opened: 9, closed: 6 },
];

const AXIS_TICK = { fontSize: 11, fill: "var(--text2)" };

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  color: "var(--text)",
  fontSize: "12px",
};

const totalOutcomes = OUTCOMES.reduce((s, o) => s + o.value, 0);
const collectionRate =
  (REVENUE.reduce((s, r) => s + r.collected, 0) / REVENUE.reduce((s, r) => s + r.revenue, 0)) * 100;

export default function ReportsPage() {
  const t = useTranslator();
  const { formatEGP, formatEGPCompact } = useFormat();

  const revenue = REVENUE.map((r) => ({
    month: t(r.monthKey),
    revenue: r.revenue,
    collected: r.collected,
  }));
  const completion = COMPLETION.map((c) => ({
    month: t(c.monthKey),
    opened: c.opened,
    closed: c.closed,
  }));
  const outcomes = OUTCOMES.map((o) => ({
    label: t(o.labelKey),
    value: o.value,
    color: o.color,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* رأس الصفحة */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.reports.heading")}
          </h1>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.reports.subtitle")}
          </p>
        </div>
        <Button variant="secondary">
          <Icon name="download" size={16} />
          <span>{t("@legalos.reports.export.button")}</span>
        </Button>
      </div>

      {/* شريط التنبيه */}
      <Alert
        type="info"
        title={t("@legalos.reports.banner.title")}
      >
        {t("@legalos.reports.banner.description")}
      </Alert>

      {/* بطاقات الإحصاءات الأربعة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.reports.stat.revenue.label")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {formatEGP(REVENUE.reduce((s, r) => s + r.revenue, 0))}
          </span>
        </Card>
        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.reports.stat.collectionRate.label")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {collectionRate.toFixed(1)}%
          </span>
        </Card>
        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.reports.stat.mattersClosed.label")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {COMPLETION.reduce((s, c) => s + c.closed, 0)}
          </span>
        </Card>
        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.reports.stat.favourableOutcomes.label")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {Math.round(((OUTCOMES[0].value + OUTCOMES[1].value) / totalOutcomes) * 100)}%
          </span>
        </Card>
      </div>

      {/* مخطط الإيرادات والتحصيل */}
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.reports.billedCollected.heading")}
          </h2>
          <Link
            href="/billing"
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--primary)" }}
          >
            {t("@legalos.reports.billedCollected.link")}
          </Link>
        </div>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => formatEGPCompact(v)}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip formatter={(v) => formatEGP(Number(v))} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line
                type="monotone"
                dataKey="revenue"
                name={t("@legalos.reports.legend.billed")}
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--primary)" }}
              />
              <Line
                type="monotone"
                dataKey="collected"
                name={t("@legalos.reports.legend.collected")}
                stroke="var(--info)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3, fill: "var(--info)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* معدل الاستغلال وتوزيع النتائج */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.reports.utilization.heading")}
            </h2>
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {t("@legalos.reports.utilization.description")}
            </p>
            <div className="flex flex-col gap-4 mt-2">
              {UTILIZATION.map((u) => (
                <div key={u.nameKey} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium" style={{ color: "var(--text)" }}>
                      {t(u.nameKey)}
                    </span>
                    <span style={{ color: "var(--text2)" }}>
                      {t("@legalos.reports.utilization.hoursOfTarget", {
                        billable: u.billable,
                        target: u.target,
                      })}
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--surface3)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, u.utilization)}%`,
                        backgroundColor:
                          u.utilization > 85 ? "var(--warn)" : "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
              {t("@legalos.reports.utilization.caption")}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.reports.outcomes.heading")}
            </h2>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomes}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {outcomes.map((o) => (
                      <Cell key={o.label} fill={o.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              {outcomes.map((o) => (
                <div key={o.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: o.color }}
                    />
                    <span style={{ color: "var(--text)" }}>{o.label}</span>
                  </div>
                  <span style={{ color: "var(--text2)" }}>
                    {t("@legalos.reports.outcome.countPercent", {
                      count: o.value,
                      percent: Math.round((o.value / totalOutcomes) * 100),
                    })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* معدل إغلاق القضايا */}
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.reports.completion.heading")}
          </h2>
          <Link
            href="/matters"
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--primary)" }}
          >
            {t("@legalos.reports.completion.link")}
          </Link>
        </div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completion} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar
                dataKey="opened"
                name={t("@legalos.reports.legend.opened")}
                fill="var(--surface3)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="closed"
                name={t("@legalos.reports.legend.closed")}
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {t("@legalos.reports.completion.caption")}
        </p>
      </Card>
    </div>
  );
}
