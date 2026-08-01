import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  "@legalos.common.loading": { defaultMessage: "Loading…" },
  "@legalos.common.loadingFirm": { defaultMessage: "Loading your firm…" },
  "@legalos.common.errorTitle": { defaultMessage: "Could not load this data" },
  "@legalos.common.tryAgain": { defaultMessage: "Try again" },

  "@legalos.common.noOrg.title": { defaultMessage: "Set up your firm" },
  "@legalos.common.noOrg.description": {
    defaultMessage:
      "This account isn't part of a firm yet. Name it to get started — you'll be its Owner.",
  },
  "@legalos.common.noOrg.firmNameLabel": { defaultMessage: "Firm name" },
  "@legalos.common.noOrg.firmNamePlaceholder": { defaultMessage: "Al-Sayed & Partners" },
  "@legalos.common.noOrg.creating": { defaultMessage: "Creating…" },
  "@legalos.common.noOrg.createFirm": { defaultMessage: "Create firm" },
  "@legalos.common.noOrg.seedHint": {
    defaultMessage:
      "To take over the seeded sample firm instead, run: uv run python scripts/seed_demo_firm.py --reset --owner-clerk-id <your Clerk user id>",
  },
  "@legalos.common.noOrg.createFailed": { defaultMessage: "Could not create the firm." },
};

export const ar: Catalog = {
  "@legalos.common.loading": { defaultMessage: "جارٍ التحميل…" },
  "@legalos.common.loadingFirm": { defaultMessage: "جارٍ تحميل بيانات المكتب…" },
  "@legalos.common.errorTitle": { defaultMessage: "تعذّر تحميل هذه البيانات" },
  "@legalos.common.tryAgain": { defaultMessage: "إعادة المحاولة" },

  "@legalos.common.noOrg.title": { defaultMessage: "أنشئ مكتبك" },
  "@legalos.common.noOrg.description": {
    defaultMessage:
      "هذا الحساب غير مرتبط بأي مكتب بعد. اختر اسماً للبدء — وستكون مالكه.",
  },
  "@legalos.common.noOrg.firmNameLabel": { defaultMessage: "اسم المكتب" },
  "@legalos.common.noOrg.firmNamePlaceholder": { defaultMessage: "السيد وشركاه" },
  "@legalos.common.noOrg.creating": { defaultMessage: "جارٍ الإنشاء…" },
  "@legalos.common.noOrg.createFirm": { defaultMessage: "إنشاء المكتب" },
  "@legalos.common.noOrg.seedHint": {
    defaultMessage:
      "لاستخدام المكتب التجريبي المُهيّأ مسبقاً بدلاً من ذلك، شغّل: uv run python scripts/seed_demo_firm.py --reset --owner-clerk-id <معرّف مستخدم Clerk الخاص بك>",
  },
  "@legalos.common.noOrg.createFailed": { defaultMessage: "تعذّر إنشاء المكتب." },
};
