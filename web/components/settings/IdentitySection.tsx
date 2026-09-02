"use client";

/**
 * "الهوية البصرية": the logo (T-028) plus the brand fields from migration
 * 0025 -- legal name, tax id, bar registration number, website, brand
 * colour. The logo uploads immediately on drop (it has always worked that
 * way, T-028); the text fields save through the section's own button like
 * every other section.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Token } from "@astryxdesign/core/Token";
import { API_BASE, api, ApiError, type Organization, type BrandColor } from "@/lib/api";
import { SettingsSection } from "./shared";

const BRAND_COLORS: BrandColor[] = [
  "blue", "cyan", "green", "orange", "pink", "purple", "red", "teal", "yellow",
];

export function IdentitySection({
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
  const [legalName, setLegalName] = useState(firm.legal_name ?? "");
  const [taxId, setTaxId] = useState(firm.tax_id ?? "");
  const [barNumber, setBarNumber] = useState(firm.bar_number ?? "");
  const [website, setWebsite] = useState(firm.website ?? "");
  const [brandColor, setBrandColor] = useState<string | null>(firm.brand_color);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    setLegalName(firm.legal_name ?? "");
    setTaxId(firm.tax_id ?? "");
    setBarNumber(firm.bar_number ?? "");
    setWebsite(firm.website ?? "");
    setBrandColor(firm.brand_color);
  }, [firm]);

  const dirty =
    legalName !== (firm.legal_name ?? "") ||
    taxId !== (firm.tax_id ?? "") ||
    barNumber !== (firm.bar_number ?? "") ||
    website !== (firm.website ?? "") ||
    brandColor !== firm.brand_color;

  function discard() {
    setLegalName(firm.legal_name ?? "");
    setTaxId(firm.tax_id ?? "");
    setBarNumber(firm.bar_number ?? "");
    setWebsite(firm.website ?? "");
    setBrandColor(firm.brand_color);
    setError(null);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateOrganization(organizationId, {
        legal_name: legalName,
        tax_id: taxId,
        bar_number: barNumber,
        website,
        brand_color: (brandColor as BrandColor | null) ?? undefined,
      });
      setSaved(true);
      onSaved();
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : t("@legalos.settings.firm.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(files: File | File[] | null) {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      await api.uploadLogo(organizationId, file);
      onSaved();
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : t("@legalos.settings.firm.logoFailed"));
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <SettingsSection
      title={t("@legalos.settings.identity.heading")}
      description={t("@legalos.settings.identity.subtitle")}
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
        <HStack gap={4} vAlign="center">
          <Avatar
            name={firm.name}
            size="lg"
            tooltip={false}
            src={firm.logo_url ? `${API_BASE}${firm.logo_url}` : undefined}
          />
          <VStack gap={0.5}>
            <Text type="label" weight="semibold">
              {t("@legalos.settings.firm.logoHeading")}
            </Text>
            <Text type="supporting" color="secondary">
              {t("@legalos.settings.firm.logoDescription")}
            </Text>
          </VStack>
        </HStack>
        <FileInput
          label={t("@legalos.settings.firm.uploadLogo")}
          isLabelHidden
          value={null}
          onChange={uploadLogo}
          accept="image/png,image/jpeg,image/webp"
          mode="dropzone"
          isDisabled={!canEdit || uploadingLogo}
          placeholder={t("@legalos.settings.firm.logoPlaceholder")}
          description={t("@legalos.settings.firm.logoHint")}
        />

        <TextInput
          label={t("@legalos.settings.identity.legalNameLabel")}
          value={legalName}
          onChange={setLegalName}
          isDisabled={!canEdit || saving}
          description={t("@legalos.settings.identity.legalNameHint")}
        />
        <HStack gap={3} wrap="wrap">
          <TextInput
            label={t("@legalos.settings.identity.taxIdLabel")}
            value={taxId}
            onChange={setTaxId}
            isDisabled={!canEdit || saving}
            width={220}
          />
          <TextInput
            label={t("@legalos.settings.identity.barNumberLabel")}
            value={barNumber}
            onChange={setBarNumber}
            isDisabled={!canEdit || saving}
            width={220}
          />
        </HStack>
        <TextInput
          label={t("@legalos.settings.identity.websiteLabel")}
          value={website}
          onChange={setWebsite}
          isDisabled={!canEdit || saving}
          placeholder="https://"
        />
        <Selector
          label={t("@legalos.settings.identity.brandColorLabel")}
          description={t("@legalos.settings.identity.brandColorHint")}
          hasClear
          value={brandColor}
          onChange={setBrandColor}
          isDisabled={!canEdit || saving}
          width={260}
          options={BRAND_COLORS.map((color) => ({
            value: color,
            label: t(`@legalos.documents.tags.color.${color}`),
          }))}
          renderOption={(option) => (
            <HStack gap={2} vAlign="center">
              <Token label={option.label ?? option.value} size="sm" color={option.value as BrandColor} />
            </HStack>
          )}
        />
      </VStack>
    </SettingsSection>
  );
}
