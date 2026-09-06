"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useEnumLabel } from "@/lib/i18n/enum-label";
import { useFormat } from "@/lib/i18n/format";

type Presence = "online" | "busy" | "offline";

interface Person {
  name: string;
  role: "owner" | "lawyer" | "staff";
}

// ---------------------------------------------------------------------------
// عينة بيانات تجريبية وهمية (Mock / Seed Sample Data) للعرض التوضيحي داخل شاشة
// الرسائل المقفولة خلف ميزة features.ts؛ ليست نصوص واجهة مفقودة من التدويل.
// ---------------------------------------------------------------------------
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

const PRESENCE_COLOR: Record<Presence, string> = {
  online: "var(--success)",
  busy: "var(--danger)",
  offline: "var(--text3)",
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

const MENTION_RE = /(@\p{L}[\p{L}\p{M}'’-]*(?:[  ]\p{L}[\p{L}\p{M}'’-]*)?)/gu;

function MessageText({ text }: { text: string }) {
  const parts = text.split(MENTION_RE).filter(Boolean);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="font-semibold" style={{ color: "var(--primary)" }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
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

  const handleSendMessage = () => {
    if (!draft.trim()) return;
    setDraft("");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden border rounded-lg m-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
      {/* الشريط الجانبي للقنوات والمحادثات المباشرة */}
      <aside
        className="w-72 flex-shrink-0 flex flex-col border-e overflow-hidden"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.messages.heading")}
          </h2>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-[var(--surface3)] transition-colors"
            style={{ color: "var(--text2)" }}
            aria-label={t("@legalos.messages.newMessage")}
          >
            <Icon name="edit" size={18} />
          </button>
        </div>

        <div className="p-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("@legalos.messages.jumpTo.placeholder")}
            startIcon={<Icon name="search" size={16} />}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-5">
          {/* قنوات القضايا */}
          <div className="flex flex-col gap-1">
            <span className="px-2 text-xs font-semibold" style={{ color: "var(--text2)" }}>
              {t("@legalos.messages.matterChannels")}
            </span>
            {visibleChannels.map((channel) => {
              const isSelected = selectedDmId === null && channel.id === selectedChannelId;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => {
                    setSelectedChannelId(channel.id);
                    setSelectedDmId(null);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-start transition-colors ${
                    isSelected ? "bg-[var(--surface3)] font-bold" : "hover:bg-[var(--surface)]"
                  }`}
                  style={{ color: isSelected ? "var(--primary)" : "var(--text)" }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon
                      name={channel.isMatter ? "work" : "tag"}
                      size={16}
                    />
                    <span className="truncate">{channel.name}</span>
                  </div>
                  {channel.unread > 0 && (
                    <Badge color="neutral">{channel.unread}</Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* المحادثات المباشرة */}
          <div className="flex flex-col gap-1">
            <span className="px-2 text-xs font-semibold" style={{ color: "var(--text2)" }}>
              {t("@legalos.messages.directMessages")}
            </span>
            {visibleDms.map((dm) => {
              const isSelected = selectedDmId === dm.id;
              const person = PEOPLE[dm.userId];
              return (
                <button
                  key={dm.id}
                  type="button"
                  onClick={() => setSelectedDmId(dm.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-start transition-colors ${
                    isSelected ? "bg-[var(--surface3)] font-bold" : "hover:bg-[var(--surface)]"
                  }`}
                  style={{ color: isSelected ? "var(--primary)" : "var(--text)" }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="relative">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                      >
                        {person.name.slice(0, 1)}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
                        style={{
                          backgroundColor: PRESENCE_COLOR[dm.presence],
                          borderColor: "var(--surface2)",
                        }}
                      />
                    </div>
                    <span className="truncate">{person.name}</span>
                  </div>
                  {dm.unread > 0 && (
                    <Badge color="neutral">{dm.unread}</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* منطقة المحادثة */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
        {/* شريط رأس القناة / المحادثة */}
        <div
          className="p-4 border-b flex items-center justify-between gap-3 flex-shrink-0"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              name={selectedDm ? "chat" : selectedChannel.isMatter ? "work" : "tag"}
              size={18}
            />
            <h1 className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
              {headingLabel}
            </h1>
            <span className="text-xs truncate" style={{ color: "var(--text2)" }}>
              · {selectedDm ? enumLabel(PEOPLE[selectedDm.userId].role) : selectedChannel.topic}
            </span>
          </div>

          {!selectedDm && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text2)" }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />
                {t("@legalos.messages.memberCount", { count: 4 })}
              </span>
            </div>
          )}
        </div>

        {/* سياق الرسائل */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
          {messages.length > 0 ? (
            <>
              <div className="flex items-center justify-center my-2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: "var(--surface2)",
                    borderColor: "var(--border)",
                    color: "var(--text2)",
                  }}
                >
                  {formatDayLong(messages[0].time)}
                </span>
              </div>

              {messages.map((message) => {
                const isSelf = message.userId === YOU;
                const person = PEOPLE[message.userId];
                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${isSelf ? "flex-row-reverse" : ""}`}
                  >
                    {!isSelf && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          backgroundColor: "var(--surface3)",
                          color: "var(--text)",
                        }}
                      >
                        {person.name.slice(0, 1)}
                      </div>
                    )}
                    <div
                      className={`flex flex-col gap-1 max-w-[70%] ${
                        isSelf ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text2)" }}>
                        <span className="font-semibold" style={{ color: "var(--text)" }}>
                          {isSelf ? "أنت" : person.name}
                        </span>
                        <span>
                          {new Date(message.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {message.bubbles.map((text, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl text-xs leading-relaxed"
                          style={{
                            backgroundColor: isSelf
                              ? "var(--primary)"
                              : "var(--surface2)",
                            color: isSelf
                              ? "var(--primary-foreground)"
                              : "var(--text)",
                            border: isSelf ? "none" : "1px solid var(--border)",
                          }}
                        >
                          <MessageText text={text} />
                        </div>
                      ))}

                      {message.attachment && (
                        <Card className="p-3 flex items-center gap-3">
                          <Icon name="description" size={20} />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                              {message.attachment.name}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--text2)" }}>
                              {message.attachment.size} · PDF
                            </span>
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="m-auto">
              <EmptyState
                icon={<Icon name="inbox" size={32} />}
                title={t("@legalos.messages.empty.title")}
                description={t("@legalos.messages.empty.description")}
              />
            </div>
          )}
        </div>

        {/* صندوق كتابة الرسالة */}
        <div className="p-4 border-t flex flex-col gap-2 flex-shrink-0" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-md hover:bg-[var(--surface2)] transition-colors"
              style={{ color: "var(--text2)" }}
              title={t("@legalos.messages.attachFile")}
            >
              <Icon name="attach_file" size={18} />
            </button>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={composerPlaceholder}
              className="flex-1 text-xs px-3 py-2 rounded-md border outline-none transition-colors"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface2)",
                color: "var(--text)",
              }}
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!draft.trim()}
            >
              <Icon name="send" size={16} />
              <span>إرسال</span>
            </Button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm">
              <Icon name="auto_awesome" size={14} />
              <span>{t("@legalos.messages.aiSummary")}</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
