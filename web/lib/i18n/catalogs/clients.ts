import type { Catalog } from "@astryxdesign/core/i18n";

// Client type and status values (company/individual/active/inactive) are NOT
// duplicated here — they are API enum values and resolve through
// lib/i18n/catalogs/enums.ts via useEnumLabel(), so the two never drift.

export const en: Catalog = {
  "@legalos.clients.heading": { defaultMessage: "Clients" },
  "@legalos.clients.subtitle.atFirm": {
    defaultMessage:
      "{count, plural, one {# client at {firm}} other {# clients at {firm}}}",
  },
  "@legalos.clients.subtitle.plain": {
    defaultMessage: "{count, plural, one {# client} other {# clients}}",
  },
  "@legalos.clients.newClient": { defaultMessage: "New client" },
  "@legalos.clients.loading": { defaultMessage: "Loading clients…" },

  "@legalos.clients.search.label": { defaultMessage: "Search clients" },
  "@legalos.clients.search.placeholder": {
    defaultMessage: "Search by name or industry",
  },
  "@legalos.clients.filter.allTypes": { defaultMessage: "All types" },
  "@legalos.clients.filter.allStatuses": { defaultMessage: "All statuses" },
  "@legalos.clients.clearFilters": { defaultMessage: "Clear filters" },

  "@legalos.clients.table.client": { defaultMessage: "Client" },
  "@legalos.clients.table.type": { defaultMessage: "Type" },
  "@legalos.clients.table.primaryContact": { defaultMessage: "Primary contact" },
  "@legalos.clients.table.activeMatters": { defaultMessage: "Active matters" },
  "@legalos.clients.table.noneActive": { defaultMessage: "None" },
  "@legalos.clients.table.lastActivity": { defaultMessage: "Last activity" },
  "@legalos.clients.table.status": { defaultMessage: "Status" },

  "@legalos.clients.empty.noneTitle": { defaultMessage: "No clients yet" },
  "@legalos.clients.empty.noneDescription": {
    defaultMessage: "Add your first client to start opening matters against it.",
  },
  "@legalos.clients.empty.noMatchTitle": {
    defaultMessage: "No clients match your filters",
  },
  "@legalos.clients.empty.noMatchDescription": {
    defaultMessage: "Try a different search term or clear the type and status filters.",
  },

  "@legalos.clients.dialog.title": { defaultMessage: "New client" },
  "@legalos.clients.dialog.nameLabel": { defaultMessage: "Client name" },
  "@legalos.clients.dialog.typeLabel": { defaultMessage: "Type" },
  "@legalos.clients.dialog.industryLabel": { defaultMessage: "Industry" },
  "@legalos.clients.dialog.industryPlaceholder": {
    defaultMessage: "Import & Export Trading",
  },
  "@legalos.clients.dialog.emailLabel": { defaultMessage: "Email" },
  "@legalos.clients.dialog.phoneLabel": { defaultMessage: "Phone" },
  "@legalos.clients.dialog.addressLabel": { defaultMessage: "Address" },
  "@legalos.clients.dialog.notesLabel": { defaultMessage: "Notes" },
  "@legalos.clients.dialog.cancel": { defaultMessage: "Cancel" },
  "@legalos.clients.dialog.saving": { defaultMessage: "Saving…" },
  "@legalos.clients.dialog.create": { defaultMessage: "Create client" },
  "@legalos.clients.dialog.error": { defaultMessage: "Could not save this client." },

  "@legalos.clients.detail.loading": { defaultMessage: "Loading client…" },
  "@legalos.clients.detail.backLink": { defaultMessage: "Clients" },
  "@legalos.clients.detail.clientSince": {
    defaultMessage: " · client since {date}",
  },
  "@legalos.clients.detail.stat.activeMatters": { defaultMessage: "Active matters" },
  "@legalos.clients.detail.stat.totalMatters": { defaultMessage: "Total matters" },
  "@legalos.clients.detail.stat.outstanding": { defaultMessage: "Outstanding" },

  "@legalos.clients.detail.matters.heading": { defaultMessage: "Matters" },
  "@legalos.clients.detail.matters.emptyTitle": { defaultMessage: "No matters yet" },
  "@legalos.clients.detail.matters.emptyDescription": {
    defaultMessage: "Open a matter against this client to start work.",
  },
  "@legalos.clients.detail.invoices.heading": { defaultMessage: "Invoices" },
  "@legalos.clients.detail.invoices.billingLink": { defaultMessage: "Billing" },
  "@legalos.clients.detail.invoices.empty": {
    defaultMessage: "No invoices raised for this client yet.",
  },
  "@legalos.clients.detail.activity.heading": { defaultMessage: "Activity" },
  "@legalos.clients.detail.activity.empty": {
    defaultMessage: "No activity recorded for this client yet.",
  },
  "@legalos.clients.detail.details.heading": { defaultMessage: "Details" },
  "@legalos.clients.detail.contacts.heading": { defaultMessage: "Contacts" },
  "@legalos.clients.detail.contacts.empty": { defaultMessage: "No contacts recorded." },
  "@legalos.clients.detail.contacts.primaryBadge": { defaultMessage: "Primary" },
  "@legalos.clients.detail.contacts.primaryHeading": { defaultMessage: "Primary contact" },
  "@legalos.clients.detail.notes.heading": { defaultMessage: "Notes" },

  "@legalos.clients.detail.field.type": { defaultMessage: "Type" },
  "@legalos.clients.detail.field.registration": { defaultMessage: "Registration" },
  "@legalos.clients.detail.field.taxId": { defaultMessage: "Tax ID" },
  "@legalos.clients.detail.field.address": { defaultMessage: "Address" },
  "@legalos.clients.detail.field.phone": { defaultMessage: "Phone" },
  "@legalos.clients.detail.field.email": { defaultMessage: "Email" },
};

export const ar: Catalog = {
  "@legalos.clients.heading": { defaultMessage: "العملاء" },
  "@legalos.clients.subtitle.atFirm": {
    defaultMessage:
      "{count, plural, zero {لا عملاء لدى {firm}} one {عميل واحد لدى {firm}} two {عميلان لدى {firm}} few {# عملاء لدى {firm}} many {# عميلاً لدى {firm}} other {# عميل لدى {firm}}}",
  },
  "@legalos.clients.subtitle.plain": {
    defaultMessage:
      "{count, plural, zero {لا عملاء} one {عميل واحد} two {عميلان} few {# عملاء} many {# عميلاً} other {# عميل}}",
  },
  "@legalos.clients.newClient": { defaultMessage: "عميل جديد" },
  "@legalos.clients.loading": { defaultMessage: "جارٍ تحميل العملاء…" },

  "@legalos.clients.search.label": { defaultMessage: "البحث في العملاء" },
  "@legalos.clients.search.placeholder": {
    defaultMessage: "ابحث بالاسم أو النشاط",
  },
  "@legalos.clients.filter.allTypes": { defaultMessage: "جميع الأنواع" },
  "@legalos.clients.filter.allStatuses": { defaultMessage: "جميع الحالات" },
  "@legalos.clients.clearFilters": { defaultMessage: "مسح عوامل التصفية" },

  "@legalos.clients.table.client": { defaultMessage: "العميل" },
  "@legalos.clients.table.type": { defaultMessage: "النوع" },
  "@legalos.clients.table.primaryContact": { defaultMessage: "جهة الاتصال الرئيسية" },
  "@legalos.clients.table.activeMatters": { defaultMessage: "الملفات النشطة" },
  "@legalos.clients.table.noneActive": { defaultMessage: "لا يوجد" },
  "@legalos.clients.table.lastActivity": { defaultMessage: "آخر نشاط" },
  "@legalos.clients.table.status": { defaultMessage: "الحالة" },

  "@legalos.clients.empty.noneTitle": { defaultMessage: "لا يوجد عملاء بعد" },
  "@legalos.clients.empty.noneDescription": {
    defaultMessage: "أضف أول عميل لتبدأ في فتح الملفات باسمه.",
  },
  "@legalos.clients.empty.noMatchTitle": {
    defaultMessage: "لا يوجد عملاء مطابقون لعوامل التصفية",
  },
  "@legalos.clients.empty.noMatchDescription": {
    defaultMessage: "جرّب مصطلح بحث آخر أو امسح تصفية النوع والحالة.",
  },

  "@legalos.clients.dialog.title": { defaultMessage: "عميل جديد" },
  "@legalos.clients.dialog.nameLabel": { defaultMessage: "اسم العميل" },
  "@legalos.clients.dialog.typeLabel": { defaultMessage: "النوع" },
  "@legalos.clients.dialog.industryLabel": { defaultMessage: "النشاط" },
  "@legalos.clients.dialog.industryPlaceholder": {
    defaultMessage: "تجارة الاستيراد والتصدير",
  },
  "@legalos.clients.dialog.emailLabel": { defaultMessage: "البريد الإلكتروني" },
  "@legalos.clients.dialog.phoneLabel": { defaultMessage: "الهاتف" },
  "@legalos.clients.dialog.addressLabel": { defaultMessage: "العنوان" },
  "@legalos.clients.dialog.notesLabel": { defaultMessage: "ملاحظات" },
  "@legalos.clients.dialog.cancel": { defaultMessage: "إلغاء" },
  "@legalos.clients.dialog.saving": { defaultMessage: "جارٍ الحفظ…" },
  "@legalos.clients.dialog.create": { defaultMessage: "إنشاء العميل" },
  "@legalos.clients.dialog.error": { defaultMessage: "تعذّر حفظ بيانات هذا العميل." },

  "@legalos.clients.detail.loading": { defaultMessage: "جارٍ تحميل بيانات العميل…" },
  "@legalos.clients.detail.backLink": { defaultMessage: "العملاء" },
  "@legalos.clients.detail.clientSince": {
    defaultMessage: " · عميل منذ {date}",
  },
  "@legalos.clients.detail.stat.activeMatters": { defaultMessage: "الملفات النشطة" },
  "@legalos.clients.detail.stat.totalMatters": { defaultMessage: "إجمالي الملفات" },
  "@legalos.clients.detail.stat.outstanding": { defaultMessage: "المستحقات" },

  "@legalos.clients.detail.matters.heading": { defaultMessage: "الملفات" },
  "@legalos.clients.detail.matters.emptyTitle": { defaultMessage: "لا توجد ملفات بعد" },
  "@legalos.clients.detail.matters.emptyDescription": {
    defaultMessage: "افتح ملفاً باسم هذا العميل لبدء العمل.",
  },
  "@legalos.clients.detail.invoices.heading": { defaultMessage: "الفواتير" },
  "@legalos.clients.detail.invoices.billingLink": { defaultMessage: "الفوترة" },
  "@legalos.clients.detail.invoices.empty": {
    defaultMessage: "لم تُصدر أي فواتير لهذا العميل بعد.",
  },
  "@legalos.clients.detail.activity.heading": { defaultMessage: "النشاط" },
  "@legalos.clients.detail.activity.empty": {
    defaultMessage: "لم يُسجَّل أي نشاط لهذا العميل بعد.",
  },
  "@legalos.clients.detail.details.heading": { defaultMessage: "التفاصيل" },
  "@legalos.clients.detail.contacts.heading": { defaultMessage: "جهات الاتصال" },
  "@legalos.clients.detail.contacts.empty": {
    defaultMessage: "لا توجد جهات اتصال مسجَّلة.",
  },
  "@legalos.clients.detail.contacts.primaryBadge": { defaultMessage: "رئيسية" },
  "@legalos.clients.detail.contacts.primaryHeading": { defaultMessage: "جهة الاتصال الرئيسية" },
  "@legalos.clients.detail.notes.heading": { defaultMessage: "ملاحظات" },

  "@legalos.clients.detail.field.type": { defaultMessage: "النوع" },
  "@legalos.clients.detail.field.registration": { defaultMessage: "السجل التجاري" },
  "@legalos.clients.detail.field.taxId": { defaultMessage: "البطاقة الضريبية" },
  "@legalos.clients.detail.field.address": { defaultMessage: "العنوان" },
  "@legalos.clients.detail.field.phone": { defaultMessage: "الهاتف" },
  "@legalos.clients.detail.field.email": { defaultMessage: "البريد الإلكتروني" },
};
