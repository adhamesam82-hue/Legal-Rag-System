"use client";

/**
 * Change what a document IS (T-032): a design-system dialog with the eleven
 * types from T-025 -- explicitly not the browser's prompt(), which the spec
 * names as the thing to remove.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { useOrg } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import { useDocTypeLabel } from "@/lib/i18n/enum-label";
import { DOC_TYPES } from "@/lib/practice";

export function DocTypeDialog({
  isOpen,
  onOpenChange,
  documentId,
  documentName,
  current,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
  documentName: string;
  current: string;
  onSaved: () => void;
}) {
  const t = useTranslator();
  const docTypeLabel = useDocTypeLabel();
  const { practice } = useOrg();
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(current);
      setError(null);
    }
  }, [isOpen, current]);

  async function save() {
    if (!practice) return;
    setSaving(true);
    setError(null);
    try {
      await practice.documents.update(documentId, { doc_type: value });
      onOpenChange(false);
      onSaved();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.documents.type.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={420}>
      <Layout
        header={<DialogHeader title={t("@legalos.documents.type.dialogTitle")} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Text type="body" color="secondary" maxLines={2}>
                {documentName}
              </Text>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <Selector
                label={t("@legalos.documents.field.type")}
                value={value}
                onChange={setValue}
                options={DOC_TYPES.map((type) => ({ value: type, label: docTypeLabel(type) }))}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack hAlign="end" gap={2}>
              <Button
                label={t("@legalos.documents.tags.cancel")}
                variant="secondary"
                isDisabled={saving}
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={t("@legalos.documents.tags.save")}
                variant="primary"
                isLoading={saving}
                isDisabled={value === current}
                onClick={save}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
