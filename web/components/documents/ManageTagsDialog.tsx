"use client";

/**
 * The firm's tag list, managed from inside the app (T-032): create, rename,
 * recolour, delete. The list belongs to the firm, not to the product -- the
 * eight seeded names are suggestions the firm may keep, rename or drop.
 *
 * Deleting a tag that is on documents asks first, and the question says HOW
 * MANY documents lose it. A silent delete of a classification on fifty files
 * is real work lost. The documents themselves are untouched either way
 * (the join rows go, the files stay -- T-025).
 *
 * Colours are palette names the design system guarantees contrast for on
 * both themes; there is no free hex input.
 */

import { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Divider } from "@astryxdesign/core/Divider";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useOrg } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import { ApiError } from "@/lib/api";
import type { DocumentTag } from "@/lib/practice";
import { TagToken } from "./TagsDialog";

const COLORS: DocumentTag["color"][] = [
  "blue", "cyan", "green", "orange", "pink", "purple", "red", "teal", "yellow",
];

export function ManageTagsDialog({
  isOpen,
  onOpenChange,
  tags,
  onChanged,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tags: DocumentTag[];
  /** Tags changed on the server; the caller refetches. */
  onChanged: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One row edits at a time; the others show as chips.
  const [editing, setEditing] = useState<DocumentTag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<DocumentTag["color"]>("blue");
  const [confirmDelete, setConfirmDelete] = useState<DocumentTag | null>(null);
  // The create form.
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<DocumentTag["color"]>("blue");

  const colorOptions = COLORS.map((value) => ({
    value,
    label: t(`@legalos.documents.tags.color.${value}`),
  }));

  function describe(exc: unknown): string {
    if (exc instanceof ApiError && exc.status === 409) return t("@legalos.documents.tags.duplicate");
    return exc instanceof Error ? exc.message : t("@legalos.documents.tags.saveFailed");
  }

  async function run(action: () => Promise<unknown>) {
    if (!practice) return false;
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
      return true;
    } catch (exc) {
      setError(describe(exc));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (await run(() => practice!.documentTags.create({ name: trimmed, color: newColor }))) {
      setNewName("");
    }
  }

  function startEdit(tag: DocumentTag) {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color);
  }

  async function saveEdit() {
    if (!editing) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = editing.id;
    if (await run(() => practice!.documentTags.update(id, { name: trimmed, color }))) {
      setEditing(null);
    }
  }

  async function remove(tag: DocumentTag) {
    if (await run(() => practice!.documentTags.remove(tag.id))) {
      setConfirmDelete(null);
    }
  }

  return (
    <>
      <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={560}>
        <Layout
          header={<DialogHeader title={t("@legalos.documents.tags.manageTitle")} onOpenChange={onOpenChange} />}
          content={
            <LayoutContent>
              <VStack gap={4}>
                <InlineError message={error} onDismiss={() => setError(null)} />

                {/* --- create ------------------------------------------ */}
                <HStack gap={2} vAlign="end" wrap="wrap">
                  <TextInput
                    label={t("@legalos.documents.tags.newName")}
                    value={newName}
                    onChange={setNewName}
                    placeholder={t("@legalos.documents.tags.newNamePlaceholder")}
                    width={220}
                    onEnter={create}
                  />
                  <Selector
                    label={t("@legalos.documents.tags.colorLabel")}
                    value={newColor}
                    onChange={(value) => setNewColor(value as DocumentTag["color"])}
                    options={colorOptions}
                    width={150}
                  />
                  <Button
                    label={t("@legalos.documents.tags.add")}
                    variant="primary"
                    icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                    isDisabled={busy || !newName.trim()}
                    onClick={create}
                  />
                </HStack>

                <Divider />

                {/* --- the list ---------------------------------------- */}
                {tags.length === 0 ? (
                  <Text type="body" color="secondary">
                    {t("@legalos.documents.tags.noneDefined")}
                  </Text>
                ) : (
                  <VStack gap={2}>
                    {tags.map((tag) =>
                      editing?.id === tag.id ? (
                        <HStack key={tag.id} gap={2} vAlign="end" wrap="wrap">
                          <TextInput
                            label={t("@legalos.documents.tags.rename")}
                            isLabelHidden
                            value={name}
                            onChange={setName}
                            width={220}
                            hasAutoFocus
                            onEnter={saveEdit}
                          />
                          <Selector
                            label={t("@legalos.documents.tags.colorLabel")}
                            isLabelHidden
                            value={color}
                            onChange={(value) => setColor(value as DocumentTag["color"])}
                            options={colorOptions}
                            width={150}
                          />
                          <Button
                            label={t("@legalos.documents.tags.save")}
                            variant="primary"
                            size="sm"
                            isDisabled={busy || !name.trim()}
                            onClick={saveEdit}
                          />
                          <Button
                            label={t("@legalos.documents.tags.cancel")}
                            variant="ghost"
                            size="sm"
                            isDisabled={busy}
                            onClick={() => setEditing(null)}
                          />
                        </HStack>
                      ) : (
                        <HStack key={tag.id} hAlign="between" vAlign="center" gap={3}>
                          <HStack gap={2} vAlign="center">
                            <TagToken tag={tag} size="md" />
                            <Text type="supporting" color="secondary">
                              {t("@legalos.documents.tags.onDocuments", { count: tag.document_count })}
                            </Text>
                          </HStack>
                          <HStack gap={1}>
                            <Button
                              label={t("@legalos.documents.tags.rename")}
                              variant="ghost"
                              size="sm"
                              icon={<Icon icon={PencilIcon} size="sm" color="inherit" />}
                              isDisabled={busy}
                              onClick={() => startEdit(tag)}
                            />
                            <Button
                              label={t("@legalos.documents.tags.delete")}
                              variant="ghost"
                              size="sm"
                              icon={<Icon icon={TrashIcon} size="sm" color="inherit" />}
                              isDisabled={busy}
                              // A tag on no document goes without a question;
                              // one that is in use asks, with the number.
                              onClick={() => (tag.document_count > 0 ? setConfirmDelete(tag) : remove(tag))}
                            />
                          </HStack>
                        </HStack>
                      ),
                    )}
                  </VStack>
                )}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack hAlign="end">
                <Button label={t("@legalos.documents.tags.done")} variant="secondary" onClick={() => onOpenChange(false)} />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

      {/* --- delete confirmation, with the count ------------------------ */}
      <Dialog
        isOpen={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        purpose="form"
        width={420}
      >
        <Layout
          header={
            <DialogHeader
              title={t("@legalos.documents.tags.deleteTitle", { name: confirmDelete?.name ?? "" })}
              onOpenChange={(open) => !open && setConfirmDelete(null)}
            />
          }
          content={
            <LayoutContent>
              <Text type="body">
                {t("@legalos.documents.tags.deleteBody", { count: confirmDelete?.document_count ?? 0 })}
              </Text>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack hAlign="end" gap={2}>
                <Button
                  label={t("@legalos.documents.tags.cancel")}
                  variant="secondary"
                  isDisabled={busy}
                  onClick={() => setConfirmDelete(null)}
                />
                <Button
                  label={t("@legalos.documents.tags.deleteConfirm")}
                  variant="destructive"
                  isLoading={busy}
                  onClick={() => confirmDelete && remove(confirmDelete)}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
