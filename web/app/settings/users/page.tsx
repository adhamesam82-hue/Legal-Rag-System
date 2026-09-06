"use client";

/**
 * Firm roster and permissions page (T-053).
 *
 * Manages organization members, roles, matter scopes, pending invitations, and invite dialog.
 * Preserves all hooks, contract layer calls, and state intact.
 */

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { memberLabel, useOrg, useResource } from "@/lib/org";
import { useFormat } from "@/lib/i18n/format";
import { DataView, InlineError } from "@/components/DataState";
import { api, ApiError, type MatterScope, type OrgMember } from "@/lib/api";

type Role = "owner" | "lawyer" | "staff";

const ROLE_COLOR: Record<Role, "primary" | "info" | "neutral"> = {
  owner: "primary",
  lawyer: "info",
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
  onInvited: (recipient: string, emailed: boolean) => void;
}) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { organizationName } = useOrg();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lawyer" | "staff">("lawyer");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<{ url: string; email: string } | null>(null);
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
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={460}>
      <DialogHeader
        title={t("@legalos.settings.invite.title")}
        description={t("@legalos.settings.invite.subtitle", {
          firm: organizationName ?? "",
        })}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        {manualLink ? (
          <div className="flex flex-col gap-4">
            <Alert
              type="warn"
              title={t("@legalos.settings.invite.notEmailedTitle")}
            >
              {t("@legalos.settings.invite.notEmailedBody", {
                email: manualLink.email,
              })}
            </Alert>
            <div
              className="p-3 rounded-md text-xs select-all border"
              style={{
                wordBreak: "break-all",
                fontFamily: "monospace",
                borderColor: "var(--border)",
                backgroundColor: "var(--surface2)",
                color: "var(--text)",
              }}
              dir="ltr"
            >
              {manualLink.url}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <InlineError message={error} onDismiss={() => setError(null)} />
            <Input
              label={t("@legalos.settings.invite.emailLabel")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@example.com"
              required
            />
            <Select
              label={t("@legalos.settings.invite.roleLabel")}
              value={role}
              onChange={(e) => setRole(e.target.value as "lawyer" | "staff")}
              options={[
                { value: "lawyer", label: enumLabel("lawyer") },
                { value: "staff", label: enumLabel("staff") },
              ]}
              helperText={t("@legalos.settings.invite.roleHint")}
            />
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        {manualLink ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(manualLink.url)
                  .then(() => setCopied(true))
                  .catch(() => {});
              }}
            >
              <Icon name={copied ? "check" : "content_copy"} size={16} />
              <span>
                {copied
                  ? t("@legalos.settings.invite.copied")
                  : t("@legalos.settings.invite.copyLink")}
              </span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setManualLink(null);
                onOpenChange(false);
              }}
            >
              {t("@legalos.settings.invite.done")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t("@legalos.settings.action.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={sending || !email.trim()}
              loading={sending}
              onClick={send}
            >
              <Icon name="person_add" size={16} />
              <span>{t("@legalos.settings.invite.send")}</span>
            </Button>
          </div>
        )}
      </DialogFooter>
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
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("@legalos.settings.users.removeFailed"),
      );
      setRemoving(false);
    }
  }

  return (
    <div className="py-3 px-4 flex items-center justify-between gap-4 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ backgroundColor: "var(--primary-soft)", color: "var(--primary)" }}
        >
          {name.slice(0, 2)}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
            {isYou ? t("@legalos.settings.users.nameWithYou", { name }) : name}
          </span>
          <span className="text-xs truncate" style={{ color: "var(--text2)" }}>
            {member.title ?? enumLabel(member.role)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <InlineError message={error} onDismiss={() => setError(null)} />
        <Badge color={ROLE_COLOR[member.role]}>
          {enumLabel(member.role)}
        </Badge>
        {member.role !== "owner" && canRemove && (
          <div style={{ width: "120px" }}>
            <Select
              value={scope}
              onChange={(e) => changeScope(e.target.value as MatterScope)}
              disabled={savingScope}
              options={[
                { value: "all", label: t("@legalos.settings.users.scopeAll") },
                { value: "assigned", label: t("@legalos.settings.users.scopeAssigned") },
              ]}
            />
          </div>
        )}
        {canRemove ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={removing}
            loading={removing}
            onClick={remove}
          >
            {t("@legalos.settings.users.removeFromFirm")}
          </Button>
        ) : (
          <span className="text-xs" style={{ color: "var(--text3)" }}>
            {isYou ? t("@legalos.settings.users.you") : enumLabel(member.role)}
          </span>
        )}
      </div>
    </div>
  );
}

function PendingInvitations({ organizationId }: { organizationId: number }) {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { formatDate } = useFormat();

  const invites = useResource(() => api.listInvites(organizationId), [organizationId]);
  const rows = (invites.data ?? []).filter((invite) => invite.status !== "accepted");
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("@legalos.settings.users.pendingInvitations")}
        </h3>
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {t("@legalos.settings.users.invitationsHint")}
        </p>
      </div>
      <Card className="p-0 divide-y" style={{ borderColor: "var(--border)" }}>
        {rows.map((invite) => (
          <div key={invite.id} className="py-3 px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon name="mail" size={18} style={{ color: "var(--text2)" }} />
              <div className="flex flex-col">
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  {invite.email}
                </span>
                <span className="text-xs" style={{ color: "var(--text2)" }}>
                  {enumLabel(invite.role)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.settings.users.inviteExpiry", {
                  date: formatDate(invite.expires_at),
                })}
              </span>
              <Badge color={invite.status === "pending" ? "info" : "neutral"}>
                {t(`@legalos.settings.users.status.${invite.status}`)}
              </Badge>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function UsersPermissionsPage() {
  const t = useTranslator();
  const { organizationId, organizationName, role: myRole } = useOrg();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [invitesNonce, setInvitesNonce] = useState(0);

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.settings.users.heading")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.users.subtitle", { firm: organizationName ?? "" })}
          </p>
        </div>
        {isOwner && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsInviteOpen(true)}
          >
            <Icon name="person_add" size={16} />
            <span>{t("@legalos.settings.users.inviteMember")}</span>
          </Button>
        )}
      </div>

      {sentTo && (
        <Alert
          type="success"
          title={t("@legalos.settings.users.inviteSent", { email: sentTo })}
          onClose={() => setSentTo(null)}
        />
      )}

      <DataView resource={members}>
        {(roster) => (
          <Card className="p-0">
            {roster.map((member) => (
              <MemberRow
                key={member.clerk_user_id}
                member={member}
                isYou={member.clerk_user_id === myUserId}
                canRemove={
                  isOwner &&
                  member.role !== "owner" &&
                  member.clerk_user_id !== myUserId
                }
                organizationId={organizationId}
                onRemoved={members.reload}
              />
            ))}
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
    </div>
  );
}
