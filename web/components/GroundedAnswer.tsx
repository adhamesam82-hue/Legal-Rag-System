"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Badge } from "@astryxdesign/core/Badge";
import { Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useTranslator } from "@astryxdesign/core/i18n";
import { AnswerBody } from "@/components/AnswerBody";
import { ArticleCard } from "@/components/ArticleCard";
import type { AskResponse } from "@/lib/api";

/**
 * Renders one live `/api/ask` response. Shared by every surface that shows an
 * AI answer — the chat at `web/app/page.tsx`, the AI Assistant and Legal
 * Research — so the citation discipline is enforced in one place rather than
 * re-implemented per screen.
 *
 * The three outcomes are deliberately not interchangeable:
 *
 *   blocked  the model cited articles it was never given. The answer text is
 *            withheld entirely, because a plausible-looking legal answer
 *            carrying a caveat is still read as an answer.
 *   refused  nothing retrieved supports the question. Shown as its own state,
 *            never as an empty answer.
 *   answered composed text, plus the retrieved articles behind it.
 */
export function GroundedAnswer({
  answer,
  /** Set false where the surface already lists the retrieved articles in full
   *  — Legal Research does, and the collapsible would repeat all eight. */
  showSources = true,
}: {
  answer: AskResponse;
  showSources?: boolean;
}) {
  const t = useTranslator();

  return (
    <VStack gap={3}>
      {answer.degraded.length > 0 && (
        <Banner
          status="warning"
          title={t("@legalos.groundedAnswer.degradedTitle")}
          description={t("@legalos.groundedAnswer.degradedDescription", {
            reasons: answer.degraded.join("; "),
          })}
        />
      )}

      {answer.blocked ? (
        <Banner
          status="error"
          title={t("@legalos.groundedAnswer.blockedTitle")}
          description={t("@legalos.groundedAnswer.blockedDescription", {
            citations: answer.blocked_citations.join(", "),
          })}
        />
      ) : answer.refused ? (
        <Banner
          status="info"
          title={t("@legalos.groundedAnswer.refusedTitle")}
          description={t("@legalos.groundedAnswer.refusedDescription")}
        />
      ) : (
        <Card padding={4}>
          <AnswerBody text={answer.text} />
        </Card>
      )}

      {showSources && answer.articles.length > 0 && (
        <Collapsible
          defaultIsOpen={false}
          trigger={
            <Text type="label">
              {t("@legalos.groundedAnswer.sources", {
                count: answer.articles.length,
                strategy: answer.strategy.replace(/_/g, " "),
              })}
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
            {t("@legalos.groundedAnswer.citedLabel")}
          </Text>
          {answer.citations.map((c) => (
            <Badge key={c} variant="info" label={c} />
          ))}
        </HStack>
      )}
    </VStack>
  );
}
