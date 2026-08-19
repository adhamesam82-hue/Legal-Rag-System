import type { Catalog } from "@astryxdesign/core/i18n";

// The `field.*` labels are shared deliberately: the list page uses them as
// table column headers and the detail page uses the same words as metadata
// row labels, so they must not drift apart.

export const en: Catalog = {
  "@legalos.documents.heading": { defaultMessage: "Documents" },
  "@legalos.documents.subtitle.inMatter": {
    defaultMessage:
      "{count, plural, one {# document in this matter} other {# documents in this matter}}",
  },
  "@legalos.documents.subtitle.firmWide": {
    defaultMessage:
      "{count, plural, one {# document across the firm} other {# documents across the firm}}",
  },
  "@legalos.documents.panel.matters": { defaultMessage: "Matters" },
  "@legalos.documents.tree.allDocuments": { defaultMessage: "All documents ({count})" },
  "@legalos.documents.search.label": { defaultMessage: "Search documents" },
  "@legalos.documents.search.placeholder": { defaultMessage: "Search by name" },
  "@legalos.documents.upload": { defaultMessage: "Upload" },
  "@legalos.documents.uploading": { defaultMessage: "Uploading…" },
  "@legalos.documents.uploadError": { defaultMessage: "Could not upload this file." },
  "@legalos.documents.loading": { defaultMessage: "Loading documents…" },
  "@legalos.documents.noFile": { defaultMessage: "No file" },
  "@legalos.documents.unfiled": { defaultMessage: "Unfiled" },

  "@legalos.documents.empty.noMatchTitle": {
    defaultMessage: "No documents match your search",
  },
  "@legalos.documents.empty.noMatchDescription": {
    defaultMessage: "Try a different search term.",
  },
  "@legalos.documents.empty.noneTitle": { defaultMessage: "No documents yet" },
  "@legalos.documents.empty.noneDescription": {
    defaultMessage: "Upload a file to file it against a matter.",
  },
  "@legalos.documents.empty.uploadAction": { defaultMessage: "Upload a document" },

  "@legalos.documents.field.document": { defaultMessage: "Document" },
  "@legalos.documents.field.matter": { defaultMessage: "Matter" },
  "@legalos.documents.field.uploadedBy": { defaultMessage: "Uploaded by" },
  "@legalos.documents.field.uploaded": { defaultMessage: "Uploaded" },
  "@legalos.documents.field.status": { defaultMessage: "Status" },
  "@legalos.documents.field.size": { defaultMessage: "Size" },
  "@legalos.documents.field.type": { defaultMessage: "Type" },

  "@legalos.documents.detail.loading": { defaultMessage: "Loading document…" },
  "@legalos.documents.detail.backLink": { defaultMessage: "Documents" },
  "@legalos.documents.detail.notFiled": {
    defaultMessage: "Not filed against a matter",
  },
  "@legalos.documents.detail.download": { defaultMessage: "Download" },
  "@legalos.documents.detail.delete": { defaultMessage: "Delete" },
  "@legalos.documents.detail.deleteDocument": { defaultMessage: "Delete document" },
  "@legalos.documents.detail.fileHeading": { defaultMessage: "File" },
  "@legalos.documents.detail.openStoredFile": { defaultMessage: "Open the stored file" },
  "@legalos.documents.detail.detailsHeading": { defaultMessage: "Details" },
  "@legalos.documents.detail.noFileTitle": { defaultMessage: "No file stored" },
  "@legalos.documents.detail.noFileDescription": {
    defaultMessage: "This record has metadata only — no file was uploaded for it.",
  },
  "@legalos.documents.detail.updateError": {
    defaultMessage: "Could not update this document.",
  },
  "@legalos.documents.detail.deleteError": {
    defaultMessage: "Could not delete this document.",
  },
};

export const ar: Catalog = {
  "@legalos.documents.heading": { defaultMessage: "المستندات" },
  "@legalos.documents.subtitle.inMatter": {
    defaultMessage:
      "{count, plural, zero {لا مستندات في هذه القضية} one {مستند واحد في هذه القضية} two {مستندان في هذه القضية} few {# مستندات في هذه القضية} many {# مستنداً في هذه القضية} other {# مستند في هذه القضية}}",
  },
  "@legalos.documents.subtitle.firmWide": {
    defaultMessage:
      "{count, plural, zero {لا مستندات على مستوى المكتب} one {مستند واحد على مستوى المكتب} two {مستندان على مستوى المكتب} few {# مستندات على مستوى المكتب} many {# مستنداً على مستوى المكتب} other {# مستند على مستوى المكتب}}",
  },
  "@legalos.documents.panel.matters": { defaultMessage: "القضايا" },
  "@legalos.documents.tree.allDocuments": { defaultMessage: "كل المستندات ({count})" },
  "@legalos.documents.search.label": { defaultMessage: "البحث في المستندات" },
  "@legalos.documents.search.placeholder": { defaultMessage: "ابحث بالاسم" },
  "@legalos.documents.upload": { defaultMessage: "رفع" },
  "@legalos.documents.uploading": { defaultMessage: "جارٍ الرفع…" },
  "@legalos.documents.uploadError": { defaultMessage: "تعذّر رفع هذا الملف." },
  "@legalos.documents.loading": { defaultMessage: "جارٍ تحميل المستندات…" },
  "@legalos.documents.noFile": { defaultMessage: "لا يوجد ملف" },
  "@legalos.documents.unfiled": { defaultMessage: "غير مودع" },

  "@legalos.documents.empty.noMatchTitle": {
    defaultMessage: "لا توجد مستندات مطابقة لبحثك",
  },
  "@legalos.documents.empty.noMatchDescription": {
    defaultMessage: "جرّب مصطلح بحث آخر.",
  },
  "@legalos.documents.empty.noneTitle": { defaultMessage: "لا توجد مستندات بعد" },
  "@legalos.documents.empty.noneDescription": {
    defaultMessage: "ارفع ملفاً لإيداعه ضمن إحدى القضايا.",
  },
  "@legalos.documents.empty.uploadAction": { defaultMessage: "رفع مستند" },

  "@legalos.documents.field.document": { defaultMessage: "المستند" },
  "@legalos.documents.field.matter": { defaultMessage: "القضية" },
  "@legalos.documents.field.uploadedBy": { defaultMessage: "رفعه" },
  "@legalos.documents.field.uploaded": { defaultMessage: "تاريخ الرفع" },
  "@legalos.documents.field.status": { defaultMessage: "الحالة" },
  "@legalos.documents.field.size": { defaultMessage: "الحجم" },
  "@legalos.documents.field.type": { defaultMessage: "النوع" },

  "@legalos.documents.detail.loading": { defaultMessage: "جارٍ تحميل المستند…" },
  "@legalos.documents.detail.backLink": { defaultMessage: "المستندات" },
  "@legalos.documents.detail.notFiled": { defaultMessage: "غير مودع ضمن أي قضية" },
  "@legalos.documents.detail.download": { defaultMessage: "تنزيل" },
  "@legalos.documents.detail.delete": { defaultMessage: "حذف" },
  "@legalos.documents.detail.deleteDocument": { defaultMessage: "حذف المستند" },
  "@legalos.documents.detail.fileHeading": { defaultMessage: "الملف المرفق" },
  "@legalos.documents.detail.openStoredFile": { defaultMessage: "فتح الملف المخزَّن" },
  "@legalos.documents.detail.detailsHeading": { defaultMessage: "التفاصيل" },
  "@legalos.documents.detail.noFileTitle": { defaultMessage: "لا يوجد ملف مخزَّن" },
  "@legalos.documents.detail.noFileDescription": {
    defaultMessage: "هذا السجل يحتوي على بيانات وصفية فقط — لم يُرفع له ملف.",
  },
  "@legalos.documents.detail.updateError": {
    defaultMessage: "تعذّر تحديث هذا المستند.",
  },
  "@legalos.documents.detail.deleteError": {
    defaultMessage: "تعذّر حذف هذا المستند.",
  },
};
