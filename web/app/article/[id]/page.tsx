"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { useTranslator, useDirection } from "@astryxdesign/core/i18n";
import { useLocale } from "@/lib/i18n/provider";
import { api, ApiError, ArticleDetail, dirOf } from "@/lib/api";

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslator();
  const direction = useDirection();
  const articleId = Number(id);

  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { locale } = useLocale();
  const [language, setLanguage] = useState<"en" | "ar">(locale);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<{
    message: string;
    isCredits: boolean;
  } | null>(null);

  useEffect(() => {
    setDetail(null);
    setExplanation(null);
    setExplainError(null);
    api
      .article(articleId)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, [articleId]);

  async function explain(lang: "en" | "ar") {
    setExplaining(true);
    setExplainError(null);
    try {
      const result = await api.explain(articleId, lang);
      setExplanation(result.text);
    } catch (e) {
      setExplainError(
        e instanceof ApiError
          ? { message: e.message, isCredits: e.isCredits }
          : { message: String(e), isCredits: false },
      );
      setExplanation(null);
    } finally {
      setExplaining(false);
    }
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <Alert type="danger" title={t("@legalos.article.error.title")}>
          {error}
        </Alert>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-xs flex items-center justify-center gap-2" style={{ color: "var(--text2)" }}>
        <Icon name="hourglass_empty" size={18} />
        <span>{t("@legalos.article.loading")}</span>
      </div>
    );
  }

  const { article, instrument, previous_id, next_id } = detail;

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      {/* رابط العودة للتشريع */}
      {instrument && (
        <div>
          <Link
            href={`/library/${instrument.id}`}
            className="text-xs hover:underline inline-flex items-center gap-1 font-medium"
            style={{ color: "var(--primary)" }}
          >
            <span>←</span>
            <span>{instrument.title}</span>
          </Link>
        </div>
      )}

      {/* شارة الاستشهاد وعنوان المادة */}
      <div className="flex flex-col gap-2">
        <div>
          <Badge color="info">{article.citation}</Badge>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          {t("@legalos.article.heading", { number: article.article_number })}
        </h1>
      </div>

      {/* نص المادة التشريعية */}
      <Card className="p-6">
        <p className="text-sm leading-relaxed" dir={dirOf(article.text)} style={{ color: "var(--text)" }}>
          {article.text}
        </p>
      </Card>

      {/* الشرح باللغة البسيطة (Plain Language Explainer) */}
      <div className="flex flex-col gap-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
            {t("@legalos.article.plainLanguage.heading")}
          </h2>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md p-1 border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}>
              <button
                type="button"
                onClick={() => setLanguage("ar")}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  language === "ar"
                    ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                    : "text-[var(--text2)] hover:text-[var(--text)]"
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  language === "en"
                    ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                    : "text-[var(--text2)] hover:text-[var(--text)]"
                }`}
              >
                English
              </button>
            </div>

            <Button
              loading={explaining}
              onClick={() => explain(language)}
            >
              <Icon name="auto_awesome" size={16} />
              <span>
                {explanation
                  ? t("@legalos.article.explain.regenerate")
                  : t("@legalos.article.explain.cta")}
              </span>
            </Button>
          </div>
        </div>

        {explainError && (
          <Alert
            type={explainError.isCredits ? "warn" : "danger"}
            title={
              explainError.isCredits
                ? t("@legalos.article.explain.creditsTitle")
                : t("@legalos.article.explain.errorTitle")
            }
          >
            {explainError.message}
          </Alert>
        )}

        {explanation ? (
          <Card className="p-5 flex flex-col gap-3" style={{ backgroundColor: "var(--surface2)" }}>
            <div className="text-xs leading-relaxed flex flex-col gap-2" dir={dirOf(explanation)} style={{ color: "var(--text)" }}>
              {explanation.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="pt-2 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
              {t("@legalos.article.explain.footerNote")}
            </div>
          </Card>
        ) : (
          !explaining &&
          !explainError && (
            <p className="text-xs" style={{ color: "var(--text2)" }}>
              {t("@legalos.article.explain.helper")}
            </p>
          )
        )}
      </div>

      {/* التنقل بين المواد السابقة واللاحقة */}
      <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: "var(--border)" }}>
        {previous_id ? (
          <Link href={`/article/${previous_id}`}>
            <Button variant="secondary">
              <Icon name={direction === "rtl" ? "arrow_forward" : "arrow_back"} size={16} />
              <span>{t("@legalos.article.previousArticle")}</span>
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {next_id && (
          <Link href={`/article/${next_id}`}>
            <Button variant="secondary">
              <span>{t("@legalos.article.nextArticle")}</span>
              <Icon name={direction === "rtl" ? "arrow_back" : "arrow_forward"} size={16} />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
