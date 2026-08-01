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

// ---------------------------------------------------------------------------
// Mock firm-level financials. Revenue tracks the dashboard's trend
// (Feb 312k → Jul 486.2k) so the two pages agree.
// ---------------------------------------------------------------------------

const MONTHLY = [
  { month: "Feb", revenue: 312000, expenses: 198000 },
  { month: "Mar", revenue: 338000, expenses: 205000 },
  { month: "Apr", revenue: 355000, expenses: 211000 },
  { month: "May", revenue: 402000, expenses: 224000 },
  { month: "Jun", revenue: 433000, expenses: 231000 },
  { month: "Jul", revenue: 486200, expenses: 246800 },
];

const CASHFLOW = MONTHLY.map((m) => ({
  month: m.month,
  net: m.revenue - m.expenses,
}));

const JULY = MONTHLY[MONTHLY.length - 1];
const JUNE = MONTHLY[MONTHLY.length - 2];
const profit = JULY.revenue - JULY.expenses;
const priorProfit = JUNE.revenue - JUNE.expenses;
const profitDelta = ((profit - priorProfit) / priorProfit) * 100;
const margin = (profit / JULY.revenue) * 100;

interface Payout extends Record<string, unknown> {
  id: string;
  partner: string;
  share: string;
  ytd: number;
  july: number;
}

const PAYOUTS: Payout[] = [
  { id: "p1", partner: "Ahmed Al-Sayed", share: "60%", ytd: 742000, july: 143500 },
  { id: "p2", partner: "Mona Farouk", share: "40%", ytd: 494600, july: 95700 },
];

interface ExpenseLine extends Record<string, unknown> {
  id: string;
  category: string;
  july: number;
  ytd: number;
}

const EXPENSES: ExpenseLine[] = [
  { id: "e1", category: "Salaries and wages", july: 148000, ytd: 902000 },
  { id: "e2", category: "Office rent", july: 42000, ytd: 252000 },
  { id: "e3", category: "Court and filing fees", july: 18600, ytd: 96400 },
  { id: "e4", category: "Software and subscriptions", july: 14200, ytd: 78300 },
  { id: "e5", category: "Professional insurance", july: 11000, ytd: 66000 },
  { id: "e6", category: "Travel and client meetings", july: 8400, ytd: 41200 },
  { id: "e7", category: "Utilities and other", july: 4600, ytd: 29800 },
];

const PAYROLL = [
  { name: "Ahmed Al-Sayed", role: "Owner · Partner", gross: 0, note: "Paid via partner draw" },
  { name: "Mona Farouk", role: "Lawyer · Partner", gross: 0, note: "Paid via partner draw" },
  { name: "Youssef Adel", role: "Lawyer", gross: 52000, note: "Monthly salary" },
  { name: "Layla Hassan", role: "Staff", gross: 24000, note: "Monthly salary" },
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
  const payoutColumns: TableColumn<Payout>[] = [
    { key: "partner", header: "Partner", width: proportional(2) },
    { key: "share", header: "Share", width: pixel(90) },
    {
      key: "july",
      header: "July payout",
      width: pixel(140),
      renderCell: (i) => <Text type="body">{formatEGP(i.july)}</Text>,
    },
    {
      key: "ytd",
      header: "Year to date",
      width: pixel(150),
      renderCell: (i) => (
        <Text type="body" weight="semibold">
          {formatEGP(i.ytd)}
        </Text>
      ),
    },
  ];

  const expenseColumns: TableColumn<ExpenseLine>[] = [
    { key: "category", header: "Category", width: proportional(2) },
    {
      key: "july",
      header: "July",
      width: pixel(130),
      renderCell: (i) => <Text type="body">{formatEGP(i.july)}</Text>,
    },
    {
      key: "ytd",
      header: "Year to date",
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
            <Heading level={2}>Accounting</Heading>
            <Text type="body" color="secondary">
              Al-Sayed &amp; Partners · firm financials for July 2026
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6}>
            <Banner
              status="info"
              title="Sample figures — no backend yet"
              description="This pillar has no data model behind it. Every number below is
                placeholder content, not a reading of your firm's records. Clients,
                matters, cases, documents, tasks, time and billing are live."
            />
          <VStack gap={6}>
            <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Revenue (July)
                  </Text>
                  <Heading level={2}>{formatEGP(JULY.revenue)}</Heading>
                  <HStack gap={1} vAlign="center">
                    <Icon icon={ArrowUpIcon} size="xsm" color="success" />
                    <Text type="supporting" color="secondary">
                      +12.3% vs. June
                    </Text>
                  </HStack>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Expenses (July)
                  </Text>
                  <Heading level={2}>{formatEGP(JULY.expenses)}</Heading>
                  <HStack gap={1} vAlign="center">
                    <Icon icon={ArrowUpIcon} size="xsm" color="secondary" />
                    <Text type="supporting" color="secondary">
                      +6.8% vs. June
                    </Text>
                  </HStack>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Profit (July)
                  </Text>
                  <Heading level={2}>{formatEGP(profit)}</Heading>
                  <HStack gap={1} vAlign="center">
                    <Icon
                      icon={profitDelta >= 0 ? ArrowUpIcon : ArrowDownIcon}
                      size="xsm"
                      color={profitDelta >= 0 ? "success" : "error"}
                    />
                    <Text type="supporting" color="secondary">
                      {profitDelta.toFixed(1)}% vs. June
                    </Text>
                  </HStack>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Net margin
                  </Text>
                  <Heading level={2}>{margin.toFixed(1)}%</Heading>
                  <Text type="supporting" color="secondary">
                    Revenue less all operating expenses
                  </Text>
                </VStack>
              </Card>
            </Grid>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>Revenue against expenses</Heading>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={MONTHLY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                          name="Revenue"
                          fill="var(--color-accent)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="expenses"
                          name="Expenses"
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
                  <Heading level={4}>Cash flow</Heading>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={CASHFLOW} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                        formatter={(v) => [formatEGP(Number(v)), "Net cash"]}
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
                    Net of collections and operating outflows each month.
                  </Text>
                </VStack>
              </Card>
            </Grid>

            <Grid columns={2} gap={6}>
              <Card>
                <VStack gap={4}>
                  <Heading level={4}>Operating expenses</Heading>
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
                      Total
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
                      <Heading level={4}>Partner payouts</Heading>
                      <Link href="/reports">Reports</Link>
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
                    <Heading level={4}>Payroll</Heading>
                    <List hasDividers density="compact">
                      {PAYROLL.map((p) => (
                        <ListItem
                          key={p.name}
                          label={p.name}
                          description={`${p.role} · ${p.note}`}
                          endContent={
                            <Text type="label" weight="semibold">
                              {p.gross > 0 ? formatEGP(p.gross) : "—"}
                            </Text>
                          }
                        />
                      ))}
                    </List>
                    <Text type="supporting" color="secondary">
                      Partner draws are settled through payouts above, not payroll.
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
