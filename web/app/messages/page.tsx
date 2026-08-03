"use client";

import { useState, type CSSProperties } from "react";
import {
  Layout,
  LayoutContent,
  LayoutPanel,
  Stack,
  StackItem,
  HStack,
  VStack,
} from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
} from "@astryxdesign/core/Chat";
import { Avatar, AvatarStatusDot } from "@astryxdesign/core/Avatar";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { Divider } from "@astryxdesign/core/Divider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  HashtagIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  PencilSquareIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { useFormat } from "@/lib/i18n/format";

// ---------------------------------------------------------------------------
// Messages — Slack-like internal firm messaging. No backend yet; this is the
// UI concept pass. Channels are organized around matters (per the brief),
// plus a firm-wide channel and private DMs between teammates.
// ---------------------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  // 100% of the shell's content region, not 100dvh: this page renders inside
  // the app shell, which has already spent the top bar's height, so a viewport
  // minimum made the screen 48px taller than the space it had. The overflow
  // landed on the composer at the bottom, which is the one control the screen
  // exists for.
  root: { height: "100%", minHeight: 0 },
  sidebar: { height: "100%", minHeight: 0 },
  sidebarHeader: {
    alignItems: "center",
    paddingInline: "var(--spacing-3)",
    paddingBlock: "var(--spacing-3)",
  },
  sidebarSearch: {
    paddingInline: "var(--spacing-3)",
    paddingBottom: "var(--spacing-2)",
  },
  sidebarScroll: {
    minHeight: 0,
    overflowY: "auto",
    paddingInline: "var(--spacing-2)",
    paddingBottom: "var(--spacing-3)",
  },
  sectionGap: { marginTop: "var(--spacing-4)" },
  streamColumn: { height: "100%", minHeight: 0 },
  streamHeader: {
    alignItems: "center",
    paddingInline: "var(--spacing-4)",
    paddingBlock: "var(--spacing-3)",
  },
  streamTopic: { minWidth: 0 },
  chatArea: { minHeight: 0, display: "flex", flexDirection: "column" },
  // A flex column, not a plain block: ChatLayout sizes itself with `flex: 1`,
  // which only means anything inside a flex container. As a block child it
  // took its content height instead and ran past the bottom of the region,
  // carrying the composer with it.
  chatFill: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" },
};

type Presence = "online" | "busy" | "offline";

interface Person {
  name: string;
  /** Enum value, resolved through the catalog — see useEnumLabel below. It
   *  used to be a literal ("Owner"), which was the one label on this screen
   *  that stayed English after the locale switched. */
  role: "owner" | "lawyer" | "staff";
}

const PEOPLE: Record<string, Person> = {
  ahmed: { name: "أحمد السيد", role: "owner" },
  mona: { name: "منى فاروق", role: "lawyer" },
  youssef: { name: "يوسف عادل", role: "lawyer" },
  layla: { name: "ليلى حسن", role: "staff" },
};

const YOU = "ahmed";

interface Channel {
  id: string;
  name: string;
  topic: string;
  isMatter: boolean;
  unread: number;
}

const CHANNELS: Channel[] = [
  {
    id: "general",
    name: "عام",
    topic: "إعلانات المكتب والنقاش العام",
    isMatter: false,
    unread: 0,
  },
  {
    id: "nabil-v-nile",
    name: "نبيل ضد شركة النيل للتجارة",
    topic: "قناة قضية · تقاضٍ تجاري",
    isMatter: true,
    unread: 2,
  },
  {
    id: "delta-foods-nda",
    name: "اتفاقية عدم الإفشاء — دلتا للأغذية",
    topic: "قناة قضية · مراجعة عقود",
    isMatter: true,
    unread: 0,
  },
];

interface DirectMessage {
  id: string;
  userId: string;
  presence: Presence;
  unread: number;
}

const DIRECT_MESSAGES: DirectMessage[] = [
  { id: "dm-mona", userId: "mona", presence: "online", unread: 0 },
  { id: "dm-youssef", userId: "youssef", presence: "busy", unread: 1 },
  { id: "dm-layla", userId: "layla", presence: "offline", unread: 0 },
];

const PRESENCE_VARIANT: Record<Presence, "success" | "error" | "neutral"> = {
  online: "success",
  busy: "error",
  offline: "neutral",
};

const PRESENCE_KEY: Record<Presence, string> = {
  online: "@legalos.messages.presence.online",
  busy: "@legalos.messages.presence.busy",
  offline: "@legalos.messages.presence.offline",
};

interface Attachment {
  name: string;
  size: string;
}

interface StreamMessage {
  id: string;
  userId: string;
  time: string;
  bubbles: string[];
  attachment?: Attachment;
}

const MESSAGES_BY_CHANNEL: Record<string, StreamMessage[]> = {
  "nabil-v-nile": [
    {
      id: "n1",
      userId: "youssef",
      time: "2026-07-31T08:45:00",
      bubbles: [
        "المحكمة قدّمت جلسة الغد إلى الساعة 10:00 ص — هل تؤكدين أن المذكرة جاهزة؟",
      ],
    },
    {
      id: "n2",
      userId: "mona",
      time: "2026-07-31T09:10:00",
      bubbles: [
        "@أحمد السيد أرفقت مسودة التسوية المحدَّثة — ما زال البند 4/2 يحتاج موافقتك.",
      ],
      attachment: { name: "مسودة_اتفاق_التسوية_ن3.pdf", size: "812 كيلوبايت" },
    },
    {
      id: "n3",
      userId: "ahmed",
      time: "2026-07-31T09:32:00",
      bubbles: [
        "راجعتها — البند 4/2 سليم. أرسليها لمحامي الخصم.",
      ],
    },
    {
      id: "n4",
      userId: "mona",
      time: "2026-07-31T09:34:00",
      bubbles: ["تمام. سأضم @ليلى حسن لإجراءات الإيداع."],
    },
  ],
  "delta-foods-nda": [
    {
      id: "d1",
      userId: "youssef",
      time: "2026-07-30T14:05:00",
      bubbles: [
        "مراجعة الذكاء الاصطناعي نبّهت إلى بندين يخرجان عن نموذجنا المعتمد — الملخص الكامل في شاشة مراجعة العقود.",
      ],
    },
    {
      id: "d2",
      userId: "layla",
      time: "2026-07-30T15:20:00",
      bubbles: ["العميل يريد التوقيع قبل الجمعة — هل نلحق بالموعد؟"],
    },
    {
      id: "d3",
      userId: "ahmed",
      time: "2026-07-30T15:26:00",
      bubbles: ["@يوسف عادل إذن لنعطِ هذا الأولوية اليوم."],
    },
  ],
  general: [
    {
      id: "g1",
      userId: "layla",
      time: "2026-07-29T11:00:00",
      bubbles: ["تذكير: اجتماع المكتب العام يوم الخميس الساعة 5 مساءً بقاعة الاجتماعات الكبرى."],
    },
    {
      id: "g2",
      userId: "mona",
      time: "2026-07-29T11:42:00",
      bubbles: ["وصل طلب عميل جديد من مجموعة خليل القابضة إلى إدارة العملاء المحتملين — أُسنده الآن."],
    },
  ],
};

// \p{L}, not [A-Z]: an Arabic script has no case, so the old pattern matched
// no mention at all once the names were Arabic. Two words at most, as before,
// so "@يوسف عادل إذن" highlights the name and not the sentence after it.
const MENTION_RE = /(@\p{L}[\p{L}\p{M}'’-]*(?:[  ]\p{L}[\p{L}\p{M}'’-]*)?)/gu;

function MessageText({ text }: { text: string }) {
  const parts = text.split(MENTION_RE).filter(Boolean);
  return (
    <Text type="body" as="span">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <Text key={i} type="body" as="span" color="accent" weight="semibold">
            {part}
          </Text>
        ) : (
          <Text key={i} type="body" as="span">
            {part}
          </Text>
        ),
      )}
    </Text>
  );
}

function AttachmentCard({ attachment }: { attachment: Attachment }) {
  return (
    <Card padding={2} variant="muted">
      <HStack gap={3} vAlign="center">
        <Icon icon={DocumentTextIcon} size="md" color="secondary" />
        <VStack gap={0}>
          <Text type="label" weight="semibold">
            {attachment.name}
          </Text>
          <Text type="supporting" color="secondary">
            {attachment.size} · PDF
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}

function StreamMessageGroup({ message }: { message: StreamMessage }) {
  const isSelf = message.userId === YOU;
  const person = PEOPLE[message.userId];
  const lastIndex = message.bubbles.length - 1;

  return (
    <ChatMessage
      sender={isSelf ? "user" : "assistant"}
      avatar={isSelf ? undefined : <Avatar name={person.name} size="md" />}
    >
      {message.bubbles.map((text, index) => (
        <ChatMessageBubble
          key={`${message.id}-${index}`}
          group={
            message.bubbles.length === 1
              ? undefined
              : index === 0
                ? "first"
                : index === lastIndex
                  ? "last"
                  : "middle"
          }
          name={!isSelf && index === 0 ? person.name : undefined}
          metadata={
            index === lastIndex ? (
              <ChatMessageMetadata
                timestamp={<Timestamp value={message.time} format="time" />}
              />
            ) : undefined
          }
        >
          <MessageText text={text} />
        </ChatMessageBubble>
      ))}
      {message.attachment && (
        <ChatMessageBubble variant="ghost">
          <AttachmentCard attachment={message.attachment} />
        </ChatMessageBubble>
      )}
    </ChatMessage>
  );
}

export default function MessagesPage() {
  const t = useTranslator();
  const enumLabel = useEnumLabel();
  const { formatDayLong } = useFormat();
  const [selectedChannelId, setSelectedChannelId] = useState("nabil-v-nile");
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");

  const isSidebarHidden = useMediaQuery("(max-width: 768px)");

  const selectedChannel =
    CHANNELS.find((c) => c.id === selectedChannelId) ?? CHANNELS[0];
  const selectedDm = selectedDmId
    ? (DIRECT_MESSAGES.find((d) => d.id === selectedDmId) ?? null)
    : null;

  const messages = selectedDm ? [] : (MESSAGES_BY_CHANNEL[selectedChannel.id] ?? []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleChannels = CHANNELS.filter((c) =>
    c.name.toLowerCase().includes(normalizedQuery),
  );
  const visibleDms = DIRECT_MESSAGES.filter((d) =>
    PEOPLE[d.userId].name.toLowerCase().includes(normalizedQuery),
  );

  const headingLabel = selectedDm ? PEOPLE[selectedDm.userId].name : selectedChannel.name;
  const composerPlaceholder = selectedDm
    ? t("@legalos.messages.composer.toPerson", {
        name: PEOPLE[selectedDm.userId].name,
      })
    : t("@legalos.messages.composer.toChannel", { name: selectedChannel.name });

  const channelSidebar = (
    <Stack direction="vertical" style={styles.sidebar}>
      <HStack gap={2} style={styles.sidebarHeader}>
        <StackItem size="fill">
          <Heading level={5}>{t("@legalos.messages.heading")}</Heading>
        </StackItem>
        <IconButton
          label={t("@legalos.messages.newMessage")}
          tooltip={t("@legalos.messages.newMessage")}
          icon={<Icon icon={PencilSquareIcon} size="sm" color="inherit" />}
          variant="ghost"
          size="sm"
          onClick={() => {}}
        />
      </HStack>
      <div style={styles.sidebarSearch}>
        <TextInput
          label={t("@legalos.messages.jumpTo.label")}
          isLabelHidden
          size="sm"
          placeholder={t("@legalos.messages.jumpTo.placeholder")}
          startIcon={MagnifyingGlassIcon}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <StackItem size="fill" style={styles.sidebarScroll}>
        <List
          density="compact"
          hasDividers={false}
          header={
            <Text type="label" size="sm" color="secondary">
              {t("@legalos.messages.matterChannels")}
            </Text>
          }
        >
          {visibleChannels.map((channel) => (
            <ListItem
              key={channel.id}
              label={channel.name}
              isSelected={selectedDmId === null && channel.id === selectedChannelId}
              onClick={() => {
                setSelectedChannelId(channel.id);
                setSelectedDmId(null);
              }}
              startContent={
                <Icon
                  icon={channel.isMatter ? BriefcaseIcon : HashtagIcon}
                  size="sm"
                  color="secondary"
                />
              }
              endContent={
                channel.unread > 0 ? (
                  <Badge label={String(channel.unread)} variant="neutral" />
                ) : undefined
              }
            />
          ))}
        </List>
        <div style={styles.sectionGap}>
          <List
            density="compact"
            hasDividers={false}
            header={
              <Text type="label" size="sm" color="secondary">
                {t("@legalos.messages.directMessages")}
              </Text>
            }
          >
            {visibleDms.map((dm) => (
              <ListItem
                key={dm.id}
                label={PEOPLE[dm.userId].name}
                isSelected={selectedDmId === dm.id}
                onClick={() => setSelectedDmId(dm.id)}
                startContent={
                  <Avatar
                    name={PEOPLE[dm.userId].name}
                    size="sm"
                    status={
                      <AvatarStatusDot
                        variant={PRESENCE_VARIANT[dm.presence]}
                        label={t(PRESENCE_KEY[dm.presence])}
                      />
                    }
                  />
                }
                endContent={
                  dm.unread > 0 ? (
                    <Badge label={String(dm.unread)} variant="neutral" />
                  ) : undefined
                }
              />
            ))}
          </List>
        </div>
      </StackItem>
    </Stack>
  );

  const messageStream = (
    <Stack direction="vertical" style={styles.streamColumn}>
      <HStack gap={3} style={styles.streamHeader}>
        <Icon
          icon={selectedDm ? ChatBubbleLeftRightIcon : selectedChannel.isMatter ? BriefcaseIcon : HashtagIcon}
          size="sm"
          color="secondary"
        />
        <Heading level={5}>{headingLabel}</Heading>
        <StackItem size="fill" style={styles.streamTopic}>
          <Text type="supporting" color="secondary" maxLines={1}>
            {selectedDm ? enumLabel(PEOPLE[selectedDm.userId].role) : selectedChannel.topic}
          </Text>
        </StackItem>
        {!selectedDm && (
          <StatusDot
            variant="success"
            label={t("@legalos.messages.memberCount", { count: 4 })}
          />
        )}
        {!selectedDm && (
          <IconButton
            label={t("@legalos.messages.members")}
            tooltip={t("@legalos.messages.members")}
            icon={<Icon icon={UserGroupIcon} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            onClick={() => {}}
          />
        )}
      </HStack>
      <Divider />
      <StackItem size="fill" style={styles.chatArea}>
        <div style={styles.chatFill}>
          <ChatLayout
            composer={
              <ChatComposer
                placeholder={composerPlaceholder}
                value={draft}
                onChange={setDraft}
                onSubmit={() => setDraft("")}
                headerActions={
                  <IconButton
                    label={t("@legalos.messages.attachFile")}
                    tooltip={t("@legalos.messages.attachFile")}
                    icon={<Icon icon={PaperClipIcon} size="sm" color="inherit" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => {}}
                  />
                }
                footerActions={
                  <Button
                    label={t("@legalos.messages.aiSummary")}
                    variant="ghost"
                    size="sm"
                    icon={<Icon icon={SparklesIcon} size="sm" className="text-purple-vivid" />}
                  >
                    {t("@legalos.messages.aiSummary")}
                  </Button>
                }
              />
            }
            emptyState={
              <EmptyState
                icon={<Icon icon={InboxIcon} size="lg" />}
                title={t("@legalos.messages.empty.title")}
                description={t("@legalos.messages.empty.description")}
              />
            }
          >
            {messages.length > 0 ? (
              <ChatMessageList density="balanced">
                <ChatSystemMessage variant="divider">
                  {formatDayLong(messages[0].time)}
                </ChatSystemMessage>
                {messages.map((message) => (
                  <StreamMessageGroup key={message.id} message={message} />
                ))}
              </ChatMessageList>
            ) : null}
          </ChatLayout>
        </div>
      </StackItem>
    </Stack>
  );

  return (
    <div style={styles.root}>
      <Layout
        height="fill"
        start={
          !isSidebarHidden && (
            <LayoutPanel width={280} padding={0}>
              {channelSidebar}
            </LayoutPanel>
          )
        }
        content={<LayoutContent padding={0}>{messageStream}</LayoutContent>}
      />
    </div>
  );
}
