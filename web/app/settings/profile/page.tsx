"use client";

/**
 * Who you are in this firm.
 *
 * Small on purpose. The page it replaces showed a name, email, phone and job
 * title hardcoded to one person, so every user read someone else's details as
 * their own; a role badge permanently reading Owner; three notification
 * switches for a notification system that does not exist; and a list of
 * "active sessions" that was invented — the worst of them, because a fabricated
 * security screen is read as evidence.
 *
 * What is here is what the server actually knows: display name, job title and
 * role come from /me, and the language switch is real. Nothing else is shown,
 * because nothing else can be sourced or saved yet.
 *
 * Editing identity needs an endpoint that does not exist — the API exposes the
 * membership for reading only. When it lands, the fields become inputs and a
 * Save appears; until then a text field with nowhere to write is a worse lie
 * than a plain value.
 */

import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Selector } from "@astryxdesign/core/Selector";
import { Link } from "@astryxdesign/core/Link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useLocale } from "@/lib/i18n/provider";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { useOrg, useResource } from "@/lib/org";
import { DataView } from "@/components/DataState";
import type { Locale } from "@/lib/i18n/locale";
import type { Role } from "@/lib/practice";

const ROLE_BADGE_VARIANT: Record<Role, "purple" | "blue" | "neutral"> = {
  owner: "purple",
  lawyer: "blue",
  staff: "neutral",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <VStack gap={1}>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <Text type="body">{value}</Text>
    </VStack>
  );
}

export default function ProfileSettingsPage() {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { organizationName } = useOrg();
  const { locale, setLocale } = useLocale();
  const me = useResource((practice) => practice.me(), []);

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={3}>
            <Link href="/settings" color="secondary">
              <HStack gap={1} vAlign="center">
                <Icon icon={ArrowLeftIcon} size="xsm" color="inherit" />
                <Text type="supporting" color="inherit">
                  {t("@legalos.settings.profile.backToSettings")}
                </Text>
              </HStack>
            </Link>
            <Heading level={3}>{t("@legalos.settings.profile.heading")}</Heading>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <DataView resource={me}>
            {(profile) => {
              const name = profile.display_name ?? profile.clerk_user_id;
              return (
                <VStack gap={5}>
                  <Card>
                    <VStack gap={4}>
                      <HStack gap={4} vAlign="center">
                        <Avatar name={name} size="lg" tooltip={false} />
                        <VStack gap={1}>
                          <Heading level={4}>{name}</Heading>
                          <Text type="supporting" color="secondary">
                            {organizationName ?? ""}
                          </Text>
                        </VStack>
                      </HStack>

                      {profile.title && (
                        <Field
                          label={t("@legalos.settings.profile.titleLabel")}
                          value={profile.title}
                        />
                      )}

                      <Text type="supporting" color="secondary">
                        {t("@legalos.settings.profile.identityReadOnly")}
                      </Text>
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>
                        {t("@legalos.settings.profile.roleHeading")}
                      </Heading>
                      <HStack gap={3} vAlign="center" wrap="wrap">
                        <Badge
                          variant={ROLE_BADGE_VARIANT[profile.role]}
                          label={enumLabel(profile.role)}
                        />
                        <Text type="body" color="secondary">
                          {t(`@legalos.settings.profile.roleDescription.${profile.role}`)}
                        </Text>
                      </HStack>
                      {profile.role === "owner" && (
                        <Link href="/settings/users">
                          {t("@legalos.settings.profile.manageTeam")}
                        </Link>
                      )}
                    </VStack>
                  </Card>

                  <Card>
                    <VStack gap={4}>
                      <Heading level={4}>
                        {t("@legalos.settings.profile.languageHeading")}
                      </Heading>
                      <Selector
                        label={t("@legalos.settings.profile.languageLabel")}
                        value={locale}
                        onChange={(value) => setLocale(value as Locale)}
                        options={[
                          { value: "ar", label: "العربية" },
                          { value: "en", label: "English" },
                        ]}
                      />
                    </VStack>
                  </Card>
                </VStack>
              );
            }}
          </DataView>
        </LayoutContent>
      }
    />
  );
}
