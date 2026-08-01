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
import { Table, proportional, pixel } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import {
  formatDate,
  formatEGP,
  label,
  type InvoiceStatus,
} from "@/lib/practice";

interface LineRow extends Record<string, unknown> {
  id: number;
  description: string;
  qty: string;
  amount: number;
}

const STATUS_VARIANT: Record<InvoiceStatus, "neutral" | "info" | "success" | "error"> = {
  draft: "neutral",
  sent: "info",
  paid: "success",
  overdue: "error",
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const invoiceId = Number(id);
  const { practice } = useOrg();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(exc instanceof Error ? exc.message : "Could not update this invoice.");
    } finally {
      setPending(false);
    }
  }

  const columns: TableColumn<LineRow>[] = [
    {
      key: "description",
      header: "Description",
      width: proportional(3),
      renderCell: (row) => <Text type="body">{row.description}</Text>,
    },
    {
      key: "qty",
      header: "Quantity",
      width: proportional(1.2),
      renderCell: (row) => (
        <Text type="body" color="secondary">
          {row.qty}
        </Text>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: pixel(140),
      align: "end",
      renderCell: (row) => (
        <Text type="body" weight="semibold">
          {formatEGP(row.amount)}
        </Text>
      ),
    },
  ];

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <DataView resource={resource} loadingLabel="Loading invoice…">
            {(loaded) => {
              const rows: LineRow[] = loaded.lines.map((line) => ({
                id: line.id,
                description: line.description,
                qty:
                  Number(line.quantity) === 1
                    ? "—"
                    : `${Number(line.quantity).toFixed(2)} @ ${formatEGP(Number(line.unit_amount))}`,
                amount: Number(line.line_total),
              }));
              const linesTotal = rows.reduce((sum, r) => sum + r.amount, 0);

              return (
                <VStack gap={6}>
                  <HStack gap={3} vAlign="center">
                    <Link href="/billing">
                      <HStack gap={1.5} vAlign="center">
                        <Icon icon={ArrowLeftIcon} size="sm" color="secondary" />
                        <Text type="body" color="secondary">
                          Billing
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
                          label={label(loaded.status)}
                        />
                      </HStack>
                      <Text type="body" color="secondary">
                        {loaded.client_name}
                        {loaded.matter_name ? ` · ${loaded.matter_name}` : ""}
                      </Text>
                    </VStack>
                    <HStack gap={3}>
                      {loaded.status === "draft" && (
                        <Button
                          label="Send invoice"
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
                          Send invoice
                        </Button>
                      )}
                      {(loaded.status === "sent" || loaded.status === "overdue") && (
                        <Button
                          label="Mark as paid"
                          variant="primary"
                          isDisabled={pending}
                          icon={
                            <Icon icon={BanknotesIcon} size="sm" color="inherit" />
                          }
                          onClick={() => setStatus("paid")}
                        >
                          Mark as paid
                        </Button>
                      )}
                    </HStack>
                  </HStack>

                  <InlineError message={error} onDismiss={() => setError(null)} />

                  <Grid columns={3} gap={6}>
                    <GridSpan columns={2}>
                      <Card>
                        <VStack gap={4}>
                          <Heading level={4}>Line items</Heading>
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
                                  Lines total
                                </Text>
                                <Text type="body">{formatEGP(linesTotal)}</Text>
                              </HStack>
                              <HStack hAlign="between">
                                <Text type="body" weight="semibold">
                                  Invoice total
                                </Text>
                                <Text type="body" weight="bold" size="lg">
                                  {formatEGP(Number(loaded.amount), loaded.currency)}
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
                              title="No line items"
                              description={`This invoice carries a total of ${formatEGP(
                                Number(loaded.amount),
                                loaded.currency,
                              )} without an itemized breakdown.`}
                            />
                          )}
                        </VStack>
                      </Card>
                    </GridSpan>

                    <Card>
                      <VStack gap={4}>
                        <Heading level={4}>Details</Heading>
                        <MetadataList>
                          <MetadataListItem label="Client">
                              <Link href={`/clients/${loaded.client_id}`}>
                                {loaded.client_name}
                              </Link>
                          </MetadataListItem>
                          {loaded.matter_id && (
                            <MetadataListItem label="Matter">
                                <Link href={`/matters/${loaded.matter_id}`}>
                                  {loaded.matter_name}
                                </Link>
                            </MetadataListItem>
                          )}
                          <MetadataListItem label="Issued">
                              formatDate(loaded.issued_date)
                          </MetadataListItem>
                          <MetadataListItem label="Due">
                              formatDate(loaded.due_date)
                          </MetadataListItem>
                          {loaded.paid_date && (
                            <MetadataListItem label="Paid">
                                formatDate(loaded.paid_date)
                            </MetadataListItem>
                          )}
                          <MetadataListItem label="Amount">
                              formatEGP(Number(loaded.amount), loaded.currency)
                          </MetadataListItem>
                        </MetadataList>
                      </VStack>
                    </Card>
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
