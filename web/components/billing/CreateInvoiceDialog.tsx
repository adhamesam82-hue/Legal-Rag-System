"use client";

/**
 * Build an invoice line by line (T-033), as opposed to the other dialog on
 * this screen (billing/page.tsx's GenerateInvoiceDialog), which drafts one
 * from unbilled time in a single call. This one exists because the backend
 * has no route to add or edit a line on an invoice that already exists
 * (POST /invoices takes the whole line list at once, and PATCH only ever
 * touched status and notes) -- so every line has to be right before the one
 * submit, and everything on screen up to that point is a preview, not the
 * record.
 *
 * Tax is set per line, never on the invoice as a whole: the API refuses a
 * request that sets both (422, T-026), and per-line covers the one case that
 * matters -- fees at the standard rate beside a disbursement that carries
 * none -- without asking the lawyer to reason about which of two rate
 * fields wins.
 */

import { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { TextInput } from "@astryxdesign/core/TextInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Divider } from "@astryxdesign/core/Divider";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { useOrg, useResource } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import { ApiError } from "@/lib/api";
import { useFormat } from "@/lib/i18n/format";
import { todayIso } from "@/lib/practice";
import { fromPiastres, totalsOf, type DraftLine } from "@/lib/money";

interface EditableLine extends DraftLine {
  key: number;
  description: string;
}

let nextKey = 1;
function blankLine(): EditableLine {
  return { key: nextKey++, description: "", quantity: 1, unitAmount: "", taxRatePercent: 0 };
}

export function CreateInvoiceDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const t = useTranslator();
  const { formatEGPExact } = useFormat();
  const { practice } = useOrg();

  const [clientId, setClientId] = useState<string | null>(null);
  const [matterId, setMatterId] = useState<string | null>(null);
  const [issuedDate, setIssuedDate] = useState<ISODateString>(todayIso);
  const [dueDate, setDueDate] = useState<ISODateString>(todayIso);
  const [number, setNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([blankLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clients = useResource((api) => (isOpen ? api.clients.list() : Promise.resolve([])), [isOpen]);
  const matters = useResource(
    (api) => (isOpen && clientId ? api.matters.list({ client_id: Number(clientId) }) : Promise.resolve([])),
    [isOpen, clientId],
  );

  function reset() {
    setClientId(null);
    setMatterId(null);
    setIssuedDate(todayIso());
    setDueDate(todayIso());
    setNumber("");
    setNotes("");
    setLines([blankLine()]);
    setError(null);
  }

  function updateLine(key: number, patch: Partial<EditableLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }
  function removeLine(key: number) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current));
  }

  const totals = totalsOf(lines);
  const validLines = lines.filter((line) => line.description.trim() && Number(line.unitAmount) >= 0);
  const canSubmit = clientId !== null && validLines.length > 0 && !saving;

  async function submit() {
    if (!practice || !clientId || validLines.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await practice.invoices.create({
        client_id: Number(clientId),
        matter_id: matterId ? Number(matterId) : undefined,
        issued_date: issuedDate,
        due_date: dueDate,
        number: number.trim() || undefined,
        notes,
        lines: validLines.map((line) => ({
          description: line.description.trim(),
          quantity: Number(line.quantity) || 0,
          unit_amount: Number(line.unitAmount) || 0,
          // A fraction, like the invoice-level field -- 14% on screen is 0.14 here.
          tax_rate: (Number(line.taxRatePercent) || 0) / 100,
        })),
      });
      onOpenChange(false);
      reset();
      onCreated();
    } catch (exc) {
      if (exc instanceof ApiError && exc.status === 409) {
        setError(t("@legalos.billing.create.numberConflict"));
      } else {
        setError(exc instanceof Error ? exc.message : t("@legalos.billing.create.error"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) reset();
      }}
      purpose="form"
      width={720}
    >
      <Layout
        header={<DialogHeader title={t("@legalos.billing.create.title")} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={5}>
              <InlineError message={error} onDismiss={() => setError(null)} />

              <HStack gap={3} wrap="wrap">
                <Selector
                  label={t("@legalos.billing.create.clientLabel")}
                  isRequired
                  hasClear
                  value={clientId}
                  onChange={(value) => {
                    setClientId(value);
                    setMatterId(null);
                  }}
                  placeholder={
                    clients.loading
                      ? t("@legalos.billing.dialog.loadingPlaceholder")
                      : t("@legalos.billing.create.clientPlaceholder")
                  }
                  options={(clients.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                  width={260}
                />
                <Selector
                  label={t("@legalos.billing.create.matterLabel")}
                  hasClear
                  isDisabled={!clientId}
                  value={matterId}
                  onChange={setMatterId}
                  placeholder={
                    !clientId
                      ? t("@legalos.billing.create.matterPlaceholderNoClient")
                      : t("@legalos.billing.create.matterPlaceholder")
                  }
                  options={(matters.data ?? []).map((m) => ({ value: String(m.id), label: m.name }))}
                  width={260}
                />
              </HStack>

              <HStack gap={3} wrap="wrap">
                <DateInput
                  label={t("@legalos.billing.create.issuedLabel")}
                  value={issuedDate}
                  onChange={(v) => setIssuedDate(v ?? issuedDate)}
                />
                <DateInput
                  label={t("@legalos.billing.create.dueLabel")}
                  value={dueDate}
                  onChange={(v) => setDueDate(v ?? dueDate)}
                />
                <TextInput
                  label={t("@legalos.billing.create.numberLabel")}
                  value={number}
                  onChange={setNumber}
                  placeholder={t("@legalos.billing.create.numberPlaceholder")}
                  description={t("@legalos.billing.create.numberHint")}
                  width={200}
                />
              </HStack>

              <Divider />

              {/* --- line items -------------------------------------------- */}
              <VStack gap={3}>
                <Text type="label">{t("@legalos.billing.create.linesHeading")}</Text>
                {lines.map((line) => {
                  const priced = totalsOf([line]);
                  return (
                    <HStack key={line.key} gap={2} vAlign="end" wrap="wrap">
                      <TextInput
                        label={t("@legalos.billingDetail.column.description")}
                        isLabelHidden
                        value={line.description}
                        onChange={(value) => updateLine(line.key, { description: value })}
                        placeholder={t("@legalos.billing.create.line.descriptionPlaceholder")}
                        width={220}
                      />
                      <NumberInput
                        label={t("@legalos.billing.create.line.quantity")}
                        value={Number(line.quantity)}
                        onChange={(value) => updateLine(line.key, { quantity: value ?? 0 })}
                        min={0}
                        step={0.25}
                        width={90}
                      />
                      <NumberInput
                        label={t("@legalos.billing.create.line.unitAmount")}
                        value={line.unitAmount === "" ? null : Number(line.unitAmount)}
                        onChange={(value) => updateLine(line.key, { unitAmount: value ?? 0 })}
                        min={0}
                        step={0.01}
                        width={120}
                      />
                      <NumberInput
                        label={t("@legalos.billing.create.line.taxPercent")}
                        value={Number(line.taxRatePercent)}
                        onChange={(value) => updateLine(line.key, { taxRatePercent: value ?? 0 })}
                        min={0}
                        max={100}
                        step={1}
                        width={90}
                      />
                      <VStack gap={0} width={110}>
                        <Text type="supporting" color="secondary">
                          {t("@legalos.billing.create.line.total")}
                        </Text>
                        <Text type="body" weight="semibold">
                          {formatEGPExact(fromPiastres(priced.subtotal))}
                        </Text>
                      </VStack>
                      <Button
                        label={t("@legalos.billing.create.line.remove")}
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        icon={<Icon icon={TrashIcon} size="sm" color="inherit" />}
                        isDisabled={lines.length === 1}
                        onClick={() => removeLine(line.key)}
                      />
                    </HStack>
                  );
                })}
                <Button
                  label={t("@legalos.billing.create.line.add")}
                  variant="secondary"
                  size="sm"
                  icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                  onClick={() => setLines((current) => [...current, blankLine()])}
                />
              </VStack>

              <Divider />

              {/* --- totals: for display only, see money.ts ---------------- */}
              <HStack hAlign="end">
                <VStack gap={1.5} width={260}>
                  <HStack hAlign="between">
                    <Text type="body" color="secondary">
                      {t("@legalos.billingDetail.linesTotal")}
                    </Text>
                    <Text type="body">{formatEGPExact(fromPiastres(totals.subtotal))}</Text>
                  </HStack>
                  {totals.tax > 0 && (
                    <HStack hAlign="between">
                      <Text type="body" color="secondary">
                        {t("@legalos.billing.create.tax")}
                      </Text>
                      <Text type="body">{formatEGPExact(fromPiastres(totals.tax))}</Text>
                    </HStack>
                  )}
                  <HStack hAlign="between">
                    <Text type="body" weight="bold" size="lg">
                      {t("@legalos.billingDetail.invoiceTotal")}
                    </Text>
                    <Text type="body" weight="bold" size="lg">
                      {formatEGPExact(fromPiastres(totals.total))}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>

              <TextArea
                label={t("@legalos.billing.create.notesLabel")}
                value={notes}
                onChange={setNotes}
                rows={3}
                placeholder={t("@legalos.billing.create.notesPlaceholder")}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.billing.dialog.cancel")}
                variant="secondary"
                isDisabled={saving}
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={saving ? t("@legalos.billing.create.saving") : t("@legalos.billing.create.save")}
                variant="primary"
                isLoading={saving}
                isDisabled={!canSubmit}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
