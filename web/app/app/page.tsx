"use client";

import { useState } from "react";
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageList,
} from "@/components/ui/Chat";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { GroundedAnswer } from "@/components/GroundedAnswer";
import { api, ApiError, AskResponse, dirOf } from "@/lib/api";
import { useCorpusStats } from "@/lib/corpus";
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
  const corpus = useCorpusStats();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  // With nothing ingested, every answer is a refusal — correctly, but the
  // refusal reads as "your question is outside what the law covers" when the
  // truth is that no law has been loaded at all. `has()` treats the unknown
  // state as stocked, so this cannot flash on a normal load.
  const corpusEmpty = !corpus.has("EG");

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
      {corpusEmpty && (
        <div style={{ paddingBlock: 12 }}>
          <Alert
            type="warn"
            title={t("@legalos.home.emptyCorpus.title")}
          >
            {t("@legalos.home.emptyCorpus.description")}
          </Alert>
        </div>
      )}
      <ChatLayout
        emptyState={
          <div className="flex flex-col items-center justify-center py-10 w-full max-w-xl mx-auto">
            <EmptyState
              icon={<Icon name="chat" size={28} />}
              title={t("@legalos.home.empty.title")}
              description={t("@legalos.home.empty.description")}
            />
            <div className="grid gap-2.5 w-full mt-6">
              {SUGGESTION_KEYS.map((key) => {
                const s = t(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => send(s)}
                    className="p-3 text-start w-full border transition-all hover:bg-[var(--surface2)] hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                    style={{
                      borderRadius: "var(--rs)",
                      backgroundColor: "var(--surface)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                    dir={dirOf(s)}
                  >
                    <span className="text-xs font-medium">{s}</span>
                  </button>
                );
              })}
            </div>
          </div>
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
              <div key={i} className="flex flex-col gap-3 w-full">
                <ChatMessage sender="user">
                  <div
                    className="p-3.5 border shadow-xs"
                    style={{
                      borderRadius: "var(--r)",
                      backgroundColor: "var(--surface2)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                    dir={dirOf(turn.question)}
                  >
                    <p className="text-sm font-medium leading-relaxed">{turn.question}</p>
                  </div>
                </ChatMessage>

                <ChatMessage sender="assistant">
                  {!turn.answer && !turn.error ? (
                    <div
                      role="status"
                      aria-label={t("@legalos.ask.searching")}
                      className="p-4 border flex flex-col gap-2.5 w-full"
                      style={{
                        borderRadius: "var(--r)",
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text2)" }}>
                        <Icon name="search" size={16} />
                        <span>{t("@legalos.ask.searching")}</span>
                      </div>
                      <Skeleton width="95%" height="14px" />
                      <Skeleton width="80%" height="14px" />
                      <Skeleton width="50%" height="14px" />
                    </div>
                  ) : turn.error ? (
                    <Alert
                      type={turn.error.isCredits ? "warn" : "danger"}
                      title={t(
                        turn.error.isCredits
                          ? "@legalos.ask.error.creditsTitle"
                          : "@legalos.ask.error.genericTitle",
                      )}
                    >
                      {turn.error.message}
                    </Alert>
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
