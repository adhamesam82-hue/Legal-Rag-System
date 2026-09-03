"use client";

/**
 * Dialog to create a litigation case record for a matter (T-044).
 *
 * All fields are optional: a dispute begins when the client walks in, weeks
 * before the case is filed in court. The lawyer can create the record with only
 * the matter ID so that facts, narrative and legal basis can be recorded immediately.
 */

import { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import type { ISODateString } from "@astryxdesign/core/Calendar";
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
  const [filedDate, setFiledDate] = useState<ISODateString | undefined>(undefined);
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
        setError(exc instanceof Error ? exc.message : t("@legalos.matterWorkspace.caseFile.saveFailed"));
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
    >
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.caseFile.dialog.heading")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Text type="body" color="secondary">
                {t("@legalos.matterWorkspace.caseFile.dialog.hint")}
              </Text>

              <InlineError message={error} onDismiss={() => setError(null)} />

              <HStack gap={3}>
                <TextInput
                  label={t("@legalos.matterWorkspace.caseFile.dialog.court")}
                  value={court}
                  onChange={setCourt}
                />
                <TextInput
                  label={t("@legalos.matterWorkspace.caseFile.dialog.caseNumber")}
                  value={caseNumber}
                  onChange={setCaseNumber}
                />
              </HStack>

              <HStack gap={3}>
                <NumberInput
                  label={t("@legalos.matterWorkspace.caseFile.dialog.judicialYear")}
                  value={judicialYear}
                  onChange={(val) => setJudicialYear(val ?? undefined)}
                  min={1900}
                  max={2100}
                  step={1}
                />
                <Selector
                  label={t("@legalos.matterWorkspace.caseFile.dialog.litigationDegree")}
                  value={litigationDegree}
                  onChange={(v) => setLitigationDegree(v ?? "first_instance")}
                  options={[
                    { value: "first_instance", label: enumLabel("first_instance") },
                    { value: "appeal", label: enumLabel("appeal") },
                    { value: "cassation", label: enumLabel("cassation") },
                  ]}
                />
              </HStack>

              <HStack gap={3}>
                <DateInput
                  label={t("@legalos.matterWorkspace.caseFile.dialog.filedDate")}
                  value={filedDate}
                  onChange={setFiledDate}
                />
                <TextInput
                  label={t("@legalos.matterWorkspace.caseFile.dialog.opposingParty")}
                  value={opposingParty}
                  onChange={setOpposingParty}
                />
              </HStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                isDisabled={saving}
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={t("@legalos.matterWorkspace.caseFile.createCase")}
                variant="primary"
                isLoading={saving}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
