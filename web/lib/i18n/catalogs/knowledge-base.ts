import type { Catalog } from "@astryxdesign/core/i18n";

// The knowledge-base entries themselves (titles, bodies, tags, author names)
// are seeded sample content and stay in their source language — this covers
// the surrounding chrome plus the five category names, which are a fixed
// vocabulary the UI filters and badges by.

export const en: Catalog = {
  "@legalos.knowledgeBase.heading": { defaultMessage: "Knowledge Base" },
  "@legalos.knowledgeBase.subtitle": {
    defaultMessage: "Firm templates, precedents, and reference guides",
  },
  "@legalos.knowledgeBase.newTemplate": { defaultMessage: "New template" },
  "@legalos.knowledgeBase.search.label": { defaultMessage: "Search knowledge base" },
  "@legalos.knowledgeBase.search.placeholder": {
    defaultMessage: "Search templates, precedents, and guides",
  },
  "@legalos.knowledgeBase.resultCount": {
    defaultMessage: "{count, plural, one {# result} other {# results}}",
  },
  "@legalos.knowledgeBase.relatedPrecedents": {
    defaultMessage: "Related precedents for your current matter",
  },
  "@legalos.knowledgeBase.empty.title": { defaultMessage: "No results found" },
  "@legalos.knowledgeBase.empty.description": {
    defaultMessage: "Try a different search term.",
  },
  "@legalos.knowledgeBase.clearSearch": { defaultMessage: "Clear search" },
  "@legalos.knowledgeBase.updated": { defaultMessage: "Updated {date}" },
  "@legalos.knowledgeBase.updatedBy": { defaultMessage: "Updated {date} · {author}" },
  "@legalos.knowledgeBase.showingFor": {
    defaultMessage: "Showing recommendations for {matter}",
  },

  "@legalos.knowledgeBase.category.contractTemplates": {
    defaultMessage: "Contract Templates",
  },
  "@legalos.knowledgeBase.category.litigationPrecedents": {
    defaultMessage: "Litigation Precedents",
  },
  "@legalos.knowledgeBase.category.regulatoryGuides": {
    defaultMessage: "Regulatory Guides",
  },
  "@legalos.knowledgeBase.category.firmPolicies": {
    defaultMessage: "Firm Policies & SOPs",
  },
  "@legalos.knowledgeBase.category.clientCommunication": {
    defaultMessage: "Client Communication Templates",
  },

  "@legalos.knowledgeBase.detail.notFoundTitle": { defaultMessage: "Item not found" },
  "@legalos.knowledgeBase.detail.notFoundDescription": {
    defaultMessage:
      "This knowledge base entry may have been moved or the link is out of date.",
  },
  "@legalos.knowledgeBase.detail.breadcrumb": { defaultMessage: "Knowledge Base" },
  "@legalos.knowledgeBase.detail.backToKb": { defaultMessage: "Back to Knowledge Base" },
  "@legalos.knowledgeBase.detail.edit": { defaultMessage: "Edit" },
  "@legalos.knowledgeBase.detail.useTemplate": { defaultMessage: "Use this template" },
  "@legalos.knowledgeBase.detail.download": { defaultMessage: "Download" },
  "@legalos.knowledgeBase.detail.aiHeading": { defaultMessage: "AI recommendations" },
  "@legalos.knowledgeBase.detail.aiForMatter": {
    defaultMessage:
      "Surfaced for matters like {matter} based on similar fact patterns and clause structure.",
  },
  "@legalos.knowledgeBase.detail.aiGeneric": {
    defaultMessage:
      "Surfaced based on matters and documents your team is currently working on.",
  },
  "@legalos.knowledgeBase.detail.askAi": {
    defaultMessage: "Ask AI Assistant about this",
  },
  "@legalos.knowledgeBase.detail.relatedMatter": { defaultMessage: "Related matter" },
  "@legalos.knowledgeBase.detail.viewMatter": { defaultMessage: "View matter" },
  "@legalos.knowledgeBase.detail.relatedItems": { defaultMessage: "Related items" },
  "@legalos.knowledgeBase.detail.detailsHeading": { defaultMessage: "Details" },
  "@legalos.knowledgeBase.detail.author": { defaultMessage: "Author" },
  "@legalos.knowledgeBase.detail.lastUpdated": { defaultMessage: "Last updated" },
  "@legalos.knowledgeBase.detail.tags": { defaultMessage: "Tags" },
};

export const ar: Catalog = {
  "@legalos.knowledgeBase.heading": { defaultMessage: "قاعدة المعرفة" },
  "@legalos.knowledgeBase.subtitle": {
    defaultMessage: "نماذج المكتب والسوابق والأدلة المرجعية",
  },
  "@legalos.knowledgeBase.newTemplate": { defaultMessage: "نموذج جديد" },
  "@legalos.knowledgeBase.search.label": { defaultMessage: "البحث في قاعدة المعرفة" },
  "@legalos.knowledgeBase.search.placeholder": {
    defaultMessage: "ابحث في النماذج والسوابق والأدلة",
  },
  "@legalos.knowledgeBase.resultCount": {
    defaultMessage:
      "{count, plural, zero {لا نتائج} one {نتيجة واحدة} two {نتيجتان} few {# نتائج} many {# نتيجة} other {# نتيجة}}",
  },
  "@legalos.knowledgeBase.relatedPrecedents": {
    defaultMessage: "سوابق ذات صلة بالملف الذي تعمل عليه",
  },
  "@legalos.knowledgeBase.empty.title": { defaultMessage: "لا توجد نتائج" },
  "@legalos.knowledgeBase.empty.description": {
    defaultMessage: "جرّب مصطلح بحث آخر.",
  },
  "@legalos.knowledgeBase.clearSearch": { defaultMessage: "مسح البحث" },
  "@legalos.knowledgeBase.updated": { defaultMessage: "حُدّث في {date}" },
  "@legalos.knowledgeBase.updatedBy": { defaultMessage: "حُدّث في {date} · {author}" },
  "@legalos.knowledgeBase.showingFor": {
    defaultMessage: "ترشيحات تخص {matter}",
  },

  "@legalos.knowledgeBase.category.contractTemplates": {
    defaultMessage: "نماذج العقود",
  },
  "@legalos.knowledgeBase.category.litigationPrecedents": {
    defaultMessage: "سوابق التقاضي",
  },
  "@legalos.knowledgeBase.category.regulatoryGuides": {
    defaultMessage: "الأدلة التنظيمية",
  },
  "@legalos.knowledgeBase.category.firmPolicies": {
    defaultMessage: "سياسات المكتب وإجراءات العمل",
  },
  "@legalos.knowledgeBase.category.clientCommunication": {
    defaultMessage: "نماذج مراسلات العملاء",
  },

  "@legalos.knowledgeBase.detail.notFoundTitle": { defaultMessage: "العنصر غير موجود" },
  "@legalos.knowledgeBase.detail.notFoundDescription": {
    defaultMessage: "ربما نُقل هذا المدخل من قاعدة المعرفة أو أن الرابط لم يعد صالحاً.",
  },
  "@legalos.knowledgeBase.detail.breadcrumb": { defaultMessage: "قاعدة المعرفة" },
  "@legalos.knowledgeBase.detail.backToKb": { defaultMessage: "العودة إلى قاعدة المعرفة" },
  "@legalos.knowledgeBase.detail.edit": { defaultMessage: "تعديل" },
  "@legalos.knowledgeBase.detail.useTemplate": { defaultMessage: "استخدام هذا النموذج" },
  "@legalos.knowledgeBase.detail.download": { defaultMessage: "تنزيل" },
  "@legalos.knowledgeBase.detail.aiHeading": {
    defaultMessage: "ترشيحات الذكاء الاصطناعي",
  },
  "@legalos.knowledgeBase.detail.aiForMatter": {
    defaultMessage:
      "مُقترح للملفات المشابهة لـ {matter} استناداً إلى تشابه الوقائع وبنية البنود.",
  },
  "@legalos.knowledgeBase.detail.aiGeneric": {
    defaultMessage: "مُقترح استناداً إلى الملفات والمستندات التي يعمل عليها فريقك حالياً.",
  },
  "@legalos.knowledgeBase.detail.askAi": {
    defaultMessage: "اسأل المساعد الذكي عن هذا",
  },
  "@legalos.knowledgeBase.detail.relatedMatter": { defaultMessage: "الملف ذو الصلة" },
  "@legalos.knowledgeBase.detail.viewMatter": { defaultMessage: "عرض الملف" },
  "@legalos.knowledgeBase.detail.relatedItems": { defaultMessage: "عناصر ذات صلة" },
  "@legalos.knowledgeBase.detail.detailsHeading": { defaultMessage: "التفاصيل" },
  "@legalos.knowledgeBase.detail.author": { defaultMessage: "المُعِدّ" },
  "@legalos.knowledgeBase.detail.lastUpdated": { defaultMessage: "آخر تحديث" },
  "@legalos.knowledgeBase.detail.tags": { defaultMessage: "الوسوم" },
};
