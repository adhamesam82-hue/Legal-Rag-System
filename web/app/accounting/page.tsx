"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { useFormat } from "@/lib/i18n/format";
import { useTranslator } from "@astryxdesign/core/i18n";

// ---------------------------------------------------------------------------
// Mock firm-level financials. Revenue tracks the dashboard's trend
// (Feb 312k → Jul 486.2k) so the two pages agree.
// ---------------------------------------------------------------------------

const MONTHLY = [
  { monthKey: "@legalos.accounting.month.feb", revenue: 312000, expenses: 198000 },
  { monthKey: "@legalos.accounting.month.mar", revenue: 338000, expenses: 205000 },
  { monthKey: "@legalos.accounting.month.apr", revenue: 355000, expenses: 211000 },
  { monthKey: "@legalos.accounting.month.may", revenue: 402000, expenses: 224000 },
  { monthKey: "@legalos.accounting.month.jun", revenue: 433000, expenses: 231000 },
  { monthKey: "@legalos.accounting.month.jul", revenue: 486200, expenses: 246800 },
];

const JULY = MONTHLY[MONTHLY.length - 1];
const JUNE = MONTHLY[MONTHLY.length - 2];
const profit = JULY.revenue - JULY.expenses;
const priorProfit = JUNE.revenue - JUNE.expenses;
const profitDelta = ((profit - priorProfit) / priorProfit) * 100;
const margin = (profit / JULY.revenue) * 100;

const CURRENT_MONTH_KEY = "@legalos.accounting.month.jul";

interface Payout extends Record<string, unknown> {
  id: string;
  partnerKey: string;
  share: string;
  ytd: number;
  july: number;
}

const PAYOUTS: Payout[] = [
  {
    id: "p1",
    partnerKey: "@legalos.accounting.person.ahmed",
    share: "60%",
    ytd: 742000,
    july: 143500,
  },
  {
    id: "p2",
    partnerKey: "@legalos.accounting.person.mona",
    share: "40%",
    ytd: 494600,
    july: 95700,
  },
];

interface ExpenseLine extends Record<string, unknown> {
  id: string;
  categoryKey: string;
  july: number;
  ytd: number;
}

const EXPENSES: ExpenseLine[] = [
  { id: "e1", categoryKey: "@legalos.accounting.expense.salaries", july: 148000, ytd: 902000 },
  { id: "e2", categoryKey: "@legalos.accounting.expense.rent", july: 42000, ytd: 252000 },
  { id: "e3", categoryKey: "@legalos.accounting.expense.courtFees", july: 18600, ytd: 96400 },
  { id: "e4", categoryKey: "@legalos.accounting.expense.software", july: 14200, ytd: 78300 },
  { id: "e5", categoryKey: "@legalos.accounting.expense.insurance", july: 11000, ytd: 66000 },
  { id: "e6", categoryKey: "@legalos.accounting.expense.travel", july: 8400, ytd: 41200 },
  { id: "e7", categoryKey: "@legalos.accounting.expense.utilities", july: 4600, ytd: 29800 },
];

const PAYROLL = [
  {
    nameKey: "@legalos.accounting.person.ahmed",
    roleKey: "@legalos.accounting.payroll.role.ownerPartner",
    gross: 0,
    noteKey: "@legalos.accounting.payroll.note.partnerDraw",
  },
  {
    nameKey: "@legalos.accounting.person.mona",
    roleKey: "@legalos.accounting.payroll.role.lawyerPartner",
    gross: 0,
    noteKey: "@legalos.accounting.payroll.note.partnerDraw",
  },
  {
    nameKey: "@legalos.accounting.person.youssef",
    roleKey: "@legalos.accounting.payroll.role.lawyer",
    gross: 52000,
    noteKey: "@legalos.accounting.payroll.note.monthlySalary",
  },
  {
    nameKey: "@legalos.accounting.person.layla",
    roleKey: "@legalos.accounting.payroll.role.staff",
    gross: 24000,
    noteKey: "@legalos.accounting.payroll.note.monthlySalary",
  },
];

const AXIS_TICK = { fontSize: 11, fill: "var(--text2)" };

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  color: "var(--text)",
  fontSize: "12px",
};

export default function AccountingPage() {
  const t = useTranslator();
  const { formatEGP, formatEGPCompact } = useFormat();
  const currentMonth = t(CURRENT_MONTH_KEY);

  const monthly = MONTHLY.map((m) => ({
    month: t(m.monthKey),
    revenue: m.revenue,
    expenses: m.expenses,
  }));
  const cashflow = monthly.map((m) => ({
    month: m.month,
    net: m.revenue - m.expenses,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          {t("@legalos.accounting.heading")}
        </h1>
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {t("@legalos.accounting.subtitle")}
        </p>
      </div>

      {/* شريط التنبيه */}
      <Alert
        type="info"
        title={t("@legalos.accounting.banner.title")}
      >
        {t("@legalos.accounting.banner.description")}
      </Alert>

      {/* بطاقات المؤشرات الإحصائية الأربعة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.accounting.stat.revenue.label", { month: currentMonth })}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {formatEGP(JULY.revenue)}
          </span>
          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--success)" }}>
            <Icon name="arrow_upward" size={14} />
            <span style={{ color: "var(--text2)" }}>
              {t("@legalos.accounting.stat.revenueChange")}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.accounting.stat.expenses.label", { month: currentMonth })}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {formatEGP(JULY.expenses)}
          </span>
          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text2)" }}>
            <Icon name="arrow_upward" size={14} />
            <span>{t("@legalos.accounting.stat.expensesChange")}</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.accounting.stat.profit.label", { month: currentMonth })}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {formatEGP(profit)}
          </span>
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: profitDelta >= 0 ? "var(--success)" : "var(--danger)" }}
          >
            <Icon name={profitDelta >= 0 ? "arrow_upward" : "arrow_downward"} size={14} />
            <span style={{ color: "var(--text2)" }}>
              {t("@legalos.accounting.stat.profitChange", {
                percent: profitDelta.toFixed(1),
              })}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.accounting.stat.margin.label")}
          </span>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {margin.toFixed(1)}%
          </span>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.accounting.stat.margin.description")}
          </span>
        </Card>
      </div>

      {/* المخططات البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.accounting.chart.revenueExpenses.heading")}
            </h2>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => formatEGPCompact(v)}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip
                    formatter={(v) => formatEGP(Number(v))}
                    contentStyle={tooltipStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="revenue"
                    name={t("@legalos.accounting.chart.legend.revenue")}
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name={t("@legalos.accounting.chart.legend.expenses")}
                    fill="var(--surface3)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.accounting.chart.cashFlow.heading")}
            </h2>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashflow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => formatEGPCompact(v)}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip
                    formatter={(v) => [
                      formatEGP(Number(v)),
                      t("@legalos.accounting.chart.cashFlow.tooltipLabel"),
                    ]}
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--primary)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {t("@legalos.accounting.chart.cashFlow.caption")}
            </p>
          </Card>
        </div>
      </div>

      {/* الجداول والمصروفات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 flex flex-col gap-4">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.accounting.expenses.heading")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                  <th className="py-2.5 px-3 text-start font-medium">
                    {t("@legalos.accounting.column.category")}
                  </th>
                  <th className="py-2.5 px-3 text-end font-medium">{currentMonth}</th>
                  <th className="py-2.5 px-3 text-end font-medium">
                    {t("@legalos.accounting.column.yearToDate")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {EXPENSES.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--surface2)] transition-colors">
                    <td className="py-2.5 px-3 font-medium" style={{ color: "var(--text)" }}>
                      {t(item.categoryKey)}
                    </td>
                    <td className="py-2.5 px-3 text-end" style={{ color: "var(--text)" }}>
                      {formatEGP(item.july)}
                    </td>
                    <td className="py-2.5 px-3 text-end" style={{ color: "var(--text2)" }}>
                      {formatEGP(item.ytd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pt-3 border-t flex items-center justify-between font-bold text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            <span>{t("@legalos.accounting.expenses.total")}</span>
            <span>{formatEGP(JULY.expenses)}</span>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.accounting.payouts.heading")}
              </h2>
              <Link
                href="/reports"
                className="text-xs hover:underline font-medium"
                style={{ color: "var(--primary)" }}
              >
                {t("@legalos.accounting.payouts.reportsLink")}
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                    <th className="py-2.5 px-3 text-start font-medium">
                      {t("@legalos.accounting.column.partner")}
                    </th>
                    <th className="py-2.5 px-3 text-center font-medium">
                      {t("@legalos.accounting.column.share")}
                    </th>
                    <th className="py-2.5 px-3 text-end font-medium">
                      {t("@legalos.accounting.column.monthPayout", { month: currentMonth })}
                    </th>
                    <th className="py-2.5 px-3 text-end font-medium">
                      {t("@legalos.accounting.column.yearToDate")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {PAYOUTS.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface2)] transition-colors">
                      <td className="py-2.5 px-3 font-medium" style={{ color: "var(--text)" }}>
                        {t(p.partnerKey)}
                      </td>
                      <td className="py-2.5 px-3 text-center" style={{ color: "var(--text2)" }}>
                        {p.share}
                      </td>
                      <td className="py-2.5 px-3 text-end" style={{ color: "var(--text)" }}>
                        {formatEGP(p.july)}
                      </td>
                      <td className="py-2.5 px-3 text-end font-bold" style={{ color: "var(--text)" }}>
                        {formatEGP(p.ytd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.accounting.payroll.heading")}
            </h2>
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {PAYROLL.map((p) => (
                <div key={p.nameKey} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium" style={{ color: "var(--text)" }}>
                      {t(p.nameKey)}
                    </span>
                    <span style={{ color: "var(--text2)" }}>
                      {t(p.roleKey)} · {t(p.noteKey)}
                    </span>
                  </div>
                  <span className="font-bold" style={{ color: "var(--text)" }}>
                    {p.gross > 0 ? formatEGP(p.gross) : "—"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {t("@legalos.accounting.payroll.caption")}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
