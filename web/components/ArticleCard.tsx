"use client";

import NextLink from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useTranslator } from "@astryxdesign/core/i18n";
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
  const t = useTranslator();
  const [expanded, setExpanded] = useState(false);
  const isLong = article.text.length > COLLAPSE_AT;
  const body =
    expanded || !isLong ? article.text : article.text.slice(0, COLLAPSE_AT) + "…";

  return (
    <Card
      padding="16px"
      style={{
        backgroundColor: cited ? "var(--surface2)" : "var(--surface)",
        borderColor: cited ? "var(--border2)" : "var(--border)",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        {rank !== undefined && (
          <span className="font-mono text-xs" style={{ color: "var(--text3)" }}>
            {rank}.
          </span>
        )}
        <Badge
          color={cited ? "info" : "neutral"}
          variant="soft"
        >
          {article.citation}
        </Badge>
        <span
          className="text-xs truncate max-w-md"
          style={{ color: "var(--text2)" }}
          dir={dirOf(article.instrument_title)}
        >
          {article.instrument_title}
        </span>
        {showScore && article.score > 0 && (
          <div className="ms-auto">
            <span className="font-mono text-xs" style={{ color: "var(--text3)" }}>
              {article.score.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      <p
        className="statute-text text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: "var(--text)" }}
        dir={dirOf(article.text)}
      >
        {body}
      </p>

      <div className="flex items-center gap-3 mt-3.5">
        {isLong && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
          >
            {t(
              expanded
                ? "@legalos.article.card.showLess"
                : "@legalos.article.card.showFull",
            )}
          </Button>
        )}
        <div className="ms-auto">
          <NextLink
            href={`/article/${article.id}`}
            className="text-xs font-medium hover:underline inline-flex items-center gap-1"
            style={{ color: "var(--primary)" }}
          >
            {t("@legalos.article.card.open")}
          </NextLink>
        </div>
      </div>
    </Card>
  );
}
