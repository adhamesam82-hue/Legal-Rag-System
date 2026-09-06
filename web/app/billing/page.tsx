"use client";

/**
 * شاشة الفوترة (Billing Page) - نظام السجل (LegalOS)
 * الموجة الرابعة من T-053.
 *
 * إعادة رسم الشاشة بالكامل باستخدام مكتبة السجل (components/ui):
 * Card, Button, Badge, Select, Dialog, Table, EmptyState, Icon
 * والتخلص التام من أي مكون بصري من @astryxdesign/core.
 * الحفاظ الصارم على كافة الخطافات والحسابات والربط والبيانات والمخطط البياني.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { InvoiceStatusMark } from "@/components/Distinction";
import { type InvoiceStatus } from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { CreateInvoiceDialog } from "@/components/billing/CreateInvoiceDialog";

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

export default function BillingPage() {
  const { formatDate, formatEGP, intlLocale, formatEGPCompact } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice } = useOrg();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
        month: new Date(`${key}-01T00:00:00`).toLocaleDateString(intlLocale, {
          month: "short",
        }),
        ...totals,
      }));
  }, [invoices, intlLocale]);

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
      setError(exc instanceof Error ? exc.message : t("@legalos.billing.error.updateInvoice"));
    } finally {
      setPendingId(null);
    }
  }

  const kpis = summary
    ? [
        {
          label: t("@legalos.billing.kpi.outstanding"),
          value: formatEGP(summary.outstanding),
          change: t("@legalos.billing.kpi.openInvoices", {
            count: invoices.filter((i) => i.status === "sent" || i.status === "overdue").length,
          }),
          icon: "payments",
          warn: false,
        },
        {
          label: t("@legalos.billing.kpi.overdue"),
          value: formatEGP(summary.overdue),
          change: t("@legalos.billing.kpi.pastDue", {
            count: invoices.filter((i) => i.status === "overdue").length,
          }),
          icon: "warning",
          warn: true,
        },
        {
          label: t("@legalos.billing.kpi.draft"),
          value: formatEGP(
            invoices
              .filter((i) => i.status === "draft")
              .reduce((sum, i) => sum + Number(i.amount), 0),
          ),
          change: t("@legalos.billing.kpi.notYetSent", { count: summary.draft_count }),
          icon: "description",
          warn: false,
        },
        {
          label: t("@legalos.billing.kpi.collected"),
          value: formatEGP(summary.paid_this_year),
          change: t("@legalos.billing.kpi.invoicesPaid", {
            count: invoices.filter((i) => i.status === "paid").length,
          }),
          icon: "account_balance",
          warn: false,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* ترويسة الصفحة */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {t("@legalos.billing.heading")}
          </h1>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.billing.subheading")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            startIcon={<Icon name="add" size={16} />}
            onClick={() => setIsCreating(true)}
            disabled={!practice}
          >
            {t("@legalos.billing.create.title")}
          </Button>
          <Button
            variant="primary"
            startIcon={<Icon name="add" size={16} />}
            onClick={() => setIsGenerating(true)}
            disabled={!practice}
          >
            {t("@legalos.billing.invoiceUnbilled")}
          </Button>
        </div>
      </div>

      <DataView resource={resource} loadingLabel={t("@legalos.billing.loading")}>
        {() => (
          <div className="flex flex-col gap-6">
            <InlineError message={error} onDismiss={() => setError(null)} />

            {/* بطاقات مؤشرات الأداء KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex items-center gap-1.5">
                      {kpi.warn && (
                        <Icon name="warning" size={16} style={{ color: "var(--warn)" }} />
                      )}
                      <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                        {kpi.label}
                      </span>
                    </div>
                    <div className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
                      {kpi.value}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text3)" }}>
                      {kpi.change}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* مخطط التحصيلات البياني Recharts */}
            {chart.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 w-full">
                    <CardTitle className="text-sm font-semibold">
                      {t("@legalos.billing.chart.heading")}
                    </CardTitle>
                    <span className="text-xs" style={{ color: "var(--text2)" }}>
                      {t("@legalos.billing.chart.lastMonths", {
                        count: chart.length,
                      })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chart}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          horizontal
                          vertical={false}
                          stroke="var(--border)"
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 12, fill: "var(--text2)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v: number) => formatEGPCompact(v)}
                          tick={{ fontSize: 12, fill: "var(--text2)" }}
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
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar
                          dataKey="invoiced"
                          name={t("@legalos.billing.chart.invoiced")}
                          fill="var(--accent)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="collected"
                          name={t("@legalos.billing.chart.collected")}
                          fill="var(--border2)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* جدول الفواتير */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  {t("@legalos.billing.invoices.heading")}
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: 0 }}>
                {rows.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ minWidth: "140px" }}>
                          {t("@legalos.billing.table.invoice")}
                        </TableHead>
                        <TableHead style={{ minWidth: "160px" }}>
                          {t("@legalos.billing.table.client")}
                        </TableHead>
                        <TableHead style={{ minWidth: "200px" }}>
                          {t("@legalos.billing.table.matter")}
                        </TableHead>
                        <TableHead style={{ minWidth: "120px" }}>
                          {t("@legalos.billing.table.issued")}
                        </TableHead>
                        <TableHead style={{ minWidth: "120px" }}>
                          {t("@legalos.billing.table.due")}
                        </TableHead>
                        <TableHead style={{ minWidth: "200px" }}>
                          {t("@legalos.billing.table.status")}
                        </TableHead>
                        <TableHead style={{ minWidth: "130px", textAlign: "end" }}>
                          {t("@legalos.billing.table.amount")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Link
                              href={`/billing/${row.id}`}
                              className="font-semibold hover:underline"
                              style={{ color: "var(--primary)" }}
                            >
                              {row.number}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs" style={{ color: "var(--text)" }}>
                              {row.client}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs line-clamp-2" style={{ color: "var(--text2)" }}>
                              {row.matter}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs" style={{ color: "var(--text2)" }}>
                              {formatDate(row.issued)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs" style={{ color: "var(--text2)" }}>
                              {formatDate(row.due)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <InvoiceStatusMark status={row.status} form="dot" />
                              {row.status === "draft" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={pendingId === row.id}
                                  loading={pendingId === row.id}
                                  onClick={() => setStatus(row, "sent")}
                                >
                                  {t("@legalos.billing.action.send")}
                                </Button>
                              )}
                              {(row.status === "sent" || row.status === "overdue") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={pendingId === row.id}
                                  loading={pendingId === row.id}
                                  onClick={() => setStatus(row, "paid")}
                                >
                                  {t("@legalos.billing.action.markPaid")}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell style={{ textAlign: "end" }}>
                            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                              {formatEGP(row.amount)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6">
                    <EmptyState
                      icon={<Icon name="payments" size={24} />}
                      title={t("@legalos.billing.invoices.emptyTitle")}
                      description={t("@legalos.billing.invoices.emptyDescription")}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DataView>

      {/* النوافذ المنبثقة */}
      <GenerateInvoiceDialog
        isOpen={isGenerating}
        onOpenChange={setIsGenerating}
        onCreated={resource.reload}
      />
      <CreateInvoiceDialog
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onCreated={resource.reload}
      />
    </div>
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
  const { formatEGP } = useFormat();
  const t = useTranslator();
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
      setError(exc instanceof Error ? exc.message : t("@legalos.billing.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={520}>
      <DialogHeader
        title={t("@legalos.billing.dialog.title")}
        onOpenChange={onOpenChange}
      />
      <DialogContent className="flex flex-col gap-4">
        <InlineError message={error} onDismiss={() => setError(null)} />
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {t("@legalos.billing.dialog.description")}
        </p>
        {options.length === 0 && !unbilled.loading ? (
          <p className="text-xs" style={{ color: "var(--text3)" }}>
            {t("@legalos.billing.dialog.noneAvailable")}
          </p>
        ) : (
          <Select
            label={t("@legalos.billing.dialog.matterLabel")}
            value={matterId ?? ""}
            onChange={(e) => setMatterId(e.target.value || null)}
            disabled={unbilled.loading}
          >
            <option value="">
              {unbilled.loading
                ? t("@legalos.billing.dialog.loadingPlaceholder")
                : t("@legalos.billing.dialog.matterPlaceholder")}
            </option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        )}
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          {t("@legalos.billing.dialog.cancel")}
        </Button>
        <Button
          variant="primary"
          onClick={submit}
          disabled={saving || !matterId}
          loading={saving}
        >
          {saving
            ? t("@legalos.billing.dialog.drafting")
            : t("@legalos.billing.dialog.draftInvoice")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
