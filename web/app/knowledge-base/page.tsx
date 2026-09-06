"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslator } from "@astryxdesign/core/i18n";
import { KB_CATEGORIES, KB_ITEMS, AI_RECOMMENDATIONS, getKbItems, type KbItem, type KbCategory } from "./data";

const TYPE_ICON_NAME: Record<KbItem["type"], string> = {
  template: "content_copy",
  precedent: "balance",
  guide: "menu_book",
  policy: "verified_user",
};

const CATEGORY_KEY: Record<KbCategory, string> = {
  "Contract Templates": "@legalos.knowledgeBase.category.contractTemplates",
  "Litigation Precedents": "@legalos.knowledgeBase.category.litigationPrecedents",
  "Regulatory Guides": "@legalos.knowledgeBase.category.regulatoryGuides",
  "Firm Policies & SOPs": "@legalos.knowledgeBase.category.firmPolicies",
  "Client Communication Templates": "@legalos.knowledgeBase.category.clientCommunication",
};

function KbCard({ item }: { item: KbItem }) {
  const t = useTranslator();
  return (
    <Card className="p-5 flex flex-col justify-between gap-3 hover:border-[var(--primary)] transition-colors">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <Icon name={TYPE_ICON_NAME[item.type]} size={18} />
          <Badge color="neutral">{t(CATEGORY_KEY[item.category])}</Badge>
        </div>
        <div className="flex flex-col gap-1">
          <Link
            href={`/knowledge-base/${item.id}`}
            className="text-xs font-bold hover:underline line-clamp-2"
            style={{ color: "var(--text)" }}
          >
            {item.title}
          </Link>
          <p className="text-[11px] line-clamp-3" style={{ color: "var(--text2)" }}>
            {item.summary}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
        <div className="flex items-center gap-1.5 truncate">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: "var(--surface3)", color: "var(--text)" }}
          >
            {item.author.slice(0, 1)}
          </div>
          <span className="truncate">{item.author}</span>
        </div>
        <span className="flex-shrink-0">
          {t("@legalos.knowledgeBase.updated", { date: item.updated })}
        </span>
      </div>
    </Card>
  );
}

export default function KnowledgeBasePage() {
  const t = useTranslator();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return KB_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [search]);

  const recommended = getKbItems(AI_RECOMMENDATIONS.map((r) => r.itemId));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* رأس الصفحة وزر إنشاء نموذج */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          {t("@legalos.knowledgeBase.heading")}
        </h1>
        <Button>
          <Icon name="add" size={16} />
          <span>{t("@legalos.knowledgeBase.newTemplate")}</span>
        </Button>
      </div>

      {/* حقل البحث */}
      <div className="max-w-md w-full">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("@legalos.knowledgeBase.search.placeholder")}
          startIcon={<Icon name="search" size={16} />}
        />
      </div>

      {/* التوصيات الذكية عند عدم وجود بحث */}
      {!filtered && (
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Icon name="auto_awesome" size={18} />
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.knowledgeBase.relatedPrecedents")}
            </h2>
          </div>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.knowledgeBase.showingFor", {
              matter: "نبيل ضد شركة النيل للتجارة",
            })}
          </p>
          <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
            {recommended.map((item, i) => (
              <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-[var(--surface2)] mt-0.5" style={{ color: "var(--text2)" }}>
                    <Icon name={TYPE_ICON_NAME[item.type]} size={16} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/knowledge-base/${item.id}`}
                      className="text-xs font-bold hover:underline"
                      style={{ color: "var(--text)" }}
                    >
                      {item.title}
                    </Link>
                    <span className="text-[11px]" style={{ color: "var(--text2)" }}>
                      {AI_RECOMMENDATIONS[i].reason}
                    </span>
                  </div>
                </div>
                <Badge color="neutral">{t(CATEGORY_KEY[item.category])}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* نتائج البحث أو التصفح حسب التصنيفات */}
      {filtered ? (
        filtered.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              {t("@legalos.knowledgeBase.resultCount", { count: filtered.length })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <KbCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8">
            <EmptyState
              icon={<Icon name="search_off" size={32} />}
              title={t("@legalos.knowledgeBase.empty.title")}
              description={t("@legalos.knowledgeBase.empty.description")}
              action={
                <Button variant="secondary" onClick={() => setSearch("")}>
                  <span>{t("@legalos.knowledgeBase.clearSearch")}</span>
                </Button>
              }
            />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-8">
          {KB_CATEGORIES.map((category) => {
            const items = KB_ITEMS.filter((i) => i.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="flex flex-col gap-4">
                <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                  {t(CATEGORY_KEY[category])}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <KbCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
