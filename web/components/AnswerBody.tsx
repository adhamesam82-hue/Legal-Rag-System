"use client";

import { Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { dirOf } from "@/lib/api";

const CITATION = /\[Law\s*[^\s/,\]]+\s*\/\s*\d{4}\s*,\s*Art\.?\s*[^\]]+\]/g;

/**
 * Renders an answer with its inline citations promoted to badges.
 *
 * Nothing here validates anything -- that already happened server-side, and an
 * answer carrying an unresolvable citation is blocked before it is ever sent.
 * This component only makes the verified citations visually separable from the
 * prose instead of leaving them as bracketed noise mid-sentence.
 */
export function AnswerBody({ text }: { text: string }) {
  const [body, disclaimer] = splitDisclaimer(text);

  return (
    <div className="answer-prose" dir={dirOf(body)}>
      {body.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i}>
          <Text type="body">{renderCitations(paragraph)}</Text>
        </p>
      ))}
      {disclaimer && (
        <p style={{ marginBlockStart: 16 }} dir={dirOf(disclaimer)}>
          <Text type="supporting">{disclaimer}</Text>
        </p>
      )}
    </div>
  );
}

function splitDisclaimer(text: string): [string, string | null] {
  const match = text.match(/_([^_]+)_\s*$/);
  if (!match) return [text.trim(), null];
  return [text.slice(0, match.index).trim(), match[1].trim()];
}

function renderCitations(paragraph: string) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of paragraph.matchAll(CITATION)) {
    const start = match.index!;
    if (start > cursor) parts.push(paragraph.slice(cursor, start));
    parts.push(
      <Badge
        key={start}
        variant="info"
        label={match[0].replace(/^\[|\]$/g, "")}
      />,
    );
    cursor = start + match[0].length;
  }
  if (cursor < paragraph.length) parts.push(paragraph.slice(cursor));
  return parts.length ? parts : paragraph;
}
