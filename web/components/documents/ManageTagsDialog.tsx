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
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
        <DialogHeader
          title={t("@legalos.documents.tags.manageTitle")}
          onOpenChange={onOpenChange}
        />
        <DialogContent>
          <div className="flex flex-col gap-4">
            <InlineError message={error} onDismiss={() => setError(null)} />

            {/* --- create ------------------------------------------ */}
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  label={t("@legalos.documents.tags.newName")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("@legalos.documents.tags.newNamePlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      create();
                    }
                  }}
                />
              </div>
              <div className="w-36">
                <Select
                  label={t("@legalos.documents.tags.colorLabel")}
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value as DocumentTag["color"])}
                  options={colorOptions}
                />
              </div>
              <Button
                variant="primary"
                disabled={busy || !newName.trim()}
                loading={busy}
                startIcon={<PlusIcon className="w-4 h-4" />}
                onClick={create}
              >
                {t("@legalos.documents.tags.add")}
              </Button>
            </div>

            <hr className="border-t" style={{ borderColor: "var(--border)" }} />

            {/* --- the list ---------------------------------------- */}
            {tags.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text2)" }}>
                {t("@legalos.documents.tags.noneDefined")}
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {tags.map((tag) =>
                  editing?.id === tag.id ? (
                    <div key={tag.id} className="flex items-end gap-2 flex-wrap p-2 rounded-md border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}>
                      <div className="flex-1 min-w-[160px]">
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoFocus
                          aria-label={t("@legalos.documents.tags.rename")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveEdit();
                            }
                          }}
                        />
                      </div>
                      <div className="w-32">
                        <Select
                          value={color}
                          onChange={(e) => setColor(e.target.value as DocumentTag["color"])}
                          options={colorOptions}
                          aria-label={t("@legalos.documents.tags.colorLabel")}
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busy || !name.trim()}
                        loading={busy}
                        onClick={saveEdit}
                      >
                        {t("@legalos.documents.tags.save")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setEditing(null)}
                      >
                        {t("@legalos.documents.tags.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-[var(--surface2)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TagToken tag={tag} size="md" />
                        <span className="text-xs" style={{ color: "var(--text2)" }}>
                          {t("@legalos.documents.tags.onDocuments", { count: tag.document_count })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => startEdit(tag)}
                          title={t("@legalos.documents.tags.rename")}
                        >
                          <PencilIcon className="w-4 h-4" />
                          <span className="sr-only">{t("@legalos.documents.tags.rename")}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => (tag.document_count > 0 ? setConfirmDelete(tag) : remove(tag))}
                          title={t("@legalos.documents.tags.delete")}
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span className="sr-only">{t("@legalos.documents.tags.delete")}</span>
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              {t("@legalos.documents.tags.done")}
            </Button>
          </div>
        </DialogFooter>
      </Dialog>

      {/* --- delete confirmation, with the count ------------------------ */}
      <Dialog
        isOpen={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        purpose="form"
        width={420}
      >
        <DialogHeader
          title={t("@legalos.documents.tags.deleteTitle", { name: confirmDelete?.name ?? "" })}
          onOpenChange={(open) => !open && setConfirmDelete(null)}
        />
        <DialogContent>
          <p className="text-sm" style={{ color: "var(--text)" }}>
            {t("@legalos.documents.tags.deleteBody", { count: confirmDelete?.document_count ?? 0 })}
          </p>
        </DialogContent>
        <DialogFooter>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirmDelete(null)}
            >
              {t("@legalos.documents.tags.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => confirmDelete && remove(confirmDelete)}
            >
              {t("@legalos.documents.tags.deleteConfirm")}
            </Button>
          </div>
        </DialogFooter>
      </Dialog>
    </>
  );
}
