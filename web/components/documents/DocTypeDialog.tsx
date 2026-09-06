"use client";

/**
 * Change what a document IS (T-032): a design-system dialog with the eleven
 * types from T-025 -- explicitly not the browser's prompt(), which the spec
 * names as the thing to remove.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
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
      <DialogHeader
        title={t("@legalos.documents.type.dialogTitle")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <p className="text-sm line-clamp-2" style={{ color: "var(--text2)" }}>
            {documentName}
          </p>
          <InlineError message={error} onDismiss={() => setError(null)} />
          <Select
            label={t("@legalos.documents.field.type")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            options={DOC_TYPES.map((type) => ({ value: type, label: docTypeLabel(type) }))}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t("@legalos.documents.tags.cancel")}
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={value === current || saving}
            onClick={save}
          >
            {t("@legalos.documents.tags.save")}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
