"use client";

/**
 * Put tags on one document (T-032). A dialog rather than an inline control
 * because it is reached from a table row, a card and the detail page alike,
 * and one picker in one place behaves the same in all three.
 *
 * PUT replaces the whole set (T-025), so the dialog holds the full selection
 * and sends it once on save. Every tag is shown by name AND colour -- a colour
 * alone is not a label (spec §6).
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Token } from "@astryxdesign/core/Token";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { useOrg } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import type { DocumentTag } from "@/lib/practice";

/** The tag as a chip: colour and name together, never colour alone. */
export function TagToken({
  tag,
  size = "sm",
  onRemove,
}: {
  tag: DocumentTag;
  size?: "sm" | "md";
  onRemove?: () => void;
}) {
  return <Token label={tag.name} size={size} color={tag.color} onRemove={onRemove} />;
}

export function TagsDialog({
  isOpen,
  onOpenChange,
  documentId,
  documentName,
  tags,
  selected,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
  documentName: string;
  tags: DocumentTag[];
  selected: number[];
  onSaved: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const [chosen, setChosen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to the document's current tags each time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setChosen(selected.map(String));
      setError(null);
    }
  }, [isOpen, selected]);

  async function save() {
    if (!practice) return;
    setSaving(true);
    setError(null);
    try {
      await practice.documents.setTags(documentId, chosen.map(Number));
      onOpenChange(false);
      onSaved();
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : t("@legalos.documents.tags.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const byId = new Map(tags.map((tag) => [String(tag.id), tag]));

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={480}>
      <Layout
        header={<DialogHeader title={t("@legalos.documents.tags.dialogTitle")} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Text type="body" color="secondary" maxLines={2}>
                {documentName}
              </Text>
              <InlineError message={error} onDismiss={() => setError(null)} />
              {tags.length === 0 ? (
                <Text type="body" color="secondary">
                  {t("@legalos.documents.tags.noneDefined")}
                </Text>
              ) : (
                <>
                  <MultiSelector
                    label={t("@legalos.documents.tags.pickLabel")}
                    value={chosen}
                    onChange={setChosen}
                    options={tags.map((tag) => ({ value: String(tag.id), label: tag.name }))}
                    placeholder={t("@legalos.documents.tags.pickPlaceholder")}
                    hasSearch
                  />
                  {/* The selection again as coloured chips, so the colour the
                      firm chose is visible while choosing, and removable here. */}
                  {chosen.length > 0 && (
                    <HStack gap={1} wrap="wrap">
                      {chosen.map((id) => {
                        const tag = byId.get(id);
                        return tag ? (
                          <TagToken
                            key={id}
                            tag={tag}
                            size="md"
                            onRemove={() => setChosen((c) => c.filter((x) => x !== id))}
                          />
                        ) : null;
                      })}
                    </HStack>
                  )}
                </>
              )}
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
                isDisabled={tags.length === 0}
                onClick={save}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
