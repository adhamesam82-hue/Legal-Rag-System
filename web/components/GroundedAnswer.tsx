"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Badge } from "@astryxdesign/core/Badge";
import { Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { AnswerBody } from "@/components/AnswerBody";
import { ArticleCard } from "@/components/ArticleCard";
import type { Article } from "@/lib/api";

/**
 * Shared shape for a grounded AI answer across the AI Assistant and Legal
 * Research surfaces. Mirrors the real `/api/ask` response contract (see
 * `web/lib/api.ts`) so mock data here reads the same as the wired chat at
 * `web/app/page.tsx` — an answer is either a cited response or an explicit
 * refusal, never unlabelled prose.
 */
export interface GroundedAnswerData {
  text: string;
  citations: string[];
  refused: boolean;
  strategy: string;
  articles: Article[];
}

/**
 * Renders a grounded answer exactly like the production chat does: the
 * composed answer (or a refusal banner when nothing in the corpus supports
 * it), a collapsible list of the retrieved source articles, and citation
 * badges. Reused wherever this pillar shows an AI answer so the citation
 * discipline stays visually identical everywhere.
 */
export function GroundedAnswer({
  answer,
  refusalTitle = "Not found in the corpus",
  refusalDescription = "No ingested article answers this. Rather than reason from general legal knowledge, the system refuses.",
}: {
  answer: GroundedAnswerData;
  refusalTitle?: string;
  refusalDescription?: string;
}) {
  return (
    <VStack gap={3}>
      {answer.refused ? (
        <Banner status="info" title={refusalTitle} description={refusalDescription} />
      ) : (
        <Card padding={4}>
          <AnswerBody text={answer.text} />
        </Card>
      )}

      {answer.articles.length > 0 && (
        <Collapsible
          defaultIsOpen={false}
          trigger={
            <Text type="label">
              {`Sources — ${answer.articles.length} article${
                answer.articles.length === 1 ? "" : "s"
              }${answer.strategy ? ` via ${answer.strategy.replace(/_/g, " ")}` : ""}`}
            </Text>
          }
        >
          <VStack gap={2} paddingBlock={2}>
            {answer.articles.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                rank={i + 1}
                cited={answer.citations.includes(article.citation)}
              />
            ))}
          </VStack>
        </Collapsible>
      )}

      {answer.citations.length > 0 && (
        <HStack gap={1.5} wrap="wrap" vAlign="center">
          <Text type="supporting" color="secondary">
            Cited:
          </Text>
          {answer.citations.map((c) => (
            <Badge key={c} variant="info" label={c} />
          ))}
        </HStack>
      )}
    </VStack>
  );
}
