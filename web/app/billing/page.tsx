"use client";

import { useMemo, useState } from "react";
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
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import {
  BanknotesIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { formatDate, formatEGP, label, type InvoiceStatus } from "@/lib/practice";

// Retainer balances and disbursements/expenses were part of the UI concept but
// have no backend and no schema, so they are not rendered here rather than
// shown as invented figures. See PRODUCT.md: screens must not imply a pillar
// is functional before it is.

interface InvoiceRow extends Record<string, unknown> {
  id: number;
  number: string;
  client: string;
  matter: string;
  amount: number;
  status: InvoiceStatus;
  issued: string;
  due: string;
}

const STATUS_VARIANT: Record<InvoiceStatus, "neutral" | "info" | "success" | "error"> = {
  draft: "neutral",
  sent: "info",
  paid: "success",
  overdue: "error",
};

function egpShort(value: number) {
  return `EGP ${Math.round(value / 1000)}k`;
}

export default function BillingPage() {
  const { practice } = useOrg();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resource = useResource(
    async (api) => {
      const [invoices, summary] = await Promise.all([
        api.invoices.list(),
        api.invoices.summary(),
      ]);
      return { invoices, summary };
    },
    [],
  );

  const invoices = resource.data?.invoices ?? [];
  const summary = resource.data?.summary;

  // Invoiced vs. collected by month, derived from the invoices themselves
  // rather than a separate reporting table that could disagree with them.
  const chart = useMemo(() => {
    const byMonth = new Map<string, { invoiced: number; collected: number }>();
    for (const invoice of invoices) {
      const key = invoice.issued_date.slice(0, 7);
      const bucket = byMonth.get(key) ?? { invoiced: 0, collected: 0 };
      bucket.invoiced += Number(invoice.amount);
      if (invoice.status === "paid") bucket.collected += Number(invoice.amount);
      byMonth.set(key, bucket);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, totals]) => ({
        month: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
        }),
        ...totals,
      }));
  }, [invoices]);

  const rows = useMemo<InvoiceRow[]>(
    () =>
      invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        client: invoice.client_name,
        matter: invoice.matter_name ?? "—",
        amount: Number(invoice.amount),
        status: invoice.status,
        issued: invoice.issued_date,
        due: invoice.due_date,
      })),
    [invoices],
  );

  async function setStatus(invoice: InvoiceRow, status: InvoiceStatus) {
    if (!practice) return;
    setPendingId(invoice.id);
    setError(null);
    try {
      await practice.invoices.setStatus(invoice.id, status);
      resource.reload();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not update this invoice.");
    } finally {
      setPendingId(null);
    }
  }

  const kpis = summary
    ? [
        {
          label: "Total Outstanding",
          value: formatEGP(summary.outstanding),
          change: `${invoices.filter((i) => i.status === "sent" || i.status === "overdue").length} open invoices`,
          icon: BanknotesIcon,
          warn: false,
        },
        {
          label: "Overdue",
          value: formatEGP(summary.overdue),
          change: `${invoices.filter((i) => i.status === "overdue").length} invoices past due`,
          icon: ExclamationTriangleIcon,
          warn: true,
        },
        {
          label: "Draft — Pending Send",
          value: formatEGP(
            invoices
              .filter((i) => i.status === "draft")
              .reduce((sum, i) => sum + Number(i.amount), 0),
          ),
          change: `${summary.draft_count} not yet sent`,
          icon: DocumentTextIcon,
          warn: false,
        },
        {
          label: "Collected this year",
          value: formatEGP(summary.paid_this_year),
          change: `${invoices.filter((i) => i.status === "paid").length} invoices paid`,
          icon: BuildingOffice2Icon,
          warn: false,
        },
      ]
    : [];

  const invoiceColumns: TableColumn<InvoiceRow>[] = [
    {
      key: "number",
      header: "Invoice",
      width: pixel(150),
      renderCell: (row) => (
        <Link href={`/billing/${row.id}`}>
          <Text type="body" weight="semibold">
            {row.number}
          </Text>
        </Link>
      ),
    },
    {
      key: "client",
      header: "Client",
      width: proportional(1.6),
      renderCell: (row) => <Text type="body">{row.client}</Text>,
    },
    {
      key: "matter",
      header: "Matter",
      width: proportional(2),
      renderCell: (row) => (
        <Text type="body" color="secondary" maxLines={1}>
          {row.matter}
        </Text>
      ),
    },
    {
      key: "issued",
      header: "Issued",
      width: pixel(120),
      renderCell: (row) => (
        <Text type="body" color="secondary">
          {formatDate(row.issued)}
        </Text>
      ),
    },
    {
      key: "due",
      header: "Due",
      width: pixel(120),
      renderCell: (row) => (
        <Text type="body" color="secondary">
          {formatDate(row.due)}
        </Text>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: pixel(210),
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Badge variant={STATUS_VARIANT[row.status]} label={label(row.status)} />
          {row.status === "draft" && (
            <Button
              label="Send"
              variant="ghost"
              size="sm"
              isDisabled={pendingId === row.id}
              onClick={() => setStatus(row, "sent")}
            >
              Send
            </Button>
          )}
          {(row.status === "sent" || row.status === "overdue") && (
            <Button
              label="Mark paid"
              variant="ghost"
              size="sm"
              isDisabled={pendingId === row.id}
              onClick={() => setStatus(row, "paid")}
            >
              Mark paid
            </Button>
          )}
        </HStack>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: pixel(130),
      align: "end",
      renderCell: (row) => (
        <Text type="body" weight="semibold">
          {formatEGP(row.amount)}
        </Text>
      ),
    },
  ];

  return (
    <>
      <Layout
        height="fill"
        content={
          <LayoutContent padding={0}>
            <VStack gap={6}>
              <HStack hAlign="between" vAlign="center">
                <VStack gap={1}>
                  <Heading level={2}>Billing</Heading>
                  <Text type="body" color="secondary">
                    Invoices raised against matters and clients
                  </Text>
                </VStack>
                <Button
                  label="Invoice unbilled time"
                  variant="primary"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setIsGenerating(true)}
                  isDisabled={!practice}
                >
                  Invoice unbilled time
                </Button>
              </HStack>

              <DataView resource={resource} loadingLabel="Loading billing…">
                {() => (
                  <VStack gap={6}>
                    <InlineError message={error} onDismiss={() => setError(null)} />

                    <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
                      {kpis.map((kpi) => (
                        <Card key={kpi.label}>
                          <VStack gap={2}>
                            <HStack gap={2} vAlign="center">
                              <Icon
                                icon={kpi.icon}
                                size="sm"
                                color={kpi.warn ? "warning" : "secondary"}
                              />
                              <Text type="label" color="secondary">
                                {kpi.label}
                              </Text>
                            </HStack>
                            <Heading level={2}>{kpi.value}</Heading>
                            <Text type="supporting" color="secondary">
                              {kpi.change}
                            </Text>
                          </VStack>
                        </Card>
                      ))}
                    </Grid>

                    {chart.length > 0 && (
                      <Card>
                        <VStack gap={4}>
                          <HStack hAlign="between" vAlign="center">
                            <Heading level={4}>Invoiced vs. collected</Heading>
                            <Text type="supporting" color="secondary">
                              Last {chart.length}{" "}
                              {chart.length === 1 ? "month" : "months"}
                            </Text>
                          </HStack>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart
                              data={chart}
                              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid
                                horizontal
                                vertical={false}
                                stroke="var(--color-border)"
                              />
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
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Bar
                                dataKey="invoiced"
                                name="Invoiced"
                                fill="var(--color-accent)"
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar
                                dataKey="collected"
                                name="Collected"
                                fill="var(--color-border-strong)"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </VStack>
                      </Card>
                    )}

                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>Invoices</Heading>
                        {rows.length > 0 ? (
                          <Table<InvoiceRow>
                            data={rows}
                            columns={invoiceColumns}
                            idKey="id"
                            hasHover
                          />
                        ) : (
                          <EmptyState
                            icon={
                              <Icon icon={BanknotesIcon} size="lg" color="secondary" />
                            }
                            title="No invoices yet"
                            description="Log billable time against a matter, then raise an invoice for it."
                          />
                        )}
                      </VStack>
                    </Card>
                  </VStack>
                )}
              </DataView>
            </VStack>
          </LayoutContent>
        }
      />
      <GenerateInvoiceDialog
        isOpen={isGenerating}
        onOpenChange={setIsGenerating}
        onCreated={resource.reload}
      />
    </>
  );
}

/** Drafts an invoice from every unbilled billable hour on the chosen matter. */
function GenerateInvoiceDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { practice } = useOrg();
  const [matterId, setMatterId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unbilled = useResource(
    async (api) => {
      if (!isOpen) return { matters: [], byMatter: {} as Record<number, number> };
      const [matters, entries] = await Promise.all([
        api.matters.list(),
        api.time.list({ unbilled_only: true }),
      ]);
      const byMatter: Record<number, number> = {};
      for (const entry of entries) {
        byMatter[entry.matter_id] =
          (byMatter[entry.matter_id] ?? 0) + Number(entry.hours) * Number(entry.rate);
      }
      return { matters, byMatter };
    },
    [isOpen],
  );

  const options = (unbilled.data?.matters ?? [])
    .filter((m) => (unbilled.data?.byMatter[m.id] ?? 0) > 0)
    .map((m) => ({
      value: String(m.id),
      label: `${m.name} — ${formatEGP(unbilled.data?.byMatter[m.id] ?? 0)}`,
    }));

  async function submit() {
    if (!practice || !matterId) return;
    setSaving(true);
    setError(null);
    try {
      await practice.invoices.generate(Number(matterId));
      setMatterId(null);
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not draft this invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={
          <DialogHeader title="Invoice unbilled time" onOpenChange={onOpenChange} />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <Text type="body" color="secondary">
                Drafts an invoice covering every unbilled billable hour logged
                against the matter. Those hours are then locked to that invoice.
              </Text>
              {options.length === 0 && !unbilled.loading ? (
                <Text type="body">
                  No matter has unbilled billable time right now.
                </Text>
              ) : (
                <Selector
                  label="Matter"
                  hasClear
                  isRequired
                  value={matterId}
                  onChange={setMatterId}
                  placeholder={
                    unbilled.loading ? "Loading…" : "Select a matter to bill"
                  }
                  options={options}
                />
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label="Cancel"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={saving ? "Drafting…" : "Draft invoice"}
                variant="primary"
                onClick={submit}
                isDisabled={saving || !matterId}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
