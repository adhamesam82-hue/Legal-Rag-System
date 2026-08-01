"use client";

import { useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { List, ListItem } from "@astryxdesign/core/List";
import { Link } from "@astryxdesign/core/Link";
import { Divider } from "@astryxdesign/core/Divider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import {
  SparklesIcon,
  BookOpenIcon,
  ScaleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";

const AI_ICON_CLASS = "text-purple-vivid";

// ---------------------------------------------------------------------------
// Mock research results. Citation format matches the real answering engine:
// [Law N/YYYY, Art. M]. The refusal example below is deliberate — the real
// system refuses rather than guessing when the corpus cannot support an answer.
// ---------------------------------------------------------------------------

const EXAMPLE_QUERY_KEYS = [
  "@legalos.legalResearch.exampleQueries.q1",
  "@legalos.legalResearch.exampleQueries.q2",
  "@legalos.legalResearch.exampleQueries.q3",
];

const ANSWER = {
  query: "What notice period applies to terminating an indefinite employment contract?",
  text: "For an employment contract of indefinite duration, either party may terminate it provided written notice is given to the other party. The notice period is two months where the worker has been employed for ten years or less, and three months where employment exceeds ten years [Law 12/2003, Art. 111]. Terminating without observing the notice period obliges the terminating party to pay the other party an amount equal to the worker's wage for the notice period, or the remainder of it [Law 12/2003, Art. 112]. Notice may not be given while the worker is on a legally granted leave [Law 12/2003, Art. 111].",
  jurisdiction: "Egypt",
};

// The refused-query example. Like ANSWER above, this is seeded engine output
// rather than UI copy, so it stays in its source language.
const REFUSAL = {
  query: "What is the minimum wage for offshore drilling contractors?",
  text: "I could not find this in the corpus. The indexed Egyptian legislation does not contain a provision setting a sector-specific minimum wage for offshore drilling contractors. Rather than infer from general wage provisions, this query is being refused — check the National Wage Council's periodic decisions, which are outside the indexed corpus.",
};

const LEGISLATION = [
  {
    citation: "Law 12/2003, Art. 111",
    title: "Labour Law — notice of termination for indefinite contracts",
    snippet:
      "إذا كان العقد غير محدد المدة جاز لكل من طرفيه إنهاؤه بشرط أن يخطر الطرف الآخر كتابة قبل الإنهاء…",
  },
  {
    citation: "Law 12/2003, Art. 112",
    title: "Labour Law — compensation in lieu of notice",
    snippet:
      "إذا لم يراع أحد الطرفين مهلة الإخطار التزم بأن يؤدي إلى الطرف الآخر مبلغاً مساوياً لأجر العامل عن مدة الإخطار…",
  },
  {
    citation: "Law 12/2003, Art. 110",
    title: "Labour Law — termination of fixed-term contracts",
    snippet: "ينتهي عقد العمل المحدد المدة بانقضاء مدته أو بإنجاز العمل المتفق عليه…",
  },
];

const DECISIONS = [
  {
    court: "Court of Cassation",
    ref: "Appeal 14237/2019, session of 9 March 2021",
    holding:
      "Notice given during a worker's annual leave is void; the notice period runs only from the worker's return to service.",
  },
  {
    court: "Court of Cassation",
    ref: "Appeal 8891/2016, session of 12 June 2018",
    holding:
      "Payment in lieu of notice does not bar a separate claim for arbitrary dismissal where the termination lacked justification.",
  },
];

const PRECEDENTS = [
  {
    labelKey: "@legalos.legalResearch.precedents.item1",
    href: "/matters/delta-foods-labour-dispute",
  },
  { labelKey: "@legalos.legalResearch.precedents.item2", href: "/knowledge-base" },
];

export default function LegalResearchPage() {
  const t = useTranslator();
  const [query, setQuery] = useState(ANSWER.query);
  const [jurisdiction, setJurisdiction] = useState("EG");
  const [instrument, setInstrument] = useState("all");
  const [mode, setMode] = useState("answer");
  const [showRefusal, setShowRefusal] = useState(false);

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>{t("@legalos.legalResearch.heading")}</Heading>
              <Text type="body" color="secondary">
                {t("@legalos.legalResearch.description")}
              </Text>
            </VStack>

            <TextInput
              label={t("@legalos.legalResearch.searchLabel")}
              isLabelHidden
              value={query}
              onChange={setQuery}
              placeholder={t("@legalos.legalResearch.searchPlaceholder")}
              />

            <HStack gap={2} vAlign="center" wrap="wrap">
              <Selector
                label={t("@legalos.legalResearch.jurisdictionLabel")}
                value={jurisdiction}
                onChange={setJurisdiction}
                options={[
                  { value: "EG", label: t("@legalos.legalResearch.jurisdiction.egypt") },
                  { value: "SA", label: t("@legalos.legalResearch.jurisdiction.saudi") },
                ]}
              />
              <Selector
                label={t("@legalos.legalResearch.instrumentTypeLabel")}
                value={instrument}
                onChange={setInstrument}
                options={[
                  { value: "all", label: t("@legalos.legalResearch.instrumentType.all") },
                  { value: "law", label: t("@legalos.legalResearch.instrumentType.law") },
                  { value: "decree", label: t("@legalos.legalResearch.instrumentType.decree") },
                  {
                    value: "regulation",
                    label: t("@legalos.legalResearch.instrumentType.regulation"),
                  },
                ]}
              />
              <SegmentedControl
                value={mode}
                onChange={setMode}
                label={t("@legalos.legalResearch.resultModeLabel")}
              >
                <SegmentedControlItem
                  value="answer"
                  label={t("@legalos.legalResearch.resultMode.answer")}
                />
                <SegmentedControlItem
                  value="articles"
                  label={t("@legalos.legalResearch.resultMode.articles")}
                />
              </SegmentedControl>
              <Button
                label={t("@legalos.legalResearch.refusalToggle.ariaLabel")}
                variant="ghost"
                size="sm"
                onClick={() => setShowRefusal((v) => !v)}
              >
                {showRefusal
                  ? t("@legalos.legalResearch.refusalToggle.showAnswered")
                  : t("@legalos.legalResearch.refusalToggle.showRefusal")}
              </Button>
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6}>
            <Card variant="purple">
              <VStack gap={4}>
                <HStack gap={2} vAlign="center">
                  <Icon icon={SparklesIcon} size="sm" className={AI_ICON_CLASS} />
                  <Heading level={4}>{t("@legalos.legalResearch.aiAnswerHeading")}</Heading>
                  <Badge
                    variant="purple"
                    label={
                      jurisdiction === "EG"
                        ? t("@legalos.legalResearch.jurisdiction.egypt")
                        : t("@legalos.legalResearch.jurisdiction.saudi")
                    }
                  />
                </HStack>

                {showRefusal ? (
                  <VStack gap={3}>
                    <Text type="supporting" color="secondary">
                      {t("@legalos.legalResearch.queryPrefix", { query: REFUSAL.query })}
                    </Text>
                    <Text type="body">{REFUSAL.text}</Text>
                    <Text type="supporting" color="secondary">
                      {t("@legalos.legalResearch.refusalNote")}
                    </Text>
                  </VStack>
                ) : (
                  <VStack gap={3}>
                    <Text type="supporting" color="secondary">
                      {t("@legalos.legalResearch.queryPrefix", { query: ANSWER.query })}
                    </Text>
                    <Text type="body">{ANSWER.text}</Text>
                  </VStack>
                )}

                <Divider />
                <Text type="supporting" color="secondary">
                  {t("@legalos.legalResearch.disclaimersFooter")}
                </Text>
              </VStack>
            </Card>

            {!showRefusal && (
              <>
                <Card>
                  <VStack gap={4}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={BookOpenIcon} size="sm" color="secondary" />
                      <Heading level={4}>
                        {t("@legalos.legalResearch.referencedLegislationHeading")}
                      </Heading>
                    </HStack>
                    <List hasDividers density="balanced">
                      {LEGISLATION.map((l) => (
                        <ListItem
                          key={l.citation}
                          label={l.title}
                          description={
                            <VStack gap={1}>
                              <Text type="supporting" color="secondary">
                                {l.citation}
                              </Text>
                              <Text type="supporting" color="secondary" dir="rtl">
                                {l.snippet}
                              </Text>
                            </VStack>
                          }
                          startContent={<Icon icon={DocumentTextIcon} size="sm" color="secondary" />}
                        />
                      ))}
                    </List>
                  </VStack>
                </Card>

                <Card>
                  <VStack gap={4}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={ScaleIcon} size="sm" color="secondary" />
                      <Heading level={4}>
                        {t("@legalos.legalResearch.referencedDecisionsHeading")}
                      </Heading>
                    </HStack>
                    <List hasDividers density="balanced">
                      {DECISIONS.map((d) => (
                        <ListItem
                          key={d.ref}
                          label={d.ref}
                          description={
                            <Text type="supporting" color="secondary" maxLines={3}>
                              {d.holding}
                            </Text>
                          }
                          startContent={<Icon icon={ScaleIcon} size="sm" color="secondary" />}
                          endContent={
                            <Text type="supporting" color="secondary">
                              {d.court}
                            </Text>
                          }
                        />
                      ))}
                    </List>
                  </VStack>
                </Card>
              </>
            )}
          </VStack>
        </LayoutContent>
      }
      end={
        <LayoutPanel width={320} padding={0} isScrollable>
          <VStack gap={6}>
            <Card>
              <VStack gap={3}>
                <Heading level={4}>{t("@legalos.legalResearch.tryQuestionHeading")}</Heading>
                {EXAMPLE_QUERY_KEYS.map((key) => {
                  const q = t(key);
                  return (
                    <Card key={key} padding={2} variant="muted">
                      <button
                        onClick={() => {
                          setQuery(q);
                          setShowRefusal(false);
                        }}
                        style={{ textAlign: "start", width: "100%" }}
                      >
                        <Text type="supporting">{q}</Text>
                      </button>
                    </Card>
                  );
                })}
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>{t("@legalos.legalResearch.relatedPrecedentsHeading")}</Heading>
                <VStack gap={2}>
                  {PRECEDENTS.map((p) => (
                    <Link key={p.href} href={p.href}>
                      <Text type="supporting">{t(p.labelKey)}</Text>
                    </Link>
                  ))}
                </VStack>
              </VStack>
            </Card>

            <Card>
              <VStack gap={3}>
                <Heading level={4}>{t("@legalos.legalResearch.corpusHeading")}</Heading>
                <Text type="supporting" color="secondary">
                  {t("@legalos.legalResearch.corpusDescription")}
                </Text>
                <Link href="/ai-assistant">
                  {t("@legalos.legalResearch.openAiAssistantLink")}
                </Link>
              </VStack>
            </Card>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}
