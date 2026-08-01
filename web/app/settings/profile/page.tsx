"use client";

import { useState } from "react";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Divider } from "@astryxdesign/core/Divider";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { ArrowLeftIcon, ArrowUpTrayIcon, KeyIcon } from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useLocale } from "@/lib/i18n/provider";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { useOrg } from "@/lib/org";
import type { Locale } from "@/lib/i18n/locale";

const SESSIONS = [
  { device: "MacBook Pro · Cairo, Egypt", detail: "Chrome · current session", current: true },
  { device: "iPhone 15 · Cairo, Egypt", detail: "LegalOS mobile · last active 2 days ago", current: false },
];

export default function ProfileSettingsPage() {
  const [name, setName] = useState("Ahmed Al-Sayed");
  const [email, setEmail] = useState("ahmed@alsayed-partners.eg");
  const [phone, setPhone] = useState("+20 100 555 0142");
  const [title, setTitle] = useState("Managing Partner");
  // Unlike the other fields on this page, language switches the whole app
  // live rather than waiting on "Save changes" — matching how the Astryx
  // InternationalizationProvider is meant to be driven (see lib/i18n).
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { organizationName } = useOrg();
  const { locale, setLocale } = useLocale();
  const [emailDigest, setEmailDigest] = useState(true);
  const [hearingAlerts, setHearingAlerts] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(false);

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
            <VStack gap={1}>
              <Heading level={2}>{t("@legalos.settings.profile.heading")}</Heading>
              <Text type="body" color="secondary">
                {t("@legalos.settings.profile.subtitle", { firm: organizationName ?? "" })}
              </Text>
            </VStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6} maxWidth={860}>
            <Card>
              <VStack gap={4}>
                <Heading level={4}>{t("@legalos.settings.profile.photoHeading")}</Heading>
                <HStack gap={4} vAlign="center" wrap="wrap">
                  <Avatar name={name} size="xl" tooltip={false} />
                  <VStack gap={2}>
                    <HStack gap={2}>
                      <Button
                        label={t("@legalos.settings.profile.uploadPhotoLabel")}
                        variant="secondary"
                        icon={<Icon icon={ArrowUpTrayIcon} size="sm" />}
                      >
                        {t("@legalos.settings.profile.uploadPhoto")}
                      </Button>
                      <Button
                        label={t("@legalos.settings.profile.removePhoto")}
                        variant="ghost"
                      >
                        {t("@legalos.settings.profile.remove")}
                      </Button>
                    </HStack>
                    <Text type="supporting" color="secondary">
                      {t("@legalos.settings.profile.photoHint")}
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>{t("@legalos.settings.profile.detailsHeading")}</Heading>
                <Grid columns={{ minWidth: 260, repeat: "fit" }} gap={4}>
                  <TextInput
                    label={t("@legalos.settings.profile.fullName")}
                    value={name}
                    onChange={setName}
                  />
                  <TextInput
                    label={t("@legalos.settings.profile.jobTitle")}
                    value={title}
                    onChange={setTitle}
                  />
                  <TextInput
                    label={t("@legalos.settings.profile.emailAddress")}
                    value={email}
                    onChange={setEmail}
                    type="email"
                  />
                  <TextInput
                    label={t("@legalos.settings.profile.phone")}
                    value={phone}
                    onChange={setPhone}
                  />
                </Grid>
                <Selector
                  label={t("@legalos.settings.profile.interfaceLanguage")}
                  value={locale}
                  onChange={(value) => setLocale(value as Locale)}
                  options={[
                    { value: "en", label: "English" },
                    { value: "ar", label: "العربية (Arabic)" },
                  ]}
                />
                <Divider />
                <HStack gap={2}>
                  <Button label={t("@legalos.settings.action.saveChanges")} variant="primary">
                    {t("@legalos.settings.action.saveChanges")}
                  </Button>
                  <Button label={t("@legalos.settings.profile.discardChanges")} variant="ghost">
                    {t("@legalos.settings.action.discard")}
                  </Button>
                </HStack>
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>{t("@legalos.settings.profile.roleHeading")}</Heading>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <Badge variant="purple" label={enumLabel("owner")} />
                  <Text type="body" color="secondary">
                    {t("@legalos.settings.profile.ownerDescription")}
                  </Text>
                </HStack>
                <Text type="supporting" color="secondary">
                  {t("@legalos.settings.profile.ownerNote")}
                </Text>
                <Link href="/settings/users">{t("@legalos.settings.profile.manageTeam")}</Link>
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>{t("@legalos.settings.profile.notificationsHeading")}</Heading>
                <Switch
                  label={t("@legalos.settings.profile.digestLabel")}
                  description={t("@legalos.settings.profile.digestDescription")}
                  value={emailDigest}
                  onChange={setEmailDigest}
                />
                <Divider />
                <Switch
                  label={t("@legalos.settings.profile.hearingLabel")}
                  description={t("@legalos.settings.profile.hearingDescription")}
                  value={hearingAlerts}
                  onChange={setHearingAlerts}
                />
                <Divider />
                <Switch
                  label={t("@legalos.settings.profile.mentionLabel")}
                  description={t("@legalos.settings.profile.mentionDescription")}
                  value={mentionAlerts}
                  onChange={setMentionAlerts}
                />
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>{t("@legalos.settings.profile.securityHeading")}</Heading>
                <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
                  <VStack gap={1}>
                    <Text type="label">{t("@legalos.settings.profile.password")}</Text>
                    <Text type="supporting" color="secondary">
                      {t("@legalos.settings.profile.passwordChanged")}
                    </Text>
                  </VStack>
                  <Button
                    label={t("@legalos.settings.profile.changePassword")}
                    variant="secondary"
                    icon={<Icon icon={KeyIcon} size="sm" />}
                  >
                    {t("@legalos.settings.profile.changePassword")}
                  </Button>
                </HStack>
                <Divider />
                <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
                  <VStack gap={1}>
                    <Text type="label">{t("@legalos.settings.profile.twoFactor")}</Text>
                    <Text type="supporting" color="secondary">
                      {t("@legalos.settings.profile.twoFactorHint")}
                    </Text>
                  </VStack>
                  <Button label={t("@legalos.settings.profile.enableTwoFactor")} variant="secondary">
                    {t("@legalos.settings.profile.enable")}
                  </Button>
                </HStack>
                <Divider />
                <VStack gap={3}>
                  <Text type="label">{t("@legalos.settings.profile.activeSessions")}</Text>
                  <List hasDividers density="compact">
                    {SESSIONS.map((s) => (
                      <ListItem
                        key={s.device}
                        label={s.device}
                        description={s.detail}
                        endContent={
                          s.current ? (
                            <Text type="supporting" color="secondary">
                              {t("@legalos.settings.profile.thisDevice")}
                            </Text>
                          ) : (
                            <Button
                              label={t("@legalos.settings.profile.signOutOf", {
                                device: s.device,
                              })}
                              variant="ghost"
                              size="sm"
                            >
                              {t("@legalos.settings.profile.signOut")}
                            </Button>
                          )
                        }
                      />
                    ))}
                  </List>
                </VStack>
              </VStack>
            </Card>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
