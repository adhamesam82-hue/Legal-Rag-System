"use client";

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
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { formatEGP } from "@/lib/legalos-data";

// ---------------------------------------------------------------------------
// Mock analytics. Revenue matches the dashboard and accounting pages
// (Feb 312k → Jul 486.2k); utilization matches the dashboard's workload card.
// ---------------------------------------------------------------------------

const REVENUE = [
  { month: "Feb", revenue: 312000, collected: 288000 },
  { month: "Mar", revenue: 338000, collected: 310000 },
  { month: "Apr", revenue: 355000, collected: 341000 },
  { month: "May", revenue: 402000, collected: 372000 },
  { month: "Jun", revenue: 433000, collected: 408000 },
  { month: "Jul", revenue: 486200, collected: 432000 },
];

const UTILIZATION = [
  { name: "Ahmed Al-Sayed", utilization: 88, billable: 148, target: 160 },
  { name: "Mona Farouk", utilization: 74, billable: 124, target: 160 },
  { name: "Youssef Adel", utilization: 61, billable: 102, target: 160 },
  { name: "Layla Hassan", utilization: 52, billable: 78, target: 150 },
];

const OUTCOMES = [
  { label: "Settled", value: 14, color: "var(--color-accent)" },
  { label: "Won at judgment", value: 8, color: "var(--color-icon-blue)" },
  { label: "Withdrawn", value: 3, color: "var(--color-border-emphasized)" },
  { label: "Lost", value: 2, color: "var(--color-icon-red)" },
];

const COMPLETION = [
  { month: "Feb", opened: 6, closed: 4 },
  { month: "Mar", opened: 5, closed: 5 },
  { month: "Apr", opened: 8, closed: 6 },
  { month: "May", opened: 7, closed: 5 },
  { month: "Jun", opened: 6, closed: 7 },
  { month: "Jul", opened: 9, closed: 6 },
];

const AXIS_TICK = { fontSize: 12, fill: "var(--color-text-secondary)" };

const tooltipStyle = {
  background: "var(--color-background-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-element)",
};

function egpK(v: number) {
  return `EGP ${Math.round(v / 1000)}k`;
}

const totalOutcomes = OUTCOMES.reduce((s, o) => s + o.value, 0);
const collectionRate =
  (REVENUE.reduce((s, r) => s + r.collected, 0) / REVENUE.reduce((s, r) => s + r.revenue, 0)) * 100;

export default function ReportsPage() {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
            <VStack gap={1}>
              <Heading level={2}>Reports</Heading>
              <Text type="body" color="secondary">
                Firm performance · February to July 2026
              </Text>
            </VStack>
            <Button
              label="Export reports"
              variant="secondary"
              icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            >
              Export
            </Button>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6}>
            <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Revenue (6 months)
                  </Text>
                  <Heading level={2}>
                    {formatEGP(REVENUE.reduce((s, r) => s + r.revenue, 0))}
                  </Heading>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Collection rate
                  </Text>
                  <Heading level={2}>{collectionRate.toFixed(1)}%</Heading>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Matters closed
                  </Text>
                  <Heading level={2}>{COMPLETION.reduce((s, c) => s + c.closed, 0)}</Heading>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    Favourable outcomes
                  </Text>
                  <Heading level={2}>
                    {Math.round(((OUTCOMES[0].value + OUTCOMES[1].value) / totalOutcomes) * 100)}%
                  </Heading>
                </VStack>
              </Card>
            </Grid>

            <Card>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>Billed against collected</Heading>
                  <Link href="/billing">Open billing</Link>
                </HStack>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={REVENUE} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={egpK}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                    />
                    <Tooltip formatter={(v) => formatEGP(Number(v))} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Billed"
                      stroke="var(--color-accent)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--color-accent)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="collected"
                      name="Collected"
                      stroke="var(--color-icon-blue)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: "var(--color-icon-blue)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </VStack>
            </Card>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>Lawyer utilization</Heading>
                    <Text type="supporting" color="secondary">
                      Billable hours logged this month against each fee earner&apos;s target.
                    </Text>
                    <VStack gap={5}>
                      {UTILIZATION.map((u) => (
                        <VStack key={u.name} gap={1}>
                          <HStack hAlign="between" vAlign="center">
                            <Text type="label">{u.name}</Text>
                            <Text type="supporting" color="secondary">
                              {u.billable}h of {u.target}h
                            </Text>
                          </HStack>
                          <ProgressBar
                            label={`${u.name} utilization`}
                            isLabelHidden
                            value={u.utilization}
                            max={100}
                            hasValueLabel
                            variant={u.utilization > 85 ? "warning" : "accent"}
                          />
                        </VStack>
                      ))}
                    </VStack>
                    <Divider />
                    <Text type="supporting" color="secondary">
                      Sustained utilization above 85% is a burnout signal, not a target to beat.
                    </Text>
                  </VStack>
                </Card>
              </GridSpan>

              <Card>
                <VStack gap={4}>
                  <Heading level={4}>Case outcomes</Heading>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={OUTCOMES}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {OUTCOMES.map((o) => (
                          <Cell key={o.label} fill={o.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <VStack gap={2}>
                    {OUTCOMES.map((o) => (
                      <HStack key={o.label} hAlign="between" vAlign="center">
                        <Text type="supporting">{o.label}</Text>
                        <Text type="supporting" color="secondary">
                          {o.value} ({Math.round((o.value / totalOutcomes) * 100)}%)
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </Card>
            </Grid>

            <Card>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>Matters opened against closed</Heading>
                  <Link href="/matters">All matters</Link>
                </HStack>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={COMPLETION} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="opened"
                      name="Opened"
                      fill="var(--color-border-emphasized)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="closed"
                      name="Closed"
                      fill="var(--color-accent)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <Text type="supporting" color="secondary">
                  New matters have outpaced closures in 4 of the last 6 months — the active
                  caseload is growing.
                </Text>
              </VStack>
            </Card>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
