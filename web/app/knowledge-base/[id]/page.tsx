"use client";

import { use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { BreadcrumbOverride } from "@/components/ui/Breadcrumb";
import { useTranslator } from "@astryxdesign/core/i18n";
import { getKbItem, getKbItems, type KbItem, type KbCategory } from "../data";

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

export default function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslator();
  const { id } = use(params);
  const item = getKbItem(id);

  if (!item) {
    return (
      <div className="p-8 flex items-center justify-center">
        <EmptyState
          icon={<Icon name="menu_book" size={32} />}
          title={t("@legalos.knowledgeBase.detail.notFoundTitle")}
          description={t("@legalos.knowledgeBase.detail.notFoundDescription")}
          action={
            <Link
              href="/knowledge-base"
              className="text-xs font-semibold hover:underline"
              style={{ color: "var(--primary)" }}
            >
              {t("@legalos.knowledgeBase.detail.backToKb")}
            </Link>
          }
        />
      </div>
    );
  }

  const related = getKbItems(item.relatedIds);

  return (
    <>
      <BreadcrumbOverride
        items={[
          { label: t("@legalos.shell.breadcrumb.home"), href: "/dashboard" },
          { label: t("@legalos.shell.nav.knowledgeBase"), href: "/knowledge-base" },
          { label: t(CATEGORY_KEY[item.category]), href: "/knowledge-base" },
          { label: item.title, isCurrent: true },
        ]}
      />
      <div className="flex flex-col gap-6 p-6">
        {/* مسار التصفح ورأس الصفحة */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text2)" }}>
            <Link href="/knowledge-base" className="hover:underline">
              {t("@legalos.knowledgeBase.detail.breadcrumb")}
            </Link>
            <span>/</span>
            <Link href="/knowledge-base" className="hover:underline">
              {item.category}
            </Link>
            <span>/</span>
            <span className="font-semibold truncate" style={{ color: "var(--text)" }}>
              {item.title}
            </span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2" data-breadcrumb-title={item.title}>
                <Icon name={TYPE_ICON_NAME[item.type]} size={22} />
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                  {item.title}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge color="neutral">{t(CATEGORY_KEY[item.category])}</Badge>
                <span style={{ color: "var(--text2)" }}>
                  {t("@legalos.knowledgeBase.updatedBy", {
                    date: item.updated,
                    author: item.author,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary">
                <Icon name="edit" size={16} />
                <span>{t("@legalos.knowledgeBase.detail.edit")}</span>
              </Button>
              {item.type === "template" ? (
                <Button>
                  <Icon name="content_copy" size={16} />
                  <span>{t("@legalos.knowledgeBase.detail.useTemplate")}</span>
                </Button>
              ) : (
                <Button>
                  <Icon name="download" size={16} />
                  <span>{t("@legalos.knowledgeBase.detail.download")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* المحتوى الرئيسي والشريط الجانبي */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <Card className="p-6 flex flex-col gap-6">
              <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                {item.summary}
              </p>
              <div className="pt-4 border-t flex flex-col gap-6" style={{ borderColor: "var(--border)" }}>
                {item.body.map((section) => (
                  <div key={section.heading} className="flex flex-col gap-2">
                    <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                      {section.heading}
                    </h2>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                      {section.text}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-5">
            {/* نصائح الذكاء الاصطناعي */}
            <Card className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon name="auto_awesome" size={18} />
                <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                  {t("@legalos.knowledgeBase.detail.aiHeading")}
                </h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                {item.relatedMatter
                  ? t("@legalos.knowledgeBase.detail.aiForMatter", {
                      matter: item.relatedMatter,
                    })
                  : t("@legalos.knowledgeBase.detail.aiGeneric")}
              </p>
              <Link
                href="/ai-assistant"
                className="text-xs font-semibold hover:underline"
                style={{ color: "var(--primary)" }}
              >
                {t("@legalos.knowledgeBase.detail.askAi")}
              </Link>
            </Card>

            {/* القضية المرتبطة */}
            {item.relatedMatter && (
              <Card className="p-5 flex flex-col gap-3">
                <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                  {t("@legalos.knowledgeBase.detail.relatedMatter")}
                </h3>
                <Link
                  href="/matters"
                  className="p-2.5 rounded-md border flex items-center gap-2 text-xs hover:bg-[var(--surface2)] transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Icon name="balance" size={16} />
                  <div className="flex flex-col truncate">
                    <span className="font-semibold truncate" style={{ color: "var(--text)" }}>
                      {item.relatedMatter}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text2)" }}>
                      {t("@legalos.knowledgeBase.detail.viewMatter")}
                    </span>
                  </div>
                </Link>
              </Card>
            )}

            {/* العناصر ذات الصلة */}
            <Card className="p-5 flex flex-col gap-3">
              <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.knowledgeBase.detail.relatedItems")}
              </h3>
              {related.length > 0 ? (
                <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      href={`/knowledge-base/${r.id}`}
                      className="py-2.5 flex items-start gap-2.5 hover:text-[var(--primary)] transition-colors text-xs"
                    >
                      <Icon name={TYPE_ICON_NAME[r.type]} size={16} />
                      <div className="flex flex-col gap-0.5 truncate">
                        <span className="font-semibold truncate" style={{ color: "var(--text)" }}>
                          {r.title}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text2)" }}>
                          {t(CATEGORY_KEY[r.category])}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--text2)" }}>
                  {t("@legalos.knowledgeBase.detail.noRelatedItems")}
                </p>
              )}
            </Card>

            {/* تفاصيل المستند والوسوم */}
            <Card className="p-5 flex flex-col gap-3">
              <h3 className="text-xs font-bold" style={{ color: "var(--text)" }}>
                {t("@legalos.knowledgeBase.detail.detailsHeading")}
              </h3>
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text2)" }}>
                    {t("@legalos.knowledgeBase.detail.author")}
                  </span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {item.author}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text2)" }}>
                    {t("@legalos.knowledgeBase.detail.lastUpdated")}
                  </span>
                  <span style={{ color: "var(--text2)" }}>{item.updated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--text2)" }}>
                    {t("@legalos.knowledgeBase.detail.tags")}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge key={tag} color="neutral">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
