"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
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
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 w-full">
      {answer.degraded.length > 0 && (
        <Alert
          type="warn"
          title={t("@legalos.groundedAnswer.degradedTitle")}
        >
          {t("@legalos.groundedAnswer.degradedDescription", {
            reasons: answer.degraded.join("; "),
          })}
        </Alert>
      )}

      {answer.blocked ? (
        <Alert
          type="danger"
          title={t("@legalos.groundedAnswer.blockedTitle")}
        >
          {t("@legalos.groundedAnswer.blockedDescription", {
            citations: answer.blocked_citations.join(", "),
          })}
        </Alert>
      ) : answer.refused ? (
        <Alert
          type="info"
          title={t("@legalos.groundedAnswer.refusedTitle")}
        >
          {t("@legalos.groundedAnswer.refusedDescription")}
        </Alert>
      ) : (
        <Card padding="20px" bordered shadow>
          <AnswerBody text={answer.text} />
        </Card>
      )}

      {showSources && answer.articles.length > 0 && (
        <div
          className="border rounded-lg overflow-hidden"
          style={{
            borderColor: "var(--border)",
            borderRadius: "var(--r)",
            backgroundColor: "var(--surface)",
          }}
        >
          <button
            type="button"
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold hover:bg-[var(--surface2)] transition-colors"
            style={{
              color: "var(--text)",
              textAlign: "start",
            }}
            aria-expanded={sourcesOpen}
          >
            <span className="flex items-center gap-1.5">
              <Icon name="source" size={16} />
              {t("@legalos.groundedAnswer.sources", {
                count: answer.articles.length,
                strategy: answer.strategy.replace(/_/g, " "),
              })}
            </span>
            <Icon
              name={sourcesOpen ? "expand_less" : "expand_more"}
              size={18}
            />
          </button>

          {sourcesOpen && (
            <div
              className="p-3 border-t flex flex-col gap-2"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface2)",
              }}
            >
              {answer.articles.map((article, i) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  rank={i + 1}
                  cited={answer.citations.includes(article.citation)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {answer.citations.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span style={{ color: "var(--text2)" }}>
            {t("@legalos.groundedAnswer.citedLabel")}
          </span>
          {answer.citations.map((c) => (
            <Badge key={c} color="info" variant="soft">
              {c}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
