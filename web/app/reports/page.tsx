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
import { Banner } from "@astryxdesign/core/Banner";
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
  { labelKey: "@legalos.reports.outcome.settled", value: 14, color: "var(--color-accent)" },
  {
    labelKey: "@legalos.reports.outcome.wonAtJudgment",
    value: 8,
    color: "var(--color-icon-blue)",
  },
  {
    labelKey: "@legalos.reports.outcome.withdrawn",
    value: 3,
    color: "var(--color-border-emphasized)",
  },
  { labelKey: "@legalos.reports.outcome.lost", value: 2, color: "var(--color-icon-red)" },
];

const COMPLETION = [
  { monthKey: MONTH_KEYS[0], opened: 6, closed: 4 },
  { monthKey: MONTH_KEYS[1], opened: 5, closed: 5 },
  { monthKey: MONTH_KEYS[2], opened: 8, closed: 6 },
  { monthKey: MONTH_KEYS[3], opened: 7, closed: 5 },
  { monthKey: MONTH_KEYS[4], opened: 6, closed: 7 },
  { monthKey: MONTH_KEYS[5], opened: 9, closed: 6 },
];

const AXIS_TICK = { fontSize: "var(--font-size-sm)", fill: "var(--color-text-secondary)" };

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
  const t = useTranslator();

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
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
            <VStack gap={1}>
              <Heading level={2}>{t("@legalos.reports.heading")}</Heading>
              <Text type="body" color="secondary">
                {t("@legalos.reports.subtitle")}
              </Text>
            </VStack>
            <Button
              label={t("@legalos.reports.export.ariaLabel")}
              variant="secondary"
              icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            >
              {t("@legalos.reports.export.button")}
            </Button>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6}>
            <Banner
              status="info"
              title={t("@legalos.reports.banner.title")}
              description={t("@legalos.reports.banner.description")}
            />
          <VStack gap={6}>
            <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    {t("@legalos.reports.stat.revenue.label")}
                  </Text>
                  <Text size="2xl" weight="semibold">
                    {formatEGP(REVENUE.reduce((s, r) => s + r.revenue, 0))}
                  </Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    {t("@legalos.reports.stat.collectionRate.label")}
                  </Text>
                  <Text size="2xl" weight="semibold">{collectionRate.toFixed(1)}%</Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    {t("@legalos.reports.stat.mattersClosed.label")}
                  </Text>
                  <Text size="2xl" weight="semibold">{COMPLETION.reduce((s, c) => s + c.closed, 0)}</Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={2}>
                  <Text type="label" color="secondary">
                    {t("@legalos.reports.stat.favourableOutcomes.label")}
                  </Text>
                  <Text size="2xl" weight="semibold">
                    {Math.round(((OUTCOMES[0].value + OUTCOMES[1].value) / totalOutcomes) * 100)}%
                  </Text>
                </VStack>
              </Card>
            </Grid>

            <Card>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={4}>{t("@legalos.reports.billedCollected.heading")}</Heading>
                  <Link href="/billing">{t("@legalos.reports.billedCollected.link")}</Link>
                </HStack>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    <Legend wrapperStyle={{ fontSize: "var(--font-size-sm)" }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name={t("@legalos.reports.legend.billed")}
                      stroke="var(--color-accent)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--color-accent)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="collected"
                      name={t("@legalos.reports.legend.collected")}
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
                    <Heading level={4}>{t("@legalos.reports.utilization.heading")}</Heading>
                    <Text type="supporting" color="secondary">
                      {t("@legalos.reports.utilization.description")}
                    </Text>
                    <VStack gap={5}>
                      {UTILIZATION.map((u) => (
                        <VStack key={u.nameKey} gap={1}>
                          <HStack hAlign="between" vAlign="center">
                            <Text type="label">{t(u.nameKey)}</Text>
                            <Text type="supporting" color="secondary">
                              {t("@legalos.reports.utilization.hoursOfTarget", {
                                billable: u.billable,
                                target: u.target,
                              })}
                            </Text>
                          </HStack>
                          <ProgressBar
                            label={t("@legalos.reports.utilization.ariaLabel", {
                              name: t(u.nameKey),
                            })}
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
                      {t("@legalos.reports.utilization.caption")}
                    </Text>
                  </VStack>
                </Card>
              </GridSpan>

              <Card>
                <VStack gap={4}>
                  <Heading level={4}>{t("@legalos.reports.outcomes.heading")}</Heading>
                  <ResponsiveContainer width="100%" height={200}>
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
                  <VStack gap={2}>
                    {outcomes.map((o) => (
                      <HStack key={o.label} hAlign="between" vAlign="center">
                        <Text type="supporting">{o.label}</Text>
                        <Text type="supporting" color="secondary">
                          {t("@legalos.reports.outcome.countPercent", {
                            count: o.value,
                            percent: Math.round((o.value / totalOutcomes) * 100),
                          })}
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
                  <Heading level={4}>{t("@legalos.reports.completion.heading")}</Heading>
                  <Link href="/matters">{t("@legalos.reports.completion.link")}</Link>
                </HStack>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={completion} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "var(--font-size-sm)" }} />
                    <Bar
                      dataKey="opened"
                      name={t("@legalos.reports.legend.opened")}
                      fill="var(--color-border-emphasized)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="closed"
                      name={t("@legalos.reports.legend.closed")}
                      fill="var(--color-accent)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <Text type="supporting" color="secondary">
                  {t("@legalos.reports.completion.caption")}
                </Text>
              </VStack>
            </Card>
          </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
