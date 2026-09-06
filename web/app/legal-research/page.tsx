"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
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

  function changeMode(next: Mode) {
    setMode(next);
    if (submitted) run(submitted, next);
  }

  const articles = mode === "answer" ? (answer?.articles ?? []) : (search?.articles ?? []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* رأس الصفحة والبحث */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.legalResearch.heading")}
          </h1>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.legalResearch.description")}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(query);
          }}
          className="flex flex-col gap-4"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("@legalos.legalResearch.searchPlaceholder")}
            startIcon={<Icon name="search" size={16} />}
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
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

            {/* مفتاح نمط النتائج: إجابة أو مواد */}
            <div className="flex rounded-md p-1 border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}>
              <button
                type="button"
                onClick={() => changeMode("answer")}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  mode === "answer"
                    ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                    : "text-[var(--text2)] hover:text-[var(--text)]"
                }`}
              >
                {t("@legalos.legalResearch.resultMode.answer")}
              </button>
              <button
                type="button"
                onClick={() => changeMode("articles")}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  mode === "articles"
                    ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                    : "text-[var(--text2)] hover:text-[var(--text)]"
                }`}
              >
                {t("@legalos.legalResearch.resultMode.articles")}
              </button>
            </div>

            <Button type="submit" loading={pending}>
              <Icon name="search" size={16} />
              <span>{t("@legalos.legalResearch.submit")}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* المحتوى الرئيسي والشريط الجانبي */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full flex flex-col gap-6">
          {error && (
            <Alert
              type={error.isCredits ? "warn" : "danger"}
              title={t(
                error.isCredits
                  ? "@legalos.ask.error.creditsTitle"
                  : "@legalos.ask.error.genericTitle",
              )}
            >
              {error.message}
            </Alert>
          )}

          {pending && (
            <div className="p-6 text-center text-xs flex items-center justify-center gap-2" style={{ color: "var(--text2)" }}>
              <Icon name="hourglass_empty" size={18} />
              <span>{t("@legalos.ask.searching")}</span>
            </div>
          )}

          {!pending && !error && !submitted && (
            <EmptyState
              title={t("@legalos.legalResearch.empty.title")}
              description={t("@legalos.legalResearch.empty.description")}
            />
          )}

          {mode === "answer" && answer && (
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="auto_awesome" size={18} />
                  <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                    {t("@legalos.legalResearch.aiAnswerHeading")}
                  </h2>
                </div>
                <Badge color="primary">{t(`@legalos.jurisdiction.${jurisdiction}`)}</Badge>
              </div>

              {submitted && (
                <div dir={dirOf(submitted)} className="text-xs" style={{ color: "var(--text2)" }}>
                  {t("@legalos.legalResearch.queryPrefix", { query: submitted })}
                </div>
              )}

              <GroundedAnswer answer={answer} showSources={false} />

              <div className="pt-3 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                {t("@legalos.legalResearch.disclaimersFooter")}
              </div>
            </Card>
          )}

          {mode === "articles" && search?.degraded && search.degraded.length > 0 && (
            <Alert
              type="warn"
              title={t("@legalos.groundedAnswer.degradedTitle")}
            >
              {t("@legalos.groundedAnswer.degradedDescription", {
                reasons: search.degraded.join("; "),
              })}
            </Alert>
          )}

          {!pending && submitted && (
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Icon name="menu_book" size={18} />
                <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                  {t("@legalos.legalResearch.referencedLegislationHeading")}
                </h2>
              </div>

              {articles.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text2)" }}>
                  {t("@legalos.legalResearch.noArticles")}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {articles.map((article, i) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      rank={i + 1}
                      showScore={mode === "articles"}
                      cited={answer?.citations.includes(article.citation) ?? false}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* الشريط الجانبي: أمثلة الأسئلة وحالة المستودع القانوني */}
        <div className="w-full lg:w-80 flex flex-col gap-5 flex-shrink-0">
          <Card className="p-5 flex flex-col gap-3">
            <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.legalResearch.tryQuestionHeading")}
            </h3>
            {EXAMPLE_QUERY_KEYS.map((key) => {
              const q = t(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setQuery(q);
                    run(q);
                  }}
                  className="p-3 rounded-lg border text-start text-xs hover:bg-[var(--surface2)] transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  dir={dirOf(q)}
                >
                  {q}
                </button>
              );
            })}
          </Card>

          <Card className="p-5 flex flex-col gap-3">
            <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.legalResearch.corpusHeading")}
            </h3>
            {corpus.failed ? (
              <p className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.corpus.unavailableDescription")}
              </p>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                {(["EG", "SA"] as const).map((code) => (
                  <div key={code} className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: "var(--text)" }}>
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
              </div>
            )}
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {t("@legalos.legalResearch.corpusDescription")}
            </p>
            <div className="pt-2 border-t flex flex-col gap-1.5 text-xs" style={{ borderColor: "var(--border)" }}>
              <Link
                href="/library"
                className="hover:underline font-medium"
                style={{ color: "var(--primary)" }}
              >
                {t("@legalos.legalResearch.browseLibraryLink")}
              </Link>
              <Link
                href="/ai-assistant"
                className="hover:underline font-medium"
                style={{ color: "var(--primary)" }}
              >
                {t("@legalos.legalResearch.openAiAssistantLink")}
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
