"use client";

/**
 * نافذة إنشاء فاتورة (Create Invoice Dialog) - نظام السجل (LegalOS)
 * الموجة الرابعة من T-053.
 *
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
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useOrg, useResource } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import { ApiError } from "@/lib/api";
import { useFormat } from "@/lib/i18n/format";
import { todayIso, type ISODateString } from "@/lib/practice";
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
      <DialogHeader
        title={t("@legalos.billing.create.title")}
        onOpenChange={onOpenChange}
      />
      <DialogContent className="flex flex-col gap-5">
        <InlineError message={error} onDismiss={() => setError(null)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label={t("@legalos.billing.create.clientLabel")}
            value={clientId ?? ""}
            onChange={(e) => {
              setClientId(e.target.value || null);
              setMatterId(null);
            }}
          >
            <option value="">
              {clients.loading
                ? t("@legalos.billing.dialog.loadingPlaceholder")
                : t("@legalos.billing.create.clientPlaceholder")}
            </option>
            {(clients.data ?? []).map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label={t("@legalos.billing.create.matterLabel")}
            value={matterId ?? ""}
            onChange={(e) => setMatterId(e.target.value || null)}
            disabled={!clientId}
          >
            <option value="">
              {!clientId
                ? t("@legalos.billing.create.matterPlaceholderNoClient")
                : t("@legalos.billing.create.matterPlaceholder")}
            </option>
            {(matters.data ?? []).map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            type="date"
            label={t("@legalos.billing.create.issuedLabel")}
            value={issuedDate}
            onChange={(e) => setIssuedDate((e.target.value as ISODateString) || issuedDate)}
          />
          <Input
            type="date"
            label={t("@legalos.billing.create.dueLabel")}
            value={dueDate}
            onChange={(e) => setDueDate((e.target.value as ISODateString) || dueDate)}
          />
          <Input
            type="text"
            label={t("@legalos.billing.create.numberLabel")}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={t("@legalos.billing.create.numberPlaceholder")}
            helperText={t("@legalos.billing.create.numberHint")}
          />
        </div>

        <div className="border-t" style={{ borderColor: "var(--border)" }} />

        {/* --- بنود الفاتورة -------------------------------------------- */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
            {t("@legalos.billing.create.linesHeading")}
          </span>

          {lines.map((line) => {
            const priced = totalsOf([line]);
            return (
              <div key={line.key} className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-[180px]">
                  <Input
                    label={t("@legalos.billingDetail.column.description")}
                    value={line.description}
                    onChange={(e) => updateLine(line.key, { description: e.target.value })}
                    placeholder={t("@legalos.billing.create.line.descriptionPlaceholder")}
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    label={t("@legalos.billing.create.line.quantity")}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 0 })}
                    min={0}
                    step={0.25}
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    label={t("@legalos.billing.create.line.unitAmount")}
                    value={line.unitAmount}
                    onChange={(e) =>
                      updateLine(line.key, {
                        unitAmount: e.target.value === "" ? "" : Number(e.target.value) || 0,
                      })
                    }
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    label={t("@legalos.billing.create.line.taxPercent")}
                    value={line.taxRatePercent}
                    onChange={(e) =>
                      updateLine(line.key, { taxRatePercent: Number(e.target.value) || 0 })
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="flex flex-col gap-1 w-24 pb-2 shrink-0">
                  <span className="text-xs" style={{ color: "var(--text2)" }}>
                    {t("@legalos.billing.create.line.total")}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {formatEGPExact(fromPiastres(priced.subtotal))}
                  </span>
                </div>
                <div className="pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={lines.length === 1}
                    onClick={() => removeLine(line.key)}
                    aria-label={t("@legalos.billing.create.line.remove")}
                  >
                    <Icon name="delete" size={16} />
                  </Button>
                </div>
              </div>
            );
          })}

          <div>
            <Button
              variant="secondary"
              size="sm"
              startIcon={<Icon name="add" size={16} />}
              onClick={() => setLines((current) => [...current, blankLine()])}
            >
              {t("@legalos.billing.create.line.add")}
            </Button>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--border)" }} />

        {/* --- الإجماليات ----------------------------------------------- */}
        <div className="flex justify-end">
          <div className="flex flex-col gap-1.5 w-64 text-xs">
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--text2)" }}>
                {t("@legalos.billingDetail.linesTotal")}
              </span>
              <span style={{ color: "var(--text)" }}>
                {formatEGPExact(fromPiastres(totals.subtotal))}
              </span>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text2)" }}>
                  {t("@legalos.billing.create.tax")}
                </span>
                <span style={{ color: "var(--text)" }}>
                  {formatEGPExact(fromPiastres(totals.tax))}
                </span>
              </div>
            )}
            <div
              className="flex justify-between items-center text-sm font-bold pt-1.5 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <span style={{ color: "var(--text)" }}>
                {t("@legalos.billingDetail.invoiceTotal")}
              </span>
              <span style={{ color: "var(--text)" }}>
                {formatEGPExact(fromPiastres(totals.total))}
              </span>
            </div>
          </div>
        </div>

        <Textarea
          label={t("@legalos.billing.create.notesLabel")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("@legalos.billing.create.notesPlaceholder")}
        />
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.billing.dialog.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={!canSubmit}
          onClick={submit}
        >
          {saving ? t("@legalos.billing.create.saving") : t("@legalos.billing.create.save")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
