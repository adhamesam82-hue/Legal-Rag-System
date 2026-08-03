"use client";

/**
 * The two money tabs.
 *
 * Bills is what the client owes the firm. Transactions is what the firm holds
 * for the client. They are separate tabs because they are separate pots — the
 * whole point of a client-funds ledger is that the money in it is not the
 * firm's, and a screen that merged them would suggest otherwise.
 */

import { useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Divider } from "@astryxdesign/core/Divider";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import { useMemberName, useOrg } from "@/lib/org";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import {
  todayIso,
  type ISODateString,
  type InvoiceStatus,
  type TrustKind,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { Panel, StatTile, financialsOf, useWrite, type TabProps } from "./shared";

const INVOICE_VARIANT: Record<InvoiceStatus, "neutral" | "info" | "success" | "error"> =
  {
    draft: "neutral",
    sent: "info",
    paid: "success",
    overdue: "error",
  };

const KINDS: TrustKind[] = ["deposit", "withdrawal", "invoice_payment", "refund"];
// Everything that is not a deposit takes money out, so it renders as an outflow.
const OUTFLOWS: TrustKind[] = ["withdrawal", "invoice_payment", "refund"];

// --- bills ------------------------------------------------------------------

export function BillsTab({
  data,
  reload,
  onError,
  quickBillOpen,
  onQuickBillChange,
}: TabProps & {
  quickBillOpen: boolean;
  onQuickBillChange: (open: boolean) => void;
}) {
  const { formatDate, formatEGP } = useFormat();
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const money = financialsOf(data);

  return (
    <>
      <Panel
        title={t("@legalos.matterWorkspace.bills.heading")}
        action={
          <Button
            label={t("@legalos.matterWorkspace.financial.quickBill")}
            variant="primary"
            size="sm"
            isDisabled={money.workInProgress <= 0}
            onClick={() => onQuickBillChange(true)}
          />
        }
      >
        {data.invoices.length === 0 ? (
          <EmptyState
            icon={<Icon icon={BanknotesIcon} size="lg" color="secondary" />}
            title={t("@legalos.matterWorkspace.bills.emptyTitle")}
            description={t("@legalos.matterWorkspace.bills.emptyDescription")}
          />
        ) : (
          <List hasDividers>
            {data.invoices.map((invoice) => (
              <ListItem
                key={invoice.id}
                label={invoice.number}
                href={`/billing/${invoice.id}`}
                description={
                  invoice.paid_date
                    ? t("@legalos.matterWorkspace.bills.paid", {
                        date: formatDate(invoice.paid_date),
                      })
                    : `${t("@legalos.matterWorkspace.bills.issued", {
                        date: formatDate(invoice.issued_date),
                      })} · ${t("@legalos.matterWorkspace.bills.due", {
                        date: formatDate(invoice.due_date),
                      })}`
                }
                startContent={
                  <Icon icon={BanknotesIcon} size="sm" color="secondary" />
                }
                endContent={
                  <HStack gap={3} vAlign="center">
                    <Badge
                      variant={INVOICE_VARIANT[invoice.status]}
                      label={enumLabel(invoice.status)}
                    />
                    <Text type="body" weight="semibold">
                      {formatEGP(Number(invoice.amount), invoice.currency)}
                    </Text>
                  </HStack>
                }
              />
            ))}
          </List>
        )}
      </Panel>

      <QuickBillDialog
        isOpen={quickBillOpen}
        onOpenChange={onQuickBillChange}
        data={data}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function QuickBillDialog({
  isOpen,
  onOpenChange,
  data,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: TabProps["data"];
  reload: () => void;
  onError: (message: string) => void;
}) {
  const { formatEGP } = useFormat();
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [terms, setTerms] = useState(30);
  const [saving, setSaving] = useState(false);
  const money = financialsOf(data);

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () => practice.invoices.generate(data.matter.id, terms),
      "@legalos.matterWorkspace.errors.bill",
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={440}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.financial.quickBill")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              {money.workInProgress <= 0 ? (
                <Text type="body" color="secondary">
                  {t("@legalos.matterWorkspace.financial.nothingToBill")}
                </Text>
              ) : (
                <>
                  <HStack hAlign="between">
                    <Text type="body">
                      {t("@legalos.matterWorkspace.financial.unbilledTime")}
                    </Text>
                    <Text type="body" weight="semibold">
                      {formatEGP(money.unbilledTime, money.currency)}
                    </Text>
                  </HStack>
                  <HStack hAlign="between">
                    <Text type="body">
                      {t("@legalos.matterWorkspace.financial.unbilledExpenses")}
                    </Text>
                    <Text type="body" weight="semibold">
                      {formatEGP(money.unbilledExpenses, money.currency)}
                    </Text>
                  </HStack>
                  <Divider />
                  <HStack hAlign="between">
                    <Text type="body" weight="semibold">
                      {t("@legalos.matterWorkspace.financial.workInProgress")}
                    </Text>
                    <Text type="body" weight="semibold">
                      {formatEGP(money.workInProgress, money.currency)}
                    </Text>
                  </HStack>
                  <NumberInput
                    label={t("@legalos.matterWorkspace.bills.paymentTerms")}
                    value={terms}
                    onChange={(value) => setTerms(value ?? 30)}
                    min={0}
                    max={365}
                    step={5}
                  />
                </>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.matterWorkspace.action.saving")
                    : t("@legalos.matterWorkspace.financial.quickBill")
                }
                variant="primary"
                isDisabled={saving || money.workInProgress <= 0}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

// --- transactions -----------------------------------------------------------

export function TransactionsTab({
  data,
  reload,
  onError,
  recordOpen,
  onRecordChange,
}: TabProps & {
  recordOpen: boolean;
  onRecordChange: (open: boolean) => void;
}) {
  const { formatDate, formatEGP } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const { role } = useOrg();
  const balance = data.trustBalance;
  const currency = data.trustAccounts[0]?.currency ?? "EGP";
  const hasAccount = data.trustAccounts.length > 0;

  if (!hasAccount) {
    return (
      <>
        <Panel title={t("@legalos.matterWorkspace.transactions.heading")}>
          <EmptyState
            icon={<Icon icon={BuildingLibraryIcon} size="lg" color="secondary" />}
            title={t("@legalos.matterWorkspace.transactions.noAccountTitle")}
            description={t(
              "@legalos.matterWorkspace.transactions.noAccountDescription",
            )}
            actions={
              role === "owner" ? (
                <Button
                  label={t("@legalos.matterWorkspace.transactions.openAccount")}
                  variant="primary"
                  onClick={() => onRecordChange(true)}
                />
              ) : (
                <Text type="supporting" color="secondary">
                  {t("@legalos.matterWorkspace.transactions.ownerOnly")}
                </Text>
              )
            }
          />
        </Panel>
        <OpenAccountDialog
          isOpen={recordOpen}
          onOpenChange={onRecordChange}
          reload={reload}
          onError={onError}
        />
      </>
    );
  }

  return (
    <>
      <VStack gap={6}>
        <Panel title={t("@legalos.matterWorkspace.transactions.heading")}>
          <Grid columns={3} gap={4}>
            <StatTile
              label={t("@legalos.matterWorkspace.transactions.balance")}
              value={formatEGP(Number(balance.balance), currency)}
            />
            <StatTile
              label={t("@legalos.matterWorkspace.transactions.deposits")}
              value={formatEGP(Number(balance.deposits), currency)}
            />
            <StatTile
              label={t("@legalos.matterWorkspace.transactions.disbursed")}
              value={formatEGP(Number(balance.disbursed), currency)}
            />
          </Grid>
        </Panel>

        <Panel
          action={
            <Button
              label={t("@legalos.matterWorkspace.transactions.record")}
              variant="primary"
              size="sm"
              isDisabled={role === "lawyer"}
              onClick={() => onRecordChange(true)}
            />
          }
        >
          {role === "lawyer" && (
            <Text type="supporting" color="secondary">
              {t("@legalos.matterWorkspace.transactions.staffOnly")}
            </Text>
          )}
          {data.trustTransactions.length === 0 ? (
            <EmptyState
              icon={<Icon icon={BanknotesIcon} size="lg" color="secondary" />}
              title={t("@legalos.matterWorkspace.transactions.emptyTitle")}
              description={t(
                "@legalos.matterWorkspace.transactions.emptyDescription",
              )}
            />
          ) : (
            <List hasDividers>
              {data.trustTransactions.map((entry) => {
                const isOutflow = OUTFLOWS.includes(entry.kind);
                return (
                  <ListItem
                    key={entry.id}
                    label={
                      entry.description ||
                      t(`@legalos.matterWorkspace.transactions.kind.${entry.kind}`)
                    }
                    description={[
                      memberName(entry.recorded_by),
                      formatDate(entry.transaction_date),
                      entry.reference,
                      entry.invoice_number,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    startContent={
                      <Icon
                        icon={isOutflow ? ArrowUpTrayIcon : ArrowDownTrayIcon}
                        size="sm"
                        color={isOutflow ? "secondary" : "success"}
                      />
                    }
                    endContent={
                      <HStack gap={3} vAlign="center">
                        <Badge
                          variant="neutral"
                          label={t(
                            `@legalos.matterWorkspace.transactions.kind.${entry.kind}`,
                          )}
                        />
                        <Text type="body" weight="semibold">
                          {isOutflow ? "−" : "+"}
                          {formatEGP(Number(entry.amount), entry.currency)}
                        </Text>
                      </HStack>
                    }
                  />
                );
              })}
            </List>
          )}
        </Panel>
      </VStack>

      <RecordTransactionDialog
        isOpen={recordOpen}
        onOpenChange={onRecordChange}
        data={data}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function OpenAccountDialog({
  isOpen,
  onOpenChange,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.trust.createAccount({
          name: name.trim(),
          bank_name: bank,
          account_number: number,
        }),
      "@legalos.matterWorkspace.errors.trust",
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={440}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.transactions.openAccount")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <TextInput
                label={t("@legalos.matterWorkspace.transactions.account.name")}
                value={name}
                onChange={setName}
                isRequired
              />
              <TextInput
                label={t("@legalos.matterWorkspace.transactions.account.bank")}
                value={bank}
                onChange={setBank}
              />
              <TextInput
                label={t("@legalos.matterWorkspace.transactions.account.number")}
                value={number}
                onChange={setNumber}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.matterWorkspace.action.saving")
                    : t("@legalos.matterWorkspace.action.save")
                }
                variant="primary"
                isDisabled={saving || !name.trim()}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

function RecordTransactionDialog({
  isOpen,
  onOpenChange,
  data,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: TabProps["data"];
  reload: () => void;
  onError: (message: string) => void;
}) {
  const { formatEGP } = useFormat();
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [kind, setKind] = useState<TrustKind>("deposit");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<ISODateString>(todayIso());
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Only an unpaid bill can be settled out of client funds.
  const payable = data.invoices.filter((invoice) => invoice.status !== "paid");

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.trust.record({
          matter_id: data.matter.id,
          kind,
          amount,
          transaction_date: date,
          description,
          reference,
          ...(kind === "invoice_payment" && invoiceId
            ? { invoice_id: Number(invoiceId) }
            : {}),
        }),
      "@legalos.matterWorkspace.errors.trust",
    );
    setSaving(false);
    if (ok) {
      setAmount(0);
      setDescription("");
      setReference("");
      onOpenChange(false);
    }
  }

  const needsInvoice = kind === "invoice_payment";

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.transactions.record")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <Selector
                  label={t("@legalos.matterWorkspace.transactions.form.kind")}
                  value={kind}
                  onChange={(value) => setKind(value as TrustKind)}
                  options={KINDS.map((value) => ({
                    value,
                    label: t(
                      `@legalos.matterWorkspace.transactions.kind.${value}`,
                    ),
                  }))}
                />
                <NumberInput
                  label={t("@legalos.matterWorkspace.transactions.form.amount")}
                  value={amount}
                  onChange={(value) => setAmount(value ?? 0)}
                  min={0}
                  step={500}
                />
                <DateInput
                  label={t("@legalos.matterWorkspace.transactions.form.date")}
                  value={date}
                  onChange={(value) => setDate(value ?? date)}
                />
              </HStack>
              {needsInvoice && (
                <Selector
                  label={t("@legalos.matterWorkspace.transactions.form.invoice")}
                  value={invoiceId}
                  onChange={setInvoiceId}
                  hasClear
                  isRequired
                  options={payable.map((invoice) => ({
                    value: String(invoice.id),
                    label: `${invoice.number} — ${formatEGP(
                      Number(invoice.amount),
                      invoice.currency,
                    )}`,
                  }))}
                />
              )}
              <TextInput
                label={t("@legalos.matterWorkspace.transactions.form.description")}
                value={description}
                onChange={setDescription}
              />
              <TextInput
                label={t("@legalos.matterWorkspace.transactions.form.reference")}
                value={reference}
                onChange={setReference}
                placeholder={t(
                  "@legalos.matterWorkspace.transactions.form.referencePlaceholder",
                )}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.matterWorkspace.action.saving")
                    : t("@legalos.matterWorkspace.action.save")
                }
                variant="primary"
                isDisabled={
                  saving || amount <= 0 || (needsInvoice && !invoiceId)
                }
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
