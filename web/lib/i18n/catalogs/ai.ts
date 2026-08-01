import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  // --- AI Assistant -----------------------------------------------------
  "@legalos.aiAssistant.heading": { defaultMessage: "AI Assistant" },
  "@legalos.aiAssistant.subheading": {
    defaultMessage: "Grounded Q&A over the Egyptian & Saudi statute corpus — ask in Arabic or English.",
  },
  "@legalos.aiAssistant.newChat": { defaultMessage: "New chat" },

  "@legalos.aiAssistant.modes.draft": { defaultMessage: "Draft Contract" },
  "@legalos.aiAssistant.modes.review": { defaultMessage: "Review Contract" },
  "@legalos.aiAssistant.modes.translate": { defaultMessage: "Translate" },
  "@legalos.aiAssistant.modes.summarize": { defaultMessage: "Summarize" },
  "@legalos.aiAssistant.modes.caseAnalysis": { defaultMessage: "Case Analysis" },
  "@legalos.aiAssistant.modes.clauseComparison": { defaultMessage: "Clause Comparison" },
  "@legalos.aiAssistant.modes.timeline": { defaultMessage: "Timeline Extraction" },
  "@legalos.aiAssistant.modes.qa": { defaultMessage: "Question Answering" },

  "@legalos.aiAssistant.recentChats.item1": { defaultMessage: "Termination notice period — labour law" },
  "@legalos.aiAssistant.recentChats.item2": {
    defaultMessage: "Delta Foods NDA — draft confidentiality clause",
  },
  "@legalos.aiAssistant.recentChats.item3": {
    defaultMessage: "Saudi Companies Law — single-shareholder LLC",
  },
  "@legalos.aiAssistant.recentChats.item4": {
    defaultMessage: "Khalil Holdings — contract translation AR→EN",
  },
  "@legalos.aiAssistant.recentChats.item5": { defaultMessage: "El-Sayed Estate — inheritance shares" },

  "@legalos.aiAssistant.time.now": { defaultMessage: "Now" },
  "@legalos.aiAssistant.time.justNow": { defaultMessage: "Just now" },
  "@legalos.aiAssistant.time.yesterday": { defaultMessage: "Yesterday" },
  "@legalos.aiAssistant.time.daysAgo3": { defaultMessage: "3 days ago" },
  "@legalos.aiAssistant.time.weekAgo1": { defaultMessage: "1 week ago" },

  "@legalos.aiAssistant.suggestions.labour": {
    defaultMessage: "What notice period is required to end an indefinite-term employment contract?",
  },
  "@legalos.aiAssistant.suggestions.companies": {
    defaultMessage: "Does Saudi Arabia's Companies Law allow a single-shareholder LLC?",
  },
  "@legalos.aiAssistant.suggestions.draft": {
    defaultMessage: "Draft a standard confidentiality clause for a services agreement.",
  },

  "@legalos.aiAssistant.conceptPreview.title": { defaultMessage: "Concept preview" },
  "@legalos.aiAssistant.conceptPreview.description": {
    defaultMessage:
      "This screen replays curated example answers instead of calling the live corpus API. Try a suggested prompt or a recent chat to see a fully grounded example.",
  },

  "@legalos.aiAssistant.knowledgeSources.heading": { defaultMessage: "Knowledge Sources" },
  "@legalos.aiAssistant.knowledgeSources.description": {
    defaultMessage:
      "Every answer above is composed only from statute articles retrieved from the corpus, cited exactly as retrieved, and verified before being shown.",
  },
  "@legalos.aiAssistant.knowledgeSources.egypt": { defaultMessage: "Egypt" },
  "@legalos.aiAssistant.knowledgeSources.egyptCount": { defaultMessage: "148 instruments" },
  "@legalos.aiAssistant.knowledgeSources.saudi": { defaultMessage: "Saudi Arabia" },
  "@legalos.aiAssistant.knowledgeSources.saudiCount": { defaultMessage: "76 instruments" },
  "@legalos.aiAssistant.knowledgeSources.citedHeading": {
    defaultMessage: "Cited in this conversation",
  },
  "@legalos.aiAssistant.knowledgeSources.footer": {
    defaultMessage:
      "Retrieval: semantic vector search over verified statute text. A question the corpus cannot support is refused, not guessed at.",
  },

  "@legalos.aiAssistant.emptyState.title": { defaultMessage: "Start a new conversation" },
  "@legalos.aiAssistant.emptyState.description": {
    defaultMessage:
      "Answers are composed only from statute articles retrieved from the corpus. Questions the corpus cannot support are refused rather than guessed at.",
  },

  "@legalos.aiAssistant.composer.placeholderDefault": {
    defaultMessage: "Ask about the law in Arabic or English…",
  },
  "@legalos.aiAssistant.composer.placeholderWithMode": { defaultMessage: "Ask in {mode} mode…" },

  "@legalos.aiAssistant.searchingCorpus": { defaultMessage: "Searching the corpus…" },

  // --- Legal Research -----------------------------------------------------
  "@legalos.legalResearch.heading": { defaultMessage: "Legal research" },
  "@legalos.legalResearch.description": {
    defaultMessage:
      "Search Egyptian and Saudi statutes and judgments. Every answer cites the articles it relies on.",
  },
  "@legalos.legalResearch.searchLabel": { defaultMessage: "Search legislation and judgments" },
  "@legalos.legalResearch.searchPlaceholder": {
    defaultMessage: "Ask a question, or search by law number and article…",
  },
  "@legalos.legalResearch.jurisdictionLabel": { defaultMessage: "Jurisdiction" },
  "@legalos.legalResearch.jurisdiction.egypt": { defaultMessage: "Egypt" },
  "@legalos.legalResearch.jurisdiction.saudi": { defaultMessage: "Saudi Arabia" },
  "@legalos.legalResearch.instrumentTypeLabel": { defaultMessage: "Instrument type" },
  "@legalos.legalResearch.instrumentType.all": { defaultMessage: "All instruments" },
  "@legalos.legalResearch.instrumentType.law": { defaultMessage: "Laws" },
  "@legalos.legalResearch.instrumentType.decree": { defaultMessage: "Decrees" },
  "@legalos.legalResearch.instrumentType.regulation": { defaultMessage: "Regulations" },
  "@legalos.legalResearch.resultModeLabel": { defaultMessage: "Result mode" },
  "@legalos.legalResearch.resultMode.answer": { defaultMessage: "AI answer" },
  "@legalos.legalResearch.resultMode.articles": { defaultMessage: "Articles only" },
  "@legalos.legalResearch.refusalToggle.ariaLabel": {
    defaultMessage: "Show a refused query example",
  },
  "@legalos.legalResearch.refusalToggle.showAnswered": { defaultMessage: "Show answered example" },
  "@legalos.legalResearch.refusalToggle.showRefusal": { defaultMessage: "Show refusal example" },

  "@legalos.legalResearch.aiAnswerHeading": { defaultMessage: "AI answer" },
  "@legalos.legalResearch.queryPrefix": { defaultMessage: "Query: “{query}”" },
  "@legalos.legalResearch.refusalNote": {
    defaultMessage:
      "Refusing beats guessing: an invented article number is the failure mode this system is built to prevent.",
  },
  "@legalos.legalResearch.disclaimersFooter": {
    defaultMessage:
      "Research assistance, not legal advice. Verify every citation against the official gazette before relying on it.",
  },

  "@legalos.legalResearch.referencedLegislationHeading": { defaultMessage: "Referenced legislation" },
  "@legalos.legalResearch.referencedDecisionsHeading": {
    defaultMessage: "Referenced court decisions",
  },

  "@legalos.legalResearch.tryQuestionHeading": { defaultMessage: "Try a question" },
  "@legalos.legalResearch.relatedPrecedentsHeading": { defaultMessage: "Related precedents" },
  "@legalos.legalResearch.corpusHeading": { defaultMessage: "Corpus" },
  "@legalos.legalResearch.corpusDescription": {
    defaultMessage:
      "Egypt · 6,985 articles indexed across the Civil Code, Labour Law, and Companies Law. Jurisdiction is a hard filter — an Egypt-scoped query never returns Saudi text.",
  },
  "@legalos.legalResearch.openAiAssistantLink": { defaultMessage: "Open AI Assistant" },

  "@legalos.legalResearch.exampleQueries.q1": {
    defaultMessage: "What is the statutory annual leave entitlement for an employee?",
  },
  "@legalos.legalResearch.exampleQueries.q2": {
    defaultMessage: "What notice period applies to terminating an indefinite employment contract?",
  },
  "@legalos.legalResearch.exampleQueries.q3": {
    defaultMessage: "When may a company issue preferred shares?",
  },

  "@legalos.legalResearch.precedents.item1": {
    defaultMessage: "Delta Foods Labour Dispute — severance calculation",
  },
  "@legalos.legalResearch.precedents.item2": {
    defaultMessage: "Firm template: Termination notice letter (indefinite contract)",
  },

  // --- Contract Review -----------------------------------------------------
  "@legalos.contractReview.severityBadge.high": { defaultMessage: "High risk" },
  "@legalos.contractReview.severityBadge.medium": { defaultMessage: "Medium risk" },
  "@legalos.contractReview.severityBadge.low": { defaultMessage: "Low risk" },

  "@legalos.contractReview.matterTitle": { defaultMessage: "Mutual NDA — Delta Foods" },
  "@legalos.contractReview.reviewCompleteBadge": { defaultMessage: "AI review complete" },
  "@legalos.contractReview.matterLink": { defaultMessage: "Delta Foods NDA Review" },
  "@legalos.contractReview.matterMeta": {
    defaultMessage: "· {count} clauses · reviewed against the firm's standard NDA template",
  },
  "@legalos.contractReview.uploadButton.ariaLabel": { defaultMessage: "Upload a different contract" },
  "@legalos.contractReview.uploadButton.label": { defaultMessage: "Upload" },
  "@legalos.contractReview.exportButton": { defaultMessage: "Export review" },

  "@legalos.contractReview.contractTextHeading": { defaultMessage: "Contract text" },
  "@legalos.contractReview.syntheticSampleNote": {
    defaultMessage: "Synthetic sample — not an executed agreement",
  },

  "@legalos.contractReview.aiReviewHeading": { defaultMessage: "AI review" },
  "@legalos.contractReview.riskScoreLabel": { defaultMessage: "Risk score" },
  "@legalos.contractReview.riskScoreValue": { defaultMessage: "{score} / 100" },
  "@legalos.contractReview.riskScoreAriaLabel": { defaultMessage: "Overall contract risk" },
  "@legalos.contractReview.riskScoreDescription": {
    defaultMessage:
      "Elevated — {highCount} high-risk clauses and {missingCount} missing standard provisions. Comparable NDAs reviewed by this firm score 25–40.",
  },
  "@legalos.contractReview.draftingAidDisclaimer": {
    defaultMessage:
      "A drafting aid, not legal advice. Every flagged clause needs a lawyer's judgement before you rely on it.",
  },

  "@legalos.contractReview.reviewSectionLabel": { defaultMessage: "Review section" },
  "@legalos.contractReview.tab.risks": { defaultMessage: "Risks" },
  "@legalos.contractReview.tab.missing": { defaultMessage: "Missing" },
  "@legalos.contractReview.tab.summary": { defaultMessage: "Summary" },

  "@legalos.contractReview.applySuggestion": { defaultMessage: "Apply suggestion" },
  "@legalos.contractReview.dismissFinding.label": { defaultMessage: "Dismiss finding" },
  "@legalos.contractReview.dismissFinding.children": { defaultMessage: "Dismiss" },

  "@legalos.contractReview.missingClausesHeading": { defaultMessage: "Missing clauses" },
  "@legalos.contractReview.missingClausesDescription": {
    defaultMessage: "Present in the firm's standard NDA template but absent here.",
  },
  "@legalos.contractReview.insertButton": { defaultMessage: "Insert {label}" },
  "@legalos.contractReview.insertButton.label": { defaultMessage: "Insert" },

  "@legalos.contractReview.recommendationsHeading": { defaultMessage: "Recommendations" },
  "@legalos.contractReview.summary.intro": {
    defaultMessage:
      "This NDA is signable once the perpetual term and the uncapped liability clause are addressed. Both deviate from the firm's standard template in ways that favour the disclosing party, and Delta Foods is the receiving party on the majority of expected disclosures under this engagement.",
  },
  "@legalos.contractReview.summary.item1.label": {
    defaultMessage: "Negotiate Clause 3 to a 5-year term",
  },
  "@legalos.contractReview.summary.item1.description": {
    defaultMessage:
      "Highest-value change; the counterparty accepted the same edit on the 2025 supply agreement.",
  },
  "@legalos.contractReview.summary.item2.label": { defaultMessage: "Cap liability in Clause 5" },
  "@legalos.contractReview.summary.item2.description": {
    defaultMessage: "Propose a cap at the value of the underlying engagement.",
  },
  "@legalos.contractReview.summary.item3.label": {
    defaultMessage: "Insert the {count} missing standard clauses",
  },
  "@legalos.contractReview.summary.item3.description": {
    defaultMessage: "Return/destruction, definition carve-outs, notices, and assignment.",
  },
  "@legalos.contractReview.compareTemplateLink": { defaultMessage: "Compare against the firm template" },
};

export const ar: Catalog = {
  // --- AI Assistant -----------------------------------------------------
  "@legalos.aiAssistant.heading": { defaultMessage: "المساعد الذكي" },
  "@legalos.aiAssistant.subheading": {
    defaultMessage: "إجابات قانونية موثّقة من مدوّنة القوانين المصرية والسعودية — اسأل بالعربية أو الإنجليزية.",
  },
  "@legalos.aiAssistant.newChat": { defaultMessage: "محادثة جديدة" },

  "@legalos.aiAssistant.modes.draft": { defaultMessage: "صياغة عقد" },
  "@legalos.aiAssistant.modes.review": { defaultMessage: "مراجعة عقد" },
  "@legalos.aiAssistant.modes.translate": { defaultMessage: "ترجمة" },
  "@legalos.aiAssistant.modes.summarize": { defaultMessage: "تلخيص" },
  "@legalos.aiAssistant.modes.caseAnalysis": { defaultMessage: "تحليل قضية" },
  "@legalos.aiAssistant.modes.clauseComparison": { defaultMessage: "مقارنة البنود" },
  "@legalos.aiAssistant.modes.timeline": { defaultMessage: "استخلاص الجدول الزمني" },
  "@legalos.aiAssistant.modes.qa": { defaultMessage: "الإجابة عن الأسئلة" },

  "@legalos.aiAssistant.recentChats.item1": { defaultMessage: "مهلة الإخطار بإنهاء الخدمة — قانون العمل" },
  "@legalos.aiAssistant.recentChats.item2": {
    defaultMessage: "اتفاقية سرية دلتا فودز — صياغة بند السرية",
  },
  "@legalos.aiAssistant.recentChats.item3": {
    defaultMessage: "نظام الشركات السعودي — شركة ذات شخص واحد",
  },
  "@legalos.aiAssistant.recentChats.item4": {
    defaultMessage: "مجموعة خليل القابضة — ترجمة عقد عربي↔إنجليزي",
  },
  "@legalos.aiAssistant.recentChats.item5": { defaultMessage: "تركة السيد — أنصبة الميراث" },

  "@legalos.aiAssistant.time.now": { defaultMessage: "الآن" },
  "@legalos.aiAssistant.time.justNow": { defaultMessage: "منذ لحظات" },
  "@legalos.aiAssistant.time.yesterday": { defaultMessage: "أمس" },
  "@legalos.aiAssistant.time.daysAgo3": { defaultMessage: "قبل ٣ أيام" },
  "@legalos.aiAssistant.time.weekAgo1": { defaultMessage: "قبل أسبوع" },

  "@legalos.aiAssistant.suggestions.labour": {
    defaultMessage: "ما هي مدة الإخطار الواجب توافرها لإنهاء عقد عمل غير محدد المدة؟",
  },
  "@legalos.aiAssistant.suggestions.companies": {
    defaultMessage: "هل يسمح نظام الشركات السعودي بتأسيس شركة ذات مسؤولية محدودة بشريك واحد؟",
  },
  "@legalos.aiAssistant.suggestions.draft": {
    defaultMessage: "صِغ بندًا قياسيًا للسرية في اتفاقية خدمات.",
  },

  "@legalos.aiAssistant.conceptPreview.title": { defaultMessage: "معاينة مفاهيمية" },
  "@legalos.aiAssistant.conceptPreview.description": {
    defaultMessage:
      "تعرض هذه الشاشة إجابات نموذجية مُعدة مسبقًا بدلًا من استدعاء واجهة قاعدة البيانات الفعلية. جرّب أحد الاقتراحات أو محادثة سابقة لرؤية مثال كامل مدعوم بالمصادر.",
  },

  "@legalos.aiAssistant.knowledgeSources.heading": { defaultMessage: "مصادر المعرفة" },
  "@legalos.aiAssistant.knowledgeSources.description": {
    defaultMessage:
      "كل إجابة أعلاه مُركّبة فقط من مواد قانونية مسترجَعة من قاعدة البيانات، وموثّقة كما وردت، ويتم التحقق منها قبل عرضها.",
  },
  "@legalos.aiAssistant.knowledgeSources.egypt": { defaultMessage: "مصر" },
  "@legalos.aiAssistant.knowledgeSources.egyptCount": { defaultMessage: "١٤٨ وثيقة تشريعية" },
  "@legalos.aiAssistant.knowledgeSources.saudi": { defaultMessage: "السعودية" },
  "@legalos.aiAssistant.knowledgeSources.saudiCount": { defaultMessage: "٧٦ وثيقة تشريعية" },
  "@legalos.aiAssistant.knowledgeSources.citedHeading": {
    defaultMessage: "المصادر المستشهد بها في هذه المحادثة",
  },
  "@legalos.aiAssistant.knowledgeSources.footer": {
    defaultMessage:
      "الاسترجاع: بحث دلالي متجهي عبر نصوص قانونية موثّقة. أي سؤال لا تدعمه قاعدة البيانات يُرفض ولا يُخمَّن.",
  },

  "@legalos.aiAssistant.emptyState.title": { defaultMessage: "ابدأ محادثة جديدة" },
  "@legalos.aiAssistant.emptyState.description": {
    defaultMessage:
      "الإجابات تُركَّب فقط من مواد قانونية مسترجَعة من قاعدة البيانات. الأسئلة التي لا تدعمها قاعدة البيانات تُرفض بدلًا من التخمين.",
  },

  "@legalos.aiAssistant.composer.placeholderDefault": {
    defaultMessage: "اسأل عن القانون بالعربية أو الإنجليزية…",
  },
  "@legalos.aiAssistant.composer.placeholderWithMode": { defaultMessage: "اسأل في وضع {mode}…" },

  "@legalos.aiAssistant.searchingCorpus": { defaultMessage: "جارٍ البحث في قاعدة البيانات…" },

  // --- Legal Research -----------------------------------------------------
  "@legalos.legalResearch.heading": { defaultMessage: "البحث القانوني" },
  "@legalos.legalResearch.description": {
    defaultMessage: "ابحث في القوانين والأحكام القضائية المصرية والسعودية. كل إجابة تستشهد بالمواد التي استندت إليها.",
  },
  "@legalos.legalResearch.searchLabel": { defaultMessage: "البحث في التشريعات والأحكام" },
  "@legalos.legalResearch.searchPlaceholder": {
    defaultMessage: "اطرح سؤالاً، أو ابحث برقم القانون والمادة…",
  },
  "@legalos.legalResearch.jurisdictionLabel": { defaultMessage: "الولاية القضائية" },
  "@legalos.legalResearch.jurisdiction.egypt": { defaultMessage: "مصر" },
  "@legalos.legalResearch.jurisdiction.saudi": { defaultMessage: "السعودية" },
  "@legalos.legalResearch.instrumentTypeLabel": { defaultMessage: "نوع الوثيقة" },
  "@legalos.legalResearch.instrumentType.all": { defaultMessage: "جميع الوثائق" },
  "@legalos.legalResearch.instrumentType.law": { defaultMessage: "القوانين" },
  "@legalos.legalResearch.instrumentType.decree": { defaultMessage: "القرارات" },
  "@legalos.legalResearch.instrumentType.regulation": { defaultMessage: "اللوائح" },
  "@legalos.legalResearch.resultModeLabel": { defaultMessage: "نمط النتائج" },
  "@legalos.legalResearch.resultMode.answer": { defaultMessage: "إجابة الذكاء الاصطناعي" },
  "@legalos.legalResearch.resultMode.articles": { defaultMessage: "المواد فقط" },
  "@legalos.legalResearch.refusalToggle.ariaLabel": {
    defaultMessage: "عرض مثال لسؤال مرفوض",
  },
  "@legalos.legalResearch.refusalToggle.showAnswered": { defaultMessage: "عرض مثال مُجاب عنه" },
  "@legalos.legalResearch.refusalToggle.showRefusal": { defaultMessage: "عرض مثال مرفوض" },

  "@legalos.legalResearch.aiAnswerHeading": { defaultMessage: "إجابة الذكاء الاصطناعي" },
  "@legalos.legalResearch.queryPrefix": { defaultMessage: "السؤال: «{query}»" },
  "@legalos.legalResearch.refusalNote": {
    defaultMessage:
      "الامتناع عن الإجابة أفضل من التخمين: اختلاق رقم مادة هو الخلل الذي صُمم هذا النظام لتفاديه.",
  },
  "@legalos.legalResearch.disclaimersFooter": {
    defaultMessage:
      "مساعدة بحثية، وليست استشارة قانونية. تحقق من كل استشهاد في الجريدة الرسمية قبل الاعتماد عليه.",
  },

  "@legalos.legalResearch.referencedLegislationHeading": { defaultMessage: "التشريعات المرجعية" },
  "@legalos.legalResearch.referencedDecisionsHeading": {
    defaultMessage: "الأحكام القضائية المرجعية",
  },

  "@legalos.legalResearch.tryQuestionHeading": { defaultMessage: "جرّب سؤالاً" },
  "@legalos.legalResearch.relatedPrecedentsHeading": { defaultMessage: "سوابق ذات صلة" },
  "@legalos.legalResearch.corpusHeading": { defaultMessage: "قاعدة البيانات" },
  "@legalos.legalResearch.corpusDescription": {
    defaultMessage:
      "مصر · ٦٬٩٨٥ مادة مفهرسة عبر القانون المدني وقانون العمل وقانون الشركات. الولاية القضائية فلتر صارم — لا يُعيد سؤال مخصص لمصر أي نص سعودي.",
  },
  "@legalos.legalResearch.openAiAssistantLink": { defaultMessage: "فتح المساعد الذكي" },

  "@legalos.legalResearch.exampleQueries.q1": {
    defaultMessage: "ما هي مدة الإجازة السنوية المستحقة للعامل؟",
  },
  "@legalos.legalResearch.exampleQueries.q2": {
    defaultMessage: "ما هي مهلة الإخطار الواجب مراعاتها لإنهاء عقد عمل غير محدد المدة؟",
  },
  "@legalos.legalResearch.exampleQueries.q3": {
    defaultMessage: "متى يجوز للشركة إصدار أسهم ممتازة؟",
  },

  "@legalos.legalResearch.precedents.item1": {
    defaultMessage: "نزاع دلتا فودز العمالي — احتساب مكافأة نهاية الخدمة",
  },
  "@legalos.legalResearch.precedents.item2": {
    defaultMessage: "قالب المكتب: خطاب إخطار بإنهاء الخدمة (عقد غير محدد المدة)",
  },

  // --- Contract Review -----------------------------------------------------
  "@legalos.contractReview.severityBadge.high": { defaultMessage: "مخاطرة عالية" },
  "@legalos.contractReview.severityBadge.medium": { defaultMessage: "مخاطرة متوسطة" },
  "@legalos.contractReview.severityBadge.low": { defaultMessage: "مخاطرة منخفضة" },

  "@legalos.contractReview.matterTitle": { defaultMessage: "اتفاقية سرية متبادلة — دلتا فودز" },
  "@legalos.contractReview.reviewCompleteBadge": { defaultMessage: "اكتملت المراجعة بالذكاء الاصطناعي" },
  "@legalos.contractReview.matterLink": { defaultMessage: "مراجعة اتفاقية سرية دلتا فودز" },
  "@legalos.contractReview.matterMeta": {
    defaultMessage: "· {count} بنود · رُوجعت وفق قالب اتفاقية السرية المعتمد لدى المكتب",
  },
  "@legalos.contractReview.uploadButton.ariaLabel": { defaultMessage: "رفع عقد آخر" },
  "@legalos.contractReview.uploadButton.label": { defaultMessage: "رفع" },
  "@legalos.contractReview.exportButton": { defaultMessage: "تصدير المراجعة" },

  "@legalos.contractReview.contractTextHeading": { defaultMessage: "نص العقد" },
  "@legalos.contractReview.syntheticSampleNote": {
    defaultMessage: "نموذج توضيحي — وليس اتفاقية موقّعة فعليًا",
  },

  "@legalos.contractReview.aiReviewHeading": { defaultMessage: "مراجعة الذكاء الاصطناعي" },
  "@legalos.contractReview.riskScoreLabel": { defaultMessage: "درجة المخاطرة" },
  "@legalos.contractReview.riskScoreValue": { defaultMessage: "{score} / 100" },
  "@legalos.contractReview.riskScoreAriaLabel": { defaultMessage: "إجمالي مخاطر العقد" },
  "@legalos.contractReview.riskScoreDescription": {
    defaultMessage:
      "مرتفعة — {highCount} بنود عالية المخاطرة و{missingCount} بنود قياسية مفقودة. عادةً ما تسجل اتفاقيات السرية المماثلة التي راجعها المكتب بين ٢٥ و٤٠.",
  },
  "@legalos.contractReview.draftingAidDisclaimer": {
    defaultMessage: "أداة مساعدة في الصياغة، وليست استشارة قانونية. كل بند تم رصده يحتاج إلى تقدير محامٍ قبل الاعتماد عليه.",
  },

  "@legalos.contractReview.reviewSectionLabel": { defaultMessage: "قسم المراجعة" },
  "@legalos.contractReview.tab.risks": { defaultMessage: "المخاطر" },
  "@legalos.contractReview.tab.missing": { defaultMessage: "الناقص" },
  "@legalos.contractReview.tab.summary": { defaultMessage: "الملخص" },

  "@legalos.contractReview.applySuggestion": { defaultMessage: "تطبيق الاقتراح" },
  "@legalos.contractReview.dismissFinding.label": { defaultMessage: "تجاهل الملاحظة" },
  "@legalos.contractReview.dismissFinding.children": { defaultMessage: "تجاهل" },

  "@legalos.contractReview.missingClausesHeading": { defaultMessage: "البنود الناقصة" },
  "@legalos.contractReview.missingClausesDescription": {
    defaultMessage: "موجودة في قالب اتفاقية السرية المعتمد لدى المكتب لكنها غائبة هنا.",
  },
  "@legalos.contractReview.insertButton": { defaultMessage: "إدراج {label}" },
  "@legalos.contractReview.insertButton.label": { defaultMessage: "إدراج" },

  "@legalos.contractReview.recommendationsHeading": { defaultMessage: "التوصيات" },
  "@legalos.contractReview.summary.intro": {
    defaultMessage:
      "يمكن التوقيع على اتفاقية السرية هذه بعد معالجة مدة السريان غير المحددة وبند المسؤولية غير المحدود. فكلاهما يخالف قالب المكتب المعتمد على نحوٍ يميل لصالح الطرف المُفصِح، ودلتا فودز هي الطرف المتلقي في أغلب الإفصاحات المتوقعة في هذا التكليف.",
  },
  "@legalos.contractReview.summary.item1.label": {
    defaultMessage: "التفاوض على تعديل البند الثالث إلى مدة خمس سنوات",
  },
  "@legalos.contractReview.summary.item1.description": {
    defaultMessage: "أهم تعديل من حيث الأثر؛ وقد قبل الطرف الآخر التعديل ذاته في عقد التوريد لسنة ٢٠٢٥.",
  },
  "@legalos.contractReview.summary.item2.label": {
    defaultMessage: "وضع حد أقصى للمسؤولية في البند الخامس",
  },
  "@legalos.contractReview.summary.item2.description": {
    defaultMessage: "يُقترح تحديد السقف بقيمة التكليف محل الاتفاق.",
  },
  "@legalos.contractReview.summary.item3.label": {
    defaultMessage: "إدراج البنود القياسية الناقصة وعددها {count}",
  },
  "@legalos.contractReview.summary.item3.description": {
    defaultMessage: "ردّ المستندات أو إعدامها، واستثناءات التعريف، والإخطارات، والتنازل عن الحقوق.",
  },
  "@legalos.contractReview.compareTemplateLink": { defaultMessage: "مقارنة مع قالب المكتب" },
};
