"use client";

import { useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Badge } from "@astryxdesign/core/Badge";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Switch } from "@astryxdesign/core/Switch";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { ArticleCard } from "@/components/ArticleCard";
import { api, ApiError, SearchResponse, dirOf } from "@/lib/api";

export default function SearchPage() {
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
      <Heading level={1}>Search</Heading>
      <div style={{ marginBlock: 8 }}>
        <Text type="supporting">
          Ranked articles with their retrieval scores, and no composed answer.
          Useful for seeing exactly what the retrieval layer returns.
        </Text>
      </div>

      <Card padding={4}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          style={{ display: "grid", gap: 14 }}
        >
          <TextInput
            label="Search the corpus"
            isLabelHidden
            value={query}
            onChange={setQuery}
            placeholder="e.g. مدة الإجازة السنوية — or: annual leave entitlement"
            size="lg"
          />
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Switch
              label="Expand query into Arabic legal terms"
              value={expand}
              onChange={setExpand}
            />
            <div style={{ marginInlineStart: "auto" }}>
              <Button
                type="submit"
                label="Search"
                variant="primary"
                isLoading={pending}
              />
            </div>
          </div>
          <Text type="supporting">
            The corpus is entirely Arabic. Expansion translates an English query
            into the statutory vocabulary before searching — without it, English
            queries match nothing. It costs one model call.
          </Text>
        </form>
      </Card>

      <div style={{ marginBlockStart: 20, display: "grid", gap: 12 }}>
        {error && <Banner status="error" title="Search failed" description={error} />}

        {results?.degraded && results.degraded.length > 0 && (
          <Banner
            status="warning"
            title="Keyword-only results"
            description={`Query expansion was unavailable: ${results.degraded.join("; ")}.`}
          />
        )}

        {results?.expanded_terms && (
          <Card padding={3} variant="muted">
            <div style={{ display: "grid", gap: 6 }}>
              {results.law_hint && (
                <div
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <Text type="supporting">Law identified:</Text>
                  <Badge variant="neutral" label={results.law_hint} />
                </div>
              )}
              <Text type="supporting">Searched for:</Text>
              <p dir={dirOf(results.expanded_terms)}>
                <Text type="supporting">{results.expanded_terms}</Text>
              </p>
            </div>
          </Card>
        )}

        {pending && <Spinner label="Searching…" />}

        {results && !pending && results.articles.length === 0 && (
          <EmptyState
            title="No matching articles"
            description="Nothing in the corpus matched. Try Arabic legal terms, or turn expansion on."
          />
        )}

        {results?.articles.map((article, i) => (
          <ArticleCard key={article.id} article={article} rank={i + 1} showScore />
        ))}
      </div>
    </div>
  );
}
