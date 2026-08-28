"use client";

/**
 * The firm's roster, from the firm's own database.
 *
 * This screen used to render four invented people and two invented
 * invitations, with every control a no-op — while the endpoints behind all of
 * it existed and were covered by tests. An owner opening it saw four strangers
 * listed as their team.
 *
 * Changing someone's role is deliberately absent rather than disabled-looking:
 * there is no endpoint for it (orgs.py exposes add and remove, not update), so
 * offering the control at all would be the same lie in a smaller box. To move
 * someone between roles today, remove them and invite them again.
 */

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
import { Icon } from "@astryxdesign/core/Icon";
import { EnvelopeIcon, PlusIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { useOrg, useResource } from "@/lib/org";
import { DataView, InlineError } from "@/components/DataState";
import { api, ApiError, type OrgMember } from "@/lib/api";

type Role = "owner" | "lawyer" | "staff";

const ROLE_BADGE_VARIANT: Record<Role, "purple" | "blue" | "neutral"> = {
  owner: "purple",
  lawyer: "blue",
  staff: "neutral",
};

function InviteMemberDialog({
  isOpen,
  onOpenChange,
  organizationId,
  onInvited,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number | null;
  onInvited: () => void;
}) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { organizationName } = useOrg();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lawyer" | "staff">("lawyer");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (organizationId === null || !email.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.createInvite(organizationId, email.trim(), role);
      setEmail("");
      onInvited();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("@legalos.settings.users.inviteFailed"),
      );
    } finally {
      setSending(false);
    }
  }

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
              <InlineError message={error} onDismiss={() => setError(null)} />
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
                onChange={(value) => setRole(value as "lawyer" | "staff")}
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
                {t("@legalos.settings.action.cancel")}
              </Button>
              <Button
                label={t("@legalos.settings.invite.send")}
                variant="primary"
                isDisabled={sending || !email.trim()}
                icon={<Icon icon={UserPlusIcon} size="sm" color="inherit" />}
                onClick={send}
              >
                {t("@legalos.settings.invite.send")}
              </Button>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

function MemberRow({
  member,
  isYou,
  canRemove,
  onRemoved,
  organizationId,
}: {
  member: OrgMember;
  isYou: boolean;
  canRemove: boolean;
  onRemoved: () => void;
  organizationId: number | null;
}) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = member.display_name ?? member.clerk_user_id;

  async function remove() {
    if (organizationId === null) return;
    setRemoving(true);
    setError(null);
    try {
      await api.removeMember(organizationId, member.clerk_user_id);
      onRemoved();
    } catch (cause) {
      // The server refuses to remove the last owner; surface its reason rather
      // than a generic failure, because that one is actionable.
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("@legalos.settings.users.removeFailed"),
      );
      setRemoving(false);
    }
  }

  return (
    <ListItem
      label={isYou ? t("@legalos.settings.users.nameWithYou", { name }) : name}
      description={member.title ?? enumLabel(member.role)}
      startContent={<Avatar name={name} size="md" tooltip={false} />}
      endContent={
        <HStack gap={3} vAlign="center">
          <InlineError message={error} onDismiss={() => setError(null)} />
          <Badge variant={ROLE_BADGE_VARIANT[member.role]} label={enumLabel(member.role)} />
          {canRemove ? (
            <Button
              label={t("@legalos.settings.users.removeFromFirm")}
              variant="ghost"
              size="sm"
              isDisabled={removing}
              onClick={remove}
            >
              {t("@legalos.settings.users.removeFromFirm")}
            </Button>
          ) : (
            <Text type="supporting" color="secondary">
              {isYou ? t("@legalos.settings.users.you") : enumLabel(member.role)}
            </Text>
          )}
        </HStack>
      }
    />
  );
}

export default function UsersPermissionsPage() {
  const t = useTranslator();
  const { organizationId, organizationName, role: myRole } = useOrg();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Who "you" are, from the API rather than a Clerk hook: this has to be right
  // in the local dev-auth mode too, where there is no Clerk session to ask.
  const me = useResource((practice) => practice.me(), []);
  const myUserId = me.data?.clerk_user_id ?? null;

  const members = useResource(
    () =>
      organizationId === null
        ? Promise.resolve([] as OrgMember[])
        : api.listOrgMembers(organizationId),
    [organizationId],
  );

  const isOwner = myRole === "owner";

  return (
    <VStack gap={6}>
      <HStack hAlign="between" vAlign="start">
        <VStack gap={1}>
          <Heading level={4}>{t("@legalos.settings.users.heading")}</Heading>
          <Text type="body" color="secondary">
            {t("@legalos.settings.users.subtitle", { firm: organizationName ?? "" })}
          </Text>
        </VStack>
        {isOwner && (
          <Button
            label={t("@legalos.settings.users.inviteMember")}
            variant="primary"
            icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
            onClick={() => setIsInviteOpen(true)}
          >
            {t("@legalos.settings.users.inviteMember")}
          </Button>
        )}
      </HStack>

      <DataView resource={members}>
        {(roster) => (
          <Card padding={0}>
            <List hasDividers density="balanced">
              {roster.map((member) => (
                <MemberRow
                  key={member.clerk_user_id}
                  member={member}
                  isYou={member.clerk_user_id === myUserId}
                  // Only an owner manages the roster, and nobody removes
                  // themselves from here — leaving is not the same action as
                  // being removed, and conflating them loses the last owner.
                  canRemove={
                    isOwner &&
                    member.role !== "owner" &&
                    member.clerk_user_id !== myUserId
                  }
                  organizationId={organizationId}
                  onRemoved={members.reload}
                />
              ))}
            </List>
          </Card>
        )}
      </DataView>

      <InviteMemberDialog
        isOpen={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        organizationId={organizationId}
        onInvited={members.reload}
      />
    </VStack>
  );
}
