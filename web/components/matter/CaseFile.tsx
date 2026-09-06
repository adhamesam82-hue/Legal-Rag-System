"use client";

/**
 * The case file proper: what the matter is about, in the lawyer's words.
 *
 * Six text sections, each collapsible and each edited in place, then a
 * seventh for the same dispute before other courts (SubCases). Collapsible rather
 * than tabbed because a lawyer preparing for a hearing reads them in
 * sequence, not one at a time; and an empty section stays on screen saying
 * what belongs in it, because a section that hides itself when empty is a
 * place the lawyer never learns exists.
 *
 * The text lives on the matter's litigation case (migration 0022), so a
 * matter that holds no case yet has nowhere to write. That state is shown as
 * what it is rather than as six sections that would fail on save.
 */

import React, { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { useOrg } from "@/lib/org";
import type { CaseRecord } from "@/lib/practice";
import { Panel, useWrite, type TabProps } from "./shared";
import { SubCases } from "./SubCases";
import { CreateCaseDialog } from "./CreateCaseDialog";

/** The six fields, in reading order. Keys match the API columns. */
export const CASE_FILE_FIELDS = [
  "summary",
  "facts",
  "legal_basis",
  "defences",
  "procedural_posture",
  "client_narrative",
] as const;

export type CaseFileField = (typeof CASE_FILE_FIELDS)[number];

/** Every collapsible in the file: the six fields plus the related-cases section. */
const SECTIONS = [...CASE_FILE_FIELDS, "sub_cases"] as const;
type SectionKey = (typeof SECTIONS)[number];

const STORAGE_PREFIX = "legalos-casefile-open:";

/**
 * Which sections are open, remembered per matter in localStorage. A display
 * preference, not firm data, so it stays in the browser. Every read and write
 * is guarded: private windows and blocked storage throw, and the file must
 * still render.
 */
function useOpenSections(matterId: number) {
  const key = `${STORAGE_PREFIX}${matterId}`;
  const [open, setOpen] = useState<Record<SectionKey, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((f) => [f, true])) as Record<SectionKey, boolean>,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Record<SectionKey, boolean>>;
        setOpen((current) => ({ ...current, ...saved }));
      }
    } catch {
      // Storage unavailable: everything stays open.
    }
    setLoaded(true);
  }, [key]);

  function toggle(field: SectionKey, isOpen: boolean) {
    setOpen((current) => {
      const next = { ...current, [field]: isOpen };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Not persisted this time; the state still changes on screen.
      }
      return next;
    });
  }

  return { open, toggle, loaded };
}

export function CaseFile({ data, reload, onError }: TabProps) {
  const t = useTranslator();
  const linkedCase = data.linkedCase;
  const [createOpen, setCreateOpen] = useState(false);

  if (!linkedCase) {
    return (
      <Panel title={t("@legalos.matterWorkspace.caseFile.heading")}>
        <div className="flex flex-col items-start gap-4">
          <p className="text-xs m-0" style={{ color: "var(--text2)" }}>
            {t("@legalos.matterWorkspace.caseFile.noCase")}
          </p>
          <Button
            variant="primary"
            onClick={() => setCreateOpen(true)}
          >
            {t("@legalos.matterWorkspace.caseFile.createCase")}
          </Button>
          <CreateCaseDialog
            matterId={data.matter.id}
            isOpen={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={reload}
          />
        </div>
      </Panel>
    );
  }

  return (
    <CaseFileSections
      matterId={data.matter.id}
      linkedCase={linkedCase}
      reload={reload}
      onError={onError}
    />
  );
}

function CaseFileSections({
  matterId,
  linkedCase,
  reload,
  onError,
}: {
  matterId: number;
  linkedCase: CaseRecord;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { open, toggle, loaded } = useOpenSections(matterId);

  return (
    <Panel title={t("@legalos.matterWorkspace.caseFile.heading")}>
      <div className="flex flex-col gap-2">
        {CASE_FILE_FIELDS.map((field) => {
          const isOpen = loaded ? open[field] : true;
          return (
            <div
              key={field}
              className="rounded-md border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={() => toggle(field, !isOpen)}
                className="w-full flex items-center justify-between p-3 text-start transition-colors"
                style={{
                  backgroundColor: "var(--surface2)",
                  color: "var(--text)",
                }}
              >
                <h4 className="text-xs font-semibold m-0">
                  {t(`@legalos.matterWorkspace.caseFile.${field}`)}
                </h4>
                <Icon name={isOpen ? "expand_less" : "expand_more"} size={18} />
              </button>
              {isOpen && (
                <div className="p-4 border-t" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                  <Section
                    field={field}
                    caseId={linkedCase.id}
                    value={linkedCase[field]}
                    reload={reload}
                    onError={onError}
                  />
                </div>
              )}
            </div>
          );
        })}

        {(() => {
          const isSubCasesOpen = loaded ? open.sub_cases : true;
          return (
            <div
              className="rounded-md border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={() => toggle("sub_cases", !isSubCasesOpen)}
                className="w-full flex items-center justify-between p-3 text-start transition-colors"
                style={{
                  backgroundColor: "var(--surface2)",
                  color: "var(--text)",
                }}
              >
                <h4 className="text-xs font-semibold m-0">
                  {t("@legalos.cases.related.heading")}
                </h4>
                <Icon name={isSubCasesOpen ? "expand_less" : "expand_more"} size={18} />
              </button>
              {isSubCasesOpen && (
                <div className="p-4 border-t" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                  <SubCases linkedCase={linkedCase} reload={reload} onError={onError} />
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </Panel>
  );
}

function Section({
  field,
  caseId,
  value,
  reload,
  onError,
}: {
  field: CaseFileField;
  caseId: number;
  value: string;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  async function save() {
    if (!practice) return;
    setSaving(true);
    // On failure useWrite reports through the page banner and returns false;
    // the draft is left exactly as typed, so a lawyer's paragraph does not
    // vanish behind an error they can retry.
    const ok = await write(
      () => practice.cases.update(caseId, { [field]: draft }),
      "@legalos.matterWorkspace.caseFile.saveFailed",
    );
    setSaving(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          placeholder={t(`@legalos.matterWorkspace.caseFile.${field}.placeholder`)}
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            {t("@legalos.matterWorkspace.action.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={save}
          >
            {t("@legalos.matterWorkspace.action.save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        // pre-wrap: the lawyer's own line breaks are the structure of the
        // text, and a statement of facts flattened into one paragraph is not
        // the same document.
        <div className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
          <span style={{ whiteSpace: "pre-wrap" }}>{value}</span>
        </div>
      ) : (
        <p className="text-xs m-0" style={{ color: "var(--text3)" }}>
          {t("@legalos.matterWorkspace.caseFile.empty", {
            hint: t(`@legalos.matterWorkspace.caseFile.${field}.placeholder`),
          })}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={startEditing}
        >
          {t(
            value
              ? "@legalos.matterWorkspace.action.edit"
              : "@legalos.matterWorkspace.caseFile.write",
          )}
        </Button>
      </div>
    </div>
  );
}
