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

const AI_ICON_CLASS = "text-purple-vivid";

// ---------------------------------------------------------------------------
// Mock research results. Citation format matches the real answering engine:
// [Law N/YYYY, Art. M]. The refusal example below is deliberate — the real
// system refuses rather than guessing when the corpus cannot support an answer.
// ---------------------------------------------------------------------------

const EXAMPLE_QUERIES = [
  "ما هي مدة الإجازة السنوية للعامل؟",
  "What notice period applies to terminating an indefinite employment contract?",
  "متى يجوز للشركة إصدار أسهم ممتازة؟",
];

const ANSWER = {
  query: "What notice period applies to terminating an indefinite employment contract?",
  text: "For an employment contract of indefinite duration, either party may terminate it provided written notice is given to the other party. The notice period is two months where the worker has been employed for ten years or less, and three months where employment exceeds ten years [Law 12/2003, Art. 111]. Terminating without observing the notice period obliges the terminating party to pay the other party an amount equal to the worker's wage for the notice period, or the remainder of it [Law 12/2003, Art. 112]. Notice may not be given while the worker is on a legally granted leave [Law 12/2003, Art. 111].",
  jurisdiction: "Egypt",
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
  { label: "Delta Foods Labour Dispute — severance calculation", href: "/matters/delta-foods-labour-dispute" },
  { label: "Firm template: Termination notice letter (indefinite contract)", href: "/knowledge-base" },
];

export default function LegalResearchPage() {
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
              <Heading level={2}>Legal research</Heading>
              <Text type="body" color="secondary">
                Search Egyptian and Saudi statutes and judgments. Every answer cites the
                articles it relies on.
              </Text>
            </VStack>

            <TextInput
              label="Search legislation and judgments"
              isLabelHidden
              value={query}
              onChange={setQuery}
              placeholder="Ask a question, or search by law number and article…"
              />

            <HStack gap={2} vAlign="center" wrap="wrap">
              <Selector
                label="Jurisdiction"
                value={jurisdiction}
                onChange={setJurisdiction}
                options={[
                  { value: "EG", label: "Egypt" },
                  { value: "SA", label: "Saudi Arabia" },
                ]}
              />
              <Selector
                label="Instrument type"
                value={instrument}
                onChange={setInstrument}
                options={[
                  { value: "all", label: "All instruments" },
                  { value: "law", label: "Laws" },
                  { value: "decree", label: "Decrees" },
                  { value: "regulation", label: "Regulations" },
                ]}
              />
              <SegmentedControl value={mode} onChange={setMode} label="Result mode">
                <SegmentedControlItem value="answer" label="AI answer" />
                <SegmentedControlItem value="articles" label="Articles only" />
              </SegmentedControl>
              <Button
                label="Show a refused query example"
                variant="ghost"
                size="sm"
                onClick={() => setShowRefusal((v) => !v)}
              >
                {showRefusal ? "Show answered example" : "Show refusal example"}
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
                  <Heading level={4}>AI answer</Heading>
                  <Badge variant="purple" label={jurisdiction === "EG" ? "Egypt" : "Saudi Arabia"} />
                </HStack>

                {showRefusal ? (
                  <VStack gap={3}>
                    <Text type="supporting" color="secondary">
                      Query: &ldquo;What is the minimum wage for offshore drilling contractors?&rdquo;
                    </Text>
                    <Text type="body">
                      I could not find this in the corpus. The indexed Egyptian legislation does
                      not contain a provision setting a sector-specific minimum wage for offshore
                      drilling contractors. Rather than infer from general wage provisions, this
                      query is being refused — check the National Wage Council&apos;s periodic
                      decisions, which are outside the indexed corpus.
                    </Text>
                    <Text type="supporting" color="secondary">
                      Refusing beats guessing: an invented article number is the failure mode this
                      system is built to prevent.
                    </Text>
                  </VStack>
                ) : (
                  <VStack gap={3}>
                    <Text type="supporting" color="secondary">
                      Query: &ldquo;{ANSWER.query}&rdquo;
                    </Text>
                    <Text type="body">{ANSWER.text}</Text>
                  </VStack>
                )}

                <Divider />
                <Text type="supporting" color="secondary">
                  Research assistance, not legal advice. Verify every citation against the
                  official gazette before relying on it.
                </Text>
              </VStack>
            </Card>

            {!showRefusal && (
              <>
                <Card>
                  <VStack gap={4}>
                    <HStack gap={2} vAlign="center">
                      <Icon icon={BookOpenIcon} size="sm" color="secondary" />
                      <Heading level={4}>Referenced legislation</Heading>
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
                      <Heading level={4}>Referenced court decisions</Heading>
                    </HStack>
                    <List hasDividers density="balanced">
                      {DECISIONS.map((d) => (
                        <ListItem
                          key={d.ref}
                          label={d.ref}
                          description={d.holding}
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
                <Heading level={4}>Try a question</Heading>
                {EXAMPLE_QUERIES.map((q) => (
                  <Button
                    key={q}
                    label={q}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery(q);
                      setShowRefusal(false);
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </VStack>
            </Card>

            <Card>
              <VStack gap={4}>
                <Heading level={4}>Related precedents</Heading>
                <List hasDividers density="compact">
                  {PRECEDENTS.map((p) => (
                    <ListItem key={p.href} label={p.label} href={p.href} />
                  ))}
                </List>
              </VStack>
            </Card>

            <Card>
              <VStack gap={3}>
                <Heading level={4}>Corpus</Heading>
                <Text type="supporting" color="secondary">
                  Egypt · 6,985 articles indexed across the Civil Code, Labour Law, and
                  Companies Law. Jurisdiction is a hard filter — an Egypt-scoped query never
                  returns Saudi text.
                </Text>
                <Link href="/ai-assistant">Open AI Assistant</Link>
              </VStack>
            </Card>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}
