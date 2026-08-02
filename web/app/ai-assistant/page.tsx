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
import { GroundedAnswer, GroundedAnswerData } from "@/components/GroundedAnswer";
import { dirOf, Article } from "@/lib/api";

// ---------------------------------------------------------------------------
// Mock data — this route is a UI concept pass with no live API wiring (see
// web/app/page.tsx for the real, working chat). Citation format and refusal
// tone mirror that real system exactly: [Law N/YYYY, Art. M], and a question
// the corpus can't support is refused rather than guessed at.
// ---------------------------------------------------------------------------

const RECENT_CHATS: { id: string; titleKey: string; timeKey: string }[] = [
  {
    id: "c1",
    titleKey: "@legalos.aiAssistant.recentChats.item1",
    timeKey: "@legalos.aiAssistant.time.justNow",
  },
  {
    id: "c2",
    titleKey: "@legalos.aiAssistant.recentChats.item2",
    timeKey: "@legalos.aiAssistant.time.yesterday",
  },
  {
    id: "c3",
    titleKey: "@legalos.aiAssistant.recentChats.item3",
    timeKey: "@legalos.aiAssistant.time.yesterday",
  },
  {
    id: "c4",
    titleKey: "@legalos.aiAssistant.recentChats.item4",
    timeKey: "@legalos.aiAssistant.time.daysAgo3",
  },
  {
    id: "c5",
    titleKey: "@legalos.aiAssistant.recentChats.item5",
    timeKey: "@legalos.aiAssistant.time.weekAgo1",
  },
];

const MODES: {
  id: string;
  labelKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href?: string;
}[] = [
  { id: "draft", labelKey: "@legalos.aiAssistant.modes.draft", icon: DocumentTextIcon },
  {
    id: "review",
    labelKey: "@legalos.aiAssistant.modes.review",
    icon: DocumentMagnifyingGlassIcon,
    href: "/contract-review",
  },
  { id: "translate", labelKey: "@legalos.aiAssistant.modes.translate", icon: LanguageIcon },
  { id: "summarize", labelKey: "@legalos.aiAssistant.modes.summarize", icon: ClipboardDocumentListIcon },
  { id: "case-analysis", labelKey: "@legalos.aiAssistant.modes.caseAnalysis", icon: ScaleIcon },
  {
    id: "clause-comparison",
    labelKey: "@legalos.aiAssistant.modes.clauseComparison",
    icon: ArrowsRightLeftIcon,
  },
  { id: "timeline", labelKey: "@legalos.aiAssistant.modes.timeline", icon: ClockIcon },
  { id: "qa", labelKey: "@legalos.aiAssistant.modes.qa", icon: ChatBubbleLeftRightIcon },
];

const LABOUR_ARTICLES: Article[] = [
  {
    id: 1101,
    citation: "Law 12/2003, Art. 110",
    instrument_number: "12",
    instrument_year: 2003,
    instrument_title: "Labour Law No. 12 of 2003",
    article_number: "110",
    text: "على صاحب العمل أو العامل الراغب في إنهاء عقد العمل غير محدد المدة أن يخطر الطرف الآخر كتابة قبل الإنهاء بمدة لا تقل عن شهرين إذا كانت مدة خدمة العامل لا تجاوز عشر سنوات، وبمدة لا تقل عن ثلاثة أشهر إذا جاوزت مدة خدمته عشر سنوات.",
    score: 0.913,
  },
  {
    id: 1102,
    citation: "Law 12/2003, Art. 111",
    instrument_number: "12",
    instrument_year: 2003,
    instrument_title: "Labour Law No. 12 of 2003",
    article_number: "111",
    text: "إذا لم يراعِ الطرف الذي أنهى العقد مهلة الإخطار المنصوص عليها في المادة السابقة، التزم بأن يؤدي للطرف الآخر تعويضًا يعادل أجر العامل عن مهلة الإخطار أو ما تبقى منها.",
    score: 0.887,
  },
];

const COMPANIES_ARTICLES: Article[] = [
  {
    id: 2201,
    citation: "Law 1/1437, Art. 152",
    instrument_number: "1",
    instrument_year: 1437,
    instrument_title: "Saudi Companies Law No. 1 of 1437H",
    article_number: "152",
    text: "يجوز أن تتكون الشركة ذات المسؤولية المحدودة من شخص طبيعي أو اعتباري واحد يمتلك جميع حصصها، ويسري عليها في هذه الحالة ما يسري على الشركة ذات الشخص الواحد من أحكام هذا النظام.",
    score: 0.901,
  },
  {
    id: 2202,
    citation: "Law 1/1437, Art. 153",
    instrument_number: "1",
    instrument_year: 1437,
    instrument_title: "Saudi Companies Law No. 1 of 1437H",
    article_number: "153",
    text: "يُمارس الشريك الوحيد الاختصاصات المقررة للجمعية العامة للشركاء، وعليه أن يثبت قراراته في محضر خاص يُودَع في مقر الشركة.",
    score: 0.86,
  },
];

const CIVIL_CODE_ARTICLES: Article[] = [
  {
    id: 3301,
    citation: "Law 131/1948, Art. 148",
    instrument_number: "131",
    instrument_year: 1948,
    instrument_title: "Civil Code No. 131 of 1948",
    article_number: "148",
    text: "يجب تنفيذ العقد طبقًا لما اشتمل عليه وبطريقة تتفق مع ما يوجبه حسن النية.",
    score: 0.79,
  },
];

type Turn =
  | {
      kind: "qa";
      id: string;
      question: string;
      mode?: string;
      time: string;
      answer: GroundedAnswerData;
      refusalDescription?: string;
    }
  | { kind: "notice"; id: string; question: string; time: string };

const SAMPLE_TURNS: Record<string, Turn> = {
  labour: {
    kind: "qa",
    id: "labour",
    time: "10:02 AM",
    question: "ما هي مدة الإخطار الواجب توافرها لإنهاء عقد عمل غير محدد المدة؟",
    answer: {
      text: "وفقًا لقانون العمل المصري، يجب على أي من الطرفين الراغب في إنهاء عقد العمل غير محدد المدة إخطار الطرف الآخر كتابةً قبل الإنهاء بمدة لا تقل عن شهرين إذا كانت مدة خدمة العامل حتى عشر سنوات، وثلاثة أشهر إذا زادت مدة الخدمة عن ذلك [Law 12/2003, Art. 110].\n\nوفي حالة عدم مراعاة مهلة الإخطار، يلتزم الطرف الذي أنهى العقد بأن يدفع للطرف الآخر تعويضًا معادلاً لأجر العامل عن مهلة الإخطار أو الجزء المتبقي منها [Law 12/2003, Art. 111].\n\n_للاطلاع على النص الكامل يرجى مراجعة الجريدة الرسمية؛ هذه الإجابة لا تُغني عن الاستشارة القانونية._",
      citations: ["Law 12/2003, Art. 110", "Law 12/2003, Art. 111"],
      refused: false,
      strategy: "vector_search",
      articles: LABOUR_ARTICLES,
    },
  },
  companies: {
    kind: "qa",
    id: "companies",
    time: "10:05 AM",
    question: "Does Saudi Arabia's Companies Law allow a single-shareholder limited liability company?",
    answer: {
      text: "Yes. Saudi Arabia's Companies Law permits a single natural or corporate person to incorporate and hold all shares of a limited liability company on their own [Law 1/1437, Art. 152]. The sole shareholder exercises the powers otherwise reserved for the general assembly of partners and must record their resolutions in a special register kept at the company's registered office [Law 1/1437, Art. 153].\n\n_Saudi statute citations follow the Umm Al-Qura gazette numbering used in the ingested corpus._",
      citations: ["Law 1/1437, Art. 152", "Law 1/1437, Art. 153"],
      refused: false,
      strategy: "vector_search",
      articles: COMPANIES_ARTICLES,
    },
  },
  crypto: {
    kind: "qa",
    id: "crypto",
    time: "10:07 AM",
    question: "What are the penalties for undeclared cryptocurrency gains under Egyptian tax law?",
    refusalDescription:
      "No ingested article addresses cryptocurrency taxation specifically. Rather than reasoning from general knowledge, the system refuses — ask about a provision that exists in the Egyptian or Saudi statute corpus, or route this to a tax advisor for an unsettled area of law.",
    answer: {
      text: "",
      citations: [],
      refused: true,
      strategy: "vector_search",
      articles: [],
    },
  },
  draft: {
    kind: "qa",
    id: "draft",
    time: "10:11 AM",
    mode: "draft",
    question: "Draft a standard confidentiality clause for a services agreement governed by Egyptian law.",
    answer: {
      text: 'Here is a standard mutual confidentiality clause for a services agreement governed by Egyptian law:\n\n"Each Party shall keep confidential all information disclosed by the other Party in connection with this Agreement and shall not disclose it to any third party without the disclosing Party\'s prior written consent, except as required by law or a competent authority."\n\nBecause Egyptian contract law requires performance in accordance with good faith [Law 131/1948, Art. 148], pair this clause with a defined term and carve-outs for information that becomes public through no fault of the receiving party — an open-ended confidentiality clause with no term is routinely narrowed by Egyptian courts.\n\n_This drafting suggestion is grounded in the retrieved article above; it is a starting point, not a substitute for review by a licensed lawyer._',
      citations: ["Law 131/1948, Art. 148"],
      refused: false,
      strategy: "vector_search",
      articles: CIVIL_CODE_ARTICLES,
    },
  },
};

const SUGGESTIONS: { key: string; turn: string }[] = [
  { key: "@legalos.aiAssistant.suggestions.labour", turn: "labour" },
  { key: "@legalos.aiAssistant.suggestions.companies", turn: "companies" },
  { key: "@legalos.aiAssistant.suggestions.draft", turn: "draft" },
];

function ModeChips({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const t = useTranslator();
  return (
    <HStack gap={2} wrap="wrap">
      {MODES.map((m) => (
        <Button
          key={m.id}
          label={t(m.labelKey)}
          size="sm"
          variant={active === m.id ? "secondary" : "ghost"}
          icon={<Icon icon={m.icon} size="sm" className="text-purple-vivid" />}
          onClick={() => (m.href ? router.push(m.href) : onSelect(m.id))}
        >
          {t(m.labelKey)}
        </Button>
      ))}
    </HStack>
  );
}

function TurnView({ turn, t }: { turn: Turn; t: TranslatorFn }) {
  const mode = turn.kind === "qa" ? MODES.find((m) => m.id === turn.mode) : undefined;
  return (
    <div key={turn.id}>
      <ChatMessage sender="user">
        <ChatMessageBubble
          metadata={
            <ChatMessageMetadata
              timestamp={<Timestamp value={`2026-07-31T${to24(turn.time)}`} format="time" />}
              footer={
                turn.kind === "qa" && turn.mode ? (
                  <Badge variant="purple" label={mode ? t(mode.labelKey) : turn.mode} />
                ) : undefined
              }
            />
          }
        >
          <div dir={dirOf(turn.question)}>
            <Text type="body">{turn.question}</Text>
          </div>
        </ChatMessageBubble>
      </ChatMessage>

      <ChatMessage sender="assistant" avatar={<Avatar name="LegalOS AI" size="md" />}>
        <ChatMessageBubble variant="ghost">
          {turn.kind === "notice" ? (
            <Banner
              status="info"
              title={t("@legalos.aiAssistant.conceptPreview.title")}
              description={t("@legalos.aiAssistant.conceptPreview.description")}
            />
          ) : (
            <GroundedAnswer answer={turn.answer} refusalDescription={turn.refusalDescription} />
          )}
        </ChatMessageBubble>
      </ChatMessage>
    </div>
  );
}

function to24(t: string) {
  const [time, meridiem] = t.split(" ");
  if (!meridiem) return "10:00:00";
  let [h, m] = time.split(":").map(Number);
  if (meridiem === "PM" && h !== 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

export default function AiAssistantPage() {
  const t = useTranslator();
  const [turns, setTurns] = useState<Turn[]>([
    SAMPLE_TURNS.labour,
    SAMPLE_TURNS.companies,
    SAMPLE_TURNS.crypto,
    SAMPLE_TURNS.draft,
  ]);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function newChat() {
    setTurns([]);
    setActiveMode(null);
  }

  function addSample(key: string) {
    setPending(true);
    setTimeout(() => {
      setTurns((prev) => [...prev, SAMPLE_TURNS[key]]);
      setPending(false);
    }, 500);
  }

  function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setTimeout(() => {
      setTurns((prev) => [
        ...prev,
        {
          kind: "notice",
          id: `notice-${prev.length}`,
          question: trimmed,
          time: t("@legalos.aiAssistant.time.now"),
        },
      ]);
      setPending(false);
    }, 500);
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
                onClick={newChat}
                width="100%"
              >
                {t("@legalos.aiAssistant.newChat")}
              </Button>
            </VStack>
            <Divider />
            <StackItem size="fill" isScrollable>
              <List hasDividers density="compact">
                {RECENT_CHATS.map((c, i) => (
                  <ListItem
                    key={c.id}
                    // A conversation is identified by its subject, and the
                    // rail cut these one or two characters short of the end.
                    // Node labels are exempt from ListItem's single-line
                    // truncation, so the title wraps instead — and anything
                    // still too long keeps a tooltip, which the plain-string
                    // form does not give.
                    label={
                      <Text type="label" weight="medium" maxLines={2}>
                        {t(c.titleKey)}
                      </Text>
                    }
                    description={t(c.timeKey)}
                    isSelected={i === 0}
                    href="/ai-assistant"
                    startContent={
                      <Icon icon={ChatBubbleLeftRightIcon} size="sm" color="secondary" />
                    }
                  />
                ))}
              </List>
            </StackItem>
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
            <Card variant="purple" padding={3}>
              <VStack gap={2}>
                <HStack hAlign="between">
                  <Text type="label">{t("@legalos.aiAssistant.knowledgeSources.egypt")}</Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.aiAssistant.knowledgeSources.egyptCount")}
                  </Text>
                </HStack>
                <HStack hAlign="between">
                  <Text type="label">{t("@legalos.aiAssistant.knowledgeSources.saudi")}</Text>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.aiAssistant.knowledgeSources.saudiCount")}
                  </Text>
                </HStack>
              </VStack>
            </Card>
            <Divider />
            <VStack gap={2}>
              <Text type="label" color="secondary">
                {t("@legalos.aiAssistant.knowledgeSources.citedHeading")}
              </Text>
              <List hasDividers density="compact">
                {Array.from(
                  new Map(
                    turns
                      .filter((turn): turn is Extract<Turn, { kind: "qa" }> => turn.kind === "qa")
                      .flatMap((turn) => turn.answer.articles)
                      .map((a) => [a.citation, a]),
                  ).values(),
                ).map((a) => (
                  <ListItem
                    key={a.id}
                    label={a.citation}
                    description={a.instrument_title}
                    endContent={<Icon icon={BookOpenIcon} size="sm" color="secondary" />}
                  />
                ))}
              </List>
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
              <HStack hAlign="between" vAlign="center">
                <VStack gap={0.5}>
                  <Heading level={3}>{t("@legalos.aiAssistant.heading")}</Heading>
                  <Text type="supporting" color="secondary">
                    {t("@legalos.aiAssistant.subheading")}
                  </Text>
                </VStack>
              </HStack>
              <ModeChips active={activeMode} onSelect={setActiveMode} />
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
                        {SUGGESTIONS.map((s) => {
                          const label = t(s.key);
                          return (
                            <Card key={s.key} padding={2} variant="muted">
                              <button
                                onClick={() => addSample(s.turn)}
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
                    onSubmit={submit}
                    isDisabled={pending}
                    placeholder={
                      activeMode
                        ? t("@legalos.aiAssistant.composer.placeholderWithMode", {
                            mode: t(
                              MODES.find((m) => m.id === activeMode)?.labelKey ?? "",
                            ),
                          })
                        : t("@legalos.aiAssistant.composer.placeholderDefault")
                    }
                  />
                }
              >
                {turns.length > 0 && (
                  <ChatMessageList>
                    {turns.map((turn) => (
                      <TurnView key={turn.id} turn={turn} t={t} />
                    ))}
                    {pending && (
                      <ChatMessage sender="assistant" avatar={<Avatar name="LegalOS AI" size="md" />}>
                        <ChatMessageBubble variant="ghost">
                          <Spinner label={t("@legalos.aiAssistant.searchingCorpus")} />
                        </ChatMessageBubble>
                      </ChatMessage>
                    )}
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
