"use client";

import { useState } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import {
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  PlusIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { useOrg } from "@/lib/org";

type Role = "owner" | "lawyer" | "staff";

const ROLE_BADGE_VARIANT: Record<Role, "purple" | "blue" | "neutral"> = {
  owner: "purple",
  lawyer: "blue",
  staff: "neutral",
};

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  isYou?: boolean;
  /** Founding members have no join date; the rest carry a month key + year. */
  joinedMonthKey?: string;
  joinedYear?: number;
}

const MEMBERS: Member[] = [
  {
    id: "ahmed",
    name: "Ahmed Al-Sayed",
    email: "ahmed@alsayedpartners.com",
    role: "owner",
    isYou: true,

  },
  {
    id: "mona",
    name: "Mona Farouk",
    email: "mona.farouk@alsayedpartners.com",
    role: "lawyer",
    joinedMonthKey: "@legalos.settings.month.mar",
    joinedYear: 2026,
  },
  {
    id: "youssef",
    name: "Youssef Adel",
    email: "youssef.adel@alsayedpartners.com",
    role: "lawyer",
    joinedMonthKey: "@legalos.settings.month.apr",
    joinedYear: 2026,
  },
  {
    id: "layla",
    name: "Layla Hassan",
    email: "layla.hassan@alsayedpartners.com",
    role: "staff",
    joinedMonthKey: "@legalos.settings.month.may",
    joinedYear: 2026,
  },
];

type InviteStatus = "pending" | "expired" | "revoked";

interface Invitation {
  id: string;
  email: string;
  role: Role;
  status: InviteStatus;
  sentDaysAgo: number;
  expiresInDays?: number;
  expiredDaysAgo?: number;
}

const INVITATIONS: Invitation[] = [
  {
    id: "inv-1",
    email: "sara.ibrahim@example.com",
    role: "lawyer",
    status: "pending",
    sentDaysAgo: 2,
    expiresInDays: 5,
  },
  {
    id: "inv-2",
    email: "khaled.reda@example.com",
    role: "staff",
    status: "expired",
    sentDaysAgo: 9,
    expiredDaysAgo: 2,
  },
];

const INVITE_STATUS_BADGE: Record<
  InviteStatus,
  { variant: "warning" | "neutral"; labelKey: string }
> = {
  pending: { variant: "warning", labelKey: "@legalos.settings.users.status.pending" },
  expired: { variant: "neutral", labelKey: "@legalos.settings.users.status.expired" },
  revoked: { variant: "neutral", labelKey: "@legalos.settings.users.status.revoked" },
};

function InviteMemberDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { organizationName } = useOrg();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("lawyer");

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.settings.invite.title")}
            subtitle={t("@legalos.settings.invite.subtitle", {
              firm: organizationName ?? "",
            })}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <TextInput
                label={t("@legalos.settings.invite.emailLabel")}
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="name@example.com"
                startIcon={EnvelopeIcon}
                isRequired
              />
              <Selector
                label={t("@legalos.settings.invite.roleLabel")}
                value={role}
                onChange={setRole}
                options={[
                  { value: "lawyer", label: enumLabel("lawyer") },
                  { value: "staff", label: enumLabel("staff") },
                ]}
                description={t("@legalos.settings.invite.roleHint")}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button
                label={t("@legalos.settings.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                label={t("@legalos.settings.invite.send")}
                variant="primary"
                icon={<Icon icon={UserPlusIcon} size="sm" color="inherit" />}
                onClick={() => {
                  setEmail("");
                  onOpenChange(false);
                }}
              >
                Send invite
              </Button>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

function MemberActions({ member }: { member: Member }) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  if (member.role === "owner") {
    return (
      <Text type="supporting" color="secondary">
        {member.isYou ? t("@legalos.settings.users.you") : enumLabel("owner")}
      </Text>
    );
  }
  return (
    <DropdownMenu
      button={{
        label: `Manage ${member.name}`,
        variant: "ghost",
        isIconOnly: true,
        icon: <Icon icon={EllipsisHorizontalIcon} size="sm" />,
      }}
      hasChevron={false}
      items={[
        {
          type: "section",
          items: [
            { label: t("@legalos.settings.users.changeRoleToLawyer"), onClick: () => {} },
            { label: t("@legalos.settings.users.changeRoleToStaff"), onClick: () => {} },
          ],
        },
        { type: "divider" },
        { label: t("@legalos.settings.users.removeFromFirm"), onClick: () => {} },
      ]}
    />
  );
}

export default function UsersPermissionsPage() {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { organizationName } = useOrg();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <VStack gap={6}>
      <HStack hAlign="between" vAlign="start">
        <VStack gap={1}>
          <Heading level={4}>{t("@legalos.settings.users.heading")}</Heading>
          <Text type="body" color="secondary">
            {t("@legalos.settings.users.subtitle", { firm: organizationName ?? "" })}
          </Text>
        </VStack>
        <Button
          label={t("@legalos.settings.users.inviteMember")}
          variant="primary"
          icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
          onClick={() => setIsInviteOpen(true)}
        >
          {t("@legalos.settings.users.inviteMember")}
        </Button>
      </HStack>

      <Card padding={0}>
        <List hasDividers density="balanced">
          {MEMBERS.map((member) => (
            <ListItem
              key={member.id}
              label={
                member.isYou
                  ? t("@legalos.settings.users.nameWithYou", { name: member.name })
                  : member.name
              }
              description={
                /* joinedMonthKey/joinedYear were carried in this mock data but
                 * never rendered; surfacing them here alongside the email is
                 * what they were collected for. */
                member.joinedMonthKey && member.joinedYear
                  ? `${member.email} · ${t("@legalos.settings.users.joined", {
                      month: t(member.joinedMonthKey),
                      year: member.joinedYear,
                    })}`
                  : `${member.email} · ${t("@legalos.settings.users.foundingMember")}`
              }
              startContent={<Avatar name={member.name} size="md" tooltip={false} />}
              endContent={
                <HStack gap={3} vAlign="center">
                  <Badge
                    variant={ROLE_BADGE_VARIANT[member.role]}
                    label={enumLabel(member.role)}
                  />
                  <MemberActions member={member} />
                </HStack>
              }
            />
          ))}
        </List>
      </Card>

      <VStack gap={3}>
        <VStack gap={1}>
          <Text type="label" weight="semibold">
            {t("@legalos.settings.users.pendingInvitations")}
          </Text>
          <Text type="supporting" color="secondary">
            {t("@legalos.settings.users.invitationsHint")}
          </Text>
        </VStack>
        <Card padding={0}>
          <List hasDividers density="balanced">
            {INVITATIONS.map((invite) => (
              <ListItem
                key={invite.id}
                label={invite.email}
                description={
                  invite.status === "pending"
                    ? t("@legalos.settings.users.invitePending", {
                        sent: invite.sentDaysAgo,
                        expires: invite.expiresInDays ?? 0,
                      })
                    : t("@legalos.settings.users.inviteExpired", {
                        sent: invite.sentDaysAgo,
                        expired: invite.expiredDaysAgo ?? 0,
                      })
                }
                startContent={<Icon icon={EnvelopeIcon} size="sm" color="secondary" />}
                endContent={
                  <HStack gap={3} vAlign="center">
                    <Badge variant="neutral" label={enumLabel(invite.role)} />
                    <Badge
                      variant={INVITE_STATUS_BADGE[invite.status].variant}
                      label={t(INVITE_STATUS_BADGE[invite.status].labelKey)}
                    />
                    {invite.status !== "revoked" && (
                      <Button
                        label={t("@legalos.settings.users.resend")}
                        variant="ghost"
                        size="sm"
                      >
                        {t("@legalos.settings.users.resend")}
                      </Button>
                    )}
                  </HStack>
                }
              />
            ))}
          </List>
        </Card>
      </VStack>

      <InviteMemberDialog isOpen={isInviteOpen} onOpenChange={setIsInviteOpen} />
    </VStack>
  );
}
