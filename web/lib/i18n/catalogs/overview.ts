import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  // ---------------------------------------------------------------------
  // app/page.tsx — chat / landing
  // ---------------------------------------------------------------------
  "@legalos.home.suggestion.article80": {
    defaultMessage: "ماذا تنص المادة 80 من قانون العمل رقم 12 لسنة 2003؟",
  },
  "@legalos.home.suggestion.annualLeave": {
    defaultMessage: "كم يومًا تكون مدة الإجازة السنوية للعامل؟",
  },
  "@legalos.home.suggestion.singlePersonCompanies": {
    defaultMessage: "Does Egypt's Companies Law recognise single-person companies?",
  },
  "@legalos.home.empty.title": { defaultMessage: "Ask about Egyptian law" },
  "@legalos.home.empty.description": {
    defaultMessage:
      "Answers are composed only from statute articles retrieved from the corpus. Every citation is verified before the answer is shown, and questions the corpus cannot support are refused rather than guessed.",
  },
  "@legalos.home.composer.placeholder": {
    defaultMessage: "Ask about the law in Arabic or English…",
  },
  // Answer rendering (spinner, errors, citations) is shared with the AI
  // Assistant and Legal Research — see @legalos.groundedAnswer.* and
  // @legalos.ask.* in catalogs/common.ts.

  // ---------------------------------------------------------------------
  // app/search/page.tsx
  // ---------------------------------------------------------------------
  "@legalos.search.heading": { defaultMessage: "Search" },
  "@legalos.search.subheading": {
    defaultMessage:
      "Ranked articles with their retrieval scores, and no composed answer. Useful for seeing exactly what the retrieval layer returns.",
  },
  "@legalos.search.input.label": { defaultMessage: "Search the corpus" },
  "@legalos.search.input.placeholder": {
    defaultMessage: "e.g. مدة الإجازة السنوية — or: annual leave entitlement",
  },
  "@legalos.search.expand.label": {
    defaultMessage: "Expand query into Arabic legal terms",
  },
  "@legalos.search.submit": { defaultMessage: "Search" },
  "@legalos.search.helper": {
    defaultMessage:
      "The corpus is entirely Arabic. Expansion translates an English query into the statutory vocabulary before searching — without it, English queries match nothing. It costs one model call.",
  },
  "@legalos.search.error.title": { defaultMessage: "Search failed" },
  "@legalos.search.degraded.title": { defaultMessage: "Keyword-only results" },
  "@legalos.search.degraded.description": {
    defaultMessage: "Query expansion was unavailable: {reasons}.",
  },
  "@legalos.search.lawIdentified": { defaultMessage: "Law identified:" },
  "@legalos.search.searchedFor": { defaultMessage: "Searched for:" },
  "@legalos.search.spinner": { defaultMessage: "Searching…" },
  "@legalos.search.empty.title": { defaultMessage: "No matching articles" },
  "@legalos.search.empty.description": {
    defaultMessage: "Nothing in the corpus matched. Try Arabic legal terms, or turn expansion on.",
  },

  // ---------------------------------------------------------------------
  // app/library/page.tsx + app/library/[id]/page.tsx
  // ---------------------------------------------------------------------
  "@legalos.library.heading": { defaultMessage: "Legal library" },
  "@legalos.library.summary": {
    defaultMessage: "{count} instruments · {articles} articles in force",
  },
  "@legalos.library.loadingCorpus": { defaultMessage: "Loading the corpus…" },
  "@legalos.library.filter.label": { defaultMessage: "Filter laws" },
  "@legalos.library.filter.placeholder": {
    defaultMessage: "Filter by title or number, e.g. 12/2003",
  },
  "@legalos.library.error.title": { defaultMessage: "Could not load the library" },
  "@legalos.library.spinner": { defaultMessage: "Loading…" },
  "@legalos.library.empty.title": { defaultMessage: "No matching law" },
  "@legalos.library.empty.description": {
    defaultMessage: 'Nothing matches "{filter}".',
  },
  "@legalos.library.articleCount": {
    defaultMessage: "{count, plural, one {# article} other {# articles}}",
  },
  "@legalos.library.backLink": { defaultMessage: "Library" },
  "@legalos.library.instrument.error.title": {
    defaultMessage: "Could not load this law",
  },
  "@legalos.library.instrument.meta": {
    defaultMessage: "{total} articles in force · showing {from}–{to}",
  },
  "@legalos.library.instrument.loadingArticles": {
    defaultMessage: "Loading articles…",
  },
  "@legalos.library.previous": { defaultMessage: "Previous" },
  "@legalos.library.next": { defaultMessage: "Next" },

  // ---------------------------------------------------------------------
  // app/article/[id]/page.tsx
  // ---------------------------------------------------------------------
  "@legalos.article.error.title": { defaultMessage: "Could not load this article" },
  "@legalos.article.loading": { defaultMessage: "Loading article…" },
  "@legalos.article.heading": { defaultMessage: "Article {number}" },
  "@legalos.article.plainLanguage.heading": { defaultMessage: "Plain language" },
  "@legalos.article.explanationLanguage.ariaLabel": {
    defaultMessage: "Explanation language",
  },
  "@legalos.article.explain.regenerate": { defaultMessage: "Regenerate" },
  "@legalos.article.explain.cta": { defaultMessage: "Explain this article" },
  "@legalos.article.explain.creditsTitle": {
    defaultMessage: "Model provider out of credits",
  },
  "@legalos.article.explain.errorTitle": {
    defaultMessage: "Could not explain this article",
  },
  "@legalos.article.explain.footerNote": {
    defaultMessage:
      "Generated from the text of this article alone. Research assistance, not legal advice.",
  },
  "@legalos.article.explain.helper": {
    defaultMessage:
      "Turns this article's legal language into a plain explanation, using only the text above.",
  },
  "@legalos.article.previousArticle": { defaultMessage: "Previous article" },
  "@legalos.article.nextArticle": { defaultMessage: "Next article" },

  // ArticleCard — the citation block reused by chat sources, search results
  // and the library listing.
  "@legalos.article.card.showFull": { defaultMessage: "Show full article" },
  "@legalos.article.card.showLess": { defaultMessage: "Show less" },
  "@legalos.article.card.open": { defaultMessage: "Open article →" },

  // ---------------------------------------------------------------------
  // app/dashboard/page.tsx
  // ---------------------------------------------------------------------
  "@legalos.dashboard.heading": { defaultMessage: "Dashboard" },
  "@legalos.dashboard.orgFallback": { defaultMessage: "Your firm" },
  "@legalos.dashboard.loading": { defaultMessage: "Loading your firm…" },
  "@legalos.dashboard.kpi.activeMatters": { defaultMessage: "Active Matters" },
  "@legalos.dashboard.kpi.activeMattersDetail": {
    defaultMessage:
      "{count, plural, one {# active client} other {# active clients}}",
  },
  "@legalos.dashboard.kpi.openTasks": { defaultMessage: "Open Tasks" },
  "@legalos.dashboard.kpi.overdueDetail": {
    defaultMessage: "{count, plural, one {# overdue} other {# overdue}}",
  },
  "@legalos.dashboard.kpi.noneOverdue": { defaultMessage: "None overdue" },
  "@legalos.dashboard.kpi.unbilledTime": { defaultMessage: "Unbilled Time" },
  "@legalos.dashboard.kpi.hoursLoggedDetail": {
    defaultMessage: "{hours}h logged this month",
  },
  "@legalos.dashboard.kpi.outstanding": { defaultMessage: "Outstanding" },
  "@legalos.dashboard.kpi.outstandingDetail": {
    defaultMessage: "Sent and overdue invoices",
  },
  "@legalos.dashboard.next30.heading": { defaultMessage: "Next 30 days" },
  "@legalos.dashboard.next30.calendarLink": { defaultMessage: "Calendar" },
  "@legalos.dashboard.next30.empty.title": { defaultMessage: "Nothing scheduled" },
  "@legalos.dashboard.next30.empty.description": {
    defaultMessage: "No hearings, deadlines or task due dates in the next 30 days.",
  },
  "@legalos.dashboard.firmWide": { defaultMessage: "Firm-wide" },
  "@legalos.dashboard.recentActivity.heading": { defaultMessage: "Recent activity" },
  "@legalos.dashboard.recentActivity.mattersLink": { defaultMessage: "Matters" },
  "@legalos.dashboard.recentActivity.empty": {
    defaultMessage: "Nothing has happened yet.",
  },
  "@legalos.dashboard.collections.heading": { defaultMessage: "Collections" },
  "@legalos.dashboard.collections.billingLink": { defaultMessage: "Billing" },
  "@legalos.dashboard.collections.seriesName": { defaultMessage: "Collected" },
};

export const ar: Catalog = {
  // ---------------------------------------------------------------------
  // app/page.tsx — chat / landing
  // ---------------------------------------------------------------------
  "@legalos.home.suggestion.article80": {
    defaultMessage: "ماذا تنص المادة 80 من قانون العمل رقم 12 لسنة 2003؟",
  },
  "@legalos.home.suggestion.annualLeave": {
    defaultMessage: "كم يومًا تكون مدة الإجازة السنوية للعامل؟",
  },
  "@legalos.home.suggestion.singlePersonCompanies": {
    defaultMessage: "هل يعترف قانون الشركات المصري بالشركة ذات الشخص الواحد؟",
  },
  "@legalos.home.empty.title": { defaultMessage: "اسأل عن القانون المصري" },
  "@legalos.home.empty.description": {
    defaultMessage:
      "تُصاغ الإجابات حصراً من نصوص المواد القانونية المسترجعة من قاعدة البيانات. يتم التحقق من كل استشهاد قبل عرض الإجابة، وتُرفض الأسئلة التي لا تدعمها قاعدة البيانات بدلاً من التخمين.",
  },
  "@legalos.home.composer.placeholder": {
    defaultMessage: "اطرح سؤالك القانوني بالعربية أو الإنجليزية…",
  },
  // عرض الإجابة (المؤشر، الأخطاء، الاستشهادات) مشترك مع المساعد الذكي
  // والبحث القانوني — راجع @legalos.groundedAnswer.* و@legalos.ask.*
  // في catalogs/common.ts.

  // ---------------------------------------------------------------------
  // app/search/page.tsx
  // ---------------------------------------------------------------------
  "@legalos.search.heading": { defaultMessage: "البحث" },
  "@legalos.search.subheading": {
    defaultMessage:
      "مواد مرتّبة حسب درجة تطابقها مع البحث، دون إجابة مُركّبة. مفيدة لمعاينة ما تُعيده طبقة الاسترجاع بدقة.",
  },
  "@legalos.search.input.label": { defaultMessage: "البحث في قاعدة البيانات" },
  "@legalos.search.input.placeholder": {
    defaultMessage: "مثال: مدة الإجازة السنوية — أو: annual leave entitlement",
  },
  "@legalos.search.expand.label": {
    defaultMessage: "توسيع الاستعلام إلى مصطلحات قانونية عربية",
  },
  "@legalos.search.submit": { defaultMessage: "بحث" },
  "@legalos.search.helper": {
    defaultMessage:
      "قاعدة البيانات بالكامل باللغة العربية. يقوم التوسيع بترجمة الاستعلام الإنجليزي إلى المصطلحات القانونية قبل البحث — وبدونه لا تُطابق الاستعلامات الإنجليزية أي نتيجة. يستهلك هذا استدعاءً واحداً للنموذج.",
  },
  "@legalos.search.error.title": { defaultMessage: "فشل البحث" },
  "@legalos.search.degraded.title": { defaultMessage: "نتائج بالكلمات المفتاحية فقط" },
  "@legalos.search.degraded.description": {
    defaultMessage: "تعذّر توسيع الاستعلام: {reasons}.",
  },
  "@legalos.search.lawIdentified": { defaultMessage: "القانون المحدَّد:" },
  "@legalos.search.searchedFor": { defaultMessage: "تم البحث عن:" },
  "@legalos.search.spinner": { defaultMessage: "جارٍ البحث…" },
  "@legalos.search.empty.title": { defaultMessage: "لا توجد مواد مطابقة" },
  "@legalos.search.empty.description": {
    defaultMessage: "لم يتم العثور على تطابق في قاعدة البيانات. جرّب مصطلحات قانونية عربية، أو فعّل خاصية التوسيع.",
  },

  // ---------------------------------------------------------------------
  // app/library/page.tsx + app/library/[id]/page.tsx
  // ---------------------------------------------------------------------
  "@legalos.library.heading": { defaultMessage: "المكتبة القانونية" },
  "@legalos.library.summary": {
    defaultMessage: "{count} تشريعاً · {articles} مادة سارية",
  },
  "@legalos.library.loadingCorpus": { defaultMessage: "جارٍ تحميل قاعدة البيانات…" },
  "@legalos.library.filter.label": { defaultMessage: "تصفية القوانين" },
  "@legalos.library.filter.placeholder": {
    defaultMessage: "تصفية حسب العنوان أو الرقم، مثال: 12/2003",
  },
  "@legalos.library.error.title": { defaultMessage: "تعذّر تحميل المكتبة" },
  "@legalos.library.spinner": { defaultMessage: "جارٍ التحميل…" },
  "@legalos.library.empty.title": { defaultMessage: "لا يوجد قانون مطابق" },
  "@legalos.library.empty.description": {
    defaultMessage: 'لا توجد نتائج مطابقة لـ"{filter}".',
  },
  "@legalos.library.articleCount": {
    defaultMessage: "{count, plural, one {مادة واحدة} two {مادتان} few {# مواد} other {# مادة}}",
  },
  "@legalos.library.backLink": { defaultMessage: "المكتبة" },
  "@legalos.library.instrument.error.title": {
    defaultMessage: "تعذّر تحميل هذا القانون",
  },
  "@legalos.library.instrument.meta": {
    defaultMessage: "{total} مادة سارية · عرض {from}–{to}",
  },
  "@legalos.library.instrument.loadingArticles": {
    defaultMessage: "جارٍ تحميل المواد…",
  },
  "@legalos.library.previous": { defaultMessage: "السابق" },
  "@legalos.library.next": { defaultMessage: "التالي" },

  // ---------------------------------------------------------------------
  // app/article/[id]/page.tsx
  // ---------------------------------------------------------------------
  "@legalos.article.error.title": { defaultMessage: "تعذّر تحميل هذه المادة" },
  "@legalos.article.loading": { defaultMessage: "جارٍ تحميل المادة…" },
  "@legalos.article.heading": { defaultMessage: "المادة {number}" },
  "@legalos.article.plainLanguage.heading": { defaultMessage: "بلغة مبسطة" },
  "@legalos.article.explanationLanguage.ariaLabel": { defaultMessage: "لغة الشرح" },
  "@legalos.article.explain.regenerate": { defaultMessage: "إعادة الإنشاء" },
  "@legalos.article.explain.cta": { defaultMessage: "اشرح هذه المادة" },
  "@legalos.article.explain.creditsTitle": { defaultMessage: "رصيد مزوّد النموذج نفد" },
  "@legalos.article.explain.errorTitle": { defaultMessage: "تعذّر شرح هذه المادة" },
  "@legalos.article.explain.footerNote": {
    defaultMessage: "تم إنشاؤه استناداً إلى نص هذه المادة فقط. مساعدة بحثية، وليست استشارة قانونية.",
  },
  "@legalos.article.explain.helper": {
    defaultMessage: "يحوّل الصياغة القانونية لهذه المادة إلى شرح مبسّط، بالاعتماد فقط على النص أعلاه.",
  },
  "@legalos.article.previousArticle": { defaultMessage: "المادة السابقة" },
  "@legalos.article.nextArticle": { defaultMessage: "المادة التالية" },

  "@legalos.article.card.showFull": { defaultMessage: "عرض المادة كاملة" },
  "@legalos.article.card.showLess": { defaultMessage: "عرض أقل" },
  "@legalos.article.card.open": { defaultMessage: "فتح المادة ←" },

  // ---------------------------------------------------------------------
  // app/dashboard/page.tsx
  // ---------------------------------------------------------------------
  "@legalos.dashboard.heading": { defaultMessage: "لوحة التحكم" },
  "@legalos.dashboard.orgFallback": { defaultMessage: "مكتبك" },
  "@legalos.dashboard.loading": { defaultMessage: "جارٍ تحميل بيانات المكتب…" },
  "@legalos.dashboard.kpi.activeMatters": { defaultMessage: "الملفات النشطة" },
  "@legalos.dashboard.kpi.activeMattersDetail": {
    defaultMessage: "{count, plural, one {عميل نشط واحد} two {عميلان نشطان} few {# عملاء نشطون} other {# عميل نشط}}",
  },
  "@legalos.dashboard.kpi.openTasks": { defaultMessage: "المهام المفتوحة" },
  "@legalos.dashboard.kpi.overdueDetail": {
    defaultMessage: "{count, plural, one {مهمة واحدة متأخرة} two {مهمتان متأخرتان} few {# مهام متأخرة} other {# مهمة متأخرة}}",
  },
  "@legalos.dashboard.kpi.noneOverdue": { defaultMessage: "لا توجد مهام متأخرة" },
  "@legalos.dashboard.kpi.unbilledTime": { defaultMessage: "الوقت غير المفوتَر" },
  "@legalos.dashboard.kpi.hoursLoggedDetail": {
    defaultMessage: "{hours} ساعة مسجَّلة هذا الشهر",
  },
  "@legalos.dashboard.kpi.outstanding": { defaultMessage: "المستحقات" },
  "@legalos.dashboard.kpi.outstandingDetail": {
    defaultMessage: "فواتير مُرسَلة ومتأخرة",
  },
  "@legalos.dashboard.next30.heading": { defaultMessage: "الثلاثون يوماً القادمة" },
  "@legalos.dashboard.next30.calendarLink": { defaultMessage: "التقويم" },
  "@legalos.dashboard.next30.empty.title": { defaultMessage: "لا توجد مواعيد مجدولة" },
  "@legalos.dashboard.next30.empty.description": {
    defaultMessage: "لا توجد جلسات أو مواعيد نهائية أو استحقاقات مهام خلال الثلاثين يوماً القادمة.",
  },
  "@legalos.dashboard.firmWide": { defaultMessage: "على مستوى المكتب" },
  "@legalos.dashboard.recentActivity.heading": { defaultMessage: "النشاط الأخير" },
  "@legalos.dashboard.recentActivity.mattersLink": { defaultMessage: "الملفات" },
  "@legalos.dashboard.recentActivity.empty": { defaultMessage: "لم يحدث أي نشاط بعد." },
  "@legalos.dashboard.collections.heading": { defaultMessage: "التحصيلات" },
  "@legalos.dashboard.collections.billingLink": { defaultMessage: "الفوترة" },
  "@legalos.dashboard.collections.seriesName": { defaultMessage: "المُحصَّل" },
};
