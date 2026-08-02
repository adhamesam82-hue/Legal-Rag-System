"use client";

import { useState } from "react";
import { Layout, LayoutHeader, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Link } from "@astryxdesign/core/Link";
import { Divider } from "@astryxdesign/core/Divider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { SparklesIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import { useTranslator } from "@astryxdesign/core/i18n";
import { GroundedAnswer } from "@/components/GroundedAnswer";
import { ArticleCard } from "@/components/ArticleCard";
import { useCorpusStats } from "@/lib/corpus";
import {
  api,
  ApiError,
  dirOf,
  type AskResponse,
  type Jurisdiction,
  type SearchResponse,
} from "@/lib/api";

const EXAMPLE_QUERY_KEYS = [
  "@legalos.legalResearch.exampleQueries.q1",
  "@legalos.legalResearch.exampleQueries.q2",
  "@legalos.legalResearch.exampleQueries.q3",
];

/** `answer` composes a cited answer via /api/ask; `articles` returns the
 *  ranked retrieval only, with no LLM call. */
type Mode = "answer" | "articles";

export default function LegalResearchPage() {
  const t = useTranslator();
  const corpus = useCorpusStats();
  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("EG");
  const [mode, setMode] = useState<Mode>("answer");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; isCredits: boolean } | null>(null);

  async function run(raw: string, runMode: Mode = mode) {
    const trimmed = raw.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    setAnswer(null);
    setSearch(null);
    setSubmitted(trimmed);

    try {
      if (runMode === "answer") {
        setAnswer(await api.ask({ question: trimmed, jurisdiction }));
      } else {
        setSearch(await api.search({ query: trimmed, jurisdiction, limit: 15 }));
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? { message: e.message, isCredits: e.isCredits }
          : { message: String(e), isCredits: false },
      );
    } finally {
      setPending(false);
    }
  }

  // Switching between a composed answer and the raw ranking is a different
  // view of the same question, so it re-runs rather than blanking the screen.
  function changeMode(next: Mode) {
    setMode(next);
    if (submitted) run(submitted, next);
  }

  const articles = mode === "answer" ? (answer?.articles ?? []) : (search?.articles ?? []);

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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(query);
              }}
            >
              <VStack gap={4}>
                <TextInput
                  label={t("@legalos.legalResearch.searchLabel")}
                  isLabelHidden
                  value={query}
                  onChange={setQuery}
                  placeholder={t("@legalos.legalResearch.searchPlaceholder")}
                />

                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Selector
                    label={t("@legalos.jurisdiction.label")}
                    value={jurisdiction}
                    onChange={(next) => setJurisdiction(next as Jurisdiction)}
                    options={[
                      { value: "EG", label: t("@legalos.jurisdiction.EG") },
                      {
                        // Jurisdiction is a hard filter in retrieval: selecting
                        // one with nothing ingested would return nothing on
                        // every query with no indication why.
                        value: "SA",
                        label: corpus.has("SA")
                          ? t("@legalos.jurisdiction.SA")
                          : t("@legalos.jurisdiction.SAUnavailable"),
                        disabled: !corpus.has("SA"),
                      },
                    ]}
                  />
                  <SegmentedControl
                    value={mode}
                    onChange={(next) => changeMode(next as Mode)}
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
                    type="submit"
                    label={t("@legalos.legalResearch.submit")}
                    variant="primary"
                    isLoading={pending}
                  />
                </HStack>
              </VStack>
            </form>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={6}>
            {error && (
              <Banner
                status={error.isCredits ? "warning" : "error"}
                title={t(
                  error.isCredits
                    ? "@legalos.ask.error.creditsTitle"
                    : "@legalos.ask.error.genericTitle",
                )}
                description={error.message}
              />
            )}

            {pending && <Spinner label={t("@legalos.ask.searching")} />}

            {!pending && !error && !submitted && (
              <EmptyState
                title={t("@legalos.legalResearch.empty.title")}
                description={t("@legalos.legalResearch.empty.description")}
              />
            )}

            {mode === "answer" && answer && (
              <Card variant="purple">
                <VStack gap={4}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Icon icon={SparklesIcon} size="sm" className="text-purple-vivid" />
                    <Heading level={4}>{t("@legalos.legalResearch.aiAnswerHeading")}</Heading>
                    <Badge variant="purple" label={t(`@legalos.jurisdiction.${jurisdiction}`)} />
                  </HStack>

                  {submitted && (
                    <div dir={dirOf(submitted)}>
                      <Text type="supporting" color="secondary">
                        {t("@legalos.legalResearch.queryPrefix", { query: submitted })}
                      </Text>
                    </div>
                  )}

                  <GroundedAnswer answer={answer} showSources={false} />

                  <Divider />
                  <Text type="supporting" color="secondary">
                    {t("@legalos.legalResearch.disclaimersFooter")}
                  </Text>
                </VStack>
              </Card>
            )}

            {mode === "articles" && search?.degraded && search.degraded.length > 0 && (
              <Banner
                status="warning"
                title={t("@legalos.groundedAnswer.degradedTitle")}
                description={t("@legalos.groundedAnswer.degradedDescription", {
                  reasons: search.degraded.join("; "),
                })}
              />
            )}

            {/* Retrieved statute text, listed in full. In answer mode these are
                the same articles GroundedAnswer collapses into "Sources" — kept
                expanded here because reading the provision itself is the point
                of the research surface. */}
            {!pending && submitted && (
              <Card>
                <VStack gap={4}>
                  <HStack gap={2} vAlign="center">
                    <Icon icon={BookOpenIcon} size="sm" color="secondary" />
                    <Heading level={4}>
                      {t("@legalos.legalResearch.referencedLegislationHeading")}
                    </Heading>
                  </HStack>
                  {articles.length === 0 ? (
                    <Text type="supporting" color="secondary">
                      {t("@legalos.legalResearch.noArticles")}
                    </Text>
                  ) : (
                    <VStack gap={3}>
                      {articles.map((article, i) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          rank={i + 1}
                          showScore={mode === "articles"}
                          cited={answer?.citations.includes(article.citation) ?? false}
                        />
                      ))}
                    </VStack>
                  )}
                </VStack>
              </Card>
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
                          run(q);
                        }}
                        style={{ textAlign: "start", width: "100%" }}
                        dir={dirOf(q)}
                      >
                        <Text type="supporting">{q}</Text>
                      </button>
                    </Card>
                  );
                })}
              </VStack>
            </Card>

            <Card>
              <VStack gap={3}>
                <Heading level={4}>{t("@legalos.legalResearch.corpusHeading")}</Heading>
                {corpus.failed ? (
                  <Text type="supporting" color="secondary">
                    {t("@legalos.corpus.unavailableDescription")}
                  </Text>
                ) : (
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
                )}
                <Text type="supporting" color="secondary">
                  {t("@legalos.legalResearch.corpusDescription")}
                </Text>
                <Link href="/library">{t("@legalos.legalResearch.browseLibraryLink")}</Link>
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
