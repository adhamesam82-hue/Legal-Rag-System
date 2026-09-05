"use client";

/**
 * Shared chrome for the settings screen's sections (T-034 / E-5).
 *
 * Each section saves independently -- a single button for fifty fields
 * across seven sections would make every save a gamble that some unrelated
 * field elsewhere on the page did not just get overwritten. This wrapper
 * only supplies the card, the title, the error/saved banners and the
 * footer; each section keeps its own field state and decides what belongs
 * in its own PATCH body.
 */

import React from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/DataState";

export function SettingsSection({
  title,
  description,
  error,
  onDismissError,
  saved,
  savedMessage,
  onDismissSaved,
  readOnlyMessage,
  children,
  canEdit,
  saving,
  dirty,
  canSave,
  onCancel,
  onSave,
}: {
  title: string;
  description?: string;
  error: string | null;
  onDismissError: () => void;
  saved: boolean;
  savedMessage: string;
  onDismissSaved: () => void;
  /** Shown instead of a footer when the caller cannot edit this section --
   *  a lawyer or staff member sees the section, not a 404, with a reason. */
  readOnlyMessage?: string;
  children: React.ReactNode;
  canEdit: boolean;
  saving: boolean;
  /** Whether anything differs from the server's copy. Cancel is enabled
   *  whenever this is true, even if the new value does not yet validate --
   *  discarding a bad value the user cannot fix is exactly when Cancel is
   *  needed most. */
  dirty: boolean;
  /** Whether Save may actually be pressed. Defaults to `dirty`; a section
   *  with its own client-side validation (a tax rate, a numbering pattern)
   *  passes `dirty && valid` here while leaving `dirty` alone, so a changed
   *  but invalid field can still be discarded. */
  canSave?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useTranslator();
  return (
    <Card padding="24px" bordered shadow className="w-full">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          {description && (
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {description}
            </p>
          )}
        </div>

        <InlineError message={error} onDismiss={onDismissError} />
        {saved && !dirty && (
          <Alert
            type="success"
            title={savedMessage}
            onClose={onDismissSaved}
          />
        )}
        {!canEdit && readOnlyMessage && (
          <Alert type="info" title={readOnlyMessage} />
        )}

        <div
          className="w-full border-t"
          style={{ borderColor: "var(--border)" }}
        />

        <div className="flex flex-col gap-4">
          {children}
        </div>

        {canEdit && (
          <div
            className="flex items-center justify-end gap-3 pt-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={saving || !dirty}
              onClick={onCancel}
            >
              {t("@legalos.settings.action.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              disabled={saving || !(canSave ?? dirty)}
              onClick={onSave}
            >
              {saving
                ? t("@legalos.settings.firm.saving")
                : t("@legalos.settings.action.saveChanges")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
