"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useTranslator, type TranslatorFn } from "@astryxdesign/core/i18n";
import { GroundedAnswer } from "@/components/GroundedAnswer";
import { useCorpusStats } from "@/lib/corpus";
import { api, ApiError, dirOf, type AskResponse, type Jurisdiction } from "@/lib/api";

const MODES: {
  id: string;
  labelKey: string;
  iconName: string;
  href?: string;
  isLive?: boolean;
}[] = [
  { id: "qa", labelKey: "@legalos.aiAssistant.modes.qa", iconName: "chat", isLive: true },
  { id: "draft", labelKey: "@legalos.aiAssistant.modes.draft", iconName: "description" },
  {
    id: "review",
    labelKey: "@legalos.aiAssistant.modes.review",
    iconName: "find_in_page",
    href: "/contract-review",
  },
  { id: "translate", labelKey: "@legalos.aiAssistant.modes.translate", iconName: "translate" },
  {
    id: "summarize",
    labelKey: "@legalos.aiAssistant.modes.summarize",
    iconName: "assignment",
  },
  { id: "case-analysis", labelKey: "@legalos.aiAssistant.modes.caseAnalysis", iconName: "balance" },
  {
    id: "clause-comparison",
    labelKey: "@legalos.aiAssistant.modes.clauseComparison",
    iconName: "compare_arrows",
  },
  { id: "timeline", labelKey: "@legalos.aiAssistant.modes.timeline", iconName: "schedule" },
];

const SUGGESTION_KEYS = [
  "@legalos.aiAssistant.suggestions.notice",
  "@legalos.aiAssistant.suggestions.leave",
  "@legalos.aiAssistant.suggestions.companies",
];

interface Turn {
  id: string;
  question: string;
  at: string;
  answer?: AskResponse;
  error?: { message: string; isCredits: boolean };
}

interface Conversation {
  id: string;
  title: string;
  turns: Turn[];
}

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${++sequence}`;

const TITLE_MAX = 60;

export default function AiAssistantPage() {
  const t = useTranslator();
  const corpus = useCorpusStats();
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("EG");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inputQuery, setInputQuery] = useState("");

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const turns = active?.turns ?? [];

  const citedArticles = Array.from(
    new Map(
      turns
        .flatMap((turn) =>
          (turn.answer?.articles ?? []).filter((article) =>
            turn.answer!.citations.includes(article.citation),
          ),
        )
        .map((article) => [article.citation, article]),
    ).values(),
  );

  function patchTurn(conversationId: string, turnId: string, patch: Partial<Turn>) {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              turns: conversation.turns.map((turn) =>
                turn.id === turnId ? { ...turn, ...patch } : turn,
              ),
            }
          : conversation,
      ),
    );
  }

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setInputQuery("");

    const turn: Turn = { id: nextId("turn"), question: trimmed, at: new Date().toISOString() };
    const conversationId = active?.id ?? nextId("conversation");

    if (active) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, turns: [...c.turns, turn] } : c)),
      );
    } else {
      setConversations((prev) => [
        {
          id: conversationId,
          title:
            trimmed.length > TITLE_MAX ? `${trimmed.slice(0, TITLE_MAX).trimEnd()}…` : trimmed,
          turns: [turn],
        },
        ...prev,
      ]);
      setActiveId(conversationId);
    }

    setPending(true);
    try {
      patchTurn(conversationId, turn.id, {
        answer: await api.ask({ question: trimmed, jurisdiction }),
      });
    } catch (error) {
      patchTurn(conversationId, turn.id, {
        error:
          error instanceof ApiError
            ? { message: error.message, isCredits: error.isCredits }
            : { message: String(error), isCredits: false },
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden border rounded-lg m-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
      {/* الشريط الجانبي الأيسر للمحادثات */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col border-e overflow-hidden"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <Button
            variant="primary"
            onClick={() => setActiveId(null)}
            disabled={pending}
            className="w-full"
          >
            <Icon name="add" size={16} />
            <span>{t("@legalos.aiAssistant.newChat")}</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="p-3 text-xs" style={{ color: "var(--text2)" }}>
              {t("@legalos.aiAssistant.noConversations")}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {conversations.map((conversation) => {
                const isSelected = conversation.id === activeId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveId(conversation.id)}
                    className={`p-2.5 rounded-md text-start flex flex-col gap-1 transition-colors ${
                      isSelected
                        ? "bg-[var(--surface3)] font-semibold"
                        : "hover:bg-[var(--surface)]"
                    }`}
                    style={{ color: isSelected ? "var(--primary)" : "var(--text)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="chat" size={14} />
                      <span className="text-xs truncate" dir={dirOf(conversation.title)}>
                        {conversation.title}
                      </span>
                    </div>
                    <span className="text-[10px]" style={{ color: "var(--text2)" }}>
                      {t("@legalos.aiAssistant.turnCount", {
                        count: conversation.turns.length,
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
          {t("@legalos.aiAssistant.sessionOnlyNote")}
        </div>
      </aside>

      {/* منطقة المحادثة المركزية */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
        {/* رأس منطقة المحادثة */}
        <div className="p-4 border-b flex flex-col gap-3 flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.aiAssistant.heading")}
              </h1>
              <p className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.aiAssistant.subheading")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.jurisdiction.label")}
              </span>
              <div className="w-36">
                <Select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
                  options={[
                    { value: "EG", label: t("@legalos.jurisdiction.EG") },
                    {
                      value: "SA",
                      label: corpus.has("SA")
                        ? t("@legalos.jurisdiction.SA")
                        : t("@legalos.jurisdiction.SAUnavailable"),
                      disabled: !corpus.has("SA"),
                    },
                  ]}
                />
              </div>
            </div>
          </div>

          <ModeChips />
        </div>

        {/* سياق الرسائل */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-5">
          {turns.length > 0 ? (
            turns.map((turn) => <TurnView key={turn.id} turn={turn} t={t} />)
          ) : (
            <div className="m-auto max-w-lg w-full flex flex-col items-center gap-6">
              <EmptyState
                icon={<Icon name="auto_awesome" size={32} />}
                title={t("@legalos.aiAssistant.emptyState.title")}
                description={t("@legalos.aiAssistant.emptyState.description")}
              />
              <div className="w-full flex flex-col gap-2">
                {SUGGESTION_KEYS.map((key) => {
                  const label = t(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => send(label)}
                      className="p-3 rounded-lg border text-start text-xs font-medium hover:bg-[var(--surface2)] transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      dir={dirOf(label)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* حقل الإدخال */}
        <div className="p-4 border-t flex items-center gap-2 flex-shrink-0" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(inputQuery);
              }
            }}
            disabled={pending}
            placeholder={t("@legalos.aiAssistant.composer.placeholderDefault")}
            className="flex-1 text-xs px-3 py-2.5 rounded-md border outline-none transition-colors"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface2)",
              color: "var(--text)",
            }}
          />
          <Button
            onClick={() => send(inputQuery)}
            loading={pending}
            disabled={!inputQuery.trim() || pending}
          >
            <Icon name="send" size={16} />
            <span>إرسال</span>
          </Button>
        </div>
      </main>

      {/* الشريط الجانبي الأيمن لمصادر المعرفة */}
      <aside
        className="w-72 flex-shrink-0 flex flex-col border-s overflow-y-auto p-4 gap-4"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}
      >
        <div className="flex items-center gap-2">
          <Icon name="auto_awesome" size={18} />
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.aiAssistant.knowledgeSources.heading")}
          </h2>
        </div>
        <p className="text-xs" style={{ color: "var(--text2)" }}>
          {t("@legalos.aiAssistant.knowledgeSources.description")}
        </p>

        {corpus.failed ? (
          <Alert
            type="danger"
            title={t("@legalos.corpus.unavailableTitle")}
          >
            {t("@legalos.corpus.unavailableDescription")}
          </Alert>
        ) : (
          <Card className="p-3 flex flex-col gap-2">
            {(["EG", "SA"] as const).map((code) => (
              <div key={code} className="flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {t(`@legalos.jurisdiction.${code}`)}
                </span>
                {corpus.stats && !corpus.has(code) ? (
                  <Badge color="neutral">{t("@legalos.corpus.notIngested")}</Badge>
                ) : (
                  <span style={{ color: "var(--text2)" }}>
                    {t("@legalos.corpus.counts", {
                      instruments: corpus.counts(code).instruments,
                      articles: corpus.counts(code).articles,
                    })}
                  </span>
                )}
              </div>
            ))}
          </Card>
        )}

        <div className="pt-3 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
            {t("@legalos.aiAssistant.knowledgeSources.citedHeading")}
          </span>
          {citedArticles.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {t("@legalos.aiAssistant.knowledgeSources.noneYet")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {citedArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="p-2 rounded-md border flex items-center justify-between gap-2 hover:bg-[var(--surface)] transition-colors text-xs"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex flex-col gap-0.5 truncate">
                    <span className="font-bold truncate" style={{ color: "var(--primary)" }}>
                      {article.citation}
                    </span>
                    <span className="text-[11px] truncate" style={{ color: "var(--text2)" }}>
                      {article.instrument_title}
                    </span>
                  </div>
                  <Icon name="open_in_new" size={14} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
          {t("@legalos.aiAssistant.knowledgeSources.footer")}
        </div>
      </aside>
    </div>
  );
}

function ModeChips() {
  const router = useRouter();
  const t = useTranslator();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        {MODES.map((mode) => (
          <Button
            key={mode.id}
            size="sm"
            variant={mode.isLive ? "secondary" : "ghost"}
            disabled={!mode.isLive && !mode.href}
            onClick={mode.href ? () => router.push(mode.href!) : undefined}
          >
            <Icon name={mode.iconName} size={14} />
            <span>{t(mode.labelKey)}</span>
          </Button>
        ))}
      </div>
      <span className="text-[11px]" style={{ color: "var(--text2)" }}>
        {t("@legalos.aiAssistant.modes.availabilityNote")}
      </span>
    </div>
  );
}

function TurnView({ turn, t }: { turn: Turn; t: TranslatorFn }) {
  return (
    <div className="flex flex-col gap-3">
      {/* سؤال المستخدم */}
      <div className="flex justify-end">
        <div
          className="max-w-[80%] p-3 rounded-xl text-xs leading-relaxed"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
          dir={dirOf(turn.question)}
        >
          {turn.question}
        </div>
      </div>

      {/* إجابة المساعد الذكي */}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: "var(--surface3)",
            color: "var(--primary)",
          }}
        >
          <Icon name="auto_awesome" size={16} />
        </div>
        <div className="flex-1 max-w-[85%]">
          {!turn.answer && !turn.error ? (
            <div className="p-3 rounded-lg border text-xs flex items-center gap-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}>
              <Icon name="hourglass_empty" size={16} />
              <span>{t("@legalos.ask.searching")}</span>
            </div>
          ) : turn.error ? (
            <Alert
              type={turn.error.isCredits ? "warn" : "danger"}
              title={t(
                turn.error.isCredits
                  ? "@legalos.ask.error.creditsTitle"
                  : "@legalos.ask.error.genericTitle",
              )}
            >
              {turn.error.message}
            </Alert>
          ) : (
            <GroundedAnswer answer={turn.answer!} />
          )}
        </div>
      </div>
    </div>
  );
}
