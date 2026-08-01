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

type Role = "owner" | "lawyer" | "staff";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  lawyer: "Lawyer",
  staff: "Staff",
};

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
  joinedLabel: string;
}

const MEMBERS: Member[] = [
  {
    id: "ahmed",
    name: "Ahmed Al-Sayed",
    email: "ahmed@alsayedpartners.com",
    role: "owner",
    isYou: true,
    joinedLabel: "Founding member",
  },
  {
    id: "mona",
    name: "Mona Farouk",
    email: "mona.farouk@alsayedpartners.com",
    role: "lawyer",
    joinedLabel: "Joined Mar 2026",
  },
  {
    id: "youssef",
    name: "Youssef Adel",
    email: "youssef.adel@alsayedpartners.com",
    role: "lawyer",
    joinedLabel: "Joined Apr 2026",
  },
  {
    id: "layla",
    name: "Layla Hassan",
    email: "layla.hassan@alsayedpartners.com",
    role: "staff",
    joinedLabel: "Joined May 2026",
  },
];

type InviteStatus = "pending" | "expired" | "revoked";

interface Invitation {
  id: string;
  email: string;
  role: Role;
  status: InviteStatus;
  detail: string;
}

const INVITATIONS: Invitation[] = [
  {
    id: "inv-1",
    email: "sara.ibrahim@example.com",
    role: "lawyer",
    status: "pending",
    detail: "Invited 2 days ago · expires in 5 days",
  },
  {
    id: "inv-2",
    email: "khaled.reda@example.com",
    role: "staff",
    status: "expired",
    detail: "Invited 9 days ago · expired 2 days ago",
  },
];

const INVITE_STATUS_BADGE: Record<InviteStatus, { variant: "warning" | "neutral"; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  expired: { variant: "neutral", label: "Expired" },
  revoked: { variant: "neutral", label: "Revoked" },
};

function InviteMemberDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("lawyer");

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <Layout
        header={
          <DialogHeader
            title="Invite a team member"
            subtitle="They'll get an email with a link to join Al-Sayed & Partners. Invitations expire after 7 days."
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <TextInput
                label="Email address"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="name@example.com"
                startIcon={EnvelopeIcon}
                isRequired
              />
              <Selector
                label="Role"
                value={role}
                onChange={setRole}
                options={[
                  { value: "lawyer", label: "Lawyer" },
                  { value: "staff", label: "Staff" },
                ]}
                description="New members can only be invited as Lawyer or Staff."
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                label="Send invite"
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
  if (member.role === "owner") {
    return (
      <Text type="supporting" color="secondary">
        {member.isYou ? "You" : "Owner"}
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
            { label: "Change role to Lawyer", onClick: () => {} },
            { label: "Change role to Staff", onClick: () => {} },
          ],
        },
        { type: "divider" },
        { label: "Remove from firm", onClick: () => {} },
      ]}
    />
  );
}

export default function UsersPermissionsPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <VStack gap={6}>
      <HStack hAlign="between" vAlign="start">
        <VStack gap={1}>
          <Heading level={4}>Users &amp; permissions</Heading>
          <Text type="body" color="secondary">
            Manage who has access to Al-Sayed &amp; Partners and what they can do. Only
            Owners can invite new members.
          </Text>
        </VStack>
        <Button
          label="Invite member"
          variant="primary"
          icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
          onClick={() => setIsInviteOpen(true)}
        >
          Invite member
        </Button>
      </HStack>

      <Card padding={0}>
        <List hasDividers density="balanced">
          {MEMBERS.map((member) => (
            <ListItem
              key={member.id}
              label={member.isYou ? `${member.name} (you)` : member.name}
              description={member.email}
              startContent={<Avatar name={member.name} size="md" tooltip={false} />}
              endContent={
                <HStack gap={3} vAlign="center">
                  <Badge variant={ROLE_BADGE_VARIANT[member.role]} label={ROLE_LABEL[member.role]} />
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
            Pending invitations
          </Text>
          <Text type="supporting" color="secondary">
            Invitations are single-use links that expire 7 days after they're sent.
          </Text>
        </VStack>
        <Card padding={0}>
          <List hasDividers density="balanced">
            {INVITATIONS.map((invite) => (
              <ListItem
                key={invite.id}
                label={invite.email}
                description={invite.detail}
                startContent={<Icon icon={EnvelopeIcon} size="sm" color="secondary" />}
                endContent={
                  <HStack gap={3} vAlign="center">
                    <Badge variant="neutral" label={ROLE_LABEL[invite.role]} />
                    <Badge
                      variant={INVITE_STATUS_BADGE[invite.status].variant}
                      label={INVITE_STATUS_BADGE[invite.status].label}
                    />
                    {invite.status !== "revoked" && (
                      <Button label="Resend" variant="ghost" size="sm">
                        Resend
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
