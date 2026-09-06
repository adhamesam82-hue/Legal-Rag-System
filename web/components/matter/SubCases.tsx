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

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
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
  return <Badge color="accent" variant="soft">{t("@legalos.cases.related.primary")}</Badge>;
}

/** "Sub-case of 1234", linked, on a case that has a parent; nothing otherwise. */
export function ParentLine({ record }: { record: Pick<CaseRecord, "parent"> }) {
  const t = useTranslator();
  if (!record.parent) return null;
  const label = record.parent.case_number || t("@legalos.cases.related.unfiledCase");
  return (
    <div className="flex items-center gap-1 flex-wrap text-xs">
      <span style={{ color: "var(--text2)" }}>
        {t("@legalos.cases.related.subCaseOf")}
      </span>
      <Link
        href={`/cases/${record.parent.id}`}
        className="font-medium hover:underline"
        style={{ color: "var(--primary)" }}
      >
        {label}
      </Link>
    </div>
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
    <div
      className="flex items-center justify-between gap-3 py-2 px-3 border-b last:border-b-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex flex-col min-w-0">
        <Link
          href={`/cases/${ref.id}`}
          className="text-xs font-semibold hover:underline truncate"
          style={{ color: "var(--primary)" }}
        >
          {label}
        </Link>
        {description && (
          <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
            {description}
          </span>
        )}
      </div>
      {endContent && <div className="shrink-0">{endContent}</div>}
    </div>
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
      <div className="flex flex-col gap-2">
        <ParentLine record={linkedCase} />
        <span className="text-xs" style={{ color: "var(--text3)" }}>
          {t("@legalos.cases.related.childCannotParent")}
        </span>
      </div>
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
    <div className="flex flex-col gap-3">
      {linkedCase.children.length === 0 ? (
        <span className="text-xs" style={{ color: "var(--text3)" }}>
          {t("@legalos.cases.related.empty")}
        </span>
      ) : (
        <div
          className="flex flex-col rounded-md border divide-y overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {linkedCase.children.map((child) => (
            <CaseRefItem
              key={child.id}
              ref={child}
              endContent={
                <Button
                  variant="ghost"
                  size="sm"
                  loading={unlinking === child.id}
                  disabled={unlinking !== null && unlinking !== child.id}
                  onClick={() => unlink(child.id)}
                >
                  {t("@legalos.cases.related.unlink")}
                </Button>
              }
            />
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setLinkOpen(true)}
        >
          {t("@legalos.cases.related.link")}
        </Button>
      </div>
      <LinkCaseDialog
        isOpen={linkOpen}
        onOpenChange={setLinkOpen}
        parent={linkedCase}
        reload={reload}
      />
    </div>
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
      <DialogHeader
        title={t("@legalos.cases.related.dialog.title")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <InlineError message={error} onDismiss={() => setError(null)} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("@legalos.cases.related.dialog.search")}
            startIcon={<Icon name="search" size={16} />}
            autoFocus
          />
          {cases.loading ? (
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {t("@legalos.cases.related.dialog.loading")}
            </span>
          ) : cases.error ? (
            <span className="text-xs" style={{ color: "var(--danger)" }}>
              {cases.error}
            </span>
          ) : candidates.length === 0 ? (
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {t("@legalos.cases.related.dialog.noCandidates")}
            </span>
          ) : shown.length === 0 ? (
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {t("@legalos.cases.related.dialog.noMatch")}
            </span>
          ) : (
            <div
              className="flex flex-col rounded-md border divide-y max-h-72 overflow-y-auto"
              style={{ borderColor: "var(--border)" }}
            >
              {shown.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                      {c.case_number || t("@legalos.cases.related.unfiledCase")}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                      {[c.matter_name, c.court, enumLabel(c.litigation_degree)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={linking === c.id}
                    disabled={linking !== null && linking !== c.id}
                    onClick={() => link(c.id)}
                  >
                    {t("@legalos.cases.related.link")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
