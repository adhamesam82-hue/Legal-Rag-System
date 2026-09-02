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

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Link } from "@astryxdesign/core/Link";
import { useOrg } from "@/lib/org";
import type { CaseRecord } from "@/lib/practice";
import { Panel, useWrite, type TabProps } from "./shared";
import { SubCases } from "./SubCases";

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

  if (!linkedCase) {
    return (
      <Panel title={t("@legalos.matterWorkspace.caseFile.heading")}>
        <VStack gap={2}>
          <Text type="body" color="secondary">
            {t("@legalos.matterWorkspace.caseFile.noCase")}
          </Text>
          <Link href="/cases">{t("@legalos.matterWorkspace.caseFile.noCase.link")}</Link>
        </VStack>
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
      <VStack gap={2}>
        {CASE_FILE_FIELDS.map((field) => (
          <Collapsible
            key={field}
            value={field}
            // Until the saved state is read, render open: a flash of
            // collapsed sections on every load would be worse than a
            // flash of open ones.
            isOpen={loaded ? open[field] : true}
            onOpenChange={(isOpen) => toggle(field, isOpen)}
            trigger={
              <Heading level={5}>{t(`@legalos.matterWorkspace.caseFile.${field}`)}</Heading>
            }
          >
            <Section
              field={field}
              caseId={linkedCase.id}
              value={linkedCase[field]}
              reload={reload}
              onError={onError}
            />
          </Collapsible>
        ))}
        <Collapsible
          value="sub_cases"
          isOpen={loaded ? open.sub_cases : true}
          onOpenChange={(isOpen) => toggle("sub_cases", isOpen)}
          trigger={<Heading level={5}>{t("@legalos.cases.related.heading")}</Heading>}
        >
          <SubCases linkedCase={linkedCase} reload={reload} onError={onError} />
        </Collapsible>
      </VStack>
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
      <VStack gap={3}>
        <TextArea
          label={t(`@legalos.matterWorkspace.caseFile.${field}`)}
          isLabelHidden
          value={draft}
          onChange={setDraft}
          rows={8}
          placeholder={t(`@legalos.matterWorkspace.caseFile.${field}.placeholder`)}
        />
        <HStack gap={2} hAlign="end">
          <Button
            label={t("@legalos.matterWorkspace.action.cancel")}
            variant="secondary"
            size="sm"
            isDisabled={saving}
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          />
          <Button
            label={t("@legalos.matterWorkspace.action.save")}
            variant="primary"
            size="sm"
            isLoading={saving}
            onClick={save}
          />
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack gap={2}>
      {value ? (
        // pre-wrap: the lawyer's own line breaks are the structure of the
        // text, and a statement of facts flattened into one paragraph is not
        // the same document.
        <Text type="body">
          <span style={{ whiteSpace: "pre-wrap" }}>{value}</span>
        </Text>
      ) : (
        <Text type="body" color="secondary">
          {t("@legalos.matterWorkspace.caseFile.empty", {
            hint: t(`@legalos.matterWorkspace.caseFile.${field}.placeholder`),
          })}
        </Text>
      )}
      <HStack hAlign="end">
        <Button
          label={t(
            value
              ? "@legalos.matterWorkspace.action.edit"
              : "@legalos.matterWorkspace.caseFile.write",
          )}
          variant="ghost"
          size="sm"
          onClick={startEditing}
        />
      </HStack>
    </VStack>
  );
}
