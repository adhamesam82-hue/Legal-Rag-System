"use client";

import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Layout, LayoutHeader, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack, HStack, StackItem } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { api, ApiError, Instrument, dirOf } from "@/lib/api";
import { useTranslator } from "@astryxdesign/core/i18n";
import { useFormat } from "@/lib/i18n/format";

export default function LibraryPage() {
  const t = useTranslator();
  const { intlLocale } = useFormat();
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
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={0}>
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>{t("@legalos.library.heading")}</Heading>
              <Text type="body" color="secondary">
                {instruments
                  ? t("@legalos.library.summary", {
                      count: instruments.length,
                      articles: totalArticles.toLocaleString(intlLocale),
                    })
                  : t("@legalos.library.loadingCorpus")}
              </Text>
            </VStack>

            <div style={{ maxWidth: 420 }}>
              <TextInput
                label={t("@legalos.library.filter.label")}
                isLabelHidden
                value={filter}
                onChange={setFilter}
                placeholder={t("@legalos.library.filter.placeholder")}
              />
            </div>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable>
          <VStack gap={4}>
            {error && (
              <Banner
                status="error"
                title={t("@legalos.library.error.title")}
                description={error}
              />
            )}
            {!instruments && !error && <Spinner label={t("@legalos.library.spinner")} />}

            {visible?.length === 0 && (
              <EmptyState
                title={t("@legalos.library.empty.title")}
                description={t("@legalos.library.empty.description", { filter })}
              />
            )}

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                // Statute titles run from two words to four lines, so without
                // this a row of cards ends up visibly ragged.
                gridAutoRows: "1fr",
              }}
            >
              {visible?.map((instrument) => (
                <NextLink
                  key={instrument.id}
                  href={`/library/${instrument.id}`}
                  style={{ display: "block", height: "100%" }}
                >
                  <Card padding={4} elevation="low" height="100%">
                    <VStack gap={2} height="100%">
                      <HStack gap={1.5} wrap="wrap">
                        <Badge variant="info" label={instrument.reference} />
                        {instrument.instrument_type !== "law" && (
                          <Badge
                            variant="neutral"
                            label={instrument.instrument_type.replace("_", " ")}
                          />
                        )}
                      </HStack>
                      {/* Takes the slack so the article count sits on a common
                          baseline across the row rather than under the title. */}
                      <StackItem size="fill">
                        <div dir={dirOf(instrument.title)}>
                          <Text type="label" maxLines={3}>
                            {instrument.title}
                          </Text>
                        </div>
                      </StackItem>
                      <Text type="supporting" color="secondary">
                        {t("@legalos.library.articleCount", {
                          count: instrument.article_count,
                        })}
                      </Text>
                    </VStack>
                  </Card>
                </NextLink>
              ))}
            </div>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
