"use client";

/**
 * Invoice detail page (T-053 / Wave 5).
 *
 * Shows full invoice breakdown: line items, taxes, totals, client/matter info,
 * payment status actions, PDF download, and notes management.
 * Preserves all hooks, contract layer calls, and state intact.
 */

import { use, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslator } from "@astryxdesign/core/i18n";
import { API_BASE, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n/provider";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { InvoiceStatusMark } from "@/components/Distinction";
import { type InvoiceStatus } from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";

interface LineRow {
  id: number;
  description: string;
  qty: string;
  amount: number;
  tax: number;
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { formatDate, formatEGPExact } = useFormat();
  const { id } = use(params);
  const invoiceId = Number(id);
  const { practice, organizationId } = useOrg();
  const { locale } = useLocale();
  const t = useTranslator();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const resource = useResource(
    (api) => api.invoices.get(invoiceId),
    [invoiceId],
  );
  const invoice = resource.data;

  async function setStatus(status: InvoiceStatus) {
    if (!practice) return;
    setPending(true);
    setError(null);
    try {
      await practice.invoices.setStatus(invoiceId, status);
      resource.reload();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.billingDetail.updateError"));
    } finally {
      setPending(false);
    }
  }

  async function saveNotes() {
    if (!practice) return;
    setSavingNotes(true);
    setError(null);
    try {
      await practice.invoices.setNotes(invoiceId, notesDraft);
      setEditingNotes(false);
      resource.reload();
    } catch (exc) {
      setError(
        exc instanceof ApiError && exc.status === 409
          ? t("@legalos.billingDetail.notes.lockedError")
          : exc instanceof Error
            ? exc.message
            : t("@legalos.billingDetail.notes.saveError"),
      );
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <div
      className="w-full flex flex-col gap-6"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      <DataView resource={resource} loadingLabel={t("@legalos.billingDetail.loading")}>
        {(loaded) => {
          const rows: LineRow[] = loaded.lines.map((line) => ({
            id: line.id,
            description: line.description,
            qty:
              Number(line.quantity) === 1
                ? "—"
                : `${Number(line.quantity).toFixed(2)} @ ${formatEGPExact(Number(line.unit_amount))}`,
            amount: Number(line.line_total),
            tax: Number(line.tax_amount),
          }));
          const linesTotal = rows.reduce((sum, r) => sum + r.amount, 0);
          const hasLineTax = rows.some((r) => r.tax > 0);

          return (
            <div className="flex flex-col gap-6">
              {/* Back link */}
              <div>
                <Link
                  href="/billing"
                  className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                  style={{ color: "var(--text2)" }}
                >
                  <Icon name="arrow_back" size={18} />
                  <span>{t("@legalos.billingDetail.backToBilling")}</span>
                </Link>
              </div>

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                      {loaded.number}
                    </h1>
                    <InvoiceStatusMark status={loaded.status} />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>
                    {loaded.client_name}
                    {loaded.matter_name ? ` · ${loaded.matter_name}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={`${API_BASE}/api/orgs/${organizationId}/invoices/${loaded.id}/pdf?lang=${locale}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface)",
                      color: "var(--text)",
                    }}
                  >
                    <Icon name="download" size={16} />
                    <span>{t("@legalos.billingDetail.downloadPdf")}</span>
                  </a>

                  {loaded.status === "draft" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={pending}
                      loading={pending}
                      onClick={() => setStatus("sent")}
                    >
                      <Icon name="send" size={16} />
                      <span>{t("@legalos.billingDetail.sendInvoice")}</span>
                    </Button>
                  )}

                  {(loaded.status === "sent" || loaded.status === "overdue") && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={pending}
                      loading={pending}
                      onClick={() => setStatus("paid")}
                    >
                      <Icon name="payments" size={16} />
                      <span>{t("@legalos.billingDetail.markAsPaid")}</span>
                    </Button>
                  )}
                </div>
              </div>

              <InlineError message={error} onDismiss={() => setError(null)} />

              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 columns: Line items */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <Card className="p-5 flex flex-col gap-4">
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                      {t("@legalos.billing.detail.lineItems")}
                    </h2>

                    {rows.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("@legalos.billingDetail.column.description")}</TableHead>
                              <TableHead>{t("@legalos.billingDetail.column.quantity")}</TableHead>
                              {hasLineTax && (
                                <TableHead className="text-end">{t("@legalos.billingDetail.column.tax")}</TableHead>
                              )}
                              <TableHead className="text-end">{t("@legalos.billingDetail.column.amount")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">{row.description}</TableCell>
                                <TableCell style={{ color: "var(--text2)" }}>{row.qty}</TableCell>
                                {hasLineTax && (
                                  <TableCell className="text-end" style={{ color: "var(--text2)" }}>
                                    {formatEGPExact(row.tax)}
                                  </TableCell>
                                )}
                                <TableCell className="text-end font-semibold">
                                  {formatEGPExact(row.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* Totals section */}
                        <div className="flex flex-col gap-2 pt-4 border-t text-sm" style={{ borderColor: "var(--border)" }}>
                          <div className="flex justify-between" style={{ color: "var(--text2)" }}>
                            <span>{t("@legalos.billingDetail.linesTotal")}</span>
                            <span>{formatEGPExact(linesTotal, loaded.currency)}</span>
                          </div>
                          {Number(loaded.tax_amount) > 0 && (
                            <div className="flex justify-between" style={{ color: "var(--text2)" }}>
                              <span>{t("@legalos.billingDetail.tax")}</span>
                              <span>{formatEGPExact(Number(loaded.tax_amount), loaded.currency)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                            <span>{t("@legalos.billingDetail.invoiceTotal")}</span>
                            <span>{formatEGPExact(Number(loaded.total_amount), loaded.currency)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        icon={<Icon name="description" size={32} />}
                        title={t("@legalos.billing.detail.noLineItems")}
                        description={t("@legalos.billing.detail.noLineItemsDescription", {
                          total: formatEGPExact(Number(loaded.total_amount), loaded.currency),
                        })}
                      />
                    )}
                  </Card>
                </div>

                {/* Right column: Invoice Metadata & Notes */}
                <div className="flex flex-col gap-6">
                  {/* Details */}
                  <Card className="p-5 flex flex-col gap-4">
                    <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                      {t("@legalos.billing.detail.heading")}
                    </h2>
                    <dl className="flex flex-col gap-2.5 text-sm">
                      <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                        <dt style={{ color: "var(--text2)" }}>{t("@legalos.billing.table.client")}</dt>
                        <dd className="font-medium">
                          <Link href={`/clients/${loaded.client_id}`} className="hover:underline" style={{ color: "var(--primary)" }}>
                            {loaded.client_name}
                          </Link>
                        </dd>
                      </div>
                      {loaded.matter_id && (
                        <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                          <dt style={{ color: "var(--text2)" }}>{t("@legalos.billing.table.matter")}</dt>
                          <dd className="font-medium">
                            <Link href={`/matters/${loaded.matter_id}`} className="hover:underline" style={{ color: "var(--primary)" }}>
                              {loaded.matter_name}
                            </Link>
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                        <dt style={{ color: "var(--text2)" }}>{t("@legalos.billing.table.issued")}</dt>
                        <dd className="font-medium" style={{ color: "var(--text)" }}>{formatDate(loaded.issued_date)}</dd>
                      </div>
                      <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                        <dt style={{ color: "var(--text2)" }}>{t("@legalos.billing.table.due")}</dt>
                        <dd className="font-medium" style={{ color: "var(--text)" }}>{formatDate(loaded.due_date)}</dd>
                      </div>
                      {loaded.paid_date && (
                        <div className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                          <dt style={{ color: "var(--text2)" }}>{t("@legalos.billing.status.paid")}</dt>
                          <dd className="font-medium" style={{ color: "var(--text)" }}>{formatDate(loaded.paid_date)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between py-1" style={{ borderColor: "var(--border)" }}>
                        <dt style={{ color: "var(--text2)" }}>{t("@legalos.billing.table.amount")}</dt>
                        <dd className="font-semibold" style={{ color: "var(--text)" }}>
                          {formatEGPExact(Number(loaded.total_amount), loaded.currency)}
                        </dd>
                      </div>
                    </dl>
                  </Card>

                  {/* Notes */}
                  <Card className="p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                        {t("@legalos.billingDetail.notes.heading")}
                      </h2>
                      {loaded.status === "draft" && !editingNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNotesDraft(loaded.notes);
                            setEditingNotes(true);
                          }}
                        >
                          {t("@legalos.billingDetail.notes.edit")}
                        </Button>
                      )}
                    </div>

                    {editingNotes ? (
                      <div className="flex flex-col gap-3">
                        <textarea
                          className="w-full px-3 py-2 rounded-md border text-sm outline-none focus:ring-1"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--surface)",
                            color: "var(--text)",
                          }}
                          rows={4}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder={t("@legalos.billingDetail.notes.placeholder")}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={savingNotes}
                            onClick={() => setEditingNotes(false)}
                          >
                            {t("@legalos.billing.dialog.cancel")}
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={savingNotes}
                            disabled={savingNotes}
                            onClick={saveNotes}
                          >
                            {t("@legalos.billingDetail.notes.save")}
                          </Button>
                        </div>
                      </div>
                    ) : loaded.notes ? (
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                        {loaded.notes}
                      </p>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--text2)" }}>
                        {t("@legalos.billingDetail.notes.empty")}
                      </p>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          );
        }}
      </DataView>
    </div>
  );
}
