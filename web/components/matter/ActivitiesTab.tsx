"use client";

/**
 * Activities: time and expenses in one ledger, because that is what a matter's
 * billable work actually is. Keeping them on separate tabs would mean nobody
 * ever sees the total the client is about to be sent.
 */

import React, { useMemo, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { useMemberName, useOrg } from "@/lib/org";
import {
  todayIso,
  type ExpenseCategory,
  type ISODateString,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { Panel, useWrite, type TabProps } from "./shared";

const CATEGORIES: ExpenseCategory[] = [
  "court_fees",
  "filing",
  "expert",
  "travel",
  "translation",
  "courier",
  "other",
];

/** One row in the merged ledger: a time entry or an expense, already flattened. */
interface Row {
  key: string;
  kind: "time" | "expense";
  date: string;
  label: string;
  who: string;
  quantity: string;
  amount: number;
  billable: boolean;
  billed: boolean;
}

export function ActivitiesTab({
  data,
  reload,
  onError,
  addTimeOpen,
  addExpenseOpen,
  onAddTimeChange,
  onAddExpenseChange,
}: TabProps & {
  addTimeOpen: boolean;
  addExpenseOpen: boolean;
  onAddTimeChange: (open: boolean) => void;
  onAddExpenseChange: (open: boolean) => void;
}) {
  const { formatDate, formatEGP } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const [filter, setFilter] = useState<"all" | "time" | "expense">("all");

  const rows = useMemo<Row[]>(() => {
    const timeRows: Row[] = data.time.map((entry) => ({
      key: `time-${entry.id}`,
      kind: "time",
      date: entry.entry_date,
      label:
        entry.description || t("@legalos.matters.detail.time.defaultDescription"),
      who: memberName(entry.clerk_user_id),
      quantity: t("@legalos.matters.detail.hoursValue", {
        hours: Number(entry.hours).toFixed(1),
      }),
      amount: Number(entry.hours) * Number(entry.rate),
      billable: entry.billable,
      billed: entry.invoice_id !== null,
    }));
    const expenseRows: Row[] = data.expenses.map((expense) => ({
      key: `expense-${expense.id}`,
      kind: "expense",
      date: expense.entry_date,
      label:
        expense.description ||
        t(`@legalos.matterWorkspace.expenseCategory.${expense.category}`),
      who: memberName(expense.clerk_user_id),
      quantity: `${Number(expense.quantity)} × ${formatEGP(
        Number(expense.unit_amount),
      )}`,
      amount: Number(expense.amount),
      billable: expense.billable,
      billed: expense.invoice_id !== null,
    }));
    return [...timeRows, ...expenseRows].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [data.time, data.expenses, memberName, t]);

  const visible = rows.filter((row) => filter === "all" || row.kind === filter);

  return (
    <>
      <Panel
        title={t("@legalos.matterWorkspace.activities.heading")}
        action={
          <div className="flex items-center gap-3 flex-wrap">
            <div
              role="radiogroup"
              aria-label={t("@legalos.matterWorkspace.activities.heading")}
              className="inline-flex p-1 border max-w-fit"
              style={{
                backgroundColor: "var(--surface2)",
                borderColor: "var(--border)",
                borderRadius: "var(--rs)",
              }}
            >
              {(["all", "time", "expense"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={filter === mode}
                  onClick={() => setFilter(mode)}
                  className="px-2.5 py-1 text-xs font-medium transition-all"
                  style={{
                    borderRadius: "calc(var(--rs) - 2px)",
                    backgroundColor: filter === mode ? "var(--surface)" : "transparent",
                    color: filter === mode ? "var(--text)" : "var(--text2)",
                    boxShadow: filter === mode ? "var(--shadow)" : "none",
                  }}
                >
                  {mode === "all"
                    ? t("@legalos.matterWorkspace.activities.filter.all")
                    : mode === "time"
                    ? t("@legalos.matterWorkspace.activities.filter.time")
                    : t("@legalos.matterWorkspace.activities.filter.expenses")}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAddTimeChange(true)}
            >
              {t("@legalos.matterWorkspace.financial.addTime")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAddExpenseChange(true)}
            >
              {t("@legalos.matterWorkspace.financial.addExpense")}
            </Button>
          </div>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon name="schedule" size={24} />}
            title={t("@legalos.matterWorkspace.activities.emptyTitle")}
            description={t("@legalos.matterWorkspace.activities.emptyDescription")}
          />
        ) : (
          <div
            className="flex flex-col rounded-md border divide-y overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            {visible.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    name={row.kind === "time" ? "schedule" : "payments"}
                    size={16}
                    style={{ color: "var(--text3)" }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                      {row.label}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                      {`${row.who} · ${formatDate(row.date)} · ${row.quantity}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {!row.billable && (
                    <Badge color="neutral" variant="soft">
                      {t("@legalos.matterWorkspace.activities.nonBillable")}
                    </Badge>
                  )}
                  {row.billed && (
                    <Badge color="info" variant="soft">
                      {t("@legalos.matterWorkspace.activities.billed")}
                    </Badge>
                  )}
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    {formatEGP(row.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <AddTimeDialog
        isOpen={addTimeOpen}
        onOpenChange={onAddTimeChange}
        matterId={data.matter.id}
        reload={reload}
        onError={onError}
      />
      <AddExpenseDialog
        isOpen={addExpenseOpen}
        onOpenChange={onAddExpenseChange}
        matterId={data.matter.id}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function AddTimeDialog({
  isOpen,
  onOpenChange,
  matterId,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  matterId: number;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [entryDate, setEntryDate] = useState<ISODateString>(todayIso());
  const [hours, setHours] = useState(1);
  const [rate, setRate] = useState(0);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.time.create({
          matter_id: matterId,
          entry_date: entryDate,
          hours,
          rate,
          description,
          billable,
        }),
      "@legalos.matterWorkspace.errors.time",
    );
    setSaving(false);
    if (ok) {
      setDescription("");
      setHours(1);
      onOpenChange(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <DialogHeader
        title={t("@legalos.matterWorkspace.activities.time.heading")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="date"
              label={t("@legalos.matterWorkspace.activities.field.date")}
              value={entryDate}
              onChange={(e) => setEntryDate((e.target.value as ISODateString) || entryDate)}
            />
            <Input
              type="number"
              label={t("@legalos.matterWorkspace.activities.time.hours")}
              value={hours}
              onChange={(e) => setHours(e.target.value ? Number(e.target.value) : 0)}
              min={0.25}
              max={24}
              step={0.25}
            />
            <Input
              type="number"
              label={t("@legalos.matterWorkspace.activities.time.rate")}
              value={rate}
              onChange={(e) => setRate(e.target.value ? Number(e.target.value) : 0)}
              min={0}
              step={50}
            />
          </div>
          <Input
            label={t("@legalos.matterWorkspace.activities.field.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Switch
            label={t("@legalos.matterWorkspace.activities.field.billable")}
            checked={billable}
            onChange={setBillable}
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
          disabled={hours <= 0}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.action.save")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function AddExpenseDialog({
  isOpen,
  onOpenChange,
  matterId,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  matterId: number;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const { formatEGP } = useFormat();
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [entryDate, setEntryDate] = useState<ISODateString>(todayIso());
  const [category, setCategory] = useState<ExpenseCategory>("court_fees");
  const [quantity, setQuantity] = useState(1);
  const [unitAmount, setUnitAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.expenses.create({
          matter_id: matterId,
          entry_date: entryDate,
          category,
          quantity,
          unit_amount: unitAmount,
          description,
          billable,
        }),
      "@legalos.matterWorkspace.errors.expense",
    );
    setSaving(false);
    if (ok) {
      setDescription("");
      setUnitAmount(0);
      setQuantity(1);
      onOpenChange(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <DialogHeader
        title={t("@legalos.matterWorkspace.activities.expense.heading")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label={t("@legalos.matterWorkspace.activities.field.date")}
              value={entryDate}
              onChange={(e) => setEntryDate((e.target.value as ISODateString) || entryDate)}
            />
            <Select
              label={t("@legalos.matterWorkspace.activities.expense.category")}
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              options={CATEGORIES.map((value) => ({
                value,
                label: t(`@legalos.matterWorkspace.expenseCategory.${value}`),
              }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="number"
              label={t("@legalos.matterWorkspace.activities.expense.quantity")}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : 1)}
              min={0.01}
              step={1}
            />
            <Input
              type="number"
              label={t("@legalos.matterWorkspace.activities.expense.unitAmount")}
              value={unitAmount}
              onChange={(e) => setUnitAmount(e.target.value ? Number(e.target.value) : 0)}
              min={0}
              step={50}
            />
          </div>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {formatEGP(quantity * unitAmount)}
          </span>
          <Input
            label={t("@legalos.matterWorkspace.activities.field.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Switch
            label={t("@legalos.matterWorkspace.activities.field.billable")}
            checked={billable}
            onChange={setBillable}
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
          disabled={quantity <= 0}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.action.save")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
