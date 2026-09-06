"use client";

/**
 * Custom fields on this matter.
 *
 * The list is driven by the firm's definitions, not by which values happen to
 * exist: a field nobody has filled in still has to show, or it can never be
 * filled in. Values are written on blur rather than behind a Save button —
 * there is no partial state worth batching, and a per-field write is what the
 * API models.
 */

import React, { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { useOrg } from "@/lib/org";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import {
  type CustomFieldType,
  type CustomFieldValue,
  MATTER_TYPES,
} from "@/lib/practice";
import { Panel, lines, useWrite, type TabProps } from "./shared";

const FIELD_TYPES: CustomFieldType[] = [
  "text",
  "number",
  "date",
  "checkbox",
  "select",
];

export function CustomFieldsTab({ data, reload, onError }: TabProps) {
  const t = useTranslator();
  const { role } = useOrg();
  const [isDefining, setIsDefining] = useState(false);

  return (
    <>
      <Panel
        title={t("@legalos.matterWorkspace.customFields.heading")}
        action={
          role !== "lawyer" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDefining(true)}
            >
              {t("@legalos.matterWorkspace.customFields.manage")}
            </Button>
          ) : undefined
        }
      >
        {data.customFields.length === 0 ? (
          <EmptyState
            icon={<Icon name="tune" size={24} />}
            title={t("@legalos.matterWorkspace.customFields.emptyTitle")}
            description={t(
              "@legalos.matterWorkspace.customFields.emptyDescription",
            )}
            action={
              role !== "lawyer" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDefining(true)}
                >
                  {t("@legalos.matterWorkspace.customFields.manage")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-4 divide-y" style={{ borderColor: "var(--border)" }}>
            {data.customFields.map((field) => (
              <FieldRow
                key={field.definition_id}
                field={field}
                matterId={data.matter.id}
                canDelete={role !== "lawyer"}
                reload={reload}
                onError={onError}
              />
            ))}
          </div>
        )}
      </Panel>

      <DefineFieldDialog
        isOpen={isDefining}
        onOpenChange={setIsDefining}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function FieldRow({
  field,
  matterId,
  canDelete,
  reload,
  onError,
}: {
  field: CustomFieldValue;
  matterId: number;
  canDelete: boolean;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [draft, setDraft] = useState(field.value ?? "");

  function save(value: string | null) {
    if (!practice) return;
    write(
      () => practice.matters.setCustomField(matterId, field.definition_id, value),
      "@legalos.matterWorkspace.errors.customField",
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-3 first:pt-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
            {field.label}
          </span>
          {field.is_required && (
            <Badge color="neutral" variant="soft" size="sm">
              {t("@legalos.matterWorkspace.customFields.requiredTag")}
            </Badge>
          )}
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              write(
                () => practice!.customFields.remove(field.definition_id),
                "@legalos.matterWorkspace.errors.customField",
              )
            }
          >
            {t("@legalos.matterWorkspace.customFields.deleteField")}
          </Button>
        )}
      </div>

      {field.field_type === "checkbox" ? (
        <Switch
          label={field.label}
          checked={field.value === "true"}
          onChange={(next) => save(next ? "true" : "false")}
        />
      ) : field.field_type === "select" ? (
        <Select
          value={field.value ?? ""}
          onChange={(e) => save(e.target.value || null)}
          options={[
            { value: "", label: t("@legalos.matterWorkspace.customFields.notSet") },
            ...field.options.map((option) => ({
              value: option,
              label: option,
            })),
          ]}
        />
      ) : field.field_type === "date" ? (
        <Input
          type="date"
          value={field.value ?? ""}
          onChange={(e) => save(e.target.value || null)}
        />
      ) : (
        <Input
          type={field.field_type === "number" ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Written when focus leaves rather than on every keystroke: one
          // request per edit, not one per character.
          onBlur={() => draft !== (field.value ?? "") && save(draft)}
          placeholder={t("@legalos.matterWorkspace.customFields.notSet")}
        />
      )}
    </div>
  );
}

function DefineFieldDialog({
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
  const enumLabel = useEnumLabel();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [label, setLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);
  const [matterType, setMatterType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Derives a valid key from the label so nobody has to invent one by hand. */
  function onLabelChange(next: string) {
    setLabel(next);
    setFieldKey(
      next
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80),
    );
  }

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.customFields.create({
          field_key: fieldKey,
          label: label.trim(),
          field_type: fieldType,
          options: fieldType === "select" ? lines(options) : [],
          is_required: required,
          matter_type: matterType,
        }),
      "@legalos.matterWorkspace.errors.customField",
    );
    setSaving(false);
    if (ok) {
      setLabel("");
      setFieldKey("");
      setOptions("");
      onOpenChange(false);
    }
  }

  const canSubmit =
    label.trim().length > 0 &&
    /^[a-z0-9_]+$/.test(fieldKey) &&
    (fieldType !== "select" || lines(options).length > 0);

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <DialogHeader
        title={t("@legalos.matterWorkspace.customFields.define.heading")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <Input
            label={t("@legalos.matterWorkspace.customFields.define.label")}
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            required
          />
          <Input
            label={t("@legalos.matterWorkspace.customFields.define.key")}
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
            helperText={t("@legalos.matterWorkspace.customFields.define.keyHint")}
          />
          <Select
            label={t("@legalos.matterWorkspace.customFields.define.type")}
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
            options={FIELD_TYPES.map((value) => ({
              value,
              label: t(`@legalos.matterWorkspace.customFields.type.${value}`),
            }))}
          />
          {fieldType === "select" && (
            <Textarea
              label={t("@legalos.matterWorkspace.customFields.define.options")}
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              rows={3}
              placeholder={t(
                "@legalos.matterWorkspace.customFields.define.optionsPlaceholder",
              )}
            />
          )}
          <Select
            label={t("@legalos.matterWorkspace.customFields.define.appliesTo")}
            value={matterType ?? ""}
            onChange={(e) => setMatterType(e.target.value || null)}
            options={[
              { value: "", label: t("@legalos.matterWorkspace.customFields.define.allTypes") },
              ...MATTER_TYPES.map((value) => ({
                value,
                label: enumLabel(value),
              })),
            ]}
          />
          <Switch
            label={t("@legalos.matterWorkspace.customFields.define.required")}
            checked={required}
            onChange={setRequired}
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
          disabled={!canSubmit}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.action.save")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
