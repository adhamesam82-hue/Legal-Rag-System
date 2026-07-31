"use client";

import NextLink from "next/link";
import { use, useEffect, useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { api, ApiError, ArticleDetail, dirOf } from "@/lib/api";

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const articleId = Number(id);

  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<{
    message: string;
    isCredits: boolean;
  } | null>(null);

  useEffect(() => {
    setDetail(null);
    setExplanation(null);
    setExplainError(null);
    api
      .article(articleId)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, [articleId]);

  async function explain(lang: "en" | "ar") {
    setExplaining(true);
    setExplainError(null);
    try {
      const result = await api.explain(articleId, lang);
      setExplanation(result.text);
    } catch (e) {
      setExplainError(
        e instanceof ApiError
          ? { message: e.message, isCredits: e.isCredits }
          : { message: String(e), isCredits: false },
      );
      setExplanation(null);
    } finally {
      setExplaining(false);
    }
  }

  if (error) {
    return (
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}>
        <Banner status="error" title="Could not load this article" description={error} />
      </div>
    );
  }
  if (!detail) {
    return (
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}>
        <Spinner label="Loading article…" />
      </div>
    );
  }

  const { article, instrument, previous_id, next_id } = detail;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px 64px" }}>
      {instrument && (
        <div style={{ marginBlockEnd: 10 }}>
          <NextLink href={`/library/${instrument.id}`}>
            <Text type="supporting">← {instrument.title}</Text>
          </NextLink>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBlockEnd: 12 }}>
        <Badge variant="info" label={article.citation} />
      </div>

      <Heading level={1}>Article {article.article_number}</Heading>

      <div style={{ marginBlockStart: 16 }}>
        <Card padding={5}>
          <p className="statute-text" dir={dirOf(article.text)}>
            <Text type="body">{article.text}</Text>
          </p>
        </Card>
      </div>

      {/* Explainer */}
      <div style={{ marginBlockStart: 24 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBlockEnd: 12,
          }}
        >
          <Heading level={2}>Plain language</Heading>
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
            <ToggleButtonGroup
              label="Explanation language"
              type="single"
              value={language}
              onChange={(value) =>
                setLanguage(value === "ar" ? "ar" : "en")
              }
            >
              <ToggleButton value="en" label="English" />
              <ToggleButton value="ar" label="العربية" />
            </ToggleButtonGroup>
            <Button
              label={explanation ? "Regenerate" : "Explain this article"}
              variant="primary"
              isLoading={explaining}
              onClick={() => explain(language)}
            />
          </div>
        </div>

        {explainError && (
          <Banner
            status={explainError.isCredits ? "warning" : "error"}
            title={
              explainError.isCredits
                ? "Model provider out of credits"
                : "Could not explain this article"
            }
            description={explainError.message}
          />
        )}

        {explanation ? (
          <Card padding={4} variant="muted">
            <div className="answer-prose" dir={dirOf(explanation)}>
              {explanation.split(/\n{2,}/).map((p, i) => (
                <p key={i}>
                  <Text type="body">{p}</Text>
                </p>
              ))}
            </div>
            <div style={{ marginBlockStart: 14 }}>
              <Text type="supporting">
                Generated from the text of this article alone. Research
                assistance, not legal advice.
              </Text>
            </div>
          </Card>
        ) : (
          !explaining &&
          !explainError && (
            <Text type="supporting">
              Turns this article&apos;s legal language into a plain explanation,
              using only the text above.
            </Text>
          )
        )}
      </div>

      {/* Prev / next within the same instrument */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          marginBlockStart: 32,
        }}
      >
        {previous_id ? (
          <NextLink href={`/article/${previous_id}`}>
            <Button label="← Previous article" variant="secondary" />
          </NextLink>
        ) : (
          <span />
        )}
        {next_id && (
          <NextLink href={`/article/${next_id}`}>
            <Button label="Next article →" variant="secondary" />
          </NextLink>
        )}
      </div>
    </div>
  );
}
