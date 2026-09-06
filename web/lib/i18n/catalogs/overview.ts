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
  "@legalos.home.emptyCorpus.title": {
    defaultMessage: "No legislation is loaded",
  },
  "@legalos.home.emptyCorpus.description": {
    defaultMessage:
      "The corpus holds no articles, so every question will be refused — not because it falls outside the law, but because there is nothing here to answer it from. Run the ingest to load the statutes.",
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
  "@legalos.dashboard.loading": { defaultMessage: "Loading dashboard data…" },
  "@legalos.dashboard.greeting": { defaultMessage: "Good morning, {name} 👋" },
  "@legalos.dashboard.summary.prefix": { defaultMessage: "You have" },
  "@legalos.dashboard.summary.hearingsCount": {
    defaultMessage: "{count, plural, one {# hearing} other {# hearings}}",
  },
  "@legalos.dashboard.summary.and": { defaultMessage: "today and" },
  "@legalos.dashboard.summary.deadlinesCount": {
    defaultMessage: "{count, plural, one {# memo} other {# memos}}",
  },
  "@legalos.dashboard.summary.suffix": { defaultMessage: "approaching deadline." },
  "@legalos.dashboard.summary.commitmentsCount": {
    defaultMessage: "{count, plural, one {# commitment} other {# commitments}}",
  },
  "@legalos.dashboard.summary.scheduledNext30": {
    defaultMessage: "scheduled in the next 30 days.",
  },
  "@legalos.dashboard.scope.firmWide": { defaultMessage: "Firm-wide" },
  "@legalos.dashboard.scope.myFiles": { defaultMessage: "My files" },
  "@legalos.dashboard.scope.toggleAria": { defaultMessage: "Toggle view between firm-wide and my files" },
  "@legalos.dashboard.exportCsv": { defaultMessage: "Export" },
  "@legalos.dashboard.exporting": { defaultMessage: "Exporting…" },
  "@legalos.dashboard.newMatter": { defaultMessage: "New matter" },
  "@legalos.dashboard.taskUpdateError": {
    defaultMessage: "Could not update task status, please try again.",
  },
  "@legalos.dashboard.currencyEGP": { defaultMessage: "EGP" },
  "@legalos.dashboard.hoursUnit": { defaultMessage: "h" },
  "@legalos.dashboard.kpi.activeMatters": { defaultMessage: "Active Matters" },
  "@legalos.dashboard.kpi.activeMattersDetail": {
    defaultMessage:
      "{count, plural, one {# active client} other {# active clients}}",
  },
  "@legalos.dashboard.kpi.activeClientsCount": {
    defaultMessage: "{count, plural, one {# active client} other {# active clients}}",
  },
  "@legalos.dashboard.kpi.openTasks": { defaultMessage: "Open Tasks" },
  "@legalos.dashboard.kpi.overdueDetail": {
    defaultMessage: "{count, plural, one {# overdue} other {# overdue}}",
  },
  "@legalos.dashboard.kpi.dueThisWeekDetail": {
    defaultMessage: "{count, plural, one {# due this week} other {# due this week}}",
  },
  "@legalos.dashboard.kpi.tasksDetail": {
    defaultMessage: "{overdue} overdue · {dueThisWeek} due this week",
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
  "@legalos.dashboard.kpi.flat": { defaultMessage: "Flat" },
  "@legalos.dashboard.kpi.viewMatters": { defaultMessage: "View matters" },
  "@legalos.dashboard.kpi.viewTasks": { defaultMessage: "View tasks" },
  "@legalos.dashboard.kpi.viewTimeTracking": { defaultMessage: "View time tracking" },
  "@legalos.dashboard.kpi.viewBilling": { defaultMessage: "View billing" },
  "@legalos.dashboard.movement.title": { defaultMessage: "Matter Movement" },
  "@legalos.dashboard.movement.subtitle": { defaultMessage: "Opened vs. Closed · Last 8 months" },
  "@legalos.dashboard.movement.opened": { defaultMessage: "Opened" },
  "@legalos.dashboard.movement.closed": { defaultMessage: "Closed" },
  "@legalos.dashboard.movement.tooltip": {
    defaultMessage: "{label} · {opened} opened · {closed} closed",
  },
  "@legalos.dashboard.byType.title": { defaultMessage: "Matters by Type" },
  "@legalos.dashboard.byType.totalActive": {
    defaultMessage: "Total {count} active matters",
  },
  "@legalos.dashboard.byType.mattersUnit": { defaultMessage: "matters" },
  "@legalos.dashboard.byType.empty": { defaultMessage: "No categorized active matters" },
  "@legalos.dashboard.recentMatters.title": { defaultMessage: "Recent Activity" },
  "@legalos.dashboard.recentMatters.lastUpdated": { defaultMessage: "Updated a minute ago" },
  "@legalos.dashboard.recentMatters.filter": { defaultMessage: "Filter" },
  "@legalos.dashboard.recentMatters.allMatters": { defaultMessage: "All matters" },
  "@legalos.dashboard.recentMatters.colMatterNumber": { defaultMessage: "Matter No." },
  "@legalos.dashboard.recentMatters.colClient": { defaultMessage: "Client" },
  "@legalos.dashboard.recentMatters.colCourt": { defaultMessage: "Court" },
  "@legalos.dashboard.recentMatters.colLawyer": { defaultMessage: "Responsible Lawyer" },
  "@legalos.dashboard.recentMatters.colNextDeadline": { defaultMessage: "Next Deadline" },
  "@legalos.dashboard.recentMatters.colStatus": { defaultMessage: "Status" },
  "@legalos.dashboard.recentMatters.todayPrefix": { defaultMessage: "Today · {label}" },
  "@legalos.dashboard.recentMatters.matterDetails": { defaultMessage: "Matter details" },
  "@legalos.dashboard.recentMatters.emptyTitle": { defaultMessage: "No matters" },
  "@legalos.dashboard.recentMatters.emptyDescription": {
    defaultMessage: "No matters to display in this scope currently",
  },
  "@legalos.dashboard.recentMatters.pagination": {
    defaultMessage: "Showing {start}–{end} of {total} matters",
  },
  "@legalos.dashboard.recentMatters.prevPage": { defaultMessage: "Previous page" },
  "@legalos.dashboard.recentMatters.nextPage": { defaultMessage: "Next page" },
  "@legalos.dashboard.status.active": { defaultMessage: "Active" },
  "@legalos.dashboard.status.closed": { defaultMessage: "Closed" },
  "@legalos.dashboard.status.pending": { defaultMessage: "Pending" },
  "@legalos.dashboard.status.appeal": { defaultMessage: "Under Appeal" },
  "@legalos.dashboard.status.urgent": { defaultMessage: "Urgent" },
  "@legalos.dashboard.next30.heading": { defaultMessage: "Next 30 days" },
  "@legalos.dashboard.next30.calendarLink": { defaultMessage: "Calendar" },
  "@legalos.dashboard.next30.empty.title": { defaultMessage: "Nothing scheduled" },
  "@legalos.dashboard.next30.empty.description": {
    defaultMessage: "No hearings, deadlines or task due dates in the next 30 days.",
  },
  "@legalos.dashboard.upcoming.today": { defaultMessage: "Today" },
  "@legalos.dashboard.upcoming.morning": { defaultMessage: "Morning" },
  "@legalos.dashboard.upcoming.remoteLocation": { defaultMessage: "Remote session · Cairo Center" },
  "@legalos.dashboard.upcoming.defaultCourt": { defaultMessage: "Competent Court" },
  "@legalos.dashboard.myTasks.title": { defaultMessage: "My Tasks Today" },
  "@legalos.dashboard.myTasks.empty": { defaultMessage: "No tasks assigned to you for today" },
  "@legalos.dashboard.myTasks.done": { defaultMessage: "Done" },
  "@legalos.dashboard.myTasks.today": { defaultMessage: "Today" },
  "@legalos.dashboard.myTasks.tomorrow": { defaultMessage: "Tomorrow" },
  "@legalos.dashboard.firmWide": { defaultMessage: "Firm-wide" },
  "@legalos.dashboard.recentActivity.heading": { defaultMessage: "Recent activity" },
  "@legalos.dashboard.recentActivity.mattersLink": { defaultMessage: "Matters" },
  "@legalos.dashboard.recentActivity.empty": {
    defaultMessage: "Nothing has happened yet.",
  },
  "@legalos.dashboard.collections.heading": { defaultMessage: "Collections" },
  "@legalos.dashboard.collections.billingLink": { defaultMessage: "Billing" },
  "@legalos.dashboard.collections.seriesName": { defaultMessage: "Collected" },
  "@legalos.dashboard.collections.collectedFees": { defaultMessage: "Collected Fees" },
  "@legalos.dashboard.collections.overdue": { defaultMessage: "Overdue" },
  "@legalos.dashboard.collections.insightTopRate": {
    defaultMessage: "Highest collection rate this month for {type} ({rate}%).",
  },
  "@legalos.dashboard.collections.insightEmpty": {
    defaultMessage: "Record invoices and collections to track highest fee rates by practice area.",
  },
  "@legalos.dashboard.activity.title": { defaultMessage: "Activity Feed" },
  "@legalos.dashboard.activity.empty": { defaultMessage: "No recent activity recorded" },
  "@legalos.dashboard.patterns.remote": { defaultMessage: "remote|virtual|arbitration" },
  "@legalos.dashboard.patterns.upload": { defaultMessage: "upload|document|file" },
  "@legalos.dashboard.patterns.schedule": { defaultMessage: "postpone|adjourn|hearing|schedule" },
  "@legalos.dashboard.patterns.payment": { defaultMessage: "invoice|fee|collect|payment" },
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
  "@legalos.home.emptyCorpus.title": {
    defaultMessage: "لا توجد تشريعات محمَّلة",
  },
  "@legalos.home.emptyCorpus.description": {
    defaultMessage:
      "قاعدة البيانات لا تحتوي على أي مادة، ولذلك سيُرفض كل سؤال — لا لأنه خارج نطاق القانون، بل لأنه لا يوجد نص هنا يُجاب منه. شغّل عملية الإدخال لتحميل التشريعات.",
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
  "@legalos.dashboard.loading": { defaultMessage: "جارٍ تحميل بيانات لوحة السجل…" },
  "@legalos.dashboard.greeting": { defaultMessage: "صباح الخير، {name} 👋" },
  "@legalos.dashboard.summary.prefix": { defaultMessage: "عندك" },
  "@legalos.dashboard.summary.hearingsCount": {
    defaultMessage: "{count, plural, one {جلسة واحدة} two {جلستان} few {# جلسات} other {# جلسة}}",
  },
  "@legalos.dashboard.summary.and": { defaultMessage: "اليوم و" },
  "@legalos.dashboard.summary.deadlinesCount": {
    defaultMessage: "{count, plural, one {مذكرة واحدة} two {مذكرتان} few {# مذكرات} other {# مذكرة}}",
  },
  "@legalos.dashboard.summary.suffix": { defaultMessage: "على وشك انتهاء الميعاد." },
  "@legalos.dashboard.summary.commitmentsCount": {
    defaultMessage: "{count, plural, one {التزام واحد} two {التزامان} few {# التزامات} other {# التزام}}",
  },
  "@legalos.dashboard.summary.scheduledNext30": {
    defaultMessage: "مجدولة خلال الـ 30 يومًا القادمة.",
  },
  "@legalos.dashboard.scope.firmWide": { defaultMessage: "على مستوى المكتب" },
  "@legalos.dashboard.scope.myFiles": { defaultMessage: "ملفاتي" },
  "@legalos.dashboard.scope.toggleAria": { defaultMessage: "تبديل العرض بين على مستوى المكتب وملفاتي" },
  "@legalos.dashboard.exportCsv": { defaultMessage: "تصدير" },
  "@legalos.dashboard.exporting": { defaultMessage: "جارٍ التصدير…" },
  "@legalos.dashboard.newMatter": { defaultMessage: "قضية جديدة" },
  "@legalos.dashboard.taskUpdateError": {
    defaultMessage: "تعذر تحديث حالة المهمة، يرجى المحاولة ثانية.",
  },
  "@legalos.dashboard.currencyEGP": { defaultMessage: "ج.م" },
  "@legalos.dashboard.hoursUnit": { defaultMessage: "ساعة" },
  "@legalos.dashboard.kpi.activeMatters": { defaultMessage: "القضايا النشطة" },
  "@legalos.dashboard.kpi.activeMattersDetail": {
    defaultMessage: "{count, plural, one {موكّل نشط واحد} two {موكّلان نشطان} few {# موكّلين نشطون} other {# موكّل نشط}}",
  },
  "@legalos.dashboard.kpi.activeClientsCount": {
    defaultMessage: "{count, plural, one {موكّل نشط واحد} two {موكّلان نشطان} few {# موكّلين نشطون} other {# موكّل نشط}}",
  },
  "@legalos.dashboard.kpi.openTasks": { defaultMessage: "المهام المفتوحة" },
  "@legalos.dashboard.kpi.overdueDetail": {
    defaultMessage: "{count, plural, one {مهمة واحدة متأخرة} two {مهمتان متأخرتان} few {# مهام متأخرة} other {# مهمة متأخرة}}",
  },
  "@legalos.dashboard.kpi.dueThisWeekDetail": {
    defaultMessage: "{count, plural, one {مهمة واحدة مستحقة هذا الأسبوع} two {مهمتان مستحقتان هذا الأسبوع} few {# مهام مستحقة هذا الأسبوع} other {# مهمة مستحقة هذا الأسبوع}}",
  },
  "@legalos.dashboard.kpi.tasksDetail": {
    defaultMessage: "{overdue} متأخرة · {dueThisWeek} مستحقة هذا الأسبوع",
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
  "@legalos.dashboard.kpi.flat": { defaultMessage: "ثابت" },
  "@legalos.dashboard.kpi.viewMatters": { defaultMessage: "عرض القضايا" },
  "@legalos.dashboard.kpi.viewTasks": { defaultMessage: "عرض المهام" },
  "@legalos.dashboard.kpi.viewTimeTracking": { defaultMessage: "عرض تتبع الوقت" },
  "@legalos.dashboard.kpi.viewBilling": { defaultMessage: "عرض الفوترة" },
  "@legalos.dashboard.movement.title": { defaultMessage: "حركة القضايا خلال الأشهر" },
  "@legalos.dashboard.movement.subtitle": { defaultMessage: "المقيدة مقابل المنتهية · آخر 8 أشهر" },
  "@legalos.dashboard.movement.opened": { defaultMessage: "مقيدة" },
  "@legalos.dashboard.movement.closed": { defaultMessage: "منتهية" },
  "@legalos.dashboard.movement.tooltip": {
    defaultMessage: "{label} · {opened} مقيدة · {closed} منتهية",
  },
  "@legalos.dashboard.byType.title": { defaultMessage: "توزيع القضايا حسب النوع" },
  "@legalos.dashboard.byType.totalActive": {
    defaultMessage: "إجمالي {count} قضية نشطة",
  },
  "@legalos.dashboard.byType.mattersUnit": { defaultMessage: "قضية" },
  "@legalos.dashboard.byType.empty": { defaultMessage: "لا توجد قضايا نشطة مصنفة" },
  "@legalos.dashboard.recentMatters.title": { defaultMessage: "النشاط الأخير" },
  "@legalos.dashboard.recentMatters.lastUpdated": { defaultMessage: "آخر تحديث قبل دقيقة" },
  "@legalos.dashboard.recentMatters.filter": { defaultMessage: "تصفية" },
  "@legalos.dashboard.recentMatters.allMatters": { defaultMessage: "كل القضايا" },
  "@legalos.dashboard.recentMatters.colMatterNumber": { defaultMessage: "رقم القضية" },
  "@legalos.dashboard.recentMatters.colClient": { defaultMessage: "الموكّل" },
  "@legalos.dashboard.recentMatters.colCourt": { defaultMessage: "المحكمة" },
  "@legalos.dashboard.recentMatters.colLawyer": { defaultMessage: "المحامي المسؤول" },
  "@legalos.dashboard.recentMatters.colNextDeadline": { defaultMessage: "الجلسة القادمة" },
  "@legalos.dashboard.recentMatters.colStatus": { defaultMessage: "الحالة" },
  "@legalos.dashboard.recentMatters.todayPrefix": { defaultMessage: "اليوم · {label}" },
  "@legalos.dashboard.recentMatters.matterDetails": { defaultMessage: "تفاصيل القضية" },
  "@legalos.dashboard.recentMatters.emptyTitle": { defaultMessage: "لا توجد قضايا" },
  "@legalos.dashboard.recentMatters.emptyDescription": {
    defaultMessage: "لا توجد قضايا لعرضها في هذا النطاق حالياً",
  },
  "@legalos.dashboard.recentMatters.pagination": {
    defaultMessage: "عرض {start}–{end} من {total} قضية",
  },
  "@legalos.dashboard.recentMatters.prevPage": { defaultMessage: "الصفحة السابقة" },
  "@legalos.dashboard.recentMatters.nextPage": { defaultMessage: "الصفحة التالية" },
  "@legalos.dashboard.status.active": { defaultMessage: "نشطة" },
  "@legalos.dashboard.status.closed": { defaultMessage: "مغلقة" },
  "@legalos.dashboard.status.pending": { defaultMessage: "مؤجلة" },
  "@legalos.dashboard.status.appeal": { defaultMessage: "قيد الاستئناف" },
  "@legalos.dashboard.status.urgent": { defaultMessage: "عاجلة" },
  "@legalos.dashboard.next30.heading": { defaultMessage: "الثلاثون يوماً القادمة" },
  "@legalos.dashboard.next30.calendarLink": { defaultMessage: "التقويم" },
  "@legalos.dashboard.next30.empty.title": { defaultMessage: "لا توجد مواعيد مجدولة" },
  "@legalos.dashboard.next30.empty.description": {
    defaultMessage: "لا توجد جلسات أو مواعيد أو استحقاقات مهام خلال الثلاثين يوماً القادمة.",
  },
  "@legalos.dashboard.upcoming.today": { defaultMessage: "اليوم" },
  "@legalos.dashboard.upcoming.morning": { defaultMessage: "صباحًا" },
  "@legalos.dashboard.upcoming.remoteLocation": { defaultMessage: "جلسة عن بُعد · مركز القاهرة" },
  "@legalos.dashboard.upcoming.defaultCourt": { defaultMessage: "المحكمة المختصة" },
  "@legalos.dashboard.myTasks.title": { defaultMessage: "مهامي اليوم" },
  "@legalos.dashboard.myTasks.empty": { defaultMessage: "لا توجد مهام مسندة إليك لليوم" },
  "@legalos.dashboard.myTasks.done": { defaultMessage: "تم" },
  "@legalos.dashboard.myTasks.today": { defaultMessage: "اليوم" },
  "@legalos.dashboard.myTasks.tomorrow": { defaultMessage: "غدًا" },
  "@legalos.dashboard.firmWide": { defaultMessage: "على مستوى المكتب" },
  "@legalos.dashboard.recentActivity.heading": { defaultMessage: "النشاط الأخير" },
  "@legalos.dashboard.recentActivity.mattersLink": { defaultMessage: "القضايا" },
  "@legalos.dashboard.recentActivity.empty": { defaultMessage: "لم يحدث أي نشاط بعد." },
  "@legalos.dashboard.collections.heading": { defaultMessage: "التحصيلات" },
  "@legalos.dashboard.collections.billingLink": { defaultMessage: "الفوترة" },
  "@legalos.dashboard.collections.seriesName": { defaultMessage: "المُحصَّل" },
  "@legalos.dashboard.collections.collectedFees": { defaultMessage: "أتعاب محصّلة" },
  "@legalos.dashboard.collections.overdue": { defaultMessage: "متأخرات" },
  "@legalos.dashboard.collections.insightTopRate": {
    defaultMessage: "أعلى نسبة تحصيل هذا الشهر لملفات {type} ({rate}%).",
  },
  "@legalos.dashboard.collections.insightEmpty": {
    defaultMessage: "سجل الفواتير والتحصيلات لمتابعة أعلى نسب الأتعاب حسب التخصص.",
  },
  "@legalos.dashboard.activity.title": { defaultMessage: "سجل النشاط" },
  "@legalos.dashboard.activity.empty": { defaultMessage: "لا يوجد نشاط مسجل مؤخرًا" },
  "@legalos.dashboard.patterns.remote": { defaultMessage: "remote|virtual|arbitration|عن بُعد|تحكيم|مرئي" },
  "@legalos.dashboard.patterns.upload": { defaultMessage: "upload|document|file|أُرفقت|مستند|ملف" },
  "@legalos.dashboard.patterns.schedule": { defaultMessage: "postpone|adjourn|hearing|schedule|تأجيل|جلسة|ميعاد" },
  "@legalos.dashboard.patterns.payment": { defaultMessage: "invoice|fee|collect|payment|تحصيل|فاتورة|أتعاب" },
};
