"use client";

import { use, useState } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { API_BASE, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n/provider";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  type InvoiceStatus,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";

interface LineRow extends Record<string, unknown> {
  id: number;
  description: string;
  qty: string;
  amount: number;
  tax: number;
}

const STATUS_VARIANT: Record<InvoiceStatus, "neutral" | "info" | "success" | "error"> = {
  draft: "neutral",
  sent: "info",
  paid: "success",
  overdue: "error",
};

const STATUS_LABEL_KEY: Record<InvoiceStatus, string> = {
  draft: "@legalos.billingDetail.status.draft",
  sent: "@legalos.billingDetail.status.sent",
  paid: "@legalos.billingDetail.status.paid",
  overdue: "@legalos.billingDetail.status.overdue",
};

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
      // The API answers 409 once the invoice has been sent -- "what was
      // sent to the client does not change" (billing.update_invoice_notes).
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
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
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
              // A tax column only when some line actually carries a rate --
              // an invoice taxed as a whole (T-026) leaves every line at 0,
              // and the whole-invoice tax_amount is shown in the totals below.
              const hasLineTax = rows.some((r) => r.tax > 0);

              const columns: TableColumn<LineRow>[] = [
                {
                  key: "description",
                  header: t("@legalos.billingDetail.column.description"),
                  width: proportional(3),
                  renderCell: (row) => <Text type="body">{row.description}</Text>,
                },
                {
                  key: "qty",
                  header: t("@legalos.billingDetail.column.quantity"),
                  width: proportional(1.2),
                  renderCell: (row) => (
                    <Text type="body" color="secondary">
                      {row.qty}
                    </Text>
                  ),
                },
                ...(hasLineTax
                  ? [
                      {
                        key: "tax",
                        header: t("@legalos.billingDetail.column.tax"),
                        width: pixel(110),
                        align: "end" as const,
                        renderCell: (row: LineRow) => (
                          <Text type="body" color="secondary">
                            {formatEGPExact(row.tax)}
                          </Text>
                        ),
                      },
                    ]
                  : []),
                {
                  key: "amount",
                  header: t("@legalos.billingDetail.column.amount"),
                  width: pixel(140),
                  align: "end",
                  renderCell: (row) => (
                    <Text type="body" weight="semibold">
                      {formatEGPExact(row.amount)}
                    </Text>
                  ),
                },
              ];

              return (
                <VStack gap={6}>
                  <HStack gap={3} vAlign="center">
                    <Link href="/billing">
                      <HStack gap={1.5} vAlign="center">
                        <Icon icon={ArrowLeftIcon} size="sm" color="secondary" />
                        <Text type="body" color="secondary">
                          {t("@legalos.billingDetail.backToBilling")}
                        </Text>
                      </HStack>
                    </Link>
                  </HStack>

                  <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
                    <VStack gap={1}>
                      <HStack gap={3} vAlign="center">
                        <Heading level={2}>{loaded.number}</Heading>
                        <Badge
                          variant={STATUS_VARIANT[loaded.status]}
                          label={t(STATUS_LABEL_KEY[loaded.status])}
                        />
                      </HStack>
                      <Text type="body" color="secondary">
                        {loaded.client_name}
                        {loaded.matter_name ? ` · ${loaded.matter_name}` : ""}
                      </Text>
                    </VStack>
                    <HStack gap={3}>
                      {/* The renderer behind this has existed since T-020/21
                        * — Arabic, embedded font, correct totals — and had no
                        * button anywhere in the UI, so the one artefact a
                        * firm actually sends a client was reachable only by
                        * typing the URL. */}
                      <Button
                        label={t("@legalos.billingDetail.downloadPdf")}
                        variant="secondary"
                        href={`${API_BASE}/api/orgs/${organizationId}/invoices/${loaded.id}/pdf?lang=${locale}`}
                        icon={
                          <Icon icon={ArrowDownTrayIcon} size="sm" color="inherit" />
                        }
                      >
                        {t("@legalos.billingDetail.downloadPdf")}
                      </Button>
                      {loaded.status === "draft" && (
                        <Button
                          label={t("@legalos.billingDetail.sendInvoice")}
                          variant="primary"
                          isDisabled={pending}
                          icon={
                            <Icon
                              icon={PaperAirplaneIcon}
                              size="sm"
                              color="inherit"
                            />
                          }
                          onClick={() => setStatus("sent")}
                        >
                          {t("@legalos.billingDetail.sendInvoice")}
                        </Button>
                      )}
                      {(loaded.status === "sent" || loaded.status === "overdue") && (
                        <Button
                          label={t("@legalos.billingDetail.markAsPaid")}
                          variant="primary"
                          isDisabled={pending}
                          icon={
                            <Icon icon={BanknotesIcon} size="sm" color="inherit" />
                          }
                          onClick={() => setStatus("paid")}
                        >
                          {t("@legalos.billingDetail.markAsPaid")}
                        </Button>
                      )}
                    </HStack>
                  </HStack>

                  <InlineError message={error} onDismiss={() => setError(null)} />

                  <Grid columns={3} gap={6}>
                    <GridSpan columns={2}>
                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>{t("@legalos.billing.detail.lineItems")}</Heading>
                          {rows.length > 0 ? (
                            <>
                              <Table<LineRow>
                                data={rows}
                                columns={columns}
                                idKey="id"
                                density="compact"
                              />
                              <Divider />
                              <HStack hAlign="between">
                                <Text type="body" color="secondary">
                                  {t("@legalos.billingDetail.linesTotal")}
                                </Text>
                                <Text type="body">{formatEGPExact(linesTotal, loaded.currency)}</Text>
                              </HStack>
                              {Number(loaded.tax_amount) > 0 && (
                                <HStack hAlign="between">
                                  <Text type="body" color="secondary">
                                    {t("@legalos.billingDetail.tax")}
                                  </Text>
                                  <Text type="body">
                                    {formatEGPExact(Number(loaded.tax_amount), loaded.currency)}
                                  </Text>
                                </HStack>
                              )}
                              <HStack hAlign="between">
                                <Text type="body" weight="semibold">
                                  {t("@legalos.billingDetail.invoiceTotal")}
                                </Text>
                                <Text type="body" weight="bold" size="lg">
                                  {formatEGPExact(Number(loaded.total_amount), loaded.currency)}
                                </Text>
                              </HStack>
                            </>
                          ) : (
                            <EmptyState
                              icon={
                                <Icon
                                  icon={DocumentTextIcon}
                                  size="lg"
                                  color="secondary"
                                />
                              }
                              title={t("@legalos.billing.detail.noLineItems")}
                              description={t("@legalos.billing.detail.noLineItemsDescription", {
                                total: formatEGPExact(Number(loaded.total_amount), loaded.currency),
                              })}
                            />
                          )}
                        </VStack>
                      </Card>
                    </GridSpan>

                    <VStack gap={6}>
                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>{t("@legalos.billing.detail.heading")}</Heading>
                          <MetadataList>
                            <MetadataListItem label={t("@legalos.billing.table.client")}>
                                <Link href={`/clients/${loaded.client_id}`}>
                                  {loaded.client_name}
                                </Link>
                            </MetadataListItem>
                            {loaded.matter_id && (
                              <MetadataListItem label={t("@legalos.billing.table.matter")}>
                                  <Link href={`/matters/${loaded.matter_id}`}>
                                    {loaded.matter_name}
                                  </Link>
                              </MetadataListItem>
                            )}
                            <MetadataListItem label={t("@legalos.billing.table.issued")}>
                              {formatDate(loaded.issued_date)}
                            </MetadataListItem>
                            <MetadataListItem label={t("@legalos.billing.table.due")}>
                              {formatDate(loaded.due_date)}
                            </MetadataListItem>
                            {loaded.paid_date && (
                              <MetadataListItem label={t("@legalos.billing.status.paid")}>
                                {formatDate(loaded.paid_date)}
                              </MetadataListItem>
                            )}
                            <MetadataListItem label={t("@legalos.billing.table.amount")}>
                              {formatEGPExact(Number(loaded.total_amount), loaded.currency)}
                            </MetadataListItem>
                          </MetadataList>
                        </VStack>
                      </Card>

                      {/* Printed under the totals on the PDF (T-026); shown
                        * here, editable on a draft only -- "what was sent to
                        * the client does not change" once it has been sent. */}
                      <Card>
                        <VStack gap={3}>
                          <HStack hAlign="between" vAlign="center">
                            <Heading level={4}>{t("@legalos.billingDetail.notes.heading")}</Heading>
                            {loaded.status === "draft" && !editingNotes && (
                              <Button
                                label={t("@legalos.billingDetail.notes.edit")}
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
                          </HStack>
                          {editingNotes ? (
                            <VStack gap={3}>
                              <TextArea
                                label={t("@legalos.billingDetail.notes.heading")}
                                isLabelHidden
                                value={notesDraft}
                                onChange={setNotesDraft}
                                rows={4}
                                placeholder={t("@legalos.billingDetail.notes.placeholder")}
                              />
                              <HStack gap={2} hAlign="end">
                                <Button
                                  label={t("@legalos.billing.dialog.cancel")}
                                  variant="secondary"
                                  size="sm"
                                  isDisabled={savingNotes}
                                  onClick={() => setEditingNotes(false)}
                                />
                                <Button
                                  label={t("@legalos.billingDetail.notes.save")}
                                  variant="primary"
                                  size="sm"
                                  isLoading={savingNotes}
                                  onClick={saveNotes}
                                />
                              </HStack>
                            </VStack>
                          ) : loaded.notes ? (
                            <Text type="body">
                              <span style={{ whiteSpace: "pre-wrap" }}>{loaded.notes}</span>
                            </Text>
                          ) : (
                            <Text type="body" color="secondary">
                              {t("@legalos.billingDetail.notes.empty")}
                            </Text>
                          )}
                        </VStack>
                      </Card>
                    </VStack>
                  </Grid>
                </VStack>
              );
            }}
          </DataView>
        </LayoutContent>
      }
    />
  );
}
