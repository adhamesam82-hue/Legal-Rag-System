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

import { useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Divider } from "@astryxdesign/core/Divider";
import { useTranslator } from "@astryxdesign/core/i18n";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { useOrg } from "@/lib/org";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import {
  type CustomFieldType,
  type CustomFieldValue,
  type ISODateString,
  type MatterType,
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
              label={t("@legalos.matterWorkspace.customFields.manage")}
              variant="secondary"
              size="sm"
              onClick={() => setIsDefining(true)}
            />
          ) : undefined
        }
      >
        {data.customFields.length === 0 ? (
          <EmptyState
            icon={
              <Icon icon={AdjustmentsHorizontalIcon} size="lg" color="secondary" />
            }
            title={t("@legalos.matterWorkspace.customFields.emptyTitle")}
            description={t(
              "@legalos.matterWorkspace.customFields.emptyDescription",
            )}
            actions={
              role !== "lawyer" ? (
                <Button
                  label={t("@legalos.matterWorkspace.customFields.manage")}
                  variant="secondary"
                  onClick={() => setIsDefining(true)}
                />
              ) : undefined
            }
          />
        ) : (
          <VStack gap={5}>
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
          </VStack>
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
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
        <HStack gap={2} vAlign="center">
          <Text type="body" weight="semibold">
            {field.label}
          </Text>
          {field.is_required && (
            <Badge
              variant="neutral"
              label={t("@legalos.matterWorkspace.customFields.requiredTag")}
            />
          )}
        </HStack>
        {canDelete && (
          <Button
            label={t("@legalos.matterWorkspace.customFields.deleteField")}
            variant="ghost"
            size="sm"
            onClick={() =>
              write(
                () => practice!.customFields.remove(field.definition_id),
                "@legalos.matterWorkspace.errors.customField",
              )
            }
          />
        )}
      </HStack>

      {field.field_type === "checkbox" ? (
        <Switch
          label={field.label}
          isLabelHidden
          value={field.value === "true"}
          onChange={(next) => save(next ? "true" : "false")}
        />
      ) : field.field_type === "select" ? (
        <Selector
          label={field.label}
          isLabelHidden
          value={field.value}
          placeholder={t("@legalos.matterWorkspace.customFields.notSet")}
          onChange={(value) => save(value)}
          hasClear
          options={field.options.map((option) => ({
            value: option,
            label: option,
          }))}
        />
      ) : field.field_type === "date" ? (
        <DateInput
          label={field.label}
          isLabelHidden
          value={(field.value as ISODateString) ?? null}
          onChange={(value) => save(value ?? null)}
        />
      ) : (
        <TextInput
          label={field.label}
          isLabelHidden
          value={draft}
          onChange={setDraft}
          // Written when focus leaves rather than on every keystroke: one
          // request per edit, not one per character.
          onBlur={() => draft !== (field.value ?? "") && save(draft)}
          placeholder={t("@legalos.matterWorkspace.customFields.notSet")}
        />
      )}
      <Divider />
    </VStack>
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
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.customFields.define.heading")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <TextInput
                label={t("@legalos.matterWorkspace.customFields.define.label")}
                value={label}
                onChange={onLabelChange}
                isRequired
              />
              <TextInput
                label={t("@legalos.matterWorkspace.customFields.define.key")}
                value={fieldKey}
                onChange={setFieldKey}
                description={t(
                  "@legalos.matterWorkspace.customFields.define.keyHint",
                )}
              />
              <Selector
                label={t("@legalos.matterWorkspace.customFields.define.type")}
                value={fieldType}
                onChange={(value) => setFieldType(value as CustomFieldType)}
                options={FIELD_TYPES.map((value) => ({
                  value,
                  label: t(`@legalos.matterWorkspace.customFields.type.${value}`),
                }))}
              />
              {fieldType === "select" && (
                <TextArea
                  label={t("@legalos.matterWorkspace.customFields.define.options")}
                  value={options}
                  onChange={setOptions}
                  rows={3}
                  placeholder={t(
                    "@legalos.matterWorkspace.customFields.define.optionsPlaceholder",
                  )}
                />
              )}
              <Selector
                label={t("@legalos.matterWorkspace.customFields.define.appliesTo")}
                value={matterType}
                onChange={setMatterType}
                hasClear
                placeholder={t(
                  "@legalos.matterWorkspace.customFields.define.allTypes",
                )}
                options={MATTER_TYPES.map((value) => ({
                  value,
                  label: enumLabel(value),
                }))}
              />
              <Switch
                label={t("@legalos.matterWorkspace.customFields.define.required")}
                value={required}
                onChange={setRequired}
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
                isDisabled={saving || !canSubmit}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
