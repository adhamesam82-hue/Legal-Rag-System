"use client";

/**
 * Activities: time and expenses in one ledger, because that is what a matter's
 * billable work actually is. Keeping them on separate tabs would mean nobody
 * ever sees the total the client is about to be sent.
 */

import { useMemo, useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
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
import { Switch } from "@astryxdesign/core/Switch";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { useTranslator } from "@astryxdesign/core/i18n";
import { BanknotesIcon, ClockIcon } from "@heroicons/react/24/outline";
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
          <HStack gap={3} vAlign="center" wrap="wrap">
            <SegmentedControl
              label={t("@legalos.matterWorkspace.activities.heading")}
              value={filter}
              size="sm"
              onChange={(value) => setFilter(value as typeof filter)}
            >
              <SegmentedControlItem
                value="all"
                label={t("@legalos.matterWorkspace.activities.filter.all")}
              />
              <SegmentedControlItem
                value="time"
                label={t("@legalos.matterWorkspace.activities.filter.time")}
              />
              <SegmentedControlItem
                value="expense"
                label={t("@legalos.matterWorkspace.activities.filter.expenses")}
              />
            </SegmentedControl>
            <Button
              label={t("@legalos.matterWorkspace.financial.addTime")}
              variant="secondary"
              size="sm"
              onClick={() => onAddTimeChange(true)}
            />
            <Button
              label={t("@legalos.matterWorkspace.financial.addExpense")}
              variant="secondary"
              size="sm"
              onClick={() => onAddExpenseChange(true)}
            />
          </HStack>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon icon={ClockIcon} size="lg" color="secondary" />}
            title={t("@legalos.matterWorkspace.activities.emptyTitle")}
            description={t("@legalos.matterWorkspace.activities.emptyDescription")}
          />
        ) : (
          <List hasDividers density="compact">
            {visible.map((row) => (
              <ListItem
                key={row.key}
                label={row.label}
                description={`${row.who} · ${formatDate(row.date)} · ${row.quantity}`}
                startContent={
                  <Icon
                    icon={row.kind === "time" ? ClockIcon : BanknotesIcon}
                    size="sm"
                    color="secondary"
                  />
                }
                endContent={
                  <HStack gap={3} vAlign="center">
                    {!row.billable && (
                      <Badge
                        variant="neutral"
                        label={t("@legalos.matterWorkspace.activities.nonBillable")}
                      />
                    )}
                    {row.billed && (
                      <Badge
                        variant="info"
                        label={t("@legalos.matterWorkspace.activities.billed")}
                      />
                    )}
                    <Text type="body" weight="semibold">
                      {formatEGP(row.amount)}
                    </Text>
                  </HStack>
                }
              />
            ))}
          </List>
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
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.activities.time.heading")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <DateInput
                  label={t("@legalos.matterWorkspace.activities.field.date")}
                  value={entryDate}
                  onChange={(value) => setEntryDate(value ?? entryDate)}
                />
                <NumberInput
                  label={t("@legalos.matterWorkspace.activities.time.hours")}
                  value={hours}
                  onChange={(value) => setHours(value ?? 0)}
                  min={0.25}
                  max={24}
                  step={0.25}
                />
                <NumberInput
                  label={t("@legalos.matterWorkspace.activities.time.rate")}
                  value={rate}
                  onChange={(value) => setRate(value ?? 0)}
                  min={0}
                  step={50}
                />
              </HStack>
              <TextInput
                label={t("@legalos.matterWorkspace.activities.field.description")}
                value={description}
                onChange={setDescription}
              />
              <Switch
                label={t("@legalos.matterWorkspace.activities.field.billable")}
                value={billable}
                onChange={setBillable}
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
                isDisabled={saving || hours <= 0}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
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
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.activities.expense.heading")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <DateInput
                  label={t("@legalos.matterWorkspace.activities.field.date")}
                  value={entryDate}
                  onChange={(value) => setEntryDate(value ?? entryDate)}
                />
                <Selector
                  label={t("@legalos.matterWorkspace.activities.expense.category")}
                  value={category}
                  onChange={(value) => setCategory(value as ExpenseCategory)}
                  options={CATEGORIES.map((value) => ({
                    value,
                    label: t(`@legalos.matterWorkspace.expenseCategory.${value}`),
                  }))}
                />
              </HStack>
              <HStack gap={3}>
                <NumberInput
                  label={t("@legalos.matterWorkspace.activities.expense.quantity")}
                  value={quantity}
                  onChange={(value) => setQuantity(value ?? 1)}
                  min={0.01}
                  step={1}
                />
                <NumberInput
                  label={t("@legalos.matterWorkspace.activities.expense.unitAmount")}
                  value={unitAmount}
                  onChange={(value) => setUnitAmount(value ?? 0)}
                  min={0}
                  step={50}
                />
              </HStack>
              <Text type="supporting" color="secondary">
                {formatEGP(quantity * unitAmount)}
              </Text>
              <TextInput
                label={t("@legalos.matterWorkspace.activities.field.description")}
                value={description}
                onChange={setDescription}
              />
              <Switch
                label={t("@legalos.matterWorkspace.activities.field.billable")}
                value={billable}
                onChange={setBillable}
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
                isDisabled={saving || quantity <= 0}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
