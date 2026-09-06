"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
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
      <div className="max-w-4xl mx-auto p-8">
        <Alert type="danger" title={t("@legalos.library.instrument.error.title")}>
          {error}
        </Alert>
      </div>
    );
  }

  const total = instrument?.article_count ?? 0;
  const shown = offset + articles.length;

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      {/* رابط العودة للمكتبة */}
      <div>
        <Link
          href="/library"
          className="text-xs hover:underline inline-flex items-center gap-1.5 font-medium"
          style={{ color: "var(--text2)" }}
        >
          <Icon name={direction === "rtl" ? "arrow_forward" : "arrow_back"} size={16} />
          <span>{t("@legalos.library.backLink")}</span>
        </Link>
      </div>

      {instrument && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge color="info">{instrument.reference}</Badge>
            <Badge color="neutral">{instrument.instrument_type.replace("_", " ")}</Badge>
          </div>
          <div dir={dirOf(instrument.title)}>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {instrument.title}
            </h1>
          </div>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.library.instrument.meta", {
              total: total.toLocaleString(intlLocale),
              from: offset + 1,
              to: shown,
            })}
          </span>
        </div>
      )}

      {loading && (
        <div className="p-6 text-center text-xs flex items-center justify-center gap-2" style={{ color: "var(--text2)" }}>
          <Icon name="hourglass_empty" size={18} />
          <span>{t("@legalos.library.instrument.loadingArticles")}</span>
        </div>
      )}

      {/* قائمة المواد */}
      <div className="flex flex-col gap-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {/* أزرار التنقل بين الصفحات */}
      <div className="flex items-center justify-center gap-3 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
        <Button
          variant="secondary"
          disabled={offset === 0 || loading}
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
        >
          <Icon name={direction === "rtl" ? "arrow_forward" : "arrow_back"} size={16} />
          <span>{t("@legalos.library.previous")}</span>
        </Button>
        <Button
          variant="secondary"
          disabled={shown >= total || loading}
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
        >
          <span>{t("@legalos.library.next")}</span>
          <Icon name={direction === "rtl" ? "arrow_back" : "arrow_forward"} size={16} />
        </Button>
      </div>
    </div>
  );
}
