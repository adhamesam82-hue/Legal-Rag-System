import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  // --- AI Assistant -----------------------------------------------------
  "@legalos.aiAssistant.heading": { defaultMessage: "AI Assistant" },
  "@legalos.aiAssistant.subheading": {
    defaultMessage: "Grounded Q&A over the statute corpus — ask in Arabic or English.",
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
  "@legalos.aiAssistant.modes.notBuiltTooltip": { defaultMessage: "Not built yet" },
  "@legalos.aiAssistant.modes.availabilityNote": {
    defaultMessage:
      "Question answering runs against the live corpus. The other modes are planned and not built yet.",
  },

  "@legalos.aiAssistant.noConversations": {
    defaultMessage: "No conversations yet. Ask a question to start one.",
  },
  "@legalos.aiAssistant.turnCount": {
    defaultMessage: "{count, plural, one {# question} other {# questions}}",
  },
  "@legalos.aiAssistant.sessionOnlyNote": {
    defaultMessage:
      "Conversations are kept for this session only — chat history isn't stored yet.",
  },

  "@legalos.aiAssistant.suggestions.notice": {
    defaultMessage: "ما هي مهلة الإخطار الواجب مراعاتها لإنهاء عقد عمل غير محدد المدة؟",
  },
  "@legalos.aiAssistant.suggestions.leave": {
    defaultMessage: "كم يومًا تكون مدة الإجازة السنوية للعامل؟",
  },
  "@legalos.aiAssistant.suggestions.companies": {
    defaultMessage: "Does Egypt's Companies Law recognise single-person companies?",
  },

  "@legalos.aiAssistant.knowledgeSources.heading": { defaultMessage: "Knowledge Sources" },
  "@legalos.aiAssistant.knowledgeSources.description": {
    defaultMessage:
      "Every answer above is composed only from statute articles retrieved from the corpus, cited exactly as retrieved, and verified before being shown.",
  },
  "@legalos.aiAssistant.knowledgeSources.citedHeading": {
    defaultMessage: "Cited in this conversation",
  },
  "@legalos.aiAssistant.knowledgeSources.noneYet": {
    defaultMessage: "Articles cited in this conversation will be listed here.",
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

  // --- Legal Research -----------------------------------------------------
  "@legalos.legalResearch.heading": { defaultMessage: "Legal research" },
  "@legalos.legalResearch.description": {
    defaultMessage:
      "Search the indexed statute corpus. Every answer cites the articles it relies on, and refuses when nothing supports one.",
  },
  "@legalos.legalResearch.searchLabel": { defaultMessage: "Search legislation" },
  "@legalos.legalResearch.searchPlaceholder": {
    defaultMessage: "Ask a question, or search by law number and article…",
  },
  "@legalos.legalResearch.submit": { defaultMessage: "Search" },
  "@legalos.legalResearch.resultModeLabel": { defaultMessage: "Result mode" },
  "@legalos.legalResearch.resultMode.answer": { defaultMessage: "AI answer" },
  "@legalos.legalResearch.resultMode.articles": { defaultMessage: "Articles only" },

  "@legalos.legalResearch.aiAnswerHeading": { defaultMessage: "AI answer" },
  "@legalos.legalResearch.queryPrefix": { defaultMessage: "Query: “{query}”" },
  "@legalos.legalResearch.disclaimersFooter": {
    defaultMessage:
      "Research assistance, not legal advice. Verify every citation against the official gazette before relying on it.",
  },

  "@legalos.legalResearch.referencedLegislationHeading": { defaultMessage: "Retrieved articles" },
  "@legalos.legalResearch.noArticles": {
    defaultMessage: "Nothing in the corpus matched this query.",
  },

  "@legalos.legalResearch.empty.title": { defaultMessage: "Search the statute corpus" },
  "@legalos.legalResearch.empty.description": {
    defaultMessage:
      "“AI answer” composes a cited answer from the retrieved articles. “Articles only” returns the ranked statute text with no model call.",
  },

  "@legalos.legalResearch.tryQuestionHeading": { defaultMessage: "Try a question" },
  "@legalos.legalResearch.corpusHeading": { defaultMessage: "Corpus" },
  "@legalos.legalResearch.corpusDescription": {
    defaultMessage:
      "Statute text only — no case law or commentary is indexed. Jurisdiction is a hard filter: an Egypt-scoped query never returns text from another jurisdiction.",
  },
  "@legalos.legalResearch.browseLibraryLink": { defaultMessage: "Browse the library" },
  "@legalos.legalResearch.openAiAssistantLink": { defaultMessage: "Open AI Assistant" },

  "@legalos.legalResearch.exampleQueries.q1": {
    defaultMessage: "What is the statutory annual leave entitlement for an employee?",
  },
  "@legalos.legalResearch.exampleQueries.q2": {
    defaultMessage: "What notice period applies to terminating an indefinite employment contract?",
  },
  "@legalos.legalResearch.exampleQueries.q3": {
    defaultMessage: "ماذا تنص المادة 80 من قانون العمل رقم 12 لسنة 2003؟",
  },

  // --- Contract Review -----------------------------------------------------
  "@legalos.contractReview.severityBadge.high": { defaultMessage: "High risk" },
  "@legalos.contractReview.severityBadge.medium": { defaultMessage: "Medium risk" },
  "@legalos.contractReview.severityBadge.low": { defaultMessage: "Low risk" },

  "@legalos.contractReview.matterTitle": { defaultMessage: "Mutual NDA — شركة دلتا للأغذية" },
  "@legalos.contractReview.reviewCompleteBadge": { defaultMessage: "AI review complete" },
  "@legalos.contractReview.matterLink": { defaultMessage: "مراجعة اتفاقية عدم إفشاء — دلتا للأغذية" },
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
      "This NDA is signable once the perpetual term and the uncapped liability clause are addressed. Both deviate from the firm's standard template in ways that favour the disclosing party, and شركة دلتا للأغذية is the receiving party on the majority of expected disclosures under this engagement.",
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
    defaultMessage: "إجابات قانونية موثّقة من مدوّنة القوانين المفهرسة — اسأل بالعربية أو الإنجليزية.",
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
  "@legalos.aiAssistant.modes.notBuiltTooltip": { defaultMessage: "لم يُبنَ بعد" },
  "@legalos.aiAssistant.modes.availabilityNote": {
    defaultMessage:
      "الإجابة عن الأسئلة تعمل فعليًا على قاعدة البيانات. أما الأوضاع الأخرى فمخطط لها ولم تُبنَ بعد.",
  },

  "@legalos.aiAssistant.noConversations": {
    defaultMessage: "لا توجد محادثات بعد. اطرح سؤالاً لبدء محادثة.",
  },
  "@legalos.aiAssistant.turnCount": {
    defaultMessage: "{count, plural, one {سؤال واحد} two {سؤالان} few {# أسئلة} other {# سؤالاً}}",
  },
  "@legalos.aiAssistant.sessionOnlyNote": {
    defaultMessage: "تُحفظ المحادثات لهذه الجلسة فقط — لم يُفعَّل تخزين سجل المحادثات بعد.",
  },

  "@legalos.aiAssistant.suggestions.notice": {
    defaultMessage: "ما هي مهلة الإخطار الواجب مراعاتها لإنهاء عقد عمل غير محدد المدة؟",
  },
  "@legalos.aiAssistant.suggestions.leave": {
    defaultMessage: "كم يومًا تكون مدة الإجازة السنوية للعامل؟",
  },
  "@legalos.aiAssistant.suggestions.companies": {
    defaultMessage: "هل يعترف قانون الشركات المصري بالشركة ذات الشخص الواحد؟",
  },

  "@legalos.aiAssistant.knowledgeSources.heading": { defaultMessage: "مصادر المعرفة" },
  "@legalos.aiAssistant.knowledgeSources.description": {
    defaultMessage:
      "كل إجابة أعلاه مُركّبة فقط من مواد قانونية مسترجَعة من قاعدة البيانات، وموثّقة كما وردت، ويتم التحقق منها قبل عرضها.",
  },
  "@legalos.aiAssistant.knowledgeSources.citedHeading": {
    defaultMessage: "المصادر المستشهد بها في هذه المحادثة",
  },
  "@legalos.aiAssistant.knowledgeSources.noneYet": {
    defaultMessage: "ستظهر هنا المواد المستشهد بها في هذه المحادثة.",
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

  // --- Legal Research -----------------------------------------------------
  "@legalos.legalResearch.heading": { defaultMessage: "البحث القانوني" },
  "@legalos.legalResearch.description": {
    defaultMessage:
      "ابحث في مدوّنة القوانين المفهرسة. كل إجابة تستشهد بالمواد التي استندت إليها، وتمتنع عن الإجابة إذا لم تدعمها أي مادة.",
  },
  "@legalos.legalResearch.searchLabel": { defaultMessage: "البحث في التشريعات" },
  "@legalos.legalResearch.searchPlaceholder": {
    defaultMessage: "اطرح سؤالاً، أو ابحث برقم القانون والمادة…",
  },
  "@legalos.legalResearch.submit": { defaultMessage: "بحث" },
  "@legalos.legalResearch.resultModeLabel": { defaultMessage: "نمط النتائج" },
  "@legalos.legalResearch.resultMode.answer": { defaultMessage: "إجابة الذكاء الاصطناعي" },
  "@legalos.legalResearch.resultMode.articles": { defaultMessage: "المواد فقط" },

  "@legalos.legalResearch.aiAnswerHeading": { defaultMessage: "إجابة الذكاء الاصطناعي" },
  "@legalos.legalResearch.queryPrefix": { defaultMessage: "السؤال: «{query}»" },
  "@legalos.legalResearch.disclaimersFooter": {
    defaultMessage:
      "مساعدة بحثية، وليست استشارة قانونية. تحقق من كل استشهاد في الجريدة الرسمية قبل الاعتماد عليه.",
  },

  "@legalos.legalResearch.referencedLegislationHeading": { defaultMessage: "المواد المسترجَعة" },
  "@legalos.legalResearch.noArticles": {
    defaultMessage: "لا توجد في قاعدة البيانات أي مادة مطابقة لهذا البحث.",
  },

  "@legalos.legalResearch.empty.title": { defaultMessage: "ابحث في مدوّنة القوانين" },
  "@legalos.legalResearch.empty.description": {
    defaultMessage:
      "«إجابة الذكاء الاصطناعي» تُركّب إجابة موثّقة من المواد المسترجَعة. أما «المواد فقط» فتُعيد النصوص مرتّبة دون استدعاء النموذج.",
  },

  "@legalos.legalResearch.tryQuestionHeading": { defaultMessage: "جرّب سؤالاً" },
  "@legalos.legalResearch.corpusHeading": { defaultMessage: "قاعدة البيانات" },
  "@legalos.legalResearch.corpusDescription": {
    defaultMessage:
      "نصوص تشريعية فقط — لا تتضمن الفهرسة أحكامًا قضائية أو شروحًا فقهية. والولاية القضائية فلتر صارم: لا يُعيد سؤال مخصص لمصر أي نص من ولاية أخرى.",
  },
  "@legalos.legalResearch.browseLibraryLink": { defaultMessage: "تصفّح المكتبة" },
  "@legalos.legalResearch.openAiAssistantLink": { defaultMessage: "فتح المساعد الذكي" },

  "@legalos.legalResearch.exampleQueries.q1": {
    defaultMessage: "ما هي مدة الإجازة السنوية المستحقة للعامل؟",
  },
  "@legalos.legalResearch.exampleQueries.q2": {
    defaultMessage: "ما هي مهلة الإخطار الواجب مراعاتها لإنهاء عقد عمل غير محدد المدة؟",
  },
  "@legalos.legalResearch.exampleQueries.q3": {
    defaultMessage: "ماذا تنص المادة 80 من قانون العمل رقم 12 لسنة 2003؟",
  },

  // --- Contract Review -----------------------------------------------------
  "@legalos.contractReview.severityBadge.high": { defaultMessage: "مخاطرة عالية" },
  "@legalos.contractReview.severityBadge.medium": { defaultMessage: "مخاطرة متوسطة" },
  "@legalos.contractReview.severityBadge.low": { defaultMessage: "مخاطرة منخفضة" },

  "@legalos.contractReview.matterTitle": { defaultMessage: "اتفاقية سرية متبادلة — شركة دلتا للأغذية" },
  "@legalos.contractReview.reviewCompleteBadge": { defaultMessage: "اكتملت المراجعة بالذكاء الاصطناعي" },
  "@legalos.contractReview.matterLink": { defaultMessage: "مراجعة اتفاقية سرية شركة دلتا للأغذية" },
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
      "مرتفعة — {highCount} بنود عالية المخاطرة و{missingCount} بنود قياسية مفقودة. عادةً ما تسجل اتفاقيات السرية المماثلة التي راجعها المكتب بين 25 و40.",
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
      "يمكن التوقيع على اتفاقية السرية هذه بعد معالجة مدة السريان غير المحددة وبند المسؤولية غير المحدود. فكلاهما يخالف قالب المكتب المعتمد على نحوٍ يميل لصالح الطرف المُفصِح، وشركة دلتا للأغذية هي الطرف المتلقي في أغلب الإفصاحات المتوقعة في هذا التكليف.",
  },
  "@legalos.contractReview.summary.item1.label": {
    defaultMessage: "التفاوض على تعديل البند الثالث إلى مدة خمس سنوات",
  },
  "@legalos.contractReview.summary.item1.description": {
    defaultMessage: "أهم تعديل من حيث الأثر؛ وقد قبل الطرف الآخر التعديل ذاته في عقد التوريد لسنة 2025.",
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
