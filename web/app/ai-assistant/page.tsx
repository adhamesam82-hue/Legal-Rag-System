"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack, HStack, StackItem } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Divider } from "@astryxdesign/core/Divider";
import { List, ListItem } from "@astryxdesign/core/List";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Selector } from "@astryxdesign/core/Selector";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
} from "@astryxdesign/core/Chat";
import {
  SparklesIcon,
  PlusIcon,
  DocumentTextIcon,
  DocumentMagnifyingGlassIcon,
  LanguageIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { useTranslator, type TranslatorFn } from "@astryxdesign/core/i18n";
import { GroundedAnswer } from "@/components/GroundedAnswer";
import { useCorpusStats } from "@/lib/corpus";
import { api, ApiError, dirOf, type AskResponse, type Jurisdiction } from "@/lib/api";

/**
 * Modes the assistant is intended to offer. Only question answering is wired:
 * `/api/ask` composes an answer strictly from retrieved statute text and
 * refuses anything the corpus cannot support, so drafting, translation and
 * summarisation are not the same request with a different prompt — they need
 * their own backends. They are shown disabled rather than hidden so the
 * intended surface stays visible without implying it works.
 */
const MODES: {
  id: string;
  labelKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href?: string;
  isLive?: boolean;
}[] = [
  { id: "qa", labelKey: "@legalos.aiAssistant.modes.qa", icon: ChatBubbleLeftRightIcon, isLive: true },
  { id: "draft", labelKey: "@legalos.aiAssistant.modes.draft", icon: DocumentTextIcon },
  {
    id: "review",
    labelKey: "@legalos.aiAssistant.modes.review",
    icon: DocumentMagnifyingGlassIcon,
    href: "/contract-review",
  },
  { id: "translate", labelKey: "@legalos.aiAssistant.modes.translate", icon: LanguageIcon },
  {
    id: "summarize",
    labelKey: "@legalos.aiAssistant.modes.summarize",
    icon: ClipboardDocumentListIcon,
  },
  { id: "case-analysis", labelKey: "@legalos.aiAssistant.modes.caseAnalysis", icon: ScaleIcon },
  {
    id: "clause-comparison",
    labelKey: "@legalos.aiAssistant.modes.clauseComparison",
    icon: ArrowsRightLeftIcon,
  },
  { id: "timeline", labelKey: "@legalos.aiAssistant.modes.timeline", icon: ClockIcon },
];

const SUGGESTION_KEYS = [
  "@legalos.aiAssistant.suggestions.notice",
  "@legalos.aiAssistant.suggestions.leave",
  "@legalos.aiAssistant.suggestions.companies",
];

interface Turn {
  id: string;
  question: string;
  /** ISO timestamp, stamped when the question is sent. */
  at: string;
  answer?: AskResponse;
  error?: { message: string; isCredits: boolean };
}

interface Conversation {
  id: string;
  title: string;
  turns: Turn[];
}

// Conversations live in component state and end with the tab. There is no
// history endpoint yet, so the rail lists this session only and says so —
// showing a persistent-looking archive would promise storage that does not
// exist.
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

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const turns = active?.turns ?? [];

  // Only articles the answer actually cited, not everything retrieval
  // returned. Eight articles are fetched per question and typically one or two
  // are relied on; listing all of them under "Cited" would inflate the
  // provenance trail this panel exists to make checkable.
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

    const turn: Turn = { id: nextId("turn"), question: trimmed, at: new Date().toISOString() };

    // The first question of a session also creates the conversation, so the
    // rail never shows an empty thread waiting to be filled.
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
    <Layout
      height="fill"
      start={
        <LayoutPanel width={272} hasDivider padding={0}>
          <VStack gap={0} height="100%">
            <VStack gap={3} padding={4}>
              <Button
                label={t("@legalos.aiAssistant.newChat")}
                variant="primary"
                icon={<Icon icon={PlusIcon} size="sm" color="inherit" />}
                onClick={() => setActiveId(null)}
                isDisabled={pending}
                width="100%"
              >
                {t("@legalos.aiAssistant.newChat")}
              </Button>
            </VStack>
            <Divider />
            <StackItem size="fill" isScrollable>
              {conversations.length === 0 ? (
                <VStack padding={4}>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.aiAssistant.noConversations")}
                  </Text>
                </VStack>
              ) : (
                <List hasDividers density="compact">
                  {conversations.map((conversation) => (
                    <ListItem
                      key={conversation.id}
                      // A conversation is identified by its subject, and the
                      // rail cut these one or two characters short of the end.
                      // Node labels are exempt from ListItem's single-line
                      // truncation, so the title wraps instead — and anything
                      // still too long keeps a tooltip, which the plain-string
                      // form does not give.
                      label={
                        <Text type="label" weight="medium" maxLines={2} dir={dirOf(conversation.title)}>
                          {conversation.title}
                        </Text>
                      }
                      description={t("@legalos.aiAssistant.turnCount", {
                        count: conversation.turns.length,
                      })}
                      isSelected={conversation.id === activeId}
                      onClick={() => setActiveId(conversation.id)}
                      startContent={
                        <Icon icon={ChatBubbleLeftRightIcon} size="sm" color="secondary" />
                      }
                    />
                  ))}
                </List>
              )}
            </StackItem>
            <Divider />
            <VStack padding={4}>
              <Text type="supporting" color="secondary">
                {t("@legalos.aiAssistant.sessionOnlyNote")}
              </Text>
            </VStack>
          </VStack>
        </LayoutPanel>
      }
      end={
        <LayoutPanel width={300} hasDivider padding={4} isScrollable>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center">
              <Icon icon={SparklesIcon} size="sm" className="text-purple-vivid" />
              <Heading level={4}>{t("@legalos.aiAssistant.knowledgeSources.heading")}</Heading>
            </HStack>
            <Text type="supporting" color="secondary">
              {t("@legalos.aiAssistant.knowledgeSources.description")}
            </Text>

            {corpus.failed ? (
              <Banner
                status="error"
                title={t("@legalos.corpus.unavailableTitle")}
                description={t("@legalos.corpus.unavailableDescription")}
              />
            ) : (
              <Card variant="purple" padding={3}>
                <VStack gap={2}>
                  {(["EG", "SA"] as const).map((code) => (
                    <HStack key={code} hAlign="between" vAlign="center" gap={2}>
                      <Text type="label">{t(`@legalos.jurisdiction.${code}`)}</Text>
                      {corpus.stats && !corpus.has(code) ? (
                        <Badge variant="neutral" label={t("@legalos.corpus.notIngested")} />
                      ) : (
                        <Text type="supporting" color="secondary">
                          {t("@legalos.corpus.counts", {
                            instruments: corpus.counts(code).instruments,
                            articles: corpus.counts(code).articles,
                          })}
                        </Text>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </Card>
            )}

            <Divider />
            <VStack gap={2}>
              <Text type="label" color="secondary">
                {t("@legalos.aiAssistant.knowledgeSources.citedHeading")}
              </Text>
              {citedArticles.length === 0 ? (
                <Text type="supporting" color="secondary">
                  {t("@legalos.aiAssistant.knowledgeSources.noneYet")}
                </Text>
              ) : (
                <List hasDividers density="compact">
                  {citedArticles.map((article) => (
                    <ListItem
                      key={article.id}
                      label={article.citation}
                      description={article.instrument_title}
                      href={`/article/${article.id}`}
                      endContent={<Icon icon={BookOpenIcon} size="sm" color="secondary" />}
                    />
                  ))}
                </List>
              )}
            </VStack>
            <Divider />
            <Text type="supporting" color="secondary">
              {t("@legalos.aiAssistant.knowledgeSources.footer")}
            </Text>
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={0}>
          <VStack gap={0} height="100%">
            <VStack gap={3} padding={4}>
              <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
                <VStack gap={0.5}>
                  <Heading level={3}>{t("@legalos.aiAssistant.heading")}</Heading>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.aiAssistant.subheading")}
                  </Text>
                </VStack>
                <JurisdictionSelector
                  value={jurisdiction}
                  onChange={setJurisdiction}
                  isSaudiAvailable={corpus.has("SA")}
                  t={t}
                />
              </HStack>
              <ModeChips />
            </VStack>
            <Divider />
            <StackItem size="fill">
              <ChatLayout
                density="spacious"
                emptyState={
                  <EmptyState
                    title={t("@legalos.aiAssistant.emptyState.title")}
                    description={t("@legalos.aiAssistant.emptyState.description")}
                    actions={
                      <VStack gap={2} width="100%">
                        {SUGGESTION_KEYS.map((key) => {
                          const label = t(key);
                          return (
                            <Card key={key} padding={2} variant="muted">
                              <button
                                onClick={() => send(label)}
                                style={{ textAlign: "start", width: "100%" }}
                                dir={dirOf(label)}
                              >
                                <Text type="label">{label}</Text>
                              </button>
                            </Card>
                          );
                        })}
                      </VStack>
                    }
                  />
                }
                composer={
                  <ChatComposer
                    onSubmit={send}
                    isDisabled={pending}
                    placeholder={t("@legalos.aiAssistant.composer.placeholderDefault")}
                  />
                }
              >
                {turns.length > 0 && (
                  <ChatMessageList>
                    {turns.map((turn) => (
                      <TurnView key={turn.id} turn={turn} t={t} />
                    ))}
                  </ChatMessageList>
                )}
              </ChatLayout>
            </StackItem>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

function JurisdictionSelector({
  value,
  onChange,
  isSaudiAvailable,
  t,
}: {
  value: Jurisdiction;
  onChange: (value: Jurisdiction) => void;
  isSaudiAvailable: boolean;
  t: TranslatorFn;
}) {
  return (
    <Selector
      label={t("@legalos.jurisdiction.label")}
      value={value}
      onChange={(next) => onChange(next as Jurisdiction)}
      options={[
        { value: "EG", label: t("@legalos.jurisdiction.EG") },
        {
          value: "SA",
          // Jurisdiction is a hard filter in retrieval, so selecting a
          // jurisdiction with nothing ingested would refuse every question
          // with no indication why.
          label: isSaudiAvailable
            ? t("@legalos.jurisdiction.SA")
            : t("@legalos.jurisdiction.SAUnavailable"),
          disabled: !isSaudiAvailable,
        },
      ]}
    />
  );
}

function ModeChips() {
  const router = useRouter();
  const t = useTranslator();
  return (
    <VStack gap={2}>
      <HStack gap={2} wrap="wrap">
        {MODES.map((mode) => (
          <Button
            key={mode.id}
            label={t(mode.labelKey)}
            size="sm"
            variant={mode.isLive ? "secondary" : "ghost"}
            isDisabled={!mode.isLive && !mode.href}
            tooltip={mode.isLive ? undefined : t("@legalos.aiAssistant.modes.notBuiltTooltip")}
            icon={<Icon icon={mode.icon} size="sm" className="text-purple-vivid" />}
            onClick={mode.href ? () => router.push(mode.href!) : undefined}
          >
            {t(mode.labelKey)}
          </Button>
        ))}
      </HStack>
      <Text type="supporting" color="secondary">
        {t("@legalos.aiAssistant.modes.availabilityNote")}
      </Text>
    </VStack>
  );
}

function TurnView({ turn, t }: { turn: Turn; t: TranslatorFn }) {
  return (
    <div>
      <ChatMessage sender="user">
        <ChatMessageBubble
          metadata={
            <ChatMessageMetadata timestamp={<Timestamp value={turn.at} format="time" />} />
          }
        >
          <div dir={dirOf(turn.question)}>
            <Text type="body">{turn.question}</Text>
          </div>
        </ChatMessageBubble>
      </ChatMessage>

      <ChatMessage sender="assistant" avatar={<Avatar name="LegalOS AI" size="md" />}>
        <ChatMessageBubble variant="ghost">
          {!turn.answer && !turn.error ? (
            <Spinner label={t("@legalos.ask.searching")} />
          ) : turn.error ? (
            <Banner
              status={turn.error.isCredits ? "warning" : "error"}
              title={t(
                turn.error.isCredits
                  ? "@legalos.ask.error.creditsTitle"
                  : "@legalos.ask.error.genericTitle",
              )}
              description={turn.error.message}
            />
          ) : (
            <GroundedAnswer answer={turn.answer!} />
          )}
        </ChatMessageBubble>
      </ChatMessage>
    </div>
  );
}
