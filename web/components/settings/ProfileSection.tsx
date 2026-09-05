"use client";

/**
 * "ملف المكتب" -- the four fields the screen has always had (name,
 * registration number, phone, address), plus what T-023/T-027 added:
 * specialties (the shared matter-type list) and the profile fields from
 * migration 0025.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
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

  function toggleSpecialty(value: string) {
    if (specialties.includes(value)) {
      setSpecialties(specialties.filter((s) => s !== value));
    } else {
      setSpecialties([...specialties, value]);
    }
  }

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
      <div className="flex flex-col gap-4">
        <Input
          label={t("@legalos.settings.firm.nameLabel")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit || saving}
          required
        />
        <Input
          label={t("@legalos.settings.firm.registrationLabel")}
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          disabled={!canEdit || saving}
          helperText={t("@legalos.settings.firm.registrationHint")}
        />
        <Input
          label={t("@legalos.settings.firm.phoneLabel")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={!canEdit || saving}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.firm.addressLabel")}
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!canEdit || saving}
            rows={3}
            className="w-full p-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            style={{
              borderRadius: "var(--rs)",
              backgroundColor: "var(--surface2)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        {/* التخصصات مع دعم الاختيار المتعدد عبر الشارات */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.firm.specialtiesLabel")}
          </label>
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>
            {t("@legalos.settings.firm.specialtiesHint")}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {MATTER_TYPES.map((type) => {
              const selected = specialties.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => canEdit && !saving && toggleSpecialty(type)}
                  disabled={!canEdit || saving}
                  className="cursor-pointer transition-all"
                  style={{ background: "transparent", border: "none", padding: 0 }}
                >
                  <Badge
                    color={selected ? "primary" : "neutral"}
                    variant={selected ? "solid" : "soft"}
                  >
                    <span className="flex items-center gap-1">
                      {enumLabel(type)}
                      {selected && <Icon name="check" size={12} />}
                    </span>
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("@legalos.settings.firm.governorateLabel")}
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
            disabled={!canEdit || saving}
          />
          <Input
            label={t("@legalos.settings.firm.mainCourtLabel")}
            value={mainCourt}
            onChange={(e) => setMainCourt(e.target.value)}
            disabled={!canEdit || saving}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t("@legalos.settings.firm.firmSizeLabel")}
            value={firmSize ?? ""}
            onChange={(e) => setFirmSize(e.target.value || null)}
            disabled={!canEdit || saving}
            options={[
              { value: "", label: "— غير محدد —" },
              ...FIRM_SIZES.map((value) => ({
                value,
                label: t(`@legalos.settings.firm.firmSize.${value}`),
              })),
            ]}
          />
          <Select
            label={t("@legalos.settings.firm.clientKindLabel")}
            value={clientKind ?? ""}
            onChange={(e) => setClientKind(e.target.value || null)}
            disabled={!canEdit || saving}
            options={[
              { value: "", label: "— غير محدد —" },
              ...CLIENT_KINDS.map((value) => ({
                value,
                label: t(`@legalos.settings.firm.clientKind.${value}`),
              })),
            ]}
          />
        </div>
      </div>
    </SettingsSection>
  );
}
