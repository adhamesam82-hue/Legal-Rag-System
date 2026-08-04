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
import { Text } from "@astryxdesign/core/Text";
import { Spinner } from "@astryxdesign/core/Spinner";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { GroundedAnswer } from "@/components/GroundedAnswer";
import { api, ApiError, AskResponse, dirOf } from "@/lib/api";
import { useTranslator } from "@astryxdesign/core/i18n";

interface Turn {
  question: string;
  answer?: AskResponse;
  error?: { message: string; isCredits: boolean };
}

const SUGGESTION_KEYS = [
  "@legalos.home.suggestion.article80",
  "@legalos.home.suggestion.annualLeave",
  "@legalos.home.suggestion.singlePersonCompanies",
];

export default function ChatPage() {
  const t = useTranslator();
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
            title={t("@legalos.home.empty.title")}
            description={t("@legalos.home.empty.description")}
            actions={
              <div style={{ display: "grid", gap: 8, width: "100%" }}>
                {SUGGESTION_KEYS.map((key) => {
                  const s = t(key);
                  return (
                    <Card key={key} padding={2} variant="muted">
                      <button
                        onClick={() => send(s)}
                        style={{ textAlign: "start", width: "100%" }}
                        dir={dirOf(s)}
                      >
                        <Text type="label">{s}</Text>
                      </button>
                    </Card>
                  );
                })}
              </div>
            }
          />
        }
        composer={
          <ChatComposer
            onSubmit={send}
            isDisabled={pending}
            placeholder={t("@legalos.home.composer.placeholder")}
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
                    <Spinner label={t("@legalos.ask.searching")} />
                  ) : turn.error ? (
                    <Banner
                      status={turn.error.isCredits ? "warning" : "error"}
                      title={t(
                        turn.error.isCredits
                          ? "@legalos.ask.error.creditsTitle"
                          : "@legalos.ask.error.genericTitle",
                      )}
                      description={turn.error.message}
                    />
                  ) : (
                    <GroundedAnswer answer={turn.answer!} />
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
