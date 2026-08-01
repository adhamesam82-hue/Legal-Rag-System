"use client";

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
import { List, ListItem } from "@astryxdesign/core/List";
import { Link } from "@astryxdesign/core/Link";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import {
  BanknotesIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Mock data — no billing backend exists yet; this is the UI concept pass.
// Collected figures line up with the dashboard's revenue trend (Feb 312k →
// Jul 486.2k) so the two pages don't contradict each other.
// ---------------------------------------------------------------------------

export interface Invoice extends Record<string, unknown> {
  id: string;
  client: string;
  matter: string;
  amount: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  issueDate: string;
  dueDate: string;
}

export const INVOICES: Invoice[] = [
  { id: "INV-2031", client: "Nile Trading Co.", matter: "Nabil v. Nile Trading Co.", amount: 84500, status: "Sent", issueDate: "Jul 27", dueDate: "Aug 10" },
  { id: "INV-2030", client: "Delta Foods", matter: "Delta Foods Labour Dispute", amount: 52000, status: "Paid", issueDate: "Jul 6", dueDate: "Jul 20" },
  { id: "INV-2029", client: "Khalil Holdings", matter: "Khalil Holdings Contract Review", amount: 38750, status: "Overdue", issueDate: "Jul 1", dueDate: "Jul 15" },
  { id: "INV-2028", client: "Al Amal Trading", matter: "Al Amal Trading Renewal", amount: 21000, status: "Draft", issueDate: "—", dueDate: "—" },
  { id: "INV-2027", client: "El-Sayed Estate", matter: "El-Sayed Estate Partition", amount: 67200, status: "Paid", issueDate: "Jun 21", dueDate: "Jul 5" },
  { id: "INV-2026", client: "Nile Trading Co.", matter: "Nabil v. Nile Trading Co.", amount: 45900, status: "Overdue", issueDate: "Jun 14", dueDate: "Jun 28" },
  { id: "INV-2025", client: "Delta Foods", matter: "Delta Foods Labour Dispute", amount: 29300, status: "Sent", issueDate: "Jul 20", dueDate: "Aug 3" },
  { id: "INV-2024", client: "Khalil Holdings", matter: "Khalil Holdings Contract Review", amount: 61000, status: "Paid", issueDate: "Jun 1", dueDate: "Jun 15" },
  { id: "INV-2023", client: "Al Amal Trading", matter: "Al Amal Trading Renewal", amount: 18400, status: "Paid", issueDate: "May 27", dueDate: "Jun 10" },
  { id: "INV-2022", client: "El-Sayed Estate", matter: "El-Sayed Estate Partition", amount: 33750, status: "Draft", issueDate: "—", dueDate: "—" },
];

const RETAINERS = [
  { client: "Nile Trading Co.", balance: 120000, threshold: 25000 },
  { client: "Delta Foods", balance: 65000, threshold: 20000 },
  { client: "Al Amal Trading", balance: 42000, threshold: 15000 },
  { client: "Khalil Holdings", balance: 18500, threshold: 25000 },
  { client: "El-Sayed Estate", balance: 9200, threshold: 15000 },
];

interface Expense extends Record<string, unknown> {
  id: string;
  date: string;
  matter: string;
  description: string;
  amount: number;
  kind: "Billable" | "Firm";
  status: string;
}

const EXPENSES: Expense[] = [
  { id: "e1", date: "Jul 28", matter: "Nabil v. Nile Trading Co.", description: "Court filing fees", amount: 3200, kind: "Billable", status: "Reimbursement pending" },
  { id: "e2", date: "Jul 26", matter: "Delta Foods Labour Dispute", description: "Expert witness consultation", amount: 12000, kind: "Billable", status: "Invoiced" },
  { id: "e3", date: "Jul 24", matter: "Khalil Holdings Contract Review", description: "Courier & notarization", amount: 850, kind: "Billable", status: "Reimbursed" },
  { id: "e4", date: "Jul 22", matter: "Firm overhead", description: "Office supplies", amount: 1400, kind: "Firm", status: "Recorded" },
  { id: "e5", date: "Jul 20", matter: "El-Sayed Estate Partition", description: "Property valuation report", amount: 6500, kind: "Billable", status: "Invoiced" },
  { id: "e6", date: "Jul 18", matter: "Firm overhead", description: "Legal research subscription", amount: 2200, kind: "Firm", status: "Recorded" },
];

const BILLING_CHART = [
  { month: "Feb", invoiced: 325000, collected: 312000 },
  { month: "Mar", invoiced: 350000, collected: 338000 },
  { month: "Apr", invoiced: 368000, collected: 355000 },
  { month: "May", invoiced: 415000, collected: 402000 },
  { month: "Jun", invoiced: 447000, collected: 433000 },
  { month: "Jul", invoiced: 501500, collected: 486200 },
];

export function egp(value: number) {
  return `EGP ${value.toLocaleString()}`;
}

function egpShort(value: number) {
  return `EGP ${Math.round(value / 1000)}k`;
}

const outstanding = INVOICES.filter((i) => i.status !== "Paid").reduce((sum, i) => sum + i.amount, 0);
const overdue = INVOICES.filter((i) => i.status === "Overdue").reduce((sum, i) => sum + i.amount, 0);
const draftPending = INVOICES.filter((i) => i.status === "Draft").reduce((sum, i) => sum + i.amount, 0);
const collectedMtd = BILLING_CHART[BILLING_CHART.length - 1].collected;

const summaryKpis = [
  { label: "Total Outstanding", value: egp(outstanding), change: `${INVOICES.filter((i) => i.status !== "Paid").length} open invoices`, icon: BanknotesIcon },
  { label: "Overdue", value: egp(overdue), change: `${INVOICES.filter((i) => i.status === "Overdue").length} invoices past due`, icon: ExclamationTriangleIcon, warn: true },
  { label: "Draft — Pending Send", value: egp(draftPending), change: `${INVOICES.filter((i) => i.status === "Draft").length} not yet sent`, icon: DocumentTextIcon },
  { label: "Collected (MTD)", value: egp(collectedMtd), change: "+12.4% vs. last month", icon: BuildingOffice2Icon },
];

function BillingChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={BILLING_CHART} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
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
          width={56}
        />
        <Tooltip
          formatter={(value, name) => [egp(Number(value)), name]}
          contentStyle={{
            background: "var(--color-background-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-element)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="invoiced" name="Invoiced" fill="var(--color-border-strong)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collected" name="Collected" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function KpiCard({ label, value, change, icon, warn }: (typeof summaryKpis)[number]) {
  return (
    <Card>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center">
          <Text type="label" color="secondary">
            {label}
          </Text>
          <Icon icon={icon} size="sm" color={warn ? "warning" : "secondary"} />
        </HStack>
        <Heading level={2}>{value}</Heading>
        <Text type="supporting" color="secondary">
          {change}
        </Text>
      </VStack>
    </Card>
  );
}

export default function BillingPage() {
  const invoiceColumns: TableColumn<Invoice>[] = [
    {
      key: "id",
      header: "Invoice #",
      width: pixel(120),
      renderCell: (item) => (
        <Link href={`/billing/${item.id}`}>{item.id}</Link>
      ),
    },
    {
      key: "client",
      header: "Client",
      width: proportional(1.5),
      renderCell: (item) => <Text type="body">{item.client}</Text>,
    },
    {
      key: "matter",
      header: "Matter",
      width: proportional(2),
      renderCell: (item) => (
        <Text type="body" color="secondary" maxLines={1}>
          {item.matter}
        </Text>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: pixel(110),
      renderCell: (item) =>
        item.status === "Overdue" ? (
          <Badge variant="error" label="Overdue" />
        ) : (
          <Text type="body" color={item.status === "Sent" ? "primary" : "secondary"}>
            {item.status}
          </Text>
        ),
    },
    {
      key: "dueDate",
      header: "Due",
      width: pixel(90),
      renderCell: (item) => (
        <Text type="body" color="secondary">
          {item.dueDate}
        </Text>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: pixel(130),
      align: "end",
      renderCell: (item) => (
        <Text type="body" weight="semibold" hasTabularNumbers>
          {egp(item.amount)}
        </Text>
      ),
    },
  ];

  const expenseColumns: TableColumn<Expense>[] = [
    { key: "date", header: "Date", width: pixel(80), renderCell: (item) => <Text type="body" color="secondary">{item.date}</Text> },
    { key: "matter", header: "Matter", width: proportional(1.5), renderCell: (item) => <Text type="body" maxLines={1}>{item.matter}</Text> },
    { key: "description", header: "Description", width: proportional(2), renderCell: (item) => <Text type="body" color="secondary">{item.description}</Text> },
    {
      key: "kind",
      header: "Type",
      width: pixel(110),
      renderCell: (item) =>
        item.kind === "Billable" ? (
          <Text type="body">Billable</Text>
        ) : (
          <Badge variant="neutral" label="Firm" />
        ),
    },
    { key: "status", header: "Status", width: pixel(160), renderCell: (item) => <Text type="body" color="secondary">{item.status}</Text> },
    {
      key: "amount",
      header: "Amount",
      width: pixel(110),
      align: "end",
      renderCell: (item) => (
        <Text type="body" weight="semibold" hasTabularNumbers>
          {egp(item.amount)}
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
                <Heading level={2}>Billing</Heading>
                <Text type="body" color="secondary">
                  Al-Sayed &amp; Partners · invoices, retainers &amp; expenses
                </Text>
              </VStack>
              <Button
                label="New invoice"
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
              >
                New invoice
              </Button>
            </HStack>

            <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
              {summaryKpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} />
              ))}
            </Grid>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <Heading level={4}>Invoiced vs. collected</Heading>
                      <Link href="/reports">View reports</Link>
                    </HStack>
                    <BillingChart />
                  </VStack>
                </Card>
              </GridSpan>

              <Card>
                <VStack gap={4}>
                  <HStack hAlign="between" vAlign="center">
                    <Heading level={4}>Retainers</Heading>
                    <Link href="/clients">All clients</Link>
                  </HStack>
                  <List hasDividers density="compact">
                    {RETAINERS.map((r) => (
                      <ListItem
                        key={r.client}
                        label={r.client}
                        description={`Replenish below ${egp(r.threshold)}`}
                        endContent={
                          <VStack gap={1} align="end">
                            <Text type="label" weight="semibold" hasTabularNumbers>
                              {egp(r.balance)}
                            </Text>
                            {r.balance < r.threshold && (
                              <Badge variant="warning" label="Low balance" />
                            )}
                          </VStack>
                        }
                      />
                    ))}
                  </List>
                </VStack>
              </Card>
            </Grid>

            <Card>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>Invoices</Heading>
                  <Text type="supporting" color="secondary">
                    {INVOICES.length} invoices
                  </Text>
                </HStack>
                <Table<Invoice> data={INVOICES} columns={invoiceColumns} idKey="id" hasHover />
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>Expenses</Heading>
                  <Text type="supporting" color="secondary">
                    Billable &amp; firm expenses, this month
                  </Text>
                </HStack>
                <Table<Expense> data={EXPENSES} columns={expenseColumns} idKey="id" hasHover />
              </VStack>
            </Card>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
