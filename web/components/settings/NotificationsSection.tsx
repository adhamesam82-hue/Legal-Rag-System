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
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Switch } from "@astryxdesign/core/Switch";
import { Divider } from "@astryxdesign/core/Divider";
import { Banner } from "@astryxdesign/core/Banner";
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
    <Card>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={5}>{t("@legalos.settings.notifications.heading")}</Heading>
          <Text type="body" color="secondary">
            {t("@legalos.settings.notifications.subtitle")}
          </Text>
        </VStack>
        <InlineError message={error} onDismiss={() => setError(null)} />
        <Divider />

        {!emailAvailable && !pushAvailable ? (
          <Banner status="info" title={t("@legalos.settings.notifications.noneAvailable")} />
        ) : (
          <VStack gap={4}>
            {emailAvailable && (
              <HStack hAlign="between" vAlign="center">
                <VStack gap={0.5}>
                  <Text type="body" weight="semibold">
                    {t("@legalos.settings.notifications.emailLabel")}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.settings.notifications.emailHint")}
                  </Text>
                </VStack>
                <Switch
                  label={t("@legalos.settings.notifications.emailLabel")}
                  isLabelHidden
                  value={wantsReminders}
                  onChange={toggleReminders}
                  isDisabled={savingReminders}
                />
              </HStack>
            )}
            {pushAvailable && (
              <HStack hAlign="between" vAlign="center">
                <VStack gap={0.5}>
                  <Text type="body" weight="semibold">
                    {t("@legalos.settings.notifications.pushLabel")}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.settings.notifications.pushHint")}
                  </Text>
                </VStack>
                <Switch
                  label={t("@legalos.settings.notifications.pushLabel")}
                  isLabelHidden
                  value={wantsPush}
                  onChange={togglePush}
                  isDisabled={savingPush}
                />
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </Card>
  );
}
