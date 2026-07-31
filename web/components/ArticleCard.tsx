"use client";

import NextLink from "next/link";
import { useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Article, dirOf } from "@/lib/api";

const COLLAPSE_AT = 460;

/**
 * One statute article. The citation is the load-bearing element of the whole
 * product, so it is rendered identically everywhere an article appears --
 * chat sources, search results, and library listings.
 */
export function ArticleCard({
  article,
  showScore = false,
  cited = false,
  rank,
}: {
  article: Article;
  showScore?: boolean;
  cited?: boolean;
  rank?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = article.text.length > COLLAPSE_AT;
  const body =
    expanded || !isLong ? article.text : article.text.slice(0, COLLAPSE_AT) + "…";

  return (
    <Card padding={4} variant={cited ? "muted" : "default"}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBlockEnd: 10,
        }}
      >
        {rank !== undefined && (
          <Text type="code" color="secondary">
            {rank}.
          </Text>
        )}
        <Badge
          variant={cited ? "info" : "neutral"}
          label={article.citation}
        />
        <Text
          type="supporting"
          maxLines={1}
          dir={dirOf(article.instrument_title)}
        >
          {article.instrument_title}
        </Text>
        {showScore && article.score > 0 && (
          <div style={{ marginInlineStart: "auto" }}>
            <Text type="code" color="secondary">
              {article.score.toFixed(4)}
            </Text>
          </div>
        )}
      </div>

      <p className="statute-text" dir={dirOf(article.text)}>
        <Text type="body">{body}</Text>
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBlockStart: 14,
        }}
      >
        {isLong && (
          <Button
            size="sm"
            variant="ghost"
            label={expanded ? "Show less" : "Show full article"}
            onClick={() => setExpanded((v) => !v)}
          />
        )}
        <div style={{ marginInlineStart: "auto" }}>
          <NextLink href={`/article/${article.id}`}>
            <Text type="label" color="accent">
              Open article →
            </Text>
          </NextLink>
        </div>
      </div>
    </Card>
  );
}
