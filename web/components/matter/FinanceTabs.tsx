"use client";

/**
 * The two money tabs.
 *
 * Bills is what the client owes the firm. Transactions is what the firm holds
 * for the client. They are separate tabs because they are separate pots — the
 * whole point of a client-funds ledger is that the money in it is not the
 * firm's, and a screen that merged them would suggest otherwise.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { useMemberName, useOrg } from "@/lib/org";
import {
  todayIso,
  type ISODateString,
  type TrustKind,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { Panel, StatTile, financialsOf, useWrite, type TabProps } from "./shared";
import { InvoiceStatusMark } from "@/components/Distinction";

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
  const money = financialsOf(data);

  return (
    <>
      <Panel
        title={t("@legalos.matterWorkspace.bills.heading")}
        action={
          <Button
            variant="primary"
            size="sm"
            disabled={money.workInProgress <= 0}
            onClick={() => onQuickBillChange(true)}
          >
            {t("@legalos.matterWorkspace.financial.quickBill")}
          </Button>
        }
      >
        {data.invoices.length === 0 ? (
          <EmptyState
            icon={<Icon name="payments" size={24} />}
            title={t("@legalos.matterWorkspace.bills.emptyTitle")}
            description={t("@legalos.matterWorkspace.bills.emptyDescription")}
          />
        ) : (
          <div
            className="flex flex-col rounded-md border divide-y overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            {data.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="receipt_long" size={16} style={{ color: "var(--text3)" }} />
                  <div className="flex flex-col min-w-0">
                    <Link
                      href={`/billing/${invoice.id}`}
                      className="text-xs font-semibold hover:underline truncate"
                      style={{ color: "var(--primary)" }}
                    >
                      {invoice.number}
                    </Link>
                    <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                      {invoice.paid_date
                        ? t("@legalos.matterWorkspace.bills.paid", {
                            date: formatDate(invoice.paid_date),
                          })
                        : `${t("@legalos.matterWorkspace.bills.issued", {
                            date: formatDate(invoice.issued_date),
                          })} · ${t("@legalos.matterWorkspace.bills.due", {
                            date: formatDate(invoice.due_date),
                          })}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <InvoiceStatusMark status={invoice.status} />
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    {formatEGP(Number(invoice.amount), invoice.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
      <DialogHeader
        title={t("@legalos.matterWorkspace.financial.quickBill")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          {money.workInProgress <= 0 ? (
            <p className="text-xs m-0" style={{ color: "var(--text3)" }}>
              {t("@legalos.matterWorkspace.financial.nothingToBill")}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text)" }}>
                  {t("@legalos.matterWorkspace.financial.unbilledTime")}
                </span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {formatEGP(money.unbilledTime, money.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text)" }}>
                  {t("@legalos.matterWorkspace.financial.unbilledExpenses")}
                </span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {formatEGP(money.unbilledExpenses, money.currency)}
                </span>
              </div>
              <hr style={{ borderColor: "var(--border)" }} />
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {t("@legalos.matterWorkspace.financial.workInProgress")}
                </span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {formatEGP(money.workInProgress, money.currency)}
                </span>
              </div>
              <Input
                type="number"
                label={t("@legalos.matterWorkspace.bills.paymentTerms")}
                value={terms}
                onChange={(e) => setTerms(e.target.value ? Number(e.target.value) : 30)}
                min={0}
                max={365}
                step={5}
              />
            </>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={money.workInProgress <= 0}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.financial.quickBill")}
        </Button>
      </DialogFooter>
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
            icon={<Icon name="account_balance" size={24} />}
            title={t("@legalos.matterWorkspace.transactions.noAccountTitle")}
            description={t(
              "@legalos.matterWorkspace.transactions.noAccountDescription",
            )}
            action={
              role === "owner" ? (
                <Button
                  variant="primary"
                  onClick={() => onRecordChange(true)}
                >
                  {t("@legalos.matterWorkspace.transactions.openAccount")}
                </Button>
              ) : (
                <span className="text-xs" style={{ color: "var(--text3)" }}>
                  {t("@legalos.matterWorkspace.transactions.ownerOnly")}
                </span>
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
      <div className="flex flex-col gap-6">
        <Panel title={t("@legalos.matterWorkspace.transactions.heading")}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </Panel>

        <Panel
          action={
            <Button
              variant="primary"
              size="sm"
              disabled={role === "lawyer"}
              onClick={() => onRecordChange(true)}
            >
              {t("@legalos.matterWorkspace.transactions.record")}
            </Button>
          }
        >
          {role === "lawyer" && (
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {t("@legalos.matterWorkspace.transactions.staffOnly")}
            </span>
          )}
          {data.trustTransactions.length === 0 ? (
            <EmptyState
              icon={<Icon name="payments" size={24} />}
              title={t("@legalos.matterWorkspace.transactions.emptyTitle")}
              description={t(
                "@legalos.matterWorkspace.transactions.emptyDescription",
              )}
            />
          ) : (
            <div
              className="flex flex-col rounded-md border divide-y overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              {data.trustTransactions.map((entry) => {
                const isOutflow = OUTFLOWS.includes(entry.kind);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        name={isOutflow ? "arrow_upward" : "arrow_downward"}
                        size={16}
                        style={{
                          color: isOutflow ? "var(--text3)" : "var(--success)",
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                          {entry.description ||
                            t(`@legalos.matterWorkspace.transactions.kind.${entry.kind}`)}
                        </span>
                        <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                          {[
                            memberName(entry.recorded_by),
                            formatDate(entry.transaction_date),
                            entry.reference,
                            entry.invoice_number,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge color="neutral" variant="soft">
                        {t(
                          `@legalos.matterWorkspace.transactions.kind.${entry.kind}`,
                        )}
                      </Badge>
                      <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                        {isOutflow ? "−" : "+"}
                        {formatEGP(Number(entry.amount), entry.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

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
      <DialogHeader
        title={t("@legalos.matterWorkspace.transactions.openAccount")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <Input
            label={t("@legalos.matterWorkspace.transactions.account.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label={t("@legalos.matterWorkspace.transactions.account.bank")}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
          <Input
            label={t("@legalos.matterWorkspace.transactions.account.number")}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={!name.trim()}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.action.save")}
        </Button>
      </DialogFooter>
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
      <DialogHeader
        title={t("@legalos.matterWorkspace.transactions.record")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label={t("@legalos.matterWorkspace.transactions.form.kind")}
              value={kind}
              onChange={(e) => setKind(e.target.value as TrustKind)}
              options={KINDS.map((value) => ({
                value,
                label: t(
                  `@legalos.matterWorkspace.transactions.kind.${value}`,
                ),
              }))}
            />
            <Input
              type="number"
              label={t("@legalos.matterWorkspace.transactions.form.amount")}
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : 0)}
              min={0}
              step={500}
            />
            <Input
              type="date"
              label={t("@legalos.matterWorkspace.transactions.form.date")}
              value={date}
              onChange={(e) => setDate((e.target.value as ISODateString) || date)}
            />
          </div>
          {needsInvoice && (
            <Select
              label={t("@legalos.matterWorkspace.transactions.form.invoice")}
              value={invoiceId ?? ""}
              onChange={(e) => setInvoiceId(e.target.value || null)}
              required
              options={[
                { value: "", label: "—" },
                ...payable.map((invoice) => ({
                  value: String(invoice.id),
                  label: `${invoice.number} — ${formatEGP(
                    Number(invoice.amount),
                    invoice.currency,
                  )}`,
                })),
              ]}
            />
          )}
          <Input
            label={t("@legalos.matterWorkspace.transactions.form.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label={t("@legalos.matterWorkspace.transactions.form.reference")}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t(
              "@legalos.matterWorkspace.transactions.form.referencePlaceholder",
            )}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={amount <= 0 || (needsInvoice && !invoiceId)}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.action.save")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
