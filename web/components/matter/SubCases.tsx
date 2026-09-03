"use client";

/**
 * The seventh section of the case file: the same dispute before other
 * courts (T-030, migration 0022).
 *
 * The rules live in the API (one level deep, never itself, one parent) and
 * the picker shows only what the API would accept: not this case, not a case
 * that already has a parent, not a case that is a parent itself. An option
 * that fails on click is a lie, so it is not offered. When the API still
 * refuses -- someone linked the same case from another tab -- the refusal
 * comes back as a sentence, not as the raw detail string.
 *
 * Search is over the firm's own litigation cases, fetched when the dialog
 * opens. A firm has at most one case per matter, so the list is hundreds at
 * the very most and filtering it here beats a search endpoint that would
 * still have to apply the same exclusions.
 */

import { useMemo, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useOrg, useResource } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import { ApiError } from "@/lib/api";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import type { CaseRecord, CaseRef } from "@/lib/practice";
import { useWrite } from "./shared";

/** "Primary" on a case with sub-cases; nothing otherwise. */
export function PrimaryBadge({ record }: { record: Pick<CaseRecord, "children"> }) {
  const t = useTranslator();
  if (record.children.length === 0) return null;
  return <Badge variant="purple" label={t("@legalos.cases.related.primary")} />;
}

/** "Sub-case of 1234", linked, on a case that has a parent; nothing otherwise. */
export function ParentLine({ record }: { record: Pick<CaseRecord, "parent"> }) {
  const t = useTranslator();
  if (!record.parent) return null;
  const label = record.parent.case_number || t("@legalos.cases.related.unfiledCase");
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      <Text type="body" color="secondary">
        {t("@legalos.cases.related.subCaseOf")}
      </Text>
      <Link href={`/cases/${record.parent.id}`}>{label}</Link>
    </HStack>
  );
}

/** One related case as a row: number (linked), court · degree · status. */
export function CaseRefItem({ ref, endContent }: { ref: CaseRef; endContent?: React.ReactNode }) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const label = ref.case_number || t("@legalos.cases.related.unfiledCase");
  const description = [ref.court, enumLabel(ref.litigation_degree), ref.status]
    .filter(Boolean)
    .join(" · ");
  return (
    <ListItem
      // The link is the label rather than the row, so the unlink button
      // beside it is not a button inside an anchor.
      label={<Link href={`/cases/${ref.id}`}>{label}</Link>}
      description={description || undefined}
      endContent={endContent}
    />
  );
}

export function SubCases({
  linkedCase,
  reload,
  onError,
}: {
  linkedCase: CaseRecord;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinking, setUnlinking] = useState<number | null>(null);

  // A sub-case cannot have sub-cases (one level), so instead of a picker
  // whose every option would be refused, the section says what this case is.
  if (linkedCase.parent) {
    return (
      <VStack gap={2}>
        <ParentLine record={linkedCase} />
        <Text type="supporting" color="secondary">
          {t("@legalos.cases.related.childCannotParent")}
        </Text>
      </VStack>
    );
  }

  async function unlink(id: number) {
    if (!practice) return;
    setUnlinking(id);
    // Clearing the parent is the whole operation: the sub-case keeps every
    // field it has. Unlinking is not deleting.
    await write(
      () => practice.cases.update(id, { parent_case_id: null }),
      "@legalos.cases.related.unlinkFailed",
    );
    setUnlinking(null);
  }

  return (
    <VStack gap={3}>
      {linkedCase.children.length === 0 ? (
        <Text type="body" color="secondary">
          {t("@legalos.cases.related.empty")}
        </Text>
      ) : (
        <List hasDividers density="compact">
          {linkedCase.children.map((child) => (
            <CaseRefItem
              key={child.id}
              ref={child}
              endContent={
                <Button
                  label={t("@legalos.cases.related.unlink")}
                  variant="ghost"
                  size="sm"
                  isLoading={unlinking === child.id}
                  isDisabled={unlinking !== null && unlinking !== child.id}
                  onClick={() => unlink(child.id)}
                />
              }
            />
          ))}
        </List>
      )}
      <HStack hAlign="end">
        <Button
          label={t("@legalos.cases.related.link")}
          variant="secondary"
          size="sm"
          onClick={() => setLinkOpen(true)}
        />
      </HStack>
      <LinkCaseDialog
        isOpen={linkOpen}
        onOpenChange={setLinkOpen}
        parent={linkedCase}
        reload={reload}
      />
    </VStack>
  );
}

function matches(record: CaseRecord, needle: string): boolean {
  if (!needle) return true;
  const haystack = [record.case_number, record.court, record.matter_name, record.opposing_party]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle.toLowerCase());
}

function LinkCaseDialog({
  isOpen,
  onOpenChange,
  parent,
  reload,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parent: CaseRecord;
  reload: () => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const enumLabel = useEnumLabel();
  const [q, setQ] = useState("");
  const [linking, setLinking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cases = useResource(
    (api) => (isOpen ? api.cases.list() : Promise.resolve([] as CaseRecord[])),
    [isOpen],
  );

  // Exactly the API's rules (cases._check_parent), applied before anything is
  // shown: not itself, not already a sub-case, not a primary case.
  const candidates = useMemo(() => {
    const list = cases.data ?? [];
    const primaries = new Set(
      list.filter((c) => c.parent_case_id !== null).map((c) => c.parent_case_id),
    );
    return list.filter(
      (c) => c.id !== parent.id && c.parent_case_id === null && !primaries.has(c.id),
    );
  }, [cases.data, parent.id]);

  const shown = candidates.filter((c) => matches(c, q.trim())).slice(0, 20);

  async function link(id: number) {
    if (!practice) return;
    setLinking(id);
    setError(null);
    try {
      await practice.cases.update(id, { parent_case_id: parent.id });
      setQ("");
      onOpenChange(false);
      reload();
    } catch (exc) {
      // The API's detail strings are English and written for a developer.
      // 422 is the one-level / not-itself rule; 404 is a case that vanished
      // between listing and clicking.
      if (exc instanceof ApiError && exc.status === 422) {
        setError(t("@legalos.cases.related.rejected"));
      } else if (exc instanceof ApiError && exc.status === 404) {
        setError(t("@legalos.cases.related.notFound"));
      } else {
        setError(exc instanceof Error ? exc.message : t("@legalos.cases.related.linkFailed"));
      }
    } finally {
      setLinking(null);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={520}>
      <Layout
        header={
          <DialogHeader title={t("@legalos.cases.related.dialog.title")} onOpenChange={onOpenChange} />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <InlineError message={error} onDismiss={() => setError(null)} />
              <TextInput
                label={t("@legalos.cases.related.dialog.search")}
                isLabelHidden
                value={q}
                onChange={setQ}
                placeholder={t("@legalos.cases.related.dialog.search")}
                startIcon={MagnifyingGlassIcon}
                hasAutoFocus
                hasClear
              />
              {cases.loading ? (
                <Text type="body" color="secondary">
                  {t("@legalos.cases.related.dialog.loading")}
                </Text>
              ) : cases.error ? (
                <Text type="body" color="secondary">
                  {cases.error}
                </Text>
              ) : candidates.length === 0 ? (
                <Text type="body" color="secondary">
                  {t("@legalos.cases.related.dialog.noCandidates")}
                </Text>
              ) : shown.length === 0 ? (
                <Text type="body" color="secondary">
                  {t("@legalos.cases.related.dialog.noMatch")}
                </Text>
              ) : (
                <List hasDividers density="compact">
                  {shown.map((c) => (
                    <ListItem
                      key={c.id}
                      label={c.case_number || t("@legalos.cases.related.unfiledCase")}
                      description={[c.matter_name, c.court, enumLabel(c.litigation_degree)]
                        .filter(Boolean)
                        .join(" · ")}
                      endContent={
                        <Button
                          label={t("@legalos.cases.related.link")}
                          variant="primary"
                          size="sm"
                          isLoading={linking === c.id}
                          isDisabled={linking !== null && linking !== c.id}
                          onClick={() => link(c.id)}
                        />
                      }
                    />
                  ))}
                </List>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
