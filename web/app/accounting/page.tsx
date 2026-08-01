"use client";

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
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { Banner } from "@astryxdesign/core/Banner";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Table, pixel, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { List, ListItem } from "@astryxdesign/core/List";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { formatEGP } from "@/lib/legalos-data";
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

// The current reporting month. Every "July" label on the page resolves through
// this one key so the copy stays consistent when the catalog switches locale.
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

const AXIS_TICK = { fontSize: 12, fill: "var(--color-text-secondary)" };

function egpK(v: number) {
  return `EGP ${Math.round(v / 1000)}k`;
}

const tooltipStyle = {
  background: "var(--color-background-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-element)",
};

export default function AccountingPage() {
  const t = useTranslator();
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

  const payoutColumns: TableColumn<Payout>[] = [
    {
      key: "partnerKey",
      header: t("@legalos.accounting.column.partner"),
      width: proportional(2),
      renderCell: (i) => <Text type="body">{t(i.partnerKey)}</Text>,
    },
    { key: "share", header: t("@legalos.accounting.column.share"), width: pixel(90) },
    {
      key: "july",
      header: t("@legalos.accounting.column.monthPayout", { month: currentMonth }),
      width: pixel(140),
      renderCell: (i) => <Text type="body">{formatEGP(i.july)}</Text>,
    },
    {
      key: "ytd",
      header: t("@legalos.accounting.column.yearToDate"),
      width: pixel(150),
      renderCell: (i) => (
        <Text type="body" weight="semibold">
          {formatEGP(i.ytd)}
        </Text>
      ),
    },
  ];

  const expenseColumns: TableColumn<ExpenseLine>[] = [
    {
      key: "categoryKey",
      header: t("@legalos.accounting.column.category"),
      width: proportional(2),
      renderCell: (i) => <Text type="body">{t(i.categoryKey)}</Text>,
    },
    {
      key: "july",
      header: currentMonth,
      width: pixel(130),
      renderCell: (i) => <Text type="body">{formatEGP(i.july)}</Text>,
    },
    {
      key: "ytd",
      header: t("@legalos.accounting.column.yearToDate"),
      width: pixel(150),
      renderCell: (i) => (
        <Text type="body" color="secondary">
          {formatEGP(i.ytd)}
        </Text>
      ),
    },
  ];

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={1}>
            <Heading level={2}>{t("@legalos.accounting.heading")}</Heading>
            <Text type="body" color="secondary">
              {t("@legalos.accounting.subtitle")}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6}>
            <Banner
              status="info"
              title={t("@legalos.accounting.banner.title")}
              description={t("@legalos.accounting.banner.description")}
            />
          <VStack gap={6}>
            <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    {t("@legalos.accounting.stat.revenue.label", { month: currentMonth })}
                  </Text>
                  <Text size="2xl" weight="semibold">{formatEGP(JULY.revenue)}</Text>
                  <HStack gap={1} vAlign="center">
                    <Icon icon={ArrowUpIcon} size="xsm" color="success" />
                    <Text type="supporting" color="secondary">
                      {t("@legalos.accounting.stat.revenueChange")}
                    </Text>
                  </HStack>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    {t("@legalos.accounting.stat.expenses.label", { month: currentMonth })}
                  </Text>
                  <Text size="2xl" weight="semibold">{formatEGP(JULY.expenses)}</Text>
                  <HStack gap={1} vAlign="center">
                    <Icon icon={ArrowUpIcon} size="xsm" color="secondary" />
                    <Text type="supporting" color="secondary">
                      {t("@legalos.accounting.stat.expensesChange")}
                    </Text>
                  </HStack>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    {t("@legalos.accounting.stat.profit.label", { month: currentMonth })}
                  </Text>
                  <Text size="2xl" weight="semibold">{formatEGP(profit)}</Text>
                  <HStack gap={1} vAlign="center">
                    <Icon
                      icon={profitDelta >= 0 ? ArrowUpIcon : ArrowDownIcon}
                      size="xsm"
                      color={profitDelta >= 0 ? "success" : "error"}
                    />
                    <Text type="supporting" color="secondary">
                      {t("@legalos.accounting.stat.profitChange", {
                        percent: profitDelta.toFixed(1),
                      })}
                    </Text>
                  </HStack>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    {t("@legalos.accounting.stat.margin.label")}
                  </Text>
                  <Text size="2xl" weight="semibold">{margin.toFixed(1)}%</Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.accounting.stat.margin.description")}
                  </Text>
                </VStack>
              </Card>
            </Grid>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>
                      {t("@legalos.accounting.chart.revenueExpenses.heading")}
                    </Heading>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis
                          tickFormatter={egpK}
                          tick={AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                          width={64}
                        />
                        <Tooltip
                          formatter={(v) => formatEGP(Number(v))}
                          contentStyle={tooltipStyle}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar
                          dataKey="revenue"
                          name={t("@legalos.accounting.chart.legend.revenue")}
                          fill="var(--color-accent)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="expenses"
                          name={t("@legalos.accounting.chart.legend.expenses")}
                          fill="var(--color-border-emphasized)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </VStack>
                </Card>
              </GridSpan>

              <Card>
                <VStack gap={4}>
                  <Heading level={4}>{t("@legalos.accounting.chart.cashFlow.heading")}</Heading>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={cashflow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={egpK}
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
                        stroke="var(--color-accent)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "var(--color-accent)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.accounting.chart.cashFlow.caption")}
                  </Text>
                </VStack>
              </Card>
            </Grid>

            <Grid columns={2} gap={6}>
              <Card>
                <VStack gap={4}>
                  <Heading level={4}>{t("@legalos.accounting.expenses.heading")}</Heading>
                  <Table<ExpenseLine>
                    data={EXPENSES}
                    columns={expenseColumns}
                    idKey="id"
                    density="compact"
                    dividers="rows"
                    hasHover
                  />
                  <Divider />
                  <HStack hAlign="between">
                    <Text type="label" weight="semibold">
                      {t("@legalos.accounting.expenses.total")}
                    </Text>
                    <Text type="label" weight="semibold">
                      {formatEGP(JULY.expenses)}
                    </Text>
                  </HStack>
                </VStack>
              </Card>

              <VStack gap={6}>
                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <Heading level={4}>{t("@legalos.accounting.payouts.heading")}</Heading>
                      <Link href="/reports">
                        {t("@legalos.accounting.payouts.reportsLink")}
                      </Link>
                    </HStack>
                    <Table<Payout>
                      data={PAYOUTS}
                      columns={payoutColumns}
                      idKey="id"
                      density="compact"
                      dividers="rows"
                      hasHover
                    />
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>{t("@legalos.accounting.payroll.heading")}</Heading>
                    <List hasDividers density="compact">
                      {PAYROLL.map((p) => (
                        <ListItem
                          key={p.nameKey}
                          label={t(p.nameKey)}
                          description={`${t(p.roleKey)} · ${t(p.noteKey)}`}
                          endContent={
                            <Text type="label" weight="semibold">
                              {p.gross > 0 ? formatEGP(p.gross) : "—"}
                            </Text>
                          }
                        />
                      ))}
                    </List>
                    <Text type="supporting" color="secondary">
                      {t("@legalos.accounting.payroll.caption")}
                    </Text>
                  </VStack>
                </Card>
              </VStack>
            </Grid>
          </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
