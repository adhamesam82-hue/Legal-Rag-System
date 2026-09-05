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
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
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

  async function uploadLogo(file: File | null) {
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
      <div className="flex flex-col gap-5">
        {/* الشعار */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg overflow-hidden border"
            style={{
              borderRadius: "var(--r)",
              backgroundColor: "var(--surface2)",
              borderColor: "var(--border)",
              color: "var(--primary)",
            }}
          >
            {firm.logo_url ? (
              <img
                src={`${API_BASE}${firm.logo_url}`}
                alt={firm.name}
                className="w-full h-full object-cover"
              />
            ) : (
              firm.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {t("@legalos.settings.firm.logoHeading")}
            </span>
            <span className="text-xs" style={{ color: "var(--text2)" }}>
              {t("@legalos.settings.firm.logoDescription")}
            </span>
          </div>
        </div>

        {/* رفع الشعار */}
        <div
          className="border-2 border-dashed p-4 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-[var(--surface2)]"
          style={{
            borderColor: "var(--border)",
            borderRadius: "var(--r)",
            backgroundColor: "var(--surface)",
          }}
        >
          <label
            htmlFor="logo-upload"
            className="flex flex-col items-center justify-center gap-1 cursor-pointer w-full text-center"
          >
            <Icon name="upload_file" size={24} />
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
              {uploadingLogo
                ? t("@legalos.settings.firm.saving")
                : t("@legalos.settings.firm.uploadLogo")}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>
              {t("@legalos.settings.firm.logoHint")}
            </span>
            <input
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => uploadLogo(e.target.files?.[0] ?? null)}
              disabled={!canEdit || uploadingLogo}
              className="sr-only"
            />
          </label>
        </div>

        <Input
          label={t("@legalos.settings.identity.legalNameLabel")}
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          disabled={!canEdit || saving}
          helperText={t("@legalos.settings.identity.legalNameHint")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("@legalos.settings.identity.taxIdLabel")}
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            disabled={!canEdit || saving}
          />
          <Input
            label={t("@legalos.settings.identity.barNumberLabel")}
            value={barNumber}
            onChange={(e) => setBarNumber(e.target.value)}
            disabled={!canEdit || saving}
          />
        </div>

        <Input
          label={t("@legalos.settings.identity.websiteLabel")}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={!canEdit || saving}
          placeholder="https://"
        />

        <Select
          label={t("@legalos.settings.identity.brandColorLabel")}
          value={brandColor ?? ""}
          onChange={(e) => setBrandColor(e.target.value || null)}
          disabled={!canEdit || saving}
          helperText={t("@legalos.settings.identity.brandColorHint")}
          options={[
            { value: "", label: "— الافتراضي —" },
            ...BRAND_COLORS.map((color) => ({
              value: color,
              label: t(`@legalos.documents.tags.color.${color}`),
            })),
          ]}
        />
      </div>
    </SettingsSection>
  );
}
