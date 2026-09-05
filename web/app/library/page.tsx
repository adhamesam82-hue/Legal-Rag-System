"use client";

import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
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
    <div
      className="w-full flex flex-col gap-6"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px",
      }}
    >
      {/* رأس الصفحة: العنوان والملخص وحقل التصفية */}
      <header
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-9 h-9"
              style={{
                borderRadius: "var(--rs)",
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <Icon name="local_library" size={20} />
            </div>
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              {t("@legalos.library.heading")}
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            {instruments
              ? t("@legalos.library.summary", {
                  count: instruments.length,
                  articles: totalArticles.toLocaleString(intlLocale),
                })
              : t("@legalos.library.loadingCorpus")}
          </p>
        </div>

        <div className="w-full md:w-80">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("@legalos.library.filter.placeholder")}
            aria-label={t("@legalos.library.filter.label")}
            startIcon={<Icon name="search" size={18} />}
          />
        </div>
      </header>

      {/* رسالة الخطأ إن وُجدت */}
      {error && (
        <Alert
          type="danger"
          title={t("@legalos.library.error.title")}
        >
          {error}
        </Alert>
      )}

      {/* حالة التحميل عبر هياكل Skeleton بدلاً من الدوامة الصامتة */}
      {!instruments && !error && (
        <div
          role="status"
          aria-label={t("@legalos.library.spinner")}
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {Array.from({ length: 9 }).map((_, idx) => (
            <Card key={idx} padding="16px" bordered shadow={false}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton width="80px" height="22px" borderRadius="var(--rs)" />
                  <Skeleton width="60px" height="22px" borderRadius="var(--rs)" />
                </div>
                <Skeleton width="90%" height="16px" />
                <Skeleton width="60%" height="16px" />
                <div className="pt-2">
                  <Skeleton width="40%" height="12px" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* الحالة الفارغة عند عدم مطابقة التصفية */}
      {visible?.length === 0 && (
        <EmptyState
          icon={<Icon name="search_off" size={24} />}
          title={t("@legalos.library.empty.title")}
          description={t("@legalos.library.empty.description", { filter })}
        />
      )}

      {/* شبكة البطاقات للتشريعات */}
      {visible && visible.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gridAutoRows: "1fr",
          }}
        >
          {visible.map((instrument) => (
            <NextLink
              key={instrument.id}
              href={`/library/${instrument.id}`}
              className="block h-full transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              style={{
                textDecoration: "none",
                borderRadius: "var(--r)",
              }}
            >
              <Card
                padding="16px"
                bordered
                shadow
                className="h-full justify-between"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge color="info" variant="soft">
                      {instrument.reference}
                    </Badge>
                    {instrument.instrument_type !== "law" && (
                      <Badge color="neutral" variant="soft">
                        {instrument.instrument_type.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <div
                    dir={dirOf(instrument.title)}
                    className="font-medium text-sm line-clamp-3 leading-snug"
                    style={{ color: "var(--text)" }}
                  >
                    {instrument.title}
                  </div>
                </div>

                <div
                  className="pt-3 text-xs flex items-center justify-between border-t mt-3"
                  style={{
                    color: "var(--text3)",
                    borderColor: "var(--border)",
                  }}
                >
                  <span>
                    {t("@legalos.library.articleCount", {
                      count: instrument.article_count,
                    })}
                  </span>
                  <Icon name="arrow_forward" size={14} />
                </div>
              </Card>
            </NextLink>
          ))}
        </div>
      )}
    </div>
  );
}
