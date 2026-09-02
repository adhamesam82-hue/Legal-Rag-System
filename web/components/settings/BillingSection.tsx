"use client";

/**
 * "الفوترة": the numbering pattern, and two figures that only PRE-FILL new
 * invoices -- default_tax_rate and default_payment_terms_days are never
 * read when an existing invoice is printed (every invoice keeps its own
 * rate, T-026), so changing them here cannot move a figure a client has
 * already seen.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { api, ApiError, type Organization } from "@/lib/api";
import { SettingsSection } from "./shared";

/** Mirrors orgs.validate_invoice_number_pattern: only {year}/{seq}, and it
 *  must end with {seq} so the last number issued parses back to an integer. */
function patternError(pattern: string): string | null {
  if (!pattern) return null;
  const placeholders = [...pattern.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const unknown = placeholders.filter((name) => name !== "year" && name !== "seq");
  if (unknown.length > 0) return "unknown";
  if (!pattern.endsWith("{seq}") || placeholders.filter((n) => n === "seq").length !== 1) {
    return "mustEndWithSeq";
  }
  return null;
}

export function BillingSection({
  firm,
  organizationId,
  canEdit,
  onSaved,
}: {
  firm: Organization;
  organizationId: number;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const t = useTranslator();
  const [pattern, setPattern] = useState(firm.invoice_number_pattern ?? "");
  // The API is a fraction (0.14); the field, like the invoice line editor, is
  // the percentage a lawyer actually types (14).
  const [taxPercent, setTaxPercent] = useState(firm.default_tax_rate * 100);
  const [terms, setTerms] = useState(firm.default_payment_terms_days);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPattern(firm.invoice_number_pattern ?? "");
    setTaxPercent(firm.default_tax_rate * 100);
    setTerms(firm.default_payment_terms_days);
  }, [firm]);

  const dirty =
    pattern !== (firm.invoice_number_pattern ?? "") ||
    taxPercent !== firm.default_tax_rate * 100 ||
    terms !== firm.default_payment_terms_days;

  const patternIssue = patternError(pattern);
  const taxValid = taxPercent >= 0 && taxPercent <= 100;
  const termsValid = terms >= 0;
  const valid = !patternIssue && taxValid && termsValid;

  function discard() {
    setPattern(firm.invoice_number_pattern ?? "");
    setTaxPercent(firm.default_tax_rate * 100);
    setTerms(firm.default_payment_terms_days);
    setError(null);
    setSaved(false);
  }

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateOrganization(organizationId, {
        invoice_number_pattern: pattern,
        default_tax_rate: taxPercent / 100,
        default_payment_terms_days: terms,
      });
      setSaved(true);
      onSaved();
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : t("@legalos.settings.firm.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title={t("@legalos.settings.billing.heading")}
      description={t("@legalos.settings.billing.subtitle")}
      error={error}
      onDismissError={() => setError(null)}
      saved={saved}
      savedMessage={t("@legalos.settings.firm.saved")}
      onDismissSaved={() => setSaved(false)}
      readOnlyMessage={t("@legalos.settings.firm.ownerOnly")}
      canEdit={canEdit}
      saving={saving}
      dirty={dirty}
      canSave={dirty && valid}
      onCancel={discard}
      onSave={save}
    >
      <VStack gap={4}>
        <TextInput
          label={t("@legalos.settings.billing.patternLabel")}
          value={pattern}
          onChange={setPattern}
          isDisabled={!canEdit || saving}
          placeholder="INV-{year}-{seq}"
          description={t("@legalos.settings.billing.patternHint")}
          status={
            patternIssue
              ? {
                  type: "error",
                  message: t(`@legalos.settings.billing.patternError.${patternIssue}`),
                }
              : undefined
          }
        />
        <HStack gap={3} wrap="wrap">
          <NumberInput
            label={t("@legalos.settings.billing.taxRateLabel")}
            value={taxPercent}
            onChange={(value) => setTaxPercent(value ?? 0)}
            isDisabled={!canEdit || saving}
            min={0}
            max={100}
            step={0.5}
            width={160}
            description={t("@legalos.settings.billing.taxRateHint")}
            status={
              !taxValid
                ? { type: "error", message: t("@legalos.settings.billing.taxRateInvalid") }
                : undefined
            }
          />
          <NumberInput
            label={t("@legalos.settings.billing.termsLabel")}
            value={terms}
            onChange={(value) => setTerms(value ?? 0)}
            isDisabled={!canEdit || saving}
            min={0}
            width={160}
            status={
              !termsValid
                ? { type: "error", message: t("@legalos.settings.billing.termsInvalid") }
                : undefined
            }
          />
        </HStack>
      </VStack>
    </SettingsSection>
  );
}
