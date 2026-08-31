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
import { Banner } from "@astryxdesign/core/Banner";
import { Avatar } from "@astryxdesign/core/Avatar";
import { List, ListItem } from "@astryxdesign/core/List";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Icon } from "@astryxdesign/core/Icon";
import { EnvelopeIcon, PlusIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { memberLabel, useOrg, useResource } from "@/lib/org";
import { useFormat } from "@/lib/i18n/format";
import { DataView, InlineError } from "@/components/DataState";
import { api, ApiError, type MatterScope, type OrgMember } from "@/lib/api";

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
  /** `emailed` is false when the invitation was created but no mail went out;
   *  the dialog then stays open with the link, so the page must not claim a
   *  message was sent. */
  onInvited: (recipient: string, emailed: boolean) => void;
}) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { organizationName } = useOrg();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lawyer" | "staff">("lawyer");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the invitation was created but no mail went out. The dialog then
  // stays open showing the link, because closing it would lose the only copy
  // of the one thing the owner now has to deliver by hand.
  const [manualLink, setManualLink] = useState<{ url: string; email: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  async function send() {
    if (organizationId === null || !email.trim()) return;
    setSending(true);
    setError(null);
    try {
      const recipient = email.trim();
      const invitation = await api.createInvite(organizationId, recipient, role);
      setEmail("");
      onInvited(recipient, invitation.email_sent);
      // Only a sent invitation closes the dialog on its own. When the mail
      // did not go, saying nothing would leave the owner waiting on a
      // colleague who was never told.
      if (invitation.email_sent) {
        onOpenChange(false);
      } else {
        setManualLink({ url: invitation.accept_url, email: recipient });
        setCopied(false);
      }
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
            {manualLink ? (
              <VStack gap={4}>
                <Banner
                  status="warning"
                  title={t("@legalos.settings.invite.notEmailedTitle")}
                  description={t("@legalos.settings.invite.notEmailedBody", {
                    email: manualLink.email,
                  })}
                />
                <div
                  style={{
                    // The link is long and has no spaces, so it must be told
                    // to wrap or it pushes the dialog wider than the viewport.
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                    fontSize: 13,
                    padding: 10,
                    borderRadius: 6,
                    background: "var(--color-background-neutral-subtle, #f4f4f5)",
                  }}
                  // LTR: a URL laid out right-to-left inside an Arabic dialog
                  // renders its segments in an order that cannot be copied by
                  // eye, which is exactly what this element is for.
                  dir="ltr"
                >
                  {manualLink.url}
                </div>
              </VStack>
            ) : (
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
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              {manualLink ? (
                <>
                  <Button
                    label={
                      copied
                        ? t("@legalos.settings.invite.copied")
                        : t("@legalos.settings.invite.copyLink")
                    }
                    variant="secondary"
                    onClick={() => {
                      // Not available over plain http on a non-localhost
                      // origin, and it rejects rather than throwing -- the
                      // link stays on screen to be selected by hand either
                      // way, so a failure just leaves the label unchanged.
                      navigator.clipboard
                        ?.writeText(manualLink.url)
                        .then(() => setCopied(true))
                        .catch(() => {});
                    }}
                  >
                    {copied
                      ? t("@legalos.settings.invite.copied")
                      : t("@legalos.settings.invite.copyLink")}
                  </Button>
                  <Button
                    label={t("@legalos.settings.invite.done")}
                    variant="primary"
                    onClick={() => {
                      setManualLink(null);
                      onOpenChange(false);
                    }}
                  >
                    {t("@legalos.settings.invite.done")}
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
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

  const name = memberLabel(member);
  const [scope, setScope] = useState<MatterScope>(member.matter_scope);
  const [savingScope, setSavingScope] = useState(false);

  async function changeScope(next: MatterScope) {
    if (organizationId === null) return;
    const previous = scope;
    setScope(next);
    setSavingScope(true);
    setError(null);
    try {
      await api.setMatterScope(organizationId, member.clerk_user_id, next);
    } catch (cause) {
      // Put the control back where it was: leaving it showing a setting the
      // server refused is how someone believes access is restricted when it
      // is not.
      setScope(previous);
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("@legalos.settings.users.scopeFailed"),
      );
    } finally {
      setSavingScope(false);
    }
  }

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
          {member.role !== "owner" && canRemove && (
            <Selector
              label={t("@legalos.settings.users.scopeLabel")}
              isLabelHidden
              value={scope}
              onChange={(value) => changeScope(value as MatterScope)}
              isDisabled={savingScope}
              size="sm"
              options={[
                { value: "all", label: t("@legalos.settings.users.scopeAll") },
                { value: "assigned", label: t("@legalos.settings.users.scopeAssigned") },
              ]}
            />
          )}
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

/**
 * Invitations that have been sent but not yet accepted.
 *
 * Sending one closed the dialog and left nothing behind — the recipient is
 * not a member until they accept, so an owner had no way to see that they had
 * already invited someone, or that the link had since expired. The endpoint
 * behind this did not exist either; both halves are new.
 */
function PendingInvitations({ organizationId }: { organizationId: number }) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { formatDate } = useFormat();

  const invites = useResource(() => api.listInvites(organizationId), [
    organizationId,
  ]);

  const rows = (invites.data ?? []).filter(
    (invite) => invite.status !== "accepted",
  );
  if (rows.length === 0) return null;

  return (
    <VStack gap={3}>
      <VStack gap={1}>
        <Heading level={5}>
          {t("@legalos.settings.users.pendingInvitations")}
        </Heading>
        <Text type="supporting" color="secondary">
          {t("@legalos.settings.users.invitationsHint")}
        </Text>
      </VStack>
      <Card padding={0}>
        <List hasDividers density="compact">
          {rows.map((invite) => (
            <ListItem
              key={invite.id}
              label={invite.email}
              description={enumLabel(invite.role)}
              startContent={<Icon icon={EnvelopeIcon} size="sm" color="secondary" />}
              endContent={
                <HStack gap={3} vAlign="center">
                  <Text type="supporting" color="secondary">
                    {t("@legalos.settings.users.inviteExpiry", {
                      date: formatDate(invite.expires_at),
                    })}
                  </Text>
                  <Badge
                    variant={invite.status === "pending" ? "info" : "neutral"}
                    label={t(
                      `@legalos.settings.users.status.${invite.status}`,
                    )}
                  />
                </HStack>
              }
            />
          ))}
        </List>
      </Card>
    </VStack>
  );
}

export default function UsersPermissionsPage() {
  const t = useTranslator();
  const { organizationId, organizationName, role: myRole } = useOrg();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  // What the dialog never said. A successful send closed it in silence, which
  // is indistinguishable from a send that failed.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [invitesNonce, setInvitesNonce] = useState(0);

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

      {sentTo && (
        <Banner
          status="success"
          title={t("@legalos.settings.users.inviteSent", { email: sentTo })}
          isDismissable
          onDismiss={() => setSentTo(null)}
        />
      )}

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

      {isOwner && organizationId !== null && (
        <PendingInvitations
          key={invitesNonce}
          organizationId={organizationId}
        />
      )}

      <InviteMemberDialog
        isOpen={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        organizationId={organizationId}
        onInvited={(recipient, emailed) => {
          if (emailed) setSentTo(recipient);
          setInvitesNonce((n) => n + 1);
          members.reload();
        }}
      />
    </VStack>
  );
}
