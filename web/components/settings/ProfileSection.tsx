"use client";

/**
 * "ملف المكتب" -- the four fields the screen has always had (name,
 * registration number, phone, address), plus what T-023/T-027 added:
 * specialties (the shared matter-type list) and the profile fields from
 * migration 0025.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { api, ApiError, type Organization, type OrganizationUpdate } from "@/lib/api";
import { MATTER_TYPES, type MatterType } from "@/lib/practice";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { SettingsSection } from "./shared";

const FIRM_SIZES = ["solo", "small", "medium", "large"] as const;
const CLIENT_KINDS = ["individuals", "companies", "mixed"] as const;

export function ProfileSection({
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
  const enumLabel = useEnumLabel();

  const [name, setName] = useState(firm.name);
  const [registrationNumber, setRegistrationNumber] = useState(firm.registration_number ?? "");
  const [phone, setPhone] = useState(firm.phone ?? "");
  const [address, setAddress] = useState(firm.address ?? "");
  const [specialties, setSpecialties] = useState<string[]>(firm.specialties);
  const [governorate, setGovernorate] = useState(firm.governorate ?? "");
  const [mainCourt, setMainCourt] = useState(firm.main_court ?? "");
  const [firmSize, setFirmSize] = useState<string | null>(firm.firm_size);
  const [clientKind, setClientKind] = useState<string | null>(firm.client_kind);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(firm.name);
    setRegistrationNumber(firm.registration_number ?? "");
    setPhone(firm.phone ?? "");
    setAddress(firm.address ?? "");
    setSpecialties(firm.specialties);
    setGovernorate(firm.governorate ?? "");
    setMainCourt(firm.main_court ?? "");
    setFirmSize(firm.firm_size);
    setClientKind(firm.client_kind);
  }, [firm]);

  const dirty =
    name !== firm.name ||
    registrationNumber !== (firm.registration_number ?? "") ||
    phone !== (firm.phone ?? "") ||
    address !== (firm.address ?? "") ||
    specialties.length !== firm.specialties.length ||
    specialties.some((s, i) => s !== firm.specialties[i]) ||
    governorate !== (firm.governorate ?? "") ||
    mainCourt !== (firm.main_court ?? "") ||
    firmSize !== firm.firm_size ||
    clientKind !== firm.client_kind;

  function discard() {
    setName(firm.name);
    setRegistrationNumber(firm.registration_number ?? "");
    setPhone(firm.phone ?? "");
    setAddress(firm.address ?? "");
    setSpecialties(firm.specialties);
    setGovernorate(firm.governorate ?? "");
    setMainCourt(firm.main_court ?? "");
    setFirmSize(firm.firm_size);
    setClientKind(firm.client_kind);
    setError(null);
    setSaved(false);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body: OrganizationUpdate = {
        name: name.trim(),
        registration_number: registrationNumber,
        phone,
        address,
        specialties: specialties as MatterType[],
        governorate,
        main_court: mainCourt,
      };
      // "" is how a nullable text field is cleared (OrganizationUpdate's own
      // convention); a closed-list field has no such value, so a cleared
      // Selector is only sent when it actually changed.
      if (firmSize !== firm.firm_size) body.firm_size = (firmSize as OrganizationUpdate["firm_size"]) ?? undefined;
      if (clientKind !== firm.client_kind) body.client_kind = (clientKind as OrganizationUpdate["client_kind"]) ?? undefined;
      await api.updateOrganization(organizationId, body);
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
      title={t("@legalos.settings.firm.detailsHeading")}
      description={t("@legalos.settings.firm.subtitle", { firm: firm.name })}
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
      <VStack gap={4}>
        <TextInput
          label={t("@legalos.settings.firm.nameLabel")}
          value={name}
          onChange={setName}
          isDisabled={!canEdit || saving}
          isRequired
        />
        <TextInput
          label={t("@legalos.settings.firm.registrationLabel")}
          value={registrationNumber}
          onChange={setRegistrationNumber}
          isDisabled={!canEdit || saving}
          description={t("@legalos.settings.firm.registrationHint")}
        />
        <TextInput
          label={t("@legalos.settings.firm.phoneLabel")}
          value={phone}
          onChange={setPhone}
          isDisabled={!canEdit || saving}
        />
        <TextArea
          label={t("@legalos.settings.firm.addressLabel")}
          value={address}
          onChange={setAddress}
          isDisabled={!canEdit || saving}
          rows={3}
        />
        <MultiSelector
          label={t("@legalos.settings.firm.specialtiesLabel")}
          description={t("@legalos.settings.firm.specialtiesHint")}
          isOptional
          value={specialties}
          onChange={setSpecialties}
          isDisabled={!canEdit || saving}
          placeholder={t("@legalos.settings.firm.specialtiesPlaceholder")}
          options={MATTER_TYPES.map((value) => ({ value, label: enumLabel(value) }))}
          hasSearch
          maxBadges={3}
        />
        <HStack gap={3} wrap="wrap">
          <TextInput
            label={t("@legalos.settings.firm.governorateLabel")}
            value={governorate}
            onChange={setGovernorate}
            isDisabled={!canEdit || saving}
            width={240}
          />
          <TextInput
            label={t("@legalos.settings.firm.mainCourtLabel")}
            value={mainCourt}
            onChange={setMainCourt}
            isDisabled={!canEdit || saving}
            width={280}
          />
        </HStack>
        <HStack gap={3} wrap="wrap">
          <Selector
            label={t("@legalos.settings.firm.firmSizeLabel")}
            hasClear
            value={firmSize}
            onChange={setFirmSize}
            isDisabled={!canEdit || saving}
            width={220}
            options={FIRM_SIZES.map((value) => ({
              value,
              label: t(`@legalos.settings.firm.firmSize.${value}`),
            }))}
          />
          <Selector
            label={t("@legalos.settings.firm.clientKindLabel")}
            hasClear
            value={clientKind}
            onChange={setClientKind}
            isDisabled={!canEdit || saving}
            width={220}
            options={CLIENT_KINDS.map((value) => ({
              value,
              label: t(`@legalos.settings.firm.clientKind.${value}`),
            }))}
          />
        </HStack>
      </VStack>
    </SettingsSection>
  );
}
