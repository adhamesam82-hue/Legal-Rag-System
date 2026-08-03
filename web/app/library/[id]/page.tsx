"use client";

import NextLink from "next/link";
import { use, useEffect, useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack } from "@astryxdesign/core/Stack";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useTranslator, useDirection } from "@astryxdesign/core/i18n";
import { useFormat } from "@/lib/i18n/format";
import { ArticleCard } from "@/components/ArticleCard";
import { api, ApiError, Article, Instrument, dirOf } from "@/lib/api";

const PAGE_SIZE = 25;

export default function InstrumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslator();
  const { intlLocale } = useFormat();
  const direction = useDirection();
  const instrumentId = Number(id);

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .instrument(instrumentId, offset, PAGE_SIZE)
      .then((data) => {
        if (cancelled) return;
        setInstrument(data.instrument);
        // Replace rather than append: offset is the source of truth, so a
        // double-fire in dev StrictMode cannot duplicate rows.
        setArticles(data.articles);
      })
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [instrumentId, offset]);

  if (error) {
    return (
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px" }}>
        <Banner
          status="error"
          title={t("@legalos.library.instrument.error.title")}
          description={error}
        />
      </div>
    );
  }

  const total = instrument?.article_count ?? 0;
  const shown = offset + articles.length;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 64px" }}>
      <div style={{ marginBlockEnd: 6 }}>
        <NextLink href="/library">
          <HStack gap={1} vAlign="center">
            <Icon
              icon={direction === "rtl" ? ArrowRightIcon : ArrowLeftIcon}
              size="xsm"
              color="secondary"
            />
            <Text type="supporting">{t("@legalos.library.backLink")}</Text>
          </HStack>
        </NextLink>
      </div>

      {instrument && (
        <>
          <div style={{ display: "flex", gap: 8, marginBlockEnd: 8 }}>
            <Badge variant="info" label={instrument.reference} />
            <Badge
              variant="neutral"
              label={instrument.instrument_type.replace("_", " ")}
            />
          </div>
          <div dir={dirOf(instrument.title)}>
            <Heading level={1}>{instrument.title}</Heading>
          </div>
          <div style={{ marginBlock: 8 }}>
            <Text type="supporting">
              {t("@legalos.library.instrument.meta", {
                total: total.toLocaleString(intlLocale),
                from: offset + 1,
                to: shown,
              })}
            </Text>
          </div>
        </>
      )}

      {loading && <Spinner label={t("@legalos.library.instrument.loadingArticles")} />}

      <div style={{ display: "grid", gap: 12, marginBlockStart: 16 }}>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginBlockStart: 24,
        }}
      >
        <Button
          label={t("@legalos.library.previous")}
          variant="secondary"
          isDisabled={offset === 0 || loading}
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
        />
        <Button
          label={t("@legalos.library.next")}
          variant="secondary"
          isDisabled={shown >= total || loading}
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
        />
      </div>
    </div>
  );
}
