"use client";

/**
 * Profile settings page (T-053).
 *
 * Shows user identity details from /me: display name, organization, job title,
 * role badge, and language selection.
 * Preserves all hooks, contract layer calls, and state intact.
 */

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useLocale } from "@/lib/i18n/provider";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { memberLabel, useOrg, useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import type { Locale } from "@/lib/i18n/locale";
import type { Role } from "@/lib/practice";

const ROLE_COLOR: Record<Role, "primary" | "info" | "neutral"> = {
  owner: "primary",
  lawyer: "info",
  staff: "neutral",
};

export default function ProfileSettingsPage() {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { organizationName } = useOrg();
  const { locale, setLocale } = useLocale();
  const me = useResource((practice) => practice.me(), []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
          style={{ color: "var(--text2)" }}
        >
          <Icon name="arrow_back" size={16} />
          <span>{t("@legalos.settings.profile.backToSettings")}</span>
        </Link>
      </div>

      <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
        {t("@legalos.settings.profile.heading")}
      </h2>

      <DataView resource={me}>
        {(profile) => {
          const name = memberLabel(profile);
          return (
            <div className="flex flex-col gap-5">
              <Card className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base"
                    style={{ backgroundColor: "var(--primary-soft)", color: "var(--primary)" }}
                  >
                    {name.slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>{name}</h3>
                    <span className="text-xs" style={{ color: "var(--text2)" }}>
                      {organizationName ?? ""}
                    </span>
                  </div>
                </div>

                {profile.title && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-xs" style={{ color: "var(--text2)" }}>
                      {t("@legalos.settings.profile.titleLabel")}
                    </span>
                    <span className="font-medium" style={{ color: "var(--text)" }}>{profile.title}</span>
                  </div>
                )}

                <p className="text-xs" style={{ color: "var(--text3)" }}>
                  {t("@legalos.settings.profile.identityReadOnly")}
                </p>
              </Card>

              <Card className="p-5 flex flex-col gap-4">
                <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                  {t("@legalos.settings.profile.roleHeading")}
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge color={ROLE_COLOR[profile.role]}>
                    {enumLabel(profile.role)}
                  </Badge>
                  <span className="text-sm" style={{ color: "var(--text2)" }}>
                    {t(`@legalos.settings.profile.roleDescription.${profile.role}`)}
                  </span>
                </div>
                {profile.role === "owner" && (
                  <div>
                    <Link
                      href="/settings/users"
                      className="text-xs font-medium hover:underline"
                      style={{ color: "var(--primary)" }}
                    >
                      {t("@legalos.settings.profile.manageTeam")}
                    </Link>
                  </div>
                )}
              </Card>

              <Card className="p-5 flex flex-col gap-4">
                <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                  {t("@legalos.settings.profile.languageHeading")}
                </h3>
                <div style={{ maxWidth: "240px" }}>
                  <Select
                    label={t("@legalos.settings.profile.interfaceLanguage")}
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                    options={[
                      { value: "ar", label: t("@legalos.settings.preferences.locale.ar") },
                      { value: "en", label: t("@legalos.settings.preferences.locale.en") },
                    ]}
                  />
                </div>
              </Card>
            </div>
          );
        }}
      </DataView>
    </div>
  );
}
