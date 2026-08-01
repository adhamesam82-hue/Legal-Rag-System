"use client";

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
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { List, ListItem } from "@astryxdesign/core/List";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import {
  ScaleIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  BanknotesIcon,
  SparklesIcon,
  ArrowUpIcon,
  ClockIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Mock data — no billing/matters backend exists yet; this dashboard is the UI
// concept pass. Shapes mirror what sub-project 2+ will eventually serve.
// ---------------------------------------------------------------------------

const kpis = [
  {
    label: "Active Matters",
    value: "42",
    change: "+3 this month",
    icon: BriefcaseIcon,
  },
  {
    label: "Open Tasks",
    value: "18",
    change: "5 overdue",
    icon: CheckCircleIcon,
    warn: true,
  },
  {
    label: "Revenue (MTD)",
    value: "EGP 486,200",
    change: "+12.4% vs. last month",
    icon: BanknotesIcon,
  },
  {
    label: "Billable Hours (MTD)",
    value: "312h",
    change: "78% utilization",
    icon: ClockIcon,
  },
];

const revenueData = [
  { month: "Feb", revenue: 312000 },
  { month: "Mar", revenue: 338000 },
  { month: "Apr", revenue: 355000 },
  { month: "May", revenue: 402000 },
  { month: "Jun", revenue: 433000 },
  { month: "Jul", revenue: 486200 },
];

const hearings = [
  {
    time: "10:00 AM",
    matter: "Nabil v. Nile Trading Co.",
    court: "Cairo Economic Court",
    lawyer: "Mona Farouk",
  },
  {
    time: "1:30 PM",
    matter: "El-Sayed Estate Partition",
    court: "Giza Family Court",
    lawyer: "Ahmed Al-Sayed",
  },
  {
    time: "3:00 PM",
    matter: "Delta Foods Labour Dispute",
    court: "Cairo Labour Court",
    lawyer: "Youssef Adel",
  },
];

const deadlines = [
  { label: "File appeal brief — Nabil v. Nile Trading", days: 2, urgent: true },
  { label: "Respond to discovery request — Delta Foods", days: 4, urgent: true },
  { label: "Renew commercial registration — Al Amal Trading", days: 9 },
  { label: "Submit tax objection — Khalil Holdings", days: 14 },
];

const activity = [
  { who: "Mona Farouk", what: "uploaded 3 documents to Nabil v. Nile Trading", time: "12m ago" },
  { who: "AI Assistant", what: "finished reviewing NDA — Delta Foods (2 risks flagged)", time: "38m ago" },
  { who: "Youssef Adel", what: "logged 2.5h on El-Sayed Estate Partition", time: "1h ago" },
  { who: "Ahmed Al-Sayed", what: "invited Mona Farouk to Al Amal Trading matter", time: "3h ago" },
];

const workload = [
  { name: "Ahmed Al-Sayed", matters: 14, utilization: 88 },
  { name: "Mona Farouk", matters: 11, utilization: 74 },
  { name: "Youssef Adel", matters: 9, utilization: 61 },
  { name: "Layla Hassan", matters: 8, utilization: 52 },
];

const pendingDocuments = [
  { name: "Settlement Agreement — Nile Trading", status: "Awaiting signature" },
  { name: "Power of Attorney — Khalil Holdings", status: "Awaiting client review" },
  { name: "NDA — Delta Foods", status: "AI review complete" },
];

const messages = [
  { from: "Mona Farouk", snippet: "Court moved the hearing to 10 AM, can you confirm?", unread: true },
  { from: "Youssef Adel", snippet: "Uploaded the labour contract draft for review", unread: true },
  { from: "Layla Hassan", snippet: "Client signed off on the settlement terms", unread: false },
];

function formatEGP(value: number) {
  return `EGP ${Math.round(value / 1000)}k`;
}

function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatEGP}
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value) => [`EGP ${Number(value).toLocaleString()}`, "Revenue"]}
          contentStyle={{
            background: "var(--color-background-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-element)",
          }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--color-accent)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function KpiCard({ label, value, change, icon, warn }: (typeof kpis)[number]) {
  return (
    <Card>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center">
          <Text type="label" color="secondary">
            {label}
          </Text>
          <Icon icon={icon} size="sm" color="secondary" />
        </HStack>
        <Heading level={2}>{value}</Heading>
        <HStack gap={1} vAlign="center">
          {!warn && <Icon icon={ArrowUpIcon} size="xsm" color="success" />}
          <Text type="supporting" color={warn ? "secondary" : "secondary"}>
            {change}
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <HStack hAlign="between" vAlign="center">
              <VStack gap={1}>
                <Heading level={2}>Good afternoon, Ahmed</Heading>
                <Text type="body" color="secondary">
                  Al-Sayed &amp; Partners · Saturday, August 1
                </Text>
              </VStack>
              <HStack gap={2}>
                <Button
                  label="Ask AI"
                  variant="secondary"
                  icon={<Icon icon={SparklesIcon} size="sm" className="text-purple-vivid" />}
                >
                  Ask AI
                </Button>
                <Button
                  label="New matter"
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                >
                  New matter
                </Button>
              </HStack>
            </HStack>

            <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
              {kpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} />
              ))}
            </Grid>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <VStack gap={6}>
                  <Card>
                    <VStack gap={4}>
                      <HStack hAlign="between" vAlign="center">
                        <Heading level={4}>Revenue &amp; billings</Heading>
                        <Link href="/reports">View reports</Link>
                      </HStack>
                      <RevenueChart />
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <HStack hAlign="between" vAlign="center">
                        <Heading level={4}>Today&apos;s hearings</Heading>
                        <Link href="/calendar">Full calendar</Link>
                      </HStack>
                      <List hasDividers density="compact">
                        {hearings.map((h) => (
                          <ListItem
                            key={h.matter}
                            label={h.matter}
                            description={`${h.court} · ${h.lawyer}`}
                            startContent={
                              <Icon icon={ScaleIcon} size="sm" color="secondary" />
                            }
                            endContent={
                              <Text type="label" weight="semibold">
                                {h.time}
                              </Text>
                            }
                          />
                        ))}
                      </List>
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <HStack hAlign="between" vAlign="center">
                        <Heading level={4}>Upcoming deadlines</Heading>
                        <Link href="/tasks">All tasks</Link>
                      </HStack>
                      <List hasDividers density="compact">
                        {deadlines.map((d) => (
                          <ListItem
                            key={d.label}
                            label={d.label}
                            startContent={
                              <Icon icon={ClockIcon} size="sm" color="secondary" />
                            }
                            endContent={
                              d.urgent ? (
                                <Badge variant="warning" label={`${d.days}d`} />
                              ) : (
                                <Text type="supporting" color="secondary">
                                  {d.days}d
                                </Text>
                              )
                            }
                          />
                        ))}
                      </List>
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>Recent activity</Heading>
                      <List hasDividers density="compact">
                        {activity.map((a) => (
                          <ListItem
                            key={`${a.who}-${a.time}`}
                            label={a.who}
                            description={a.what}
                            startContent={<Avatar name={a.who} size="sm" tooltip={false} />}
                            endContent={
                              <Text type="supporting" color="secondary">
                                {a.time}
                              </Text>
                            }
                          />
                        ))}
                      </List>
                    </VStack>
                  </Card>
                </VStack>
              </GridSpan>

              <VStack gap={6}>
                <Card variant="purple">
                  <VStack gap={3}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={SparklesIcon} size="sm" className="text-purple-vivid" />
                      <Heading level={4}>AI insights</Heading>
                    </HStack>
                    <Text type="body">
                      3 matters have hearings this week with no prepared brief on file.
                    </Text>
                    <Divider />
                    <Text type="body">
                      The Delta Foods NDA review found 2 clauses that deviate from your
                      standard template.
                    </Text>
                    <Button label="Ask AI Assistant" variant="secondary" size="sm">
                      Ask AI Assistant
                    </Button>
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>Lawyer workload</Heading>
                    <VStack gap={4}>
                      {workload.map((w) => (
                        <VStack key={w.name} gap={1}>
                          <HStack hAlign="between" vAlign="center">
                            <Text type="label">{w.name}</Text>
                            <Text type="supporting" color="secondary">
                              {w.matters} matters
                            </Text>
                          </HStack>
                          <ProgressBar
                            label={`${w.name} utilization`}
                            isLabelHidden
                            value={w.utilization}
                            max={100}
                            hasValueLabel
                            variant={w.utilization > 85 ? "warning" : "accent"}
                          />
                        </VStack>
                      ))}
                    </VStack>
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <Heading level={4}>Pending documents</Heading>
                      <Link href="/documents">All documents</Link>
                    </HStack>
                    <List hasDividers density="compact">
                      {pendingDocuments.map((d) => (
                        <ListItem
                          key={d.name}
                          label={d.name}
                          startContent={
                            <Icon icon={DocumentTextIcon} size="sm" color="secondary" />
                          }
                          endContent={
                            <Text type="supporting" color="secondary">
                              {d.status}
                            </Text>
                          }
                        />
                      ))}
                    </List>
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <HStack hAlign="between" vAlign="center">
                      <Heading level={4}>Recent messages</Heading>
                      <Link href="/messages">Open inbox</Link>
                    </HStack>
                    <List hasDividers density="compact">
                      {messages.map((m) => (
                        <ListItem
                          key={m.from}
                          label={m.from}
                          description={m.snippet}
                          startContent={<Avatar name={m.from} size="sm" tooltip={false} />}
                          endContent={
                            m.unread ? (
                              <Icon
                                icon={ChatBubbleLeftRightIcon}
                                size="sm"
                                className="text-purple-vivid"
                              />
                            ) : undefined
                          }
                        />
                      ))}
                    </List>
                  </VStack>
                </Card>
              </VStack>
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
