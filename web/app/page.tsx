"use client";

import { useState } from "react";
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageList,
} from "@astryxdesign/core/Chat";
import { Card } from "@astryxdesign/core/Card";
import { Banner } from "@astryxdesign/core/Banner";
import { Badge } from "@astryxdesign/core/Badge";
import { Text } from "@astryxdesign/core/Text";
import { Spinner } from "@astryxdesign/core/Spinner";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { AnswerBody } from "@/components/AnswerBody";
import { ArticleCard } from "@/components/ArticleCard";
import { api, ApiError, AskResponse, dirOf } from "@/lib/api";

interface Turn {
  question: string;
  answer?: AskResponse;
  error?: { message: string; isCredits: boolean };
}

const SUGGESTIONS = [
  "ماذا تنص المادة 80 من قانون العمل رقم 12 لسنة 2003؟",
  "كم يومًا تكون مدة الإجازة السنوية للعامل؟",
  "Does Egypt's Companies Law recognise single-person companies?",
];

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    const index = turns.length;
    setTurns((t) => [...t, { question: trimmed }]);
    setPending(true);

    try {
      const answer = await api.ask({ question: trimmed, jurisdiction: "EG" });
      setTurns((t) =>
        t.map((turn, i) => (i === index ? { ...turn, answer } : turn)),
      );
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? { message: error.message, isCredits: error.isCredits }
          : { message: String(error), isCredits: false };
      setTurns((t) =>
        t.map((turn, i) => (i === index ? { ...turn, error: apiError } : turn)),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    // Fills the viewport below the 56px nav so the composer docks at the
    // bottom instead of floating wherever the message list happens to end.
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "0 20px",
        minHeight: "calc(100dvh - 56px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ChatLayout
        emptyState={
          <EmptyState
            title="Ask about Egyptian law"
            description="Answers are composed only from statute articles retrieved from the corpus. Every citation is verified before the answer is shown, and questions the corpus cannot support are refused rather than guessed."
            actions={
              <div style={{ display: "grid", gap: 8, width: "100%" }}>
                {SUGGESTIONS.map((s) => (
                  <Card key={s} padding={2} variant="muted">
                    <button
                      onClick={() => send(s)}
                      style={{ textAlign: "start", width: "100%" }}
                      dir={dirOf(s)}
                    >
                      <Text type="label">{s}</Text>
                    </button>
                  </Card>
                ))}
              </div>
            }
          />
        }
        composer={
          <ChatComposer
            onSubmit={send}
            isDisabled={pending}
            placeholder="Ask about the law in Arabic or English…"
          />
        }
      >
        {turns.length > 0 && (
          <ChatMessageList>
            {turns.map((turn, i) => (
              <div key={i}>
                <ChatMessage sender="user">
                  <Card padding={3} variant="muted">
                    <div dir={dirOf(turn.question)}>
                      <Text type="body">{turn.question}</Text>
                    </div>
                  </Card>
                </ChatMessage>

                <ChatMessage sender="assistant">
                  {!turn.answer && !turn.error ? (
                    <Spinner label="Searching the corpus…" />
                  ) : turn.error ? (
                    <Banner
                      status={turn.error.isCredits ? "warning" : "error"}
                      title={
                        turn.error.isCredits
                          ? "Model provider out of credits"
                          : "Could not answer"
                      }
                      description={turn.error.message}
                    />
                  ) : (
                    <AnswerView answer={turn.answer!} />
                  )}
                </ChatMessage>
              </div>
            ))}
          </ChatMessageList>
        )}
      </ChatLayout>
    </div>
  );
}

function AnswerView({ answer }: { answer: AskResponse }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {answer.degraded.length > 0 && (
        <Banner
          status="warning"
          title="Reduced retrieval quality"
          description={`Falling back to keyword search: ${answer.degraded.join("; ")}.`}
        />
      )}

      {/*
        A blocked answer is shown as an error and its text is withheld entirely.
        The model cited articles it was not given, and a plausible-looking legal
        answer carrying a caveat is still read as an answer.
      */}
      {answer.blocked ? (
        <Banner
          status="error"
          title="Answer blocked — unverifiable citations"
          description={`The model cited articles that were not retrieved from the corpus, so they cannot be verified: ${answer.blocked_citations.join(", ")}.`}
        />
      ) : answer.refused ? (
        <Banner
          status="info"
          title="Not found in the corpus"
          description="No ingested article answers this. Rather than reason from general legal knowledge, the system refuses."
        />
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
              } via ${answer.strategy.replace("_", " ")}`}
            </Text>
          }
        >
          <div style={{ display: "grid", gap: 10, paddingBlockStart: 10 }}>
            {answer.articles.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                rank={i + 1}
                cited={answer.citations.includes(article.citation)}
              />
            ))}
          </div>
        </Collapsible>
      )}

      {answer.citations.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Text type="supporting">Cited:</Text>
          {answer.citations.map((c) => (
            <Badge key={c} variant="info" label={c} />
          ))}
        </div>
      )}
    </div>
  );
}
