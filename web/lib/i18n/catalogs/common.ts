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

  // ---------------------------------------------------------------------
  // components/GroundedAnswer.tsx — every surface that renders /api/ask
  // ---------------------------------------------------------------------
  "@legalos.groundedAnswer.degradedTitle": {
    defaultMessage: "Reduced retrieval quality",
  },
  "@legalos.groundedAnswer.degradedDescription": {
    defaultMessage: "Falling back to keyword search: {reasons}.",
  },
  "@legalos.groundedAnswer.blockedTitle": {
    defaultMessage: "Answer blocked — unverifiable citations",
  },
  "@legalos.groundedAnswer.blockedDescription": {
    defaultMessage:
      "The model cited articles that were not retrieved from the corpus, so they cannot be verified: {citations}.",
  },
  "@legalos.groundedAnswer.refusedTitle": { defaultMessage: "Not found in the corpus" },
  "@legalos.groundedAnswer.refusedDescription": {
    defaultMessage:
      "No ingested article answers this. Rather than reason from general legal knowledge, the system refuses.",
  },
  "@legalos.groundedAnswer.sources": {
    defaultMessage:
      "Sources — {count, plural, one {# article} other {# articles}} via {strategy}",
  },
  "@legalos.groundedAnswer.citedLabel": { defaultMessage: "Cited:" },

  "@legalos.ask.error.creditsTitle": { defaultMessage: "Model provider out of credits" },
  "@legalos.ask.error.genericTitle": { defaultMessage: "Could not answer" },
  "@legalos.ask.searching": { defaultMessage: "Searching the corpus…" },

  // Jurisdiction and corpus coverage — shared by every AI surface.
  "@legalos.jurisdiction.label": { defaultMessage: "Jurisdiction" },
  "@legalos.jurisdiction.EG": { defaultMessage: "Egypt" },
  "@legalos.jurisdiction.SA": { defaultMessage: "Saudi Arabia" },
  "@legalos.jurisdiction.SAUnavailable": {
    defaultMessage: "Saudi Arabia — not ingested yet",
  },
  "@legalos.corpus.counts": {
    defaultMessage:
      "{instruments, number} instruments · {articles, number} articles",
  },
  "@legalos.corpus.notIngested": { defaultMessage: "Not ingested yet" },
  "@legalos.corpus.unavailableTitle": { defaultMessage: "Corpus unavailable" },
  "@legalos.corpus.unavailableDescription": {
    defaultMessage: "Could not reach the API, so corpus coverage is unknown.",
  },
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

  // ---------------------------------------------------------------------
  // components/GroundedAnswer.tsx — every surface that renders /api/ask
  // ---------------------------------------------------------------------
  "@legalos.groundedAnswer.degradedTitle": { defaultMessage: "جودة الاسترجاع منخفضة" },
  "@legalos.groundedAnswer.degradedDescription": {
    defaultMessage: "تم الرجوع إلى البحث بالكلمات المفتاحية: {reasons}.",
  },
  "@legalos.groundedAnswer.blockedTitle": {
    defaultMessage: "حُجبت الإجابة — استشهادات غير قابلة للتحقق",
  },
  "@legalos.groundedAnswer.blockedDescription": {
    defaultMessage:
      "استشهد النموذج بمواد لم تُسترجَع من قاعدة البيانات، ولذلك يتعذّر التحقق منها: {citations}.",
  },
  "@legalos.groundedAnswer.refusedTitle": { defaultMessage: "غير موجود في قاعدة البيانات" },
  "@legalos.groundedAnswer.refusedDescription": {
    defaultMessage:
      "لا توجد مادة مفهرسة تجيب عن هذا السؤال. وبدلاً من الاستنتاج من المعرفة القانونية العامة، يمتنع النظام عن الإجابة.",
  },
  "@legalos.groundedAnswer.sources": {
    defaultMessage:
      "المصادر — {count, plural, one {مادة واحدة} two {مادتان} few {# مواد} other {# مادة}} عبر {strategy}",
  },
  "@legalos.groundedAnswer.citedLabel": { defaultMessage: "الاستشهادات:" },

  "@legalos.ask.error.creditsTitle": { defaultMessage: "رصيد مزوّد النموذج نفد" },
  "@legalos.ask.error.genericTitle": { defaultMessage: "تعذّر تقديم إجابة" },
  "@legalos.ask.searching": { defaultMessage: "جارٍ البحث في قاعدة البيانات…" },

  // الولاية القضائية وتغطية قاعدة البيانات — مشتركة بين كل شاشات الذكاء الاصطناعي.
  "@legalos.jurisdiction.label": { defaultMessage: "الولاية القضائية" },
  "@legalos.jurisdiction.EG": { defaultMessage: "مصر" },
  "@legalos.jurisdiction.SA": { defaultMessage: "السعودية" },
  "@legalos.jurisdiction.SAUnavailable": {
    defaultMessage: "السعودية — لم تُفهرس بعد",
  },
  "@legalos.corpus.counts": {
    defaultMessage: "{instruments, number} وثيقة تشريعية · {articles, number} مادة",
  },
  "@legalos.corpus.notIngested": { defaultMessage: "لم تُفهرس بعد" },
  "@legalos.corpus.unavailableTitle": { defaultMessage: "قاعدة البيانات غير متاحة" },
  "@legalos.corpus.unavailableDescription": {
    defaultMessage: "تعذّر الوصول إلى الواجهة البرمجية، لذا فإن تغطية قاعدة البيانات غير معروفة.",
  },
};
