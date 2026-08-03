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

import { useMemo, useState } from "react";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Divider } from "@astryxdesign/core/Divider";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
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
const CHANNEL_ICON = {
  phone: PhoneIcon,
  email: EnvelopeIcon,
  meeting: UserGroupIcon,
  letter: EnvelopeIcon,
} as const;
const PORTAL_VARIANT: Record<PortalStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  invited: "warning",
  revoked: "neutral",
};

export function CommunicationsTab(props: TabProps) {
  const t = useTranslator();
  const [sub, setSub] = useState("logs");

  return (
    <VStack gap={4}>
      <TabList value={sub} onChange={setSub} hasDivider>
        <Tab value="logs" label={t("@legalos.matterWorkspace.comms.sub.logs")} />
        <Tab
          value="messages"
          label={t("@legalos.matterWorkspace.comms.sub.messages")}
          endContent={
            props.data.threads.some((thread) => thread.unread_count > 0) ? (
              <Badge
                variant="error"
                label={String(
                  props.data.threads.reduce(
                    (sum, thread) => sum + thread.unread_count,
                    0,
                  ),
                )}
              />
            ) : undefined
          }
        />
        <Tab
          value="portals"
          label={t("@legalos.matterWorkspace.comms.sub.portals")}
        />
      </TabList>

      {sub === "logs" && <LogsPanel {...props} />}
      {sub === "messages" && <MessagesPanel {...props} />}
      {sub === "portals" && <PortalsPanel {...props} />}
    </VStack>
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
          <HStack gap={3} vAlign="center" wrap="wrap">
            <SegmentedControl
              label={t("@legalos.matterWorkspace.comms.form.channel")}
              value={channel}
              size="sm"
              onChange={(value) => setChannel(value as typeof channel)}
            >
              <SegmentedControlItem
                value="all"
                label={t("@legalos.matterWorkspace.comms.channel.all")}
              />
              {CHANNELS.map((value) => (
                <SegmentedControlItem
                  key={value}
                  value={value}
                  label={t(`@legalos.matterWorkspace.comms.channel.${value}`)}
                />
              ))}
            </SegmentedControl>
            <TextInput
              label={t("@legalos.matterWorkspace.comms.logs.search")}
              isLabelHidden
              value={search}
              onChange={setSearch}
              placeholder={t("@legalos.matterWorkspace.comms.logs.search")}
              width={220}
            />
            <Button
              label={t("@legalos.matterWorkspace.comms.logs.new")}
              variant="primary"
              size="sm"
              onClick={() => setIsLogging(true)}
            />
          </HStack>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={<Icon icon={PhoneIcon} size="lg" color="secondary" />}
            title={t("@legalos.matterWorkspace.comms.logs.emptyTitle")}
            description={t("@legalos.matterWorkspace.comms.logs.emptyDescription")}
            actions={
              <Button
                label={t("@legalos.matterWorkspace.comms.logs.new")}
                variant="secondary"
                onClick={() => setIsLogging(true)}
              />
            }
          />
        ) : (
          <List hasDividers density="compact">
            {visible.map((entry) => (
              <ListItem
                key={entry.id}
                label={
                  entry.subject ||
                  t(`@legalos.matterWorkspace.comms.channel.${entry.channel}`)
                }
                description={[
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
                startContent={
                  <Icon
                    icon={CHANNEL_ICON[entry.channel]}
                    size="sm"
                    color="secondary"
                  />
                }
                endContent={
                  <HStack gap={3} vAlign="center">
                    <Badge
                      variant="neutral"
                      label={t(
                        `@legalos.matterWorkspace.comms.direction.${entry.direction}`,
                      )}
                    />
                    <Text type="supporting" color="secondary">
                      {formatDateTime(entry.occurred_at)}
                    </Text>
                  </HStack>
                }
              />
            ))}
          </List>
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
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.comms.logs.new")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <HStack gap={3}>
                <Selector
                  label={t("@legalos.matterWorkspace.comms.form.channel")}
                  value={channel}
                  onChange={(value) => setChannel(value as CommunicationChannel)}
                  options={CHANNELS.map((value) => ({
                    value,
                    label: t(`@legalos.matterWorkspace.comms.channel.${value}`),
                  }))}
                />
                <Selector
                  label={t("@legalos.matterWorkspace.comms.form.direction")}
                  value={direction}
                  onChange={(value) =>
                    setDirection(value as CommunicationDirection)
                  }
                  options={(["incoming", "outgoing"] as const).map((value) => ({
                    value,
                    label: t(`@legalos.matterWorkspace.comms.direction.${value}`),
                  }))}
                />
                {hasDuration && (
                  <NumberInput
                    label={t("@legalos.matterWorkspace.comms.form.duration")}
                    value={duration}
                    onChange={(value) => setDuration(value ?? 1)}
                    min={1}
                    step={5}
                  />
                )}
              </HStack>
              <TextInput
                label={t("@legalos.matterWorkspace.comms.form.counterparty")}
                value={counterparty}
                onChange={setCounterparty}
              />
              <TextInput
                label={t("@legalos.matterWorkspace.comms.form.subject")}
                value={subject}
                onChange={setSubject}
              />
              <TextArea
                label={t("@legalos.matterWorkspace.comms.form.body")}
                value={body}
                onChange={setBody}
                rows={4}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.matterWorkspace.action.saving")
                    : t("@legalos.matterWorkspace.action.save")
                }
                variant="primary"
                isDisabled={saving}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
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
            label={t("@legalos.matterWorkspace.comms.messages.new")}
            variant="primary"
            size="sm"
            onClick={() => setIsStarting(true)}
          />
        }
      >
        {data.threads.length === 0 ? (
          <EmptyState
            icon={<Icon icon={ChatBubbleLeftRightIcon} size="lg" color="secondary" />}
            title={t("@legalos.matterWorkspace.comms.messages.emptyTitle")}
            description={t(
              "@legalos.matterWorkspace.comms.messages.emptyDescription",
            )}
            actions={
              <Button
                label={t("@legalos.matterWorkspace.comms.messages.new")}
                variant="secondary"
                onClick={() => setIsStarting(true)}
              />
            }
          />
        ) : (
          <VStack gap={4}>
            {data.threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                reload={reload}
                onError={onError}
              />
            ))}
          </VStack>
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
    <Card>
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
          <VStack gap={0}>
            <Text type="body" weight="semibold">
              {thread.subject}
            </Text>
            <Text type="supporting" color="secondary">
              {[
                thread.contact_name ??
                  t("@legalos.matterWorkspace.comms.messages.noPortal"),
                t("@legalos.matterWorkspace.comms.messages.count", {
                  count: thread.message_count,
                }),
              ].join(" · ")}
            </Text>
          </VStack>
          <HStack gap={2} vAlign="center">
            {thread.unread_count > 0 && (
              <Badge
                variant="error"
                label={t("@legalos.matterWorkspace.comms.messages.unread", {
                  count: thread.unread_count,
                })}
              />
            )}
            {thread.unread_count > 0 && (
              <Button
                label={t("@legalos.matterWorkspace.comms.messages.markRead")}
                variant="ghost"
                size="sm"
                onClick={() =>
                  write(
                    () => practice!.portals.markRead(thread.id),
                    "@legalos.matterWorkspace.errors.message",
                  )
                }
              />
            )}
          </HStack>
        </HStack>

        <Divider />

        <List hasDividers density="compact">
          {thread.messages.map((message) => (
            <ListItem
              key={message.id}
              label={
                message.author_kind === "firm"
                  ? memberName(message.author_user)
                  : message.author_name ||
                    t("@legalos.matterWorkspace.comms.messages.client")
              }
              description={message.body}
              startContent={
                <Avatar
                  name={
                    message.author_kind === "firm"
                      ? memberName(message.author_user)
                      : message.author_name || "?"
                  }
                  size="sm"
                  tooltip={false}
                />
              }
              endContent={
                <Text type="supporting" color="secondary">
                  {formatDateTime(message.sent_at)}
                </Text>
              }
            />
          ))}
        </List>

        <HStack gap={3} vAlign="end">
          <TextInput
            label={t("@legalos.matterWorkspace.comms.messages.reply")}
            isLabelHidden
            value={reply}
            onChange={setReply}
            placeholder={t("@legalos.matterWorkspace.comms.messages.reply")}
          />
          <Button
            label={t("@legalos.matterWorkspace.comms.messages.send")}
            variant="primary"
            isDisabled={sending || !reply.trim()}
            onClick={send}
          />
        </HStack>
      </VStack>
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
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.comms.messages.new")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Selector
                label={t("@legalos.matterWorkspace.comms.messages.sendTo")}
                value={portalId}
                onChange={setPortalId}
                hasClear
                placeholder={t("@legalos.matterWorkspace.comms.messages.noPortal")}
                options={reachable.map((portal) => ({
                  value: String(portal.id),
                  label: portal.contact_name,
                }))}
              />
              <TextInput
                label={t("@legalos.matterWorkspace.comms.messages.subject")}
                value={subject}
                onChange={setSubject}
                isRequired
              />
              <TextArea
                label={t("@legalos.matterWorkspace.comms.messages.firstMessage")}
                value={body}
                onChange={setBody}
                rows={5}
                isRequired
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.matterWorkspace.action.saving")
                    : t("@legalos.matterWorkspace.comms.messages.start")
                }
                variant="primary"
                isDisabled={saving || !subject.trim() || !body.trim()}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
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
            label={t("@legalos.matterWorkspace.comms.portals.invite")}
            variant="primary"
            size="sm"
            isDisabled={data.clientContacts.length === 0}
            onClick={() => setIsInviting(true)}
          />
        }
      >
        {data.clientContacts.length === 0 && (
          <Text type="body" color="secondary">
            {t("@legalos.matterWorkspace.comms.portals.noContacts")}
          </Text>
        )}

        {data.portals.length === 0 ? (
          <EmptyState
            icon={<Icon icon={UsersIcon} size="lg" color="secondary" />}
            title={t("@legalos.matterWorkspace.comms.portals.emptyTitle")}
            description={t("@legalos.matterWorkspace.comms.portals.emptyDescription")}
          />
        ) : (
          <List hasDividers>
            {data.portals.map((portal) => (
              <ListItem
                key={portal.id}
                label={portal.contact_name}
                description={[
                  portal.contact_email,
                  portal.last_active_at
                    ? t("@legalos.matterWorkspace.comms.portals.lastActive", {
                        date: formatDate(portal.last_active_at),
                      })
                    : t("@legalos.matterWorkspace.comms.portals.neverActive"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                startContent={
                  <Avatar name={portal.contact_name} size="sm" tooltip={false} />
                }
                endContent={
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <PortalPermissions portal={portal} />
                    <Badge
                      variant={PORTAL_VARIANT[portal.status]}
                      label={t(
                        `@legalos.matterWorkspace.comms.portals.status.${portal.status}`,
                      )}
                    />
                    {portal.status === "revoked" ? (
                      <Button
                        label={t("@legalos.matterWorkspace.comms.portals.reinvite")}
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
                      />
                    ) : (
                      <>
                        {portal.status === "invited" && (
                          <Button
                            label={t(
                              "@legalos.matterWorkspace.comms.portals.activate",
                            )}
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
                          />
                        )}
                        <Button
                          label={t("@legalos.matterWorkspace.comms.portals.revoke")}
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
                        />
                      </>
                    )}
                  </HStack>
                }
              />
            ))}
          </List>
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
    <HStack gap={1} wrap="wrap">
      {granted.map((label) => (
        <Badge key={label} variant="neutral" label={label} />
      ))}
    </HStack>
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
      <Layout
        header={
          <DialogHeader
            title={t("@legalos.matterWorkspace.comms.portals.invite")}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Selector
                label={t("@legalos.matterWorkspace.contacts.form.pick")}
                value={contactId}
                onChange={setContactId}
                hasClear
                options={data.clientContacts.map((contact) => ({
                  value: String(contact.id),
                  label: contact.title
                    ? `${contact.name} — ${contact.title}`
                    : contact.name,
                }))}
              />
              <Switch
                label={t("@legalos.matterWorkspace.comms.portals.canViewDocuments")}
                value={documents}
                onChange={setDocuments}
              />
              <Switch
                label={t("@legalos.matterWorkspace.comms.portals.canViewBills")}
                value={bills}
                onChange={setBills}
              />
              <Switch
                label={t("@legalos.matterWorkspace.comms.portals.canMessage")}
                value={messages}
                onChange={setMessages}
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={3} hAlign="end">
              <Button
                label={t("@legalos.matterWorkspace.action.cancel")}
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
              <Button
                label={
                  saving
                    ? t("@legalos.matterWorkspace.action.saving")
                    : t("@legalos.matterWorkspace.comms.portals.invite")
                }
                variant="primary"
                isDisabled={saving || !contactId}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
