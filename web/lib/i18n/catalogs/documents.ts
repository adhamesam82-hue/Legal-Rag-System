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
  "@legalos.documents.tree.all": { defaultMessage: "All documents" },
  "@legalos.documents.tree.recent": { defaultMessage: "Recent" },
  "@legalos.documents.tree.unfiled": { defaultMessage: "Not filed on a matter" },
  "@legalos.documents.tree.group.general": { defaultMessage: "General" },
  "@legalos.documents.tree.group.matters": { defaultMessage: "Matters" },
  "@legalos.documents.tree.group.clients": { defaultMessage: "Clients" },
  "@legalos.documents.tree.group.types": { defaultMessage: "By type" },
  "@legalos.documents.tree.group.tags": { defaultMessage: "Tags" },
  "@legalos.documents.tree.groupEmpty": { defaultMessage: "Nothing here yet" },
  "@legalos.documents.filters.clearAll": { defaultMessage: "Clear all filters" },
  "@legalos.documents.loadMore": { defaultMessage: "Load more" },
  "@legalos.documents.subtitle.filtered": {
    defaultMessage: "{count, plural, one {# document matches} other {# documents match}}",
  },
  "@legalos.documents.empty.filteredDescription": {
    defaultMessage: "No document matches every active filter. Remove one, or clear them all.",
  },
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

  // T-032: tags managed in-app, type from a dialog, cards or list
  "@legalos.documents.view.label": { defaultMessage: "View" },
  "@legalos.documents.view.list": { defaultMessage: "List" },
  "@legalos.documents.view.cards": { defaultMessage: "Cards" },
  "@legalos.documents.card.download": { defaultMessage: "Download" },
  "@legalos.documents.type.change": { defaultMessage: "Change type" },
  "@legalos.documents.type.dialogTitle": { defaultMessage: "Change document type" },
  "@legalos.documents.type.saveFailed": { defaultMessage: "Could not change the type." },
  "@legalos.documents.tags.edit": { defaultMessage: "Tags" },
  "@legalos.documents.tags.manage": { defaultMessage: "Manage tags" },
  "@legalos.documents.tags.manageTitle": { defaultMessage: "Manage tags" },
  "@legalos.documents.tags.dialogTitle": { defaultMessage: "Document tags" },
  "@legalos.documents.tags.pickLabel": { defaultMessage: "Tags" },
  "@legalos.documents.tags.pickPlaceholder": { defaultMessage: "Choose tags" },
  "@legalos.documents.tags.noneDefined": {
    defaultMessage: "No tags yet. Create some under \u201cManage tags\u201d.",
  },
  "@legalos.documents.tags.save": { defaultMessage: "Save" },
  "@legalos.documents.tags.cancel": { defaultMessage: "Cancel" },
  "@legalos.documents.tags.done": { defaultMessage: "Done" },
  "@legalos.documents.tags.add": { defaultMessage: "Add" },
  "@legalos.documents.tags.newName": { defaultMessage: "New tag" },
  "@legalos.documents.tags.newNamePlaceholder": { defaultMessage: "e.g. Urgent" },
  "@legalos.documents.tags.colorLabel": { defaultMessage: "Colour" },
  "@legalos.documents.tags.rename": { defaultMessage: "Rename" },
  "@legalos.documents.tags.delete": { defaultMessage: "Delete" },
  "@legalos.documents.tags.deleteTitle": { defaultMessage: "Delete the tag \u201c{name}\u201d" },
  "@legalos.documents.tags.deleteBody": {
    defaultMessage:
      "{count, plural, one {# document will lose this tag.} other {# documents will lose this tag.}} The documents themselves stay.",
  },
  "@legalos.documents.tags.deleteConfirm": { defaultMessage: "Delete tag" },
  "@legalos.documents.tags.onDocuments": {
    defaultMessage: "{count, plural, =0 {on no documents} one {on # document} other {on # documents}}",
  },
  "@legalos.documents.tags.saveFailed": { defaultMessage: "Could not save the tags." },
  "@legalos.documents.tags.duplicate": { defaultMessage: "A tag with that name already exists." },
  "@legalos.documents.tags.color.blue": { defaultMessage: "Blue" },
  "@legalos.documents.tags.color.cyan": { defaultMessage: "Cyan" },
  "@legalos.documents.tags.color.green": { defaultMessage: "Green" },
  "@legalos.documents.tags.color.orange": { defaultMessage: "Orange" },
  "@legalos.documents.tags.color.pink": { defaultMessage: "Pink" },
  "@legalos.documents.tags.color.purple": { defaultMessage: "Purple" },
  "@legalos.documents.tags.color.red": { defaultMessage: "Red" },
  "@legalos.documents.tags.color.teal": { defaultMessage: "Teal" },
  "@legalos.documents.tags.color.yellow": { defaultMessage: "Yellow" },
  "@legalos.documents.detail.tagsHeading": { defaultMessage: "Tags" },
  "@legalos.documents.detail.editTags": { defaultMessage: "Edit tags" },
  "@legalos.documents.detail.noTags": { defaultMessage: "No tags on this document." },
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
  "@legalos.documents.tree.all": { defaultMessage: "كل المستندات" },
  "@legalos.documents.tree.recent": { defaultMessage: "الأحدث" },
  "@legalos.documents.tree.unfiled": { defaultMessage: "بدون قضية" },
  "@legalos.documents.tree.group.general": { defaultMessage: "عام" },
  "@legalos.documents.tree.group.matters": { defaultMessage: "القضايا" },
  "@legalos.documents.tree.group.clients": { defaultMessage: "الموكّلون" },
  "@legalos.documents.tree.group.types": { defaultMessage: "حسب النوع" },
  "@legalos.documents.tree.group.tags": { defaultMessage: "الوسوم" },
  "@legalos.documents.tree.groupEmpty": { defaultMessage: "لا شيء هنا بعد" },
  "@legalos.documents.filters.clearAll": { defaultMessage: "مسح كل الفلاتر" },
  "@legalos.documents.loadMore": { defaultMessage: "تحميل المزيد" },
  "@legalos.documents.subtitle.filtered": {
    defaultMessage: "{count, plural, zero {لا مستندات مطابقة} one {مستند واحد مطابق} two {مستندان مطابقان} few {# مستندات مطابقة} many {# مستندًا مطابقًا} other {# مستند مطابق}}",
  },
  "@legalos.documents.empty.filteredDescription": {
    defaultMessage: "لا مستند يطابق كل الفلاتر النشطة معًا. أزل واحدًا أو امسحها كلها.",
  },
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

  // T-032: إدارة الوسوم من الشاشة، النوع من نافذة، بطاقات أو قائمة
  "@legalos.documents.view.label": { defaultMessage: "طريقة العرض" },
  "@legalos.documents.view.list": { defaultMessage: "قائمة" },
  "@legalos.documents.view.cards": { defaultMessage: "بطاقات" },
  "@legalos.documents.card.download": { defaultMessage: "تنزيل" },
  "@legalos.documents.type.change": { defaultMessage: "تغيير النوع" },
  "@legalos.documents.type.dialogTitle": { defaultMessage: "تغيير نوع المستند" },
  "@legalos.documents.type.saveFailed": { defaultMessage: "تعذّر تغيير النوع." },
  "@legalos.documents.tags.edit": { defaultMessage: "الوسوم" },
  "@legalos.documents.tags.manage": { defaultMessage: "إدارة الوسوم" },
  "@legalos.documents.tags.manageTitle": { defaultMessage: "إدارة الوسوم" },
  "@legalos.documents.tags.dialogTitle": { defaultMessage: "وسوم المستند" },
  "@legalos.documents.tags.pickLabel": { defaultMessage: "الوسوم" },
  "@legalos.documents.tags.pickPlaceholder": { defaultMessage: "اختر الوسوم" },
  "@legalos.documents.tags.noneDefined": {
    defaultMessage: "لا وسوم بعد. أنشئها من «إدارة الوسوم».",
  },
  "@legalos.documents.tags.save": { defaultMessage: "حفظ" },
  "@legalos.documents.tags.cancel": { defaultMessage: "إلغاء" },
  "@legalos.documents.tags.done": { defaultMessage: "تم" },
  "@legalos.documents.tags.add": { defaultMessage: "إضافة" },
  "@legalos.documents.tags.newName": { defaultMessage: "وسم جديد" },
  "@legalos.documents.tags.newNamePlaceholder": { defaultMessage: "مثال: عاجل" },
  "@legalos.documents.tags.colorLabel": { defaultMessage: "اللون" },
  "@legalos.documents.tags.rename": { defaultMessage: "إعادة تسمية" },
  "@legalos.documents.tags.delete": { defaultMessage: "حذف" },
  "@legalos.documents.tags.deleteTitle": { defaultMessage: "حذف الوسم «{name}»" },
  "@legalos.documents.tags.deleteBody": {
    defaultMessage:
      "{count, plural, one {سيفقد مستند واحد هذا الوسم.} two {سيفقد مستندان هذا الوسم.} few {ستفقد # مستندات هذا الوسم.} many {سيفقد # مستندًا هذا الوسم.} other {سيفقد # مستند هذا الوسم.}} المستندات نفسها تبقى.",
  },
  "@legalos.documents.tags.deleteConfirm": { defaultMessage: "حذف الوسم" },
  "@legalos.documents.tags.onDocuments": {
    defaultMessage: "{count, plural, =0 {على لا مستند} one {على مستند واحد} two {على مستندين} few {على # مستندات} many {على # مستندًا} other {على # مستند}}",
  },
  "@legalos.documents.tags.saveFailed": { defaultMessage: "تعذّر حفظ الوسوم." },
  "@legalos.documents.tags.duplicate": { defaultMessage: "يوجد وسم بهذا الاسم بالفعل." },
  "@legalos.documents.tags.color.blue": { defaultMessage: "أزرق" },
  "@legalos.documents.tags.color.cyan": { defaultMessage: "سماوي" },
  "@legalos.documents.tags.color.green": { defaultMessage: "أخضر" },
  "@legalos.documents.tags.color.orange": { defaultMessage: "برتقالي" },
  "@legalos.documents.tags.color.pink": { defaultMessage: "وردي" },
  "@legalos.documents.tags.color.purple": { defaultMessage: "بنفسجي" },
  "@legalos.documents.tags.color.red": { defaultMessage: "أحمر" },
  "@legalos.documents.tags.color.teal": { defaultMessage: "أزرق مخضرّ" },
  "@legalos.documents.tags.color.yellow": { defaultMessage: "أصفر" },
  "@legalos.documents.detail.tagsHeading": { defaultMessage: "الوسوم" },
  "@legalos.documents.detail.editTags": { defaultMessage: "تعديل الوسوم" },
  "@legalos.documents.detail.noTags": { defaultMessage: "لا وسوم على هذا المستند." },
};
