"use client";

/**
 * Dialog to create a litigation case record for a matter (T-044).
 *
 * All fields are optional: a dispute begins when the client walks in, weeks
 * before the case is filed in court. The lawyer can create the record with only
 * the matter ID so that facts, narrative and legal basis can be recorded immediately.
 */

import React, { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useOrg } from "@/lib/org";
import { InlineError } from "@/components/DataState";
import { ApiError } from "@/lib/api";
import { useEnumLabel } from "@/lib/i18n/enum-label";

export function CreateCaseDialog({
  matterId,
  isOpen,
  onOpenChange,
  onCreated,
}: {
  matterId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { practice } = useOrg();

  const [court, setCourt] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [judicialYear, setJudicialYear] = useState<number | undefined>(undefined);
  const [litigationDegree, setLitigationDegree] = useState<string>("first_instance");
  const [filedDate, setFiledDate] = useState<string | undefined>(undefined);
  const [opposingParty, setOpposingParty] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCourt("");
    setCaseNumber("");
    setJudicialYear(undefined);
    setLitigationDegree("first_instance");
    setFiledDate(undefined);
    setOpposingParty("");
    setError(null);
  }

  async function submit() {
    if (!practice) return;
    setSaving(true);
    setError(null);
    try {
      await practice.cases.create({
        matter_id: matterId,
        court: court.trim(),
        case_number: caseNumber.trim(),
        judicial_year: judicialYear ?? undefined,
        litigation_degree: litigationDegree || "first_instance",
        filed_date: filedDate || null,
        opposing_party: opposingParty.trim(),
      });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (exc) {
      if (exc instanceof ApiError && exc.status === 409) {
        setError(t("@legalos.matterWorkspace.caseFile.dialog.alreadyExists"));
        // Race condition: another tab created it; trigger reload so user gets the case file
        onCreated();
      } else {
        setError(
          exc instanceof Error
            ? exc.message
            : t("@legalos.matterWorkspace.caseFile.saveFailed"),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) reset();
      }}
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={t("@legalos.matterWorkspace.caseFile.dialog.heading")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <p className="text-xs m-0" style={{ color: "var(--text2)" }}>
            {t("@legalos.matterWorkspace.caseFile.dialog.hint")}
          </p>

          <InlineError message={error} onDismiss={() => setError(null)} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t("@legalos.matterWorkspace.caseFile.dialog.court")}
              value={court}
              onChange={(e) => setCourt(e.target.value)}
            />
            <Input
              label={t("@legalos.matterWorkspace.caseFile.dialog.caseNumber")}
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="number"
              label={t("@legalos.matterWorkspace.caseFile.dialog.judicialYear")}
              value={judicialYear ?? ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setJudicialYear(val);
              }}
              min={1900}
              max={2100}
              step={1}
            />
            <Select
              label={t("@legalos.matterWorkspace.caseFile.dialog.litigationDegree")}
              value={litigationDegree}
              onChange={(e) => setLitigationDegree(e.target.value)}
              options={[
                { value: "first_instance", label: enumLabel("first_instance") },
                { value: "appeal", label: enumLabel("appeal") },
                { value: "cassation", label: enumLabel("cassation") },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label={t("@legalos.matterWorkspace.caseFile.dialog.filedDate")}
              value={filedDate ?? ""}
              onChange={(e) => setFiledDate(e.target.value || undefined)}
            />
            <Input
              label={t("@legalos.matterWorkspace.caseFile.dialog.opposingParty")}
              value={opposingParty}
              onChange={(e) => setOpposingParty(e.target.value)}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.caseFile.createCase")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
