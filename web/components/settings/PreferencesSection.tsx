"use client";

/**
 * "التفضيلات": language, timezone, date format, default currency (0025).
 *
 * The timezone list is a short curated set, not the full IANA database --
 * the backend accepts any real zone (validated against Python's zoneinfo),
 * so this is a deliberate, documented narrowing to the zones an Egyptian or
 * regional firm is actually in, not a claim that these are the only valid
 * ones.
 */

import { useEffect, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { api, ApiError, type Organization, type DateFormat } from "@/lib/api";
import { SettingsSection } from "./shared";

const TIMEZONES = [
  "Africa/Cairo",
  "Africa/Casablanca",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Amman",
  "Asia/Baghdad",
  "Asia/Beirut",
  "Europe/Istanbul",
  "Europe/London",
  "UTC",
];

const DATE_FORMATS: DateFormat[] = ["DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"];

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function PreferencesSection({
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
  const [locale, setLocale] = useState(firm.locale);
  const [timezone, setTimezone] = useState(firm.timezone);
  const [dateFormat, setDateFormat] = useState<DateFormat>(firm.date_format);
  const [currency, setCurrency] = useState(firm.default_currency);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocale(firm.locale);
    setTimezone(firm.timezone);
    setDateFormat(firm.date_format);
    setCurrency(firm.default_currency);
  }, [firm]);

  const dirty =
    locale !== firm.locale ||
    timezone !== firm.timezone ||
    dateFormat !== firm.date_format ||
    currency !== firm.default_currency;

  const currencyValid = CURRENCY_PATTERN.test(currency);

  function discard() {
    setLocale(firm.locale);
    setTimezone(firm.timezone);
    setDateFormat(firm.date_format);
    setCurrency(firm.default_currency);
    setError(null);
    setSaved(false);
  }

  async function save() {
    if (!currencyValid) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateOrganization(organizationId, {
        locale,
        timezone,
        date_format: dateFormat,
        default_currency: currency,
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
      title={t("@legalos.settings.preferences.heading")}
      description={t("@legalos.settings.preferences.subtitle")}
      error={error}
      onDismissError={() => setError(null)}
      saved={saved}
      savedMessage={t("@legalos.settings.firm.saved")}
      onDismissSaved={() => setSaved(false)}
      readOnlyMessage={t("@legalos.settings.firm.ownerOnly")}
      canEdit={canEdit}
      saving={saving}
      dirty={dirty}
      canSave={dirty && currencyValid}
      onCancel={discard}
      onSave={save}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t("@legalos.settings.preferences.localeLabel")}
            value={locale}
            onChange={(e) => setLocale(e.target.value as "ar" | "en")}
            disabled={!canEdit || saving}
            options={[
              { value: "ar", label: t("@legalos.settings.preferences.locale.ar") },
              { value: "en", label: t("@legalos.settings.preferences.locale.en") },
            ]}
          />
          <Select
            label={t("@legalos.settings.preferences.timezoneLabel")}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={!canEdit || saving}
            options={TIMEZONES.map((zone) => ({ value: zone, label: zone }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t("@legalos.settings.preferences.dateFormatLabel")}
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as DateFormat)}
            disabled={!canEdit || saving}
            options={DATE_FORMATS.map((format) => ({ value: format, label: format }))}
          />
          <Input
            label={t("@legalos.settings.preferences.currencyLabel")}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
            disabled={!canEdit || saving}
            helperText={t("@legalos.settings.preferences.currencyHint")}
            errorMessage={
              currency && !currencyValid
                ? t("@legalos.settings.preferences.currencyInvalid")
                : undefined
            }
          />
        </div>
      </div>
    </SettingsSection>
  );
}
