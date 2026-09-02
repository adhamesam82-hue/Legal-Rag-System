"use client";

/**
 * Shared chrome for the settings screen's sections (T-034).
 *
 * Each section saves independently -- a single button for fifty fields
 * across seven sections would make every save a gamble that some unrelated
 * field elsewhere on the page did not just get overwritten. This wrapper
 * only supplies the card, the title, the error/saved banners and the
 * footer; each section keeps its own field state and decides what belongs
 * in its own PATCH body.
 */

import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
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
    <Card>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={5}>{title}</Heading>
          {description && (
            <Text type="body" color="secondary">
              {description}
            </Text>
          )}
        </VStack>

        <InlineError message={error} onDismiss={onDismissError} />
        {saved && !dirty && (
          <Banner
            status="success"
            title={savedMessage}
            isDismissable
            onDismiss={onDismissSaved}
          />
        )}
        {!canEdit && readOnlyMessage && <Banner status="info" title={readOnlyMessage} />}

        <Divider />

        {children}

        {canEdit && (
          <HStack gap={2} hAlign="end">
            <Button
              label={t("@legalos.settings.action.cancel")}
              variant="secondary"
              isDisabled={saving || !dirty}
              onClick={onCancel}
            />
            <Button
              label={
                saving ? t("@legalos.settings.firm.saving") : t("@legalos.settings.action.saveChanges")
              }
              variant="primary"
              isDisabled={saving || !(canSave ?? dirty)}
              onClick={onSave}
            />
          </HStack>
        )}
      </VStack>
    </Card>
  );
}
