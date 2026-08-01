"use client";

import { use } from "react";
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
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { INVOICES, egp, type Invoice } from "@/app/billing/page";

// ---------------------------------------------------------------------------
// Invoice detail — mock data only. Line items are derived from each
// invoice's total (14% VAT backed out) so every id in the /billing table
// resolves to an internally consistent breakdown; INV-2031 gets a hand
// authored breakdown since it's the primary reference id for this screen.
// ---------------------------------------------------------------------------

interface LineItem extends Record<string, unknown> {
  id: string;
  description: string;
  qty: string;
  amount: number;
}

const HAND_AUTHORED_ITEMS: Record<string, LineItem[]> = {
  "INV-2031": [
    { id: "li1", description: "Legal services — appeal brief drafting", qty: "18h @ EGP 2,500", amount: 45000 },
    { id: "li2", description: "Legal services — hearing preparation", qty: "6h @ EGP 2,500", amount: 15000 },
    { id: "li3", description: "Legal services — client consultations", qty: "4h @ EGP 2,500", amount: 10000 },
    { id: "li4", description: "Court filing fees", qty: "1", amount: 3200 },
    { id: "li5", description: "Courier & notarization", qty: "1", amount: 923 },
  ],
};

function buildLineItems(invoice: Invoice): { items: LineItem[]; subtotal: number; vat: number } {
  const authored = HAND_AUTHORED_ITEMS[invoice.id];
  const subtotal = authored
    ? authored.reduce((sum, i) => sum + i.amount, 0)
    : Math.round(invoice.amount / 1.14);
  const vat = invoice.amount - subtotal;
  if (authored) return { items: authored, subtotal, vat };

  const servicesAmount = Math.round(subtotal * 0.82);
  const costsAmount = subtotal - servicesAmount;
  return {
    items: [
      { id: "gen1", description: `Legal services — ${invoice.matter}`, qty: "—", amount: servicesAmount },
      { id: "gen2", description: "Costs & disbursements", qty: "—", amount: costsAmount },
    ],
    subtotal,
    vat,
  };
}

function statusBadgeVariant(status: Invoice["status"]) {
  switch (status) {
    case "Paid":
      return "success" as const;
    case "Overdue":
      return "error" as const;
    case "Sent":
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const invoice = INVOICES.find((i) => i.id === id);

  if (!invoice) {
    return (
      <Layout
        height="fill"
        content={
          <LayoutContent padding={0}>
            <EmptyState
              title="Invoice not found"
              description={`No invoice matches "${id}". It may have been removed or the link is out of date.`}
              icon={<Icon icon={DocumentTextIcon} size="lg" color="secondary" />}
              actions={
                <Link href="/billing">
                  <Button label="Back to invoices" variant="secondary" />
                </Link>
              }
            />
          </LayoutContent>
        }
      />
    );
  }

  const { items, subtotal, vat } = buildLineItems(invoice);

  const columns: TableColumn<LineItem>[] = [
    {
      key: "description",
      header: "Description",
      width: proportional(3),
      renderCell: (item) => <Text type="body">{item.description}</Text>,
    },
    {
      key: "qty",
      header: "Qty / Rate",
      width: proportional(1.5),
      renderCell: (item) => (
        <Text type="body" color="secondary">
          {item.qty}
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

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={0}>
          <VStack gap={6}>
            <VStack gap={3}>
              <Link href="/billing">
                <HStack gap={1} vAlign="center">
                  <Icon icon={ArrowLeftIcon} size="sm" color="inherit" />
                  All invoices
                </HStack>
              </Link>
              <HStack hAlign="between" vAlign="start">
                <VStack gap={1}>
                  <HStack gap={3} vAlign="center">
                    <Heading level={2}>{invoice.id}</Heading>
                    <Badge variant={statusBadgeVariant(invoice.status)} label={invoice.status} />
                  </HStack>
                  <Text type="body" color="secondary">
                    {invoice.client} · {invoice.matter}
                  </Text>
                </VStack>
                <HStack gap={2}>
                  <Button
                    label="Download PDF"
                    variant="secondary"
                    icon={<Icon icon={DocumentArrowDownIcon} size="sm" color="inherit" />}
                  >
                    Download PDF
                  </Button>
                  {invoice.status === "Draft" && (
                    <Button
                      label="Send invoice"
                      variant="primary"
                      icon={<Icon icon={PaperAirplaneIcon} size="sm" color="inherit" />}
                    >
                      Send invoice
                    </Button>
                  )}
                  {(invoice.status === "Sent" || invoice.status === "Overdue") && (
                    <Button
                      label="Record payment"
                      variant="primary"
                      icon={<Icon icon={BanknotesIcon} size="sm" color="inherit" />}
                    >
                      Record payment
                    </Button>
                  )}
                </HStack>
              </HStack>
            </VStack>

            <Grid columns={3} gap={6}>
              <GridSpan columns={2}>
                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>Line items</Heading>
                    <Table<LineItem> data={items} columns={columns} idKey="id" />
                    <Divider />
                    <VStack gap={2} align="end">
                      <HStack gap={8} hAlign="between" width="100%">
                        <Text type="body" color="secondary">
                          Subtotal
                        </Text>
                        <Text type="body" hasTabularNumbers>
                          {egp(subtotal)}
                        </Text>
                      </HStack>
                      <HStack gap={8} hAlign="between" width="100%">
                        <Text type="body" color="secondary">
                          VAT (14%)
                        </Text>
                        <Text type="body" hasTabularNumbers>
                          {egp(vat)}
                        </Text>
                      </HStack>
                      <HStack gap={8} hAlign="between" width="100%">
                        <Text type="large" weight="semibold">
                          Total
                        </Text>
                        <Text type="large" weight="semibold" hasTabularNumbers>
                          {egp(invoice.amount)}
                        </Text>
                      </HStack>
                    </VStack>
                  </VStack>
                </Card>
              </GridSpan>

              <VStack gap={6}>
                <Card>
                  <VStack gap={4}>
                    <Heading level={4}>Details</Heading>
                    <MetadataList label={{ position: "start" }}>
                      <MetadataListItem label="Client">
                        <Link href="/clients">{invoice.client}</Link>
                      </MetadataListItem>
                      <MetadataListItem label="Matter">
                        <Link href="/matters">{invoice.matter}</Link>
                      </MetadataListItem>
                      <MetadataListItem label="Issue date">{invoice.issueDate}</MetadataListItem>
                      <MetadataListItem label="Due date">{invoice.dueDate}</MetadataListItem>
                      <MetadataListItem label="Payment status">
                        <Badge variant={statusBadgeVariant(invoice.status)} label={invoice.status} />
                      </MetadataListItem>
                    </MetadataList>
                  </VStack>
                </Card>

                <Card variant="muted">
                  <VStack gap={2}>
                    <Text type="label" weight="semibold">
                      Billed by
                    </Text>
                    <Text type="body" color="secondary">
                      Al-Sayed &amp; Partners
                    </Text>
                    <Text type="supporting" color="secondary">
                      6 Gameat Al Dowal Al Arabiya St, Mohandessin, Giza
                    </Text>
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
