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
import { useLocale } from "@/lib/i18n/provider";
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
                  Settings
                </Text>
              </HStack>
            </Link>
            <VStack gap={1}>
              <Heading level={2}>Your profile</Heading>
              <Text type="body" color="secondary">
                How you appear to the rest of Al-Sayed &amp; Partners.
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
                <Heading level={4}>Photo</Heading>
                <HStack gap={4} vAlign="center" wrap="wrap">
                  <Avatar name={name} size="xl" tooltip={false} />
                  <VStack gap={2}>
                    <HStack gap={2}>
                      <Button
                        label="Upload a new photo"
                        variant="secondary"
                        icon={<Icon icon={ArrowUpTrayIcon} size="sm" />}
                      >
                        Upload photo
                      </Button>
                      <Button label="Remove photo" variant="ghost">
                        Remove
                      </Button>
                    </HStack>
                    <Text type="supporting" color="secondary">
                      JPG or PNG, at least 256×256px. Falls back to your initials.
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>Details</Heading>
                <Grid columns={{ minWidth: 260, repeat: "fit" }} gap={4}>
                  <TextInput label="Full name" value={name} onChange={setName} />
                  <TextInput label="Job title" value={title} onChange={setTitle} />
                  <TextInput label="Email address" value={email} onChange={setEmail} type="email" />
                  <TextInput label="Phone" value={phone} onChange={setPhone} />
                </Grid>
                <Selector
                  label="Interface language"
                  value={locale}
                  onChange={(value) => setLocale(value as Locale)}
                  options={[
                    { value: "en", label: "English" },
                    { value: "ar", label: "العربية (Arabic)" },
                  ]}
                />
                <Divider />
                <HStack gap={2}>
                  <Button label="Save changes" variant="primary">
                    Save changes
                  </Button>
                  <Button label="Discard changes" variant="ghost">
                    Discard
                  </Button>
                </HStack>
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>Role and access</Heading>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <Badge variant="purple" label="Owner" />
                  <Text type="body" color="secondary">
                    Full access to every matter, plus firm billing and team management.
                  </Text>
                </HStack>
                <Text type="supporting" color="secondary">
                  Only an Owner can change roles. A firm must always keep at least one Owner, so
                  your own role cannot be changed while you are the only one.
                </Text>
                <Link href="/settings/users">Manage the team</Link>
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>Notifications</Heading>
                <Switch
                  label="Daily email digest"
                  description="A morning summary of hearings, deadlines, and assignments."
                  value={emailDigest}
                  onChange={setEmailDigest}
                />
                <Divider />
                <Switch
                  label="Hearing reminders"
                  description="Alert me the day before any hearing on a matter I am responsible for."
                  value={hearingAlerts}
                  onChange={setHearingAlerts}
                />
                <Divider />
                <Switch
                  label="Mentions in messages"
                  description="Notify me when a colleague @mentions me in a matter channel."
                  value={mentionAlerts}
                  onChange={setMentionAlerts}
                />
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>Security</Heading>
                <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
                  <VStack gap={1}>
                    <Text type="label">Password</Text>
                    <Text type="supporting" color="secondary">
                      Last changed 4 months ago
                    </Text>
                  </VStack>
                  <Button label="Change password" variant="secondary" icon={<Icon icon={KeyIcon} size="sm" />}>
                    Change password
                  </Button>
                </HStack>
                <Divider />
                <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
                  <VStack gap={1}>
                    <Text type="label">Two-factor authentication</Text>
                    <Text type="supporting" color="secondary">
                      Not enabled — strongly recommended for accounts with billing access.
                    </Text>
                  </VStack>
                  <Button label="Enable two-factor authentication" variant="secondary">
                    Enable
                  </Button>
                </HStack>
                <Divider />
                <VStack gap={3}>
                  <Text type="label">Active sessions</Text>
                  <List hasDividers density="compact">
                    {SESSIONS.map((s) => (
                      <ListItem
                        key={s.device}
                        label={s.device}
                        description={s.detail}
                        endContent={
                          s.current ? (
                            <Text type="supporting" color="secondary">
                              This device
                            </Text>
                          ) : (
                            <Button label={`Sign out of ${s.device}`} variant="ghost" size="sm">
                              Sign out
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
