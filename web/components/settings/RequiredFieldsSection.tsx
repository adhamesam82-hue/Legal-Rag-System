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
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
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
      <VStack gap={5}>
        <Text type="supporting" color="secondary">
          {t("@legalos.settings.requiredFields.notEnforcedYet")}
        </Text>
        <HStack gap={6} wrap="wrap" vAlign="start">
          <CheckboxList
            label={t("@legalos.settings.requiredFields.matterGroup")}
            value={matterFields}
            onChange={setMatterFields}
            isDisabled={!canEdit || saving}
            density="compact"
            width={260}
          >
            {MATTER_FIELDS.map((field) => (
              <CheckboxListItem
                key={field}
                value={field}
                label={t(`@legalos.settings.requiredFields.matter.${field}`)}
              />
            ))}
          </CheckboxList>
          <CheckboxList
            label={t("@legalos.settings.requiredFields.clientGroup")}
            value={clientFields}
            onChange={setClientFields}
            isDisabled={!canEdit || saving}
            density="compact"
            width={260}
          >
            {CLIENT_FIELDS.map((field) => (
              <CheckboxListItem
                key={field}
                value={field}
                label={t(`@legalos.settings.requiredFields.client.${field}`)}
              />
            ))}
          </CheckboxList>
        </HStack>
      </VStack>
    </SettingsSection>
  );
}
