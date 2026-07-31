"use client";

import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { api, ApiError, Instrument, dirOf } from "@/lib/api";

export default function LibraryPage() {
  const [instruments, setInstruments] = useState<Instrument[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .instruments("EG")
      .then(setInstruments)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, []);

  // Filtering client-side: 78 instruments is small enough that a round trip
  // per keystroke would be slower than the filter itself.
  const visible = useMemo(() => {
    if (!instruments) return null;
    const needle = filter.trim().toLowerCase();
    if (!needle) return instruments;
    return instruments.filter(
      (i) =>
        i.title.toLowerCase().includes(needle) ||
        i.reference.includes(needle),
    );
  }, [instruments, filter]);

  const totalArticles = instruments?.reduce((n, i) => n + i.article_count, 0) ?? 0;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 64px" }}>
      <Heading level={1}>Legal library</Heading>
      <div style={{ marginBlock: 8 }}>
        <Text type="supporting">
          {instruments
            ? `${instruments.length} instruments · ${totalArticles.toLocaleString()} articles in force`
            : "Loading the corpus…"}
        </Text>
      </div>

      <div style={{ marginBlockEnd: 20, maxWidth: 420 }}>
        <TextInput
          label="Filter laws"
          isLabelHidden
          value={filter}
          onChange={setFilter}
          placeholder="Filter by title or number, e.g. 12/2003"
        />
      </div>

      {error && (
        <Banner status="error" title="Could not load the library" description={error} />
      )}
      {!instruments && !error && <Spinner label="Loading…" />}

      {visible?.length === 0 && (
        <EmptyState
          title="No matching law"
          description={`Nothing matches "${filter}".`}
        />
      )}

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        }}
      >
        {visible?.map((instrument) => (
          <NextLink key={instrument.id} href={`/library/${instrument.id}`}>
            <Card padding={4} elevation="low">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge variant="info" label={instrument.reference} />
                  {instrument.instrument_type !== "law" && (
                    <Badge
                      variant="neutral"
                      label={instrument.instrument_type.replace("_", " ")}
                    />
                  )}
                </div>
                <div dir={dirOf(instrument.title)}>
                  <Text type="label" maxLines={3}>
                    {instrument.title}
                  </Text>
                </div>
                <Text type="supporting">
                  {instrument.article_count.toLocaleString()} articles
                </Text>
              </div>
            </Card>
          </NextLink>
        ))}
      </div>
    </div>
  );
}
