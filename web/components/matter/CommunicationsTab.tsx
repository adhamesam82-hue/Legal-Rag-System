"use client";

/**
 * Communications, in Clio's three parts:
 *
 *   Logs           — calls, emails, meetings and letters that happened elsewhere
 *   Secure messages — threads the product itself carries
 *   Client portals  — who from the client can see this matter, and what of it
 *
 * The split matters: a log is a record of something that already happened and
 * is edited freely; a message is a thing the product sent and is not.
 */

import React, { useMemo, useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { useMemberName, useOrg } from "@/lib/org";
import {
  type ClientPortal,
  type CommunicationChannel,
  type CommunicationDirection,
  type PortalStatus,
  type SecureThread,
} from "@/lib/practice";
import { useFormat } from "@/lib/i18n/format";
import { Panel, useWrite, type TabProps } from "./shared";

const CHANNELS: CommunicationChannel[] = ["phone", "email", "meeting", "letter"];
const CHANNEL_ICON: Record<CommunicationChannel, string> = {
  phone: "call",
  email: "mail",
  meeting: "groups",
  letter: "drafts",
};

const PORTAL_VARIANT: Record<PortalStatus, "success" | "warn" | "neutral"> = {
  active: "success",
  invited: "warn",
  revoked: "neutral",
};

export function CommunicationsTab(props: TabProps) {
  const t = useTranslator();
  const [sub, setSub] = useState<"logs" | "messages" | "portals">("logs");

  const unreadCount = props.data.threads.reduce(
    (sum, thread) => sum + thread.unread_count,
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Sub Tabs Bar */}
      <div
        className="flex items-center gap-2 border-b pb-2 flex-wrap"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setSub("logs")}
          className="px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-2"
          style={{
            backgroundColor: sub === "logs" ? "var(--surface2)" : "transparent",
            color: sub === "logs" ? "var(--primary)" : "var(--text2)",
          }}
        >
          {t("@legalos.matterWorkspace.comms.sub.logs")}
        </button>
        <button
          type="button"
          onClick={() => setSub("messages")}
          className="px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-2"
          style={{
            backgroundColor: sub === "messages" ? "var(--surface2)" : "transparent",
            color: sub === "messages" ? "var(--primary)" : "var(--text2)",
          }}
        >
          <span>{t("@legalos.matterWorkspace.comms.sub.messages")}</span>
          {unreadCount > 0 && (
            <Badge color="danger" variant="soft" size="sm">
              {String(unreadCount)}
            </Badge>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSub("portals")}
          className="px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-2"
          style={{
            backgroundColor: sub === "portals" ? "var(--surface2)" : "transparent",
            color: sub === "portals" ? "var(--primary)" : "var(--text2)",
          }}
        >
          {t("@legalos.matterWorkspace.comms.sub.portals")}
        </button>
      </div>

      {sub === "logs" && <LogsPanel {...props} />}
      {sub === "messages" && <MessagesPanel {...props} />}
      {sub === "portals" && <PortalsPanel {...props} />}
    </div>
  );
}

// --- logs -------------------------------------------------------------------

function LogsPanel({ data, reload, onError }: TabProps) {
  const { formatDateTime } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const [channel, setChannel] = useState<"all" | CommunicationChannel>("all");
  const [search, setSearch] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.communications.filter((entry) => {
      if (channel !== "all" && entry.channel !== channel) return false;
      if (!needle) return true;
      return (
        entry.subject.toLowerCase().includes(needle) ||
        entry.body.toLowerCase().includes(needle) ||
        entry.counterparty.toLowerCase().includes(needle)
      );
    });
  }, [data.communications, channel, search]);

  return (
    <>
      <Panel
        action={
          <div className="flex items-center gap-3 flex-wrap">
            <div
              role="radiogroup"
              aria-label={t("@legalos.matterWorkspace.comms.form.channel")}
              className="inline-flex p-1 border max-w-fit"
              style={{
                backgroundColor: "var(--surface2)",
                borderColor: "var(--border)",
                borderRadius: "var(--rs)",
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={channel === "all"}
                onClick={() => setChannel("all")}
                className="px-2.5 py-1 text-xs font-medium transition-all"
                style={{
                  borderRadius: "calc(var(--rs) - 2px)",
                  backgroundColor: channel === "all" ? "var(--surface)" : "transparent",
                  color: channel === "all" ? "var(--text)" : "var(--text2)",
                  boxShadow: channel === "all" ? "var(--shadow)" : "none",
                }}
              >
                {t("@legalos.matterWorkspace.comms.channel.all")}
              </button>
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  role="radio"
                  aria-checked={channel === ch}
                  onClick={() => setChannel(ch)}
                  className="px-2.5 py-1 text-xs font-medium transition-all"
                  style={{
                    borderRadius: "calc(var(--rs) - 2px)",
                    backgroundColor: channel === ch ? "var(--surface)" : "transparent",
                    color: channel === ch ? "var(--text)" : "var(--text2)",
                    boxShadow: channel === ch ? "var(--shadow)" : "none",
                  }}
                >
                  {t(`@legalos.matterWorkspace.comms.channel.${ch}`)}
                </button>
              ))}
            </div>
            <div className="w-52">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("@legalos.matterWorkspace.comms.logs.search")}
                startIcon={<Icon name="search" size={16} />}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsLogging(true)}
            >
              {t("@legalos.matterWorkspace.comms.logs.new")}
            </Button>
          </div>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon name="call" size={24} />}
            title={t("@legalos.matterWorkspace.comms.logs.emptyTitle")}
            description={t("@legalos.matterWorkspace.comms.logs.emptyDescription")}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsLogging(true)}
              >
                {t("@legalos.matterWorkspace.comms.logs.new")}
              </Button>
            }
          />
        ) : (
          <div
            className="flex flex-col rounded-md border divide-y overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            {visible.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    name={CHANNEL_ICON[entry.channel]}
                    size={16}
                    style={{ color: "var(--text3)" }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                      {entry.subject ||
                        t(`@legalos.matterWorkspace.comms.channel.${entry.channel}`)}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                      {[
                        entry.counterparty,
                        memberName(entry.logged_by),
                        entry.duration_minutes
                          ? t("@legalos.matterWorkspace.comms.logs.duration", {
                              count: entry.duration_minutes,
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge color="neutral" variant="soft">
                    {t(
                      `@legalos.matterWorkspace.comms.direction.${entry.direction}`,
                    )}
                  </Badge>
                  <span className="text-xs" style={{ color: "var(--text3)" }}>
                    {formatDateTime(entry.occurred_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <LogDialog
        isOpen={isLogging}
        onOpenChange={setIsLogging}
        matterId={data.matter.id}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function LogDialog({
  isOpen,
  onOpenChange,
  matterId,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  matterId: number;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [channel, setChannel] = useState<CommunicationChannel>("phone");
  const [direction, setDirection] = useState<CommunicationDirection>("outgoing");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [duration, setDuration] = useState(15);
  const [saving, setSaving] = useState(false);

  // Only a two-way exchange has a duration; the API rejects one on an email.
  const hasDuration = channel === "phone" || channel === "meeting";

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.communications.log({
          matter_id: matterId,
          channel,
          direction,
          subject,
          body,
          counterparty,
          occurred_at: new Date().toISOString(),
          duration_minutes: hasDuration ? duration : null,
        }),
      "@legalos.matterWorkspace.errors.communication",
    );
    setSaving(false);
    if (ok) {
      setSubject("");
      setBody("");
      setCounterparty("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={520}>
      <DialogHeader
        title={t("@legalos.matterWorkspace.comms.logs.new")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label={t("@legalos.matterWorkspace.comms.form.channel")}
              value={channel}
              onChange={(e) => setChannel(e.target.value as CommunicationChannel)}
              options={CHANNELS.map((value) => ({
                value,
                label: t(`@legalos.matterWorkspace.comms.channel.${value}`),
              }))}
            />
            <Select
              label={t("@legalos.matterWorkspace.comms.form.direction")}
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as CommunicationDirection)
              }
              options={(["incoming", "outgoing"] as const).map((value) => ({
                value,
                label: t(`@legalos.matterWorkspace.comms.direction.${value}`),
              }))}
            />
            {hasDuration && (
              <Input
                type="number"
                label={t("@legalos.matterWorkspace.comms.form.duration")}
                value={duration}
                onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : 1)}
                min={1}
                step={5}
              />
            )}
          </div>
          <Input
            label={t("@legalos.matterWorkspace.comms.form.counterparty")}
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
          />
          <Input
            label={t("@legalos.matterWorkspace.comms.form.subject")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            label={t("@legalos.matterWorkspace.comms.form.body")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.action.save")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// --- secure messages --------------------------------------------------------

function MessagesPanel({ data, reload, onError }: TabProps) {
  const t = useTranslator();
  const [isStarting, setIsStarting] = useState(false);

  return (
    <>
      <Panel
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsStarting(true)}
          >
            {t("@legalos.matterWorkspace.comms.messages.new")}
          </Button>
        }
      >
        {data.threads.length === 0 ? (
          <EmptyState
            icon={<Icon name="chat" size={24} />}
            title={t("@legalos.matterWorkspace.comms.messages.emptyTitle")}
            description={t(
              "@legalos.matterWorkspace.comms.messages.emptyDescription",
            )}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsStarting(true)}
              >
                {t("@legalos.matterWorkspace.comms.messages.new")}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {data.threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                reload={reload}
                onError={onError}
              />
            ))}
          </div>
        )}
      </Panel>

      <StartThreadDialog
        isOpen={isStarting}
        onOpenChange={setIsStarting}
        data={data}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function ThreadCard({
  thread,
  reload,
  onError,
}: {
  thread: SecureThread;
  reload: () => void;
  onError: (message: string) => void;
}) {
  const { formatDateTime } = useFormat();
  const t = useTranslator();
  const memberName = useMemberName();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!practice || !reply.trim()) return;
    setSending(true);
    const ok = await write(
      () => practice.portals.reply(thread.id, reply.trim()),
      "@legalos.matterWorkspace.errors.message",
    );
    setSending(false);
    if (ok) setReply("");
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {thread.subject}
            </span>
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              {[
                thread.contact_name ??
                  t("@legalos.matterWorkspace.comms.messages.noPortal"),
                t("@legalos.matterWorkspace.comms.messages.count", {
                  count: thread.message_count,
                }),
              ].join(" · ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {thread.unread_count > 0 && (
              <Badge color="danger" variant="soft">
                {t("@legalos.matterWorkspace.comms.messages.unread", {
                  count: thread.unread_count,
                })}
              </Badge>
            )}
            {thread.unread_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  write(
                    () => practice!.portals.markRead(thread.id),
                    "@legalos.matterWorkspace.errors.message",
                  )
                }
              >
                {t("@legalos.matterWorkspace.comms.messages.markRead")}
              </Button>
            )}
          </div>
        </div>

        <div
          className="flex flex-col rounded-md border divide-y overflow-hidden my-2"
          style={{ borderColor: "var(--border)" }}
        >
          {thread.messages.map((message) => {
            const author =
              message.author_kind === "firm"
                ? memberName(message.author_user)
                : message.author_name ||
                  t("@legalos.matterWorkspace.comms.messages.client");
            return (
              <div
                key={message.id}
                className="flex items-start justify-between gap-3 p-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    title={author}
                    className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0 mt-0.5"
                    style={{
                      backgroundColor: "var(--surface3)",
                      borderColor: "var(--border)",
                      color: "var(--text2)",
                    }}
                  >
                    {author ? author.slice(0, 2).toUpperCase() : "?"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                      {author}
                    </span>
                    <p className="text-xs m-0 mt-1 leading-relaxed" style={{ color: "var(--text2)" }}>
                      {message.body}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] shrink-0" style={{ color: "var(--text3)" }}>
                  {formatDateTime(message.sent_at)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t("@legalos.matterWorkspace.comms.messages.reply")}
            />
          </div>
          <Button
            variant="primary"
            loading={sending}
            disabled={!reply.trim()}
            onClick={send}
          >
            {t("@legalos.matterWorkspace.comms.messages.send")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StartThreadDialog({
  isOpen,
  onOpenChange,
  data,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: TabProps["data"];
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [portalId, setPortalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Only a live grant can carry a thread to the client; a revoked one cannot.
  const reachable = data.portals.filter((portal) => portal.status !== "revoked");

  async function submit() {
    if (!practice) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.matters.startThread(data.matter.id, {
          subject: subject.trim(),
          body: body.trim(),
          ...(portalId ? { portal_id: Number(portalId) } : {}),
        }),
      "@legalos.matterWorkspace.errors.message",
    );
    setSaving(false);
    if (ok) {
      setSubject("");
      setBody("");
      setPortalId(null);
      onOpenChange(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={520}>
      <DialogHeader
        title={t("@legalos.matterWorkspace.comms.messages.new")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <Select
            label={t("@legalos.matterWorkspace.comms.messages.sendTo")}
            value={portalId ?? ""}
            onChange={(e) => setPortalId(e.target.value || null)}
            options={[
              { value: "", label: t("@legalos.matterWorkspace.comms.messages.noPortal") },
              ...reachable.map((portal) => ({
                value: String(portal.id),
                label: portal.contact_name,
              })),
            ]}
          />
          <Input
            label={t("@legalos.matterWorkspace.comms.messages.subject")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <Textarea
            label={t("@legalos.matterWorkspace.comms.messages.firstMessage")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            required
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={!subject.trim() || !body.trim()}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.comms.messages.start")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// --- client portals ---------------------------------------------------------

export function PortalsPanel({ data, reload, onError }: TabProps) {
  const { formatDate } = useFormat();
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [isInviting, setIsInviting] = useState(false);

  return (
    <>
      <Panel
        action={
          <Button
            variant="primary"
            size="sm"
            disabled={data.clientContacts.length === 0}
            onClick={() => setIsInviting(true)}
          >
            {t("@legalos.matterWorkspace.comms.portals.invite")}
          </Button>
        }
      >
        {data.clientContacts.length === 0 && (
          <p className="text-xs m-0" style={{ color: "var(--text3)" }}>
            {t("@legalos.matterWorkspace.comms.portals.noContacts")}
          </p>
        )}

        {data.portals.length === 0 ? (
          <EmptyState
            icon={<Icon name="groups" size={24} />}
            title={t("@legalos.matterWorkspace.comms.portals.emptyTitle")}
            description={t("@legalos.matterWorkspace.comms.portals.emptyDescription")}
          />
        ) : (
          <div
            className="flex flex-col rounded-md border divide-y overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            {data.portals.map((portal) => (
              <div
                key={portal.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    title={portal.contact_name}
                    className="flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full border shrink-0"
                    style={{
                      backgroundColor: "var(--surface3)",
                      borderColor: "var(--border)",
                      color: "var(--text2)",
                    }}
                  >
                    {portal.contact_name ? portal.contact_name.slice(0, 2).toUpperCase() : "?"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                      {portal.contact_name}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text3)" }}>
                      {[
                        portal.contact_email,
                        portal.last_active_at
                          ? t("@legalos.matterWorkspace.comms.portals.lastActive", {
                              date: formatDate(portal.last_active_at),
                            })
                          : t("@legalos.matterWorkspace.comms.portals.neverActive"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <PortalPermissions portal={portal} />
                  <Badge
                    color={PORTAL_VARIANT[portal.status]}
                    variant="soft"
                  >
                    {t(
                      `@legalos.matterWorkspace.comms.portals.status.${portal.status}`,
                    )}
                  </Badge>
                  {portal.status === "revoked" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        write(
                          () =>
                            practice!.matters.invitePortal(data.matter.id, {
                              contact_id: portal.contact_id,
                              can_view_documents: portal.can_view_documents,
                              can_view_bills: portal.can_view_bills,
                              can_message: portal.can_message,
                            }),
                          "@legalos.matterWorkspace.errors.portal",
                        )
                      }
                    >
                      {t("@legalos.matterWorkspace.comms.portals.reinvite")}
                    </Button>
                  ) : (
                    <>
                      {portal.status === "invited" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            write(
                              () =>
                                practice!.portals.update(portal.id, {
                                  status: "active",
                                }),
                              "@legalos.matterWorkspace.errors.portal",
                            )
                          }
                        >
                          {t(
                            "@legalos.matterWorkspace.comms.portals.activate",
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          write(
                            () =>
                              practice!.portals.update(portal.id, {
                                status: "revoked",
                              }),
                            "@legalos.matterWorkspace.errors.portal",
                          )
                        }
                      >
                        {t("@legalos.matterWorkspace.comms.portals.revoke")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <InvitePortalDialog
        isOpen={isInviting}
        onOpenChange={setIsInviting}
        data={data}
        reload={reload}
        onError={onError}
      />
    </>
  );
}

function PortalPermissions({ portal }: { portal: ClientPortal }) {
  const t = useTranslator();
  const granted = [
    portal.can_view_documents &&
      t("@legalos.matterWorkspace.comms.portals.canViewDocuments"),
    portal.can_view_bills &&
      t("@legalos.matterWorkspace.comms.portals.canViewBills"),
    portal.can_message && t("@legalos.matterWorkspace.comms.portals.canMessage"),
  ].filter(Boolean) as string[];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {granted.map((label) => (
        <Badge key={label} color="neutral" variant="soft" size="sm">
          {label}
        </Badge>
      ))}
    </div>
  );
}

function InvitePortalDialog({
  isOpen,
  onOpenChange,
  data,
  reload,
  onError,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: TabProps["data"];
  reload: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslator();
  const { practice } = useOrg();
  const write = useWrite(reload, onError);
  const [contactId, setContactId] = useState<string | null>(null);
  const [documents, setDocuments] = useState(true);
  const [bills, setBills] = useState(false);
  const [messages, setMessages] = useState(true);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!practice || !contactId) return;
    setSaving(true);
    const ok = await write(
      () =>
        practice.matters.invitePortal(data.matter.id, {
          contact_id: Number(contactId),
          can_view_documents: documents,
          can_view_bills: bills,
          can_message: messages,
        }),
      "@legalos.matterWorkspace.errors.portal",
    );
    setSaving(false);
    if (ok) {
      setContactId(null);
      onOpenChange(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <DialogHeader
        title={t("@legalos.matterWorkspace.comms.portals.invite")}
        onOpenChange={onOpenChange}
      />
      <DialogContent>
        <div className="flex flex-col gap-4">
          <Select
            label={t("@legalos.matterWorkspace.contacts.form.pick")}
            value={contactId ?? ""}
            onChange={(e) => setContactId(e.target.value || null)}
            options={[
              { value: "", label: "—" },
              ...data.clientContacts.map((contact) => ({
                value: String(contact.id),
                label: contact.title
                  ? `${contact.name} — ${contact.title}`
                  : contact.name,
              })),
            ]}
          />
          <Switch
            label={t("@legalos.matterWorkspace.comms.portals.canViewDocuments")}
            checked={documents}
            onChange={setDocuments}
          />
          <Switch
            label={t("@legalos.matterWorkspace.comms.portals.canViewBills")}
            checked={bills}
            onChange={setBills}
          />
          <Switch
            label={t("@legalos.matterWorkspace.comms.portals.canMessage")}
            checked={messages}
            onChange={setMessages}
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          {t("@legalos.matterWorkspace.action.cancel")}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={!contactId}
          onClick={submit}
        >
          {t("@legalos.matterWorkspace.comms.portals.invite")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
