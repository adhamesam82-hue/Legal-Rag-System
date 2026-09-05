"use client";

/**
 * "الحقول الإلزامية": which of the optional matter/client fields this firm
 * marks essential (orgs.REQUIRED_FIELD_CHOICES). Recorded as the firm's own
 * declared choice -- name and client are already required everywhere, so
 * this list can only ever add to that. Nothing in the matter or client
 * forms reads this yet, and the section says so rather than implying a
 * blocked save that will not actually happen.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Checkbox } from "@/components/ui/Checkbox";
import { api, ApiError, type Organization } from "@/lib/api";
import { SettingsSection } from "./shared";

const MATTER_FIELDS = ["matter_number", "description", "budget_amount", "tags", "staff"] as const;
const CLIENT_FIELDS = [
  "industry", "client_since", "registration_number", "tax_id", "address", "phone", "email", "notes",
] as const;

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
}

export function RequiredFieldsSection({
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
  const [matterFields, setMatterFields] = useState<string[]>(firm.required_fields.matter ?? []);
  const [clientFields, setClientFields] = useState<string[]>(firm.required_fields.client ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMatterFields(firm.required_fields.matter ?? []);
    setClientFields(firm.required_fields.client ?? []);
  }, [firm]);

  const dirty =
    !sameSet(matterFields, firm.required_fields.matter ?? []) ||
    !sameSet(clientFields, firm.required_fields.client ?? []);

  function toggleMatterField(field: string, checked: boolean) {
    setMatterFields((prev) =>
      checked ? [...prev, field] : prev.filter((f) => f !== field)
    );
  }

  function toggleClientField(field: string, checked: boolean) {
    setClientFields((prev) =>
      checked ? [...prev, field] : prev.filter((f) => f !== field)
    );
  }

  function discard() {
    setMatterFields(firm.required_fields.matter ?? []);
    setClientFields(firm.required_fields.client ?? []);
    setError(null);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateOrganization(organizationId, {
        required_fields: { matter: matterFields, client: clientFields },
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
      title={t("@legalos.settings.requiredFields.heading")}
      description={t("@legalos.settings.requiredFields.subtitle")}
      error={error}
      onDismissError={() => setError(null)}
      saved={saved}
      savedMessage={t("@legalos.settings.firm.saved")}
      onDismissSaved={() => setSaved(false)}
      readOnlyMessage={t("@legalos.settings.firm.ownerOnly")}
      canEdit={canEdit}
      saving={saving}
      dirty={dirty}
      onCancel={discard}
      onSave={save}
    >
      <div className="flex flex-col gap-6">
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {t("@legalos.settings.requiredFields.notEnforcedYet")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* حقول القضايا */}
          <div
            className="flex flex-col gap-3 p-4 border rounded-lg"
            style={{
              borderColor: "var(--border)",
              borderRadius: "var(--rs)",
              backgroundColor: "var(--surface2)",
            }}
          >
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.settings.requiredFields.matterGroup")}
            </span>
            <div className="flex flex-col gap-2.5">
              {MATTER_FIELDS.map((field) => (
                <Checkbox
                  key={field}
                  label={t(`@legalos.settings.requiredFields.matter.${field}`)}
                  checked={matterFields.includes(field)}
                  onChange={(e) => toggleMatterField(field, e.target.checked)}
                  disabled={!canEdit || saving}
                />
              ))}
            </div>
          </div>

          {/* حقول الموكلين */}
          <div
            className="flex flex-col gap-3 p-4 border rounded-lg"
            style={{
              borderColor: "var(--border)",
              borderRadius: "var(--rs)",
              backgroundColor: "var(--surface2)",
            }}
          >
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.settings.requiredFields.clientGroup")}
            </span>
            <div className="flex flex-col gap-2.5">
              {CLIENT_FIELDS.map((field) => (
                <Checkbox
                  key={field}
                  label={t(`@legalos.settings.requiredFields.client.${field}`)}
                  checked={clientFields.includes(field)}
                  onChange={(e) => toggleClientField(field, e.target.checked)}
                  disabled={!canEdit || saving}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
