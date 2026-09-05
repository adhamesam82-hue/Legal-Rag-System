"use client";

/**
 * "الإشعارات": the caller's OWN reminder channels, not a firm setting --
 * every member edits this regardless of role, unlike the sections around
 * it. Loads its own resource rather than reading the firm prop, and shows
 * a channel's switch only when that channel can actually deliver something
 * right now (email_available / push_available, from whether Resend/Firebase
 * are configured); an install with neither shows an honest empty state
 * instead of two switches that do nothing.
 */

import { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Alert } from "@/components/ui/Alert";
import { useOrg, useResource } from "@/lib/org";
import { api, ApiError } from "@/lib/api";
import { DataView, InlineError } from "@/components/DataState";

export function NotificationsSection() {
  const t = useTranslator();
  const { organizationId } = useOrg();
  const resource = useResource(
    () => api.notificationPreferences(organizationId!),
    [organizationId],
  );

  return (
    <DataView resource={resource} loadingLabel={t("@legalos.settings.notifications.loading")}>
      {(prefs) => (
        <NotificationsForm
          organizationId={organizationId!}
          wantsReminders={prefs.wants_reminders}
          wantsPush={prefs.wants_push}
          emailAvailable={prefs.email_available}
          pushAvailable={prefs.push_available}
          onSaved={resource.reload}
        />
      )}
    </DataView>
  );
}

function NotificationsForm({
  organizationId,
  wantsReminders,
  wantsPush,
  emailAvailable,
  pushAvailable,
  onSaved,
}: {
  organizationId: number;
  wantsReminders: boolean;
  wantsPush: boolean;
  emailAvailable: boolean;
  pushAvailable: boolean;
  onSaved: () => void;
}) {
  const t = useTranslator();
  const [savingReminders, setSavingReminders] = useState(false);
  const [savingPush, setSavingPush] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleReminders(checked: boolean) {
    setSavingReminders(true);
    setError(null);
    try {
      await api.updateNotificationPreferences(organizationId, { wants_reminders: checked });
      onSaved();
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : t("@legalos.settings.notifications.saveFailed"));
    } finally {
      setSavingReminders(false);
    }
  }

  async function togglePush(checked: boolean) {
    setSavingPush(true);
    setError(null);
    try {
      await api.updateNotificationPreferences(organizationId, { wants_push: checked });
      onSaved();
    } catch (exc) {
      setError(exc instanceof ApiError ? exc.message : t("@legalos.settings.notifications.saveFailed"));
    } finally {
      setSavingPush(false);
    }
  }

  return (
    <Card padding="24px" bordered shadow className="w-full">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.settings.notifications.heading")}
          </h2>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.notifications.subtitle")}
          </p>
        </div>

        <InlineError message={error} onDismiss={() => setError(null)} />

        <div
          className="w-full border-t"
          style={{ borderColor: "var(--border)" }}
        />

        {!emailAvailable && !pushAvailable ? (
          <Alert type="info" title={t("@legalos.settings.notifications.noneAvailable")} />
        ) : (
          <div className="flex flex-col gap-4 divide-y" style={{ borderColor: "var(--border)" }}>
            {emailAvailable && (
              <div className="flex items-center justify-between gap-4 pt-3 first:pt-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.settings.notifications.emailLabel")}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text2)" }}>
                    {t("@legalos.settings.notifications.emailHint")}
                  </span>
                </div>
                <Switch
                  label={t("@legalos.settings.notifications.emailLabel")}
                  checked={wantsReminders}
                  onChange={toggleReminders}
                  disabled={savingReminders}
                />
              </div>
            )}
            {pushAvailable && (
              <div className="flex items-center justify-between gap-4 pt-3 first:pt-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {t("@legalos.settings.notifications.pushLabel")}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text2)" }}>
                    {t("@legalos.settings.notifications.pushHint")}
                  </span>
                </div>
                <Switch
                  label={t("@legalos.settings.notifications.pushLabel")}
                  checked={wantsPush}
                  onChange={togglePush}
                  disabled={savingPush}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
