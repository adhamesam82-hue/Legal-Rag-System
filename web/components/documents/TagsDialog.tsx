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
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useOrg } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import type { DocumentTag } from "@/lib/practice";

const TAG_COLOR_SCHEMES: Record<DocumentTag["color"], { bg: string; fg: string; border: string }> = {
  blue: { bg: "var(--info-soft)", fg: "var(--info)", border: "var(--info)" },
  cyan: { bg: "var(--info-soft)", fg: "var(--info)", border: "var(--border)" },
  green: { bg: "var(--success-soft)", fg: "var(--success)", border: "var(--success)" },
  orange: { bg: "var(--accent-soft)", fg: "var(--accent)", border: "var(--accent)" },
  pink: { bg: "var(--warn-soft)", fg: "var(--danger)", border: "var(--border)" },
  purple: { bg: "var(--primary-soft)", fg: "var(--primary)", border: "var(--primary)" },
  red: { bg: "var(--danger-soft)", fg: "var(--danger)", border: "var(--danger)" },
  teal: { bg: "var(--success-soft)", fg: "var(--success)", border: "var(--border)" },
  yellow: { bg: "var(--warn-soft)", fg: "var(--warn)", border: "var(--warn)" },
};

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
  const scheme = TAG_COLOR_SCHEMES[tag.color] || {
    bg: "var(--surface2)",
    fg: "var(--text)",
    border: "var(--border)",
  };

  return (
    <span
      className="inline-flex items-center gap-1 font-medium transition-colors"
      style={{
        backgroundColor: scheme.bg,
        color: scheme.fg,
        borderColor: scheme.border,
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "var(--rs)",
        fontSize: size === "sm" ? "11px" : "12px",
        padding: size === "sm" ? "1px 6px" : "2px 8px",
        lineHeight: 1.4,
      }}
    >
      <span>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 focus:outline-none flex items-center justify-center -me-0.5"
          aria-label={`Remove ${tag.name}`}
          style={{ color: "inherit" }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
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
  const unselectedTags = tags.filter((tag) => !chosen.includes(String(tag.id)));

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={480}>
      <DialogHeader
        title={t("@legalos.documents.tags.dialogTitle")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <p className="text-sm line-clamp-2" style={{ color: "var(--text2)" }}>
            {documentName}
          </p>
          <InlineError message={error} onDismiss={() => setError(null)} />
          {tags.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              {t("@legalos.documents.tags.noneDefined")}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {unselectedTags.length > 0 && (
                <Select
                  label={t("@legalos.documents.tags.pickLabel")}
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !chosen.includes(val)) {
                      setChosen([...chosen, val]);
                    }
                  }}
                  options={[
                    { value: "", label: t("@legalos.documents.tags.pickPlaceholder") },
                    ...unselectedTags.map((tag) => ({ value: String(tag.id), label: tag.name })),
                  ]}
                />
              )}

              {/* The selection again as coloured chips, so the colour the
                  firm chose is visible while choosing, and removable here. */}
              {chosen.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                    {t("@legalos.documents.tree.group.tags")} ({chosen.length})
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-md border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}>
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
                  </div>
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: "var(--text3)" }}>
                  {t("@legalos.documents.tags.pickPlaceholder")}
                </p>
              )}
            </div>
          )}
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
            disabled={tags.length === 0}
            onClick={save}
          >
            {t("@legalos.documents.tags.save")}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
