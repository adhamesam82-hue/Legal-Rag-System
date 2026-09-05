"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { ArticleCard } from "@/components/ArticleCard";
import { api, ApiError, SearchResponse, dirOf } from "@/lib/api";
import { useTranslator } from "@astryxdesign/core/i18n";

export default function SearchPage() {
  const t = useTranslator();
  const [query, setQuery] = useState("");
  // Vector search now handles cross-lingual queries on its own; measured to
  // make LLM expansion add nothing (see docs/ailab/specs/2026-07-31-phase2-
  // retrieval-answering-design.md). Off by default, still available to toggle.
  const [expand, setExpand] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!query.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      setResults(
        await api.search({
          query: query.trim(),
          jurisdiction: "EG",
          limit: 15,
          expand,
          rerank: false,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setResults(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 64px" }}>
      {/* ترويسة الصفحة */}
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          {t("@legalos.search.heading")}
        </h1>
        <p className="text-sm" style={{ color: "var(--text2)" }}>
          {t("@legalos.search.subheading")}
        </p>
      </div>

      {/* بطاقة البحث والتحكم */}
      <Card padding="20px" className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          className="flex flex-col gap-3.5"
        >
          <Input
            id="search-input"
            label={t("@legalos.search.input.label")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("@legalos.search.input.placeholder")}
            startIcon={<Icon name="search" size={20} />}
            autoFocus
            fullWidth
          />
          <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
            <Switch
              id="search-expand-toggle"
              label={t("@legalos.search.expand.label")}
              checked={expand}
              onChange={setExpand}
            />
            <Button
              type="submit"
              variant="primary"
              loading={pending}
              loadingText={t("@legalos.search.spinner")}
              startIcon={<Icon name="search" size={18} />}
              disabled={!query.trim() || pending}
            >
              {t("@legalos.search.submit")}
            </Button>
          </div>
          <p className="text-xs" style={{ color: "var(--text3)" }}>
            {t("@legalos.search.helper")}
          </p>
        </form>
      </Card>

      {/* منطقة النتائج والرسائل */}
      <div className="flex flex-col gap-3">
        {error && (
          <Alert type="danger" title={t("@legalos.search.error.title")}>
            {error}
          </Alert>
        )}

        {results?.degraded && results.degraded.length > 0 && (
          <Alert
            type="warn"
            title={t("@legalos.search.degraded.title")}
          >
            {t("@legalos.search.degraded.description", {
              reasons: results.degraded.join("; "),
            })}
          </Alert>
        )}

        {results?.expanded_terms && (
          <Card
            padding="16px"
            style={{
              backgroundColor: "var(--surface2)",
              borderColor: "var(--border2)",
            }}
          >
            <div className="flex flex-col gap-2">
              {results.law_hint && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--text2)" }}>
                    {t("@legalos.search.lawIdentified")}
                  </span>
                  <Badge color="neutral" variant="soft">
                    {results.law_hint}
                  </Badge>
                </div>
              )}
              <span className="text-xs" style={{ color: "var(--text2)" }}>
                {t("@legalos.search.searchedFor")}
              </span>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text)" }}
                dir={dirOf(results.expanded_terms)}
              >
                {results.expanded_terms}
              </p>
            </div>
          </Card>
        )}

        {/* حالة التحميل بالهيكل العظمي */}
        {pending && (
          <div className="flex flex-col gap-3 py-2">
            <Card padding="16px">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton width="40px" height="14px" />
                  <Skeleton width="120px" height="20px" borderRadius="var(--rs)" />
                  <Skeleton width="180px" height="14px" />
                </div>
                <Skeleton width="100%" height="14px" />
                <Skeleton width="85%" height="14px" />
                <Skeleton width="60%" height="14px" />
              </div>
            </Card>
            <Card padding="16px">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton width="40px" height="14px" />
                  <Skeleton width="100px" height="20px" borderRadius="var(--rs)" />
                  <Skeleton width="160px" height="14px" />
                </div>
                <Skeleton width="100%" height="14px" />
                <Skeleton width="75%" height="14px" />
              </div>
            </Card>
          </div>
        )}

        {/* الحالة الفارغة */}
        {results && !pending && results.articles.length === 0 && (
          <EmptyState
            icon={<Icon name="search_off" size={26} />}
            title={t("@legalos.search.empty.title")}
            description={t("@legalos.search.empty.description")}
          />
        )}

        {/* قائمة النتائج */}
        {results?.articles.map((article, i) => (
          <ArticleCard key={article.id} article={article} rank={i + 1} showScore />
        ))}
      </div>
    </div>
  );
}
