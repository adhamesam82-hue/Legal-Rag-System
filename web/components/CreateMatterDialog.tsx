"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { useTranslator } from "@astryxdesign/core/i18n";
import { memberLabel, useOrg, useResource } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import {
  todayIso,
  type ISODateString,
  type MatterType,
  MATTER_TYPES,
} from "@/lib/practice";

const MATTER_TYPE_KEY = (type: MatterType) => `@legalos.enum.${type}`;

export interface CreateMatterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateMatterDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: CreateMatterDialogProps) {
  const { practice, members } = useOrg();
  const t = useTranslator();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [matterType, setMatterType] = useState<MatterType>("civil");
  const [billingType, setBillingType] = useState("hourly");
  const [responsible, setResponsible] = useState<string | null>(null);
  const [staff, setStaff] = useState<string[]>([]);
  const [openedDate, setOpenedDate] = useState<ISODateString>(todayIso);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clients = useResource(
    (api) => (isOpen ? api.clients.list() : Promise.resolve([])),
    [isOpen],
  );

  async function submit() {
    if (!practice || !name.trim() || !clientId || !responsible) return;
    setSaving(true);
    setError(null);
    try {
      await practice.matters.create({
        name: name.trim(),
        client_id: Number(clientId),
        matter_type: matterType,
        billing_type: billingType,
        responsible_user: responsible,
        staff: Array.from(new Set([responsible, ...staff])),
        opened_date: openedDate,
        description,
      });
      setName("");
      setDescription("");
      setClientId(null);
      setStaff([]);
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.matters.dialog.error"));
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(name.trim() && clientId && responsible && openedDate);
  const availableStaff = members.filter((m) => m.clerk_user_id !== responsible);

  const toggleStaffMember = (userId: string) => {
    setStaff((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={540}>
      <DialogHeader
        title={t("@legalos.matters.newMatter")}
        onOpenChange={onOpenChange}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <DialogContent>
          <div className="flex flex-col gap-4">
            <InlineError message={error} onDismiss={() => setError(null)} />
            <Input
              label={t("@legalos.matters.dialog.nameLabel")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("@legalos.matters.dialog.namePlaceholder")}
              required
            />
            <Select
              label={t("@legalos.matters.field.client")}
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value || null)}
              required
              options={[
                {
                  value: "",
                  label: clients.loading
                    ? t("@legalos.matters.dialog.clientsLoading")
                    : t("@legalos.matters.dialog.selectClient"),
                },
                ...(clients.data ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.name,
                })),
              ]}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label={t("@legalos.matters.field.type")}
                value={matterType}
                onChange={(e) => setMatterType((e.target.value as MatterType) ?? "civil")}
                options={MATTER_TYPES.map((type) => ({
                  value: type,
                  label: t(MATTER_TYPE_KEY(type)),
                }))}
              />
              <Select
                label={t("@legalos.matters.field.billing")}
                value={billingType}
                onChange={(e) => setBillingType(e.target.value || "hourly")}
                options={[
                  { value: "hourly", label: t("@legalos.matters.billing.hourly") },
                  { value: "fixed_fee", label: t("@legalos.matters.billing.fixedFee") },
                  { value: "retainer", label: t("@legalos.matters.billing.retainer") },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label={t("@legalos.matters.field.responsible")}
                value={responsible ?? ""}
                onChange={(e) => setResponsible(e.target.value || null)}
                required
                options={[
                  { value: "", label: t("@legalos.matters.dialog.selectLawyer") },
                  ...members.map((m) => ({
                    value: m.clerk_user_id,
                    label: memberLabel(m),
                  })),
                ]}
              />
              <Input
                type="date"
                label={t("@legalos.matters.field.opened")}
                value={openedDate}
                onChange={(e) => setOpenedDate((e.target.value || todayIso) as ISODateString)}
                required
              />
            </div>

            {/* Staff Multi-Select */}
            {availableStaff.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                  {t("@legalos.matters.field.staff")}
                </label>
                <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                  {t("@legalos.matters.field.staffHint")}
                </span>
                <div
                  className="flex flex-col gap-1 p-2 rounded-lg border max-h-32 overflow-y-auto"
                  style={{
                    backgroundColor: "var(--surface2)",
                    borderColor: "var(--border)",
                    borderRadius: "var(--rs)",
                  }}
                >
                  {availableStaff.map((m) => {
                    const isChecked = staff.includes(m.clerk_user_id);
                    return (
                      <label
                        key={m.clerk_user_id}
                        className="flex items-center gap-2 p-1 text-xs rounded hover:bg-[var(--surface3)] cursor-pointer select-none"
                        style={{ color: "var(--text)" }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleStaffMember(m.clerk_user_id)}
                        />
                        <span>{memberLabel(m)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                {t("@legalos.matters.field.description")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs outline-none transition-all resize-y border"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--rs)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              {t("@legalos.matters.dialog.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving || !canSave}
            >
              {t("@legalos.matters.dialog.submit")}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
