// Mock data for the Knowledge Base pillar — no knowledge-base backend exists
// yet. Content reads as plausible internal firm material, not real precedent.
//
// The material itself is Arabic, matching the seeded firm in
// scripts/seed_demo_firm.py: an Egyptian practice writes its templates and
// precedent notes in Arabic regardless of the UI language. KbCategory's
// members stay English because they are discriminators, not display text —
// knowledge-base/page.tsx maps each to a catalog key for rendering.

export type KbCategory =
  | "Contract Templates"
  | "Litigation Precedents"
  | "Regulatory Guides"
  | "Firm Policies & SOPs"
  | "Client Communication Templates";

export type KbItemType = "template" | "precedent" | "guide" | "policy";

export type KbItem = {
  id: string;
  title: string;
  category: KbCategory;
  type: KbItemType;
  author: string;
  updated: string;
  summary: string;
  tags: string[];
  relatedMatter?: string;
  body: { heading: string; text: string }[];
  relatedIds: string[];
};

export const KB_CATEGORIES: KbCategory[] = [
  "Contract Templates",
  "Litigation Precedents",
  "Regulatory Guides",
  "Firm Policies & SOPs",
  "Client Communication Templates",
];

export const KB_ITEMS: KbItem[] = [
  {
    id: "standard-nda-template",
    title: "نموذج اتفاقية عدم إفشاء معتمد (عربي/إنجليزي)",
    category: "Contract Templates",
    type: "template",
    author: "أحمد السيد",
    updated: "10 يوليو 2026",
    summary: "نموذج اتفاقية عدم إفشاء متبادلة بنسختين عربية وإنجليزية، وهو نقطة البداية المعتمدة في المكتب لأي اتفاقية سرية جديدة.",
    tags: ["عدم إفشاء", "نموذج", "ثنائي اللغة"],
    body: [
      { heading: "نظرة عامة", text: "هذا هو نموذج اتفاقية عدم الإفشاء المتبادلة المعتمد في المكتب، ويُحفَظ بنسختين متوازيتين عربية وإنجليزية. يُستخدم كمسودة أولى لأي اتفاقية عدم إفشاء مع عميل، ما لم تقتضِ القضية اتفاقية أحادية الاتجاه." },
      { heading: "الشروط المعتمدة", text: "مدة السرية ثلاث سنوات، مع الاستثناءات المعتادة للمعلومات المتاحة للجمهور، والقانون الواجب التطبيق هو القانون المصري افتراضيًا — يُعدَّل شرط الاختصاص عند التعاقد مع أطراف خارج مصر." },
      { heading: "متى نخرج عن النموذج", text: "يُعرض الأمر على أحمد قبل قبول أي صياغة لعدم المنافسة أو مدة سرية تتجاوز خمس سنوات؛ كلاهما خارج حدود المخاطر المقبولة في المكتب." },
    ],
    relatedIds: ["nda-delta-foods-precedent", "engagement-letter-template"],
  },
  {
    id: "commercial-lease-template",
    title: "نموذج عقد إيجار تجاري",
    category: "Contract Templates",
    type: "template",
    author: "منى فاروق",
    updated: "18 يونيو 2026",
    summary: "نموذج أساسي لعقود إيجار العقارات التجارية، يغطي زيادة الأجرة والصيانة والإنهاء المبكر.",
    tags: ["إيجار", "نموذج", "عقارات"],
    body: [
      { heading: "نظرة عامة", text: "يغطي البنية المعتمدة لعقود الإيجار التجاري التي يتولاها المكتب: المدة، وجدول زيادة الأجرة، والتزامات الصيانة، وشرط جزاء الإنهاء المبكر." },
      { heading: "ملاحظات", text: "يجب التأكد من متطلبات التسجيل لدى الشهر العقاري المختص قبل الاعتماد النهائي؛ فالمتطلبات تختلف من محافظة لأخرى." },
    ],
    relatedIds: ["poa-corporate-template"],
  },
  {
    id: "poa-corporate-template",
    title: "نموذج توكيل — الشركات",
    category: "Contract Templates",
    type: "template",
    author: "ليلى حسن",
    updated: "22 مايو 2026",
    summary: "نموذج توكيل صادر عن شركة لتفويض سلطة التوقيع نيابةً عنها.",
    tags: ["توكيل", "نموذج", "شركات"],
    body: [
      { heading: "نظرة عامة", text: "يُستخدم عندما يحتاج عميل من الشركات إلى تفويض سلطة التوقيع لشخص طبيعي في نطاق محدد من المعاملات." },
      { heading: "التوثيق", text: "يلزم توثيقه قبل الاستعمال، مع إرفاق مستخرج السجل التجاري للشركة بطلب التوثيق." },
    ],
    relatedIds: ["poa-khalil-holdings-precedent"],
  },
  {
    id: "engagement-letter-template",
    title: "نموذج خطاب التكليف",
    category: "Client Communication Templates",
    type: "template",
    author: "أحمد السيد",
    updated: "30 يونيو 2026",
    summary: "خطاب التكليف المعتمد الذي يحدد نطاق العمل والأتعاب وشروط التعاقد في القضايا الجديدة.",
    tags: ["نموذج", "بدء التعامل"],
    body: [
      { heading: "نظرة عامة", text: "يُرسل هذا الخطاب إلى كل عميل جديد قبل فتح ملف القضية، ويحدد نطاق العمل وهيكل الأتعاب وشروط الفوترة." },
      { heading: "التعديل حسب الحالة", text: "يُعدَّل بند الأتعاب حسب ما إذا كان التكليف بأتعاب مقطوعة أم بالساعة؛ النموذج الافتراضي مبني على الفوترة بالساعة." },
    ],
    relatedIds: ["client-onboarding-checklist"],
  },
  {
    id: "client-update-email-template",
    title: "نموذج رسالة تحديث للعميل — تأجيل جلسة",
    category: "Client Communication Templates",
    type: "template",
    author: "منى فاروق",
    updated: "18 يوليو 2026",
    summary: "نموذج بريد إلكتروني سريع لإبلاغ العملاء عند تغيّر موعد الجلسة.",
    tags: ["نموذج", "مراسلات"],
    body: [
      { heading: "نظرة عامة", text: "يُستخدم عند تأجيل المحكمة لجلسة في وقت قصير. تُحفظ اللهجة هادئة ووقائعية، مع ذكر الموعد الجديد وأي إجراء مطلوب من العميل." },
    ],
    relatedIds: ["engagement-letter-template"],
  },
  {
    id: "nda-delta-foods-precedent",
    title: "محكمة القاهرة الاقتصادية: مذكرة سابقة في الإخلال بالعقد",
    category: "Litigation Precedents",
    type: "precedent",
    author: "أحمد السيد",
    updated: "15 يوليو 2026",
    summary: "مذكرة داخلية تلخص بنية الدفاع والنتيجة في قضية إخلال بالعقد سابقة أمام محكمة القاهرة الاقتصادية.",
    tags: ["إخلال بالعقد", "محكمة اقتصادية", "سابقة"],
    relatedMatter: "نبيل ضد شركة النيل للتجارة",
    body: [
      { heading: "الخلفية", text: "تلخص منهج المكتب في نزاع سابق على الإخلال بالعقد نُظر أمام محكمة القاهرة الاقتصادية، بما في ذلك بنية الدفاع التي أيّدت موقف العميل." },
      { heading: "بنية الدفاع", text: "تبدأ المذكرة بالتسلسل الزمني للعقد، ثم تثبت تخلف الطرف الآخر عن التنفيذ في المواعيد المتفق عليها، وتنتهي بمنهج احتساب التعويض المستخدم." },
      { heading: "الاستفادة في القضايا الجارية", text: "يُرجع إلى هذه البنية عند إعداد المذكرات في نزاعات الإخلال التجاري المشابهة، مع تكييف جزء التعويض على وقائع كل قضية." },
    ],
    relatedIds: ["standard-nda-template"],
  },
  {
    id: "labour-settlement-precedent",
    title: "سابقة تسوية في نزاع عمالي — دعاوى إنهاء الخدمة",
    category: "Litigation Precedents",
    type: "precedent",
    author: "يوسف عادل",
    updated: "12 يوليو 2026",
    summary: "مرجع داخلي لصياغة شروط التسوية في دعاوى الفصل التعسفي أمام محكمة العمل.",
    tags: ["قانون العمل", "تسوية", "سابقة"],
    relatedMatter: "نزاع عمالي — دلتا للأغذية",
    body: [
      { heading: "الخلفية", text: "مادة مرجعية لصياغة شروط التسوية في النزاعات العمالية المتعلقة بإنهاء الخدمة، مستخلصة من قضايا سابقة تولّاها المكتب." },
      { heading: "بنية التسوية", text: "تتناول التسويات في هذا النوع عادةً حساب مكافأة نهاية الخدمة، والتعويض عن مهلة الإخطار، وشرط عدم الإساءة المتبادل." },
    ],
    relatedIds: ["poa-khalil-holdings-precedent"],
  },
  {
    id: "poa-khalil-holdings-precedent",
    title: "سابقة قسمة تركة أمام محكمة الأسرة",
    category: "Litigation Precedents",
    type: "precedent",
    author: "أحمد السيد",
    updated: "28 يونيو 2026",
    summary: "مذكرة مرجعية داخلية حول بنية دعاوى قسمة التركات أمام محكمة الأسرة.",
    tags: ["أحوال شخصية", "تركات", "سابقة"],
    relatedMatter: "قسمة تركة المرحوم محمود السيد",
    body: [
      { heading: "الخلفية", text: "تغطي بنية الدعوى المستخدمة في قضية قسمة تركة سابقة، بما في ذلك قائمة مستندات الوراثة التي تطلبها محكمة الأسرة." },
      { heading: "قائمة المستندات", text: "يجب إيداع إعلام الوراثة وحصر الأصول واتفاقات القسمة السابقة (إن وُجدت) معًا في حزمة واحدة تفاديًا للتأجيل الإجرائي." },
    ],
    relatedIds: ["client-onboarding-checklist"],
  },
  {
    id: "companies-law-summary",
    title: "ملخص تعديلات قانون الشركات المصري (2025)",
    category: "Regulatory Guides",
    type: "guide",
    author: "يوسف عادل",
    updated: "5 يونيو 2026",
    summary: "ملخص داخلي لأحدث تعديلات قانون الشركات المصري ذات الصلة بأعمال الاستشارات المؤسسية.",
    tags: ["قانون الشركات", "شركات", "تنظيمي"],
    body: [
      { heading: "نظرة عامة", text: "ملخص عملي لأحدث التعديلات على متطلبات حوكمة الشركات والإفصاح، أُعدّ للرجوع الداخلي في الأعمال الاستشارية." },
      { heading: "الأثر العملي", text: "يمس الإفصاح عن تشكيل مجلس الإدارة ومواعيد إخطار الأقلية من المساهمين؛ يُراجع مع العملاء الذين يجرون تغييرات في الحوكمة." },
    ],
    relatedIds: ["gafi-registration-guide"],
  },
  {
    id: "gafi-registration-guide",
    title: "دليل تسجيل الاستثمار الأجنبي لدى هيئة الاستثمار",
    category: "Regulatory Guides",
    type: "guide",
    author: "منى فاروق",
    updated: "30 مايو 2026",
    summary: "مرجع داخلي خطوة بخطوة لتسجيل الكيانات المملوكة لأجانب لدى الهيئة العامة للاستثمار.",
    tags: ["هيئة الاستثمار", "استثمار أجنبي", "تنظيمي"],
    body: [
      { heading: "نظرة عامة", text: "يستعرض حزمة المستندات وترتيب الخطوات المطلوبة عادةً لتسجيل كيان مملوك لأجانب لدى الهيئة العامة للاستثمار والمناطق الحرة." },
      { heading: "أسباب التأخير الشائعة", text: "غياب مستندات الشركة الأم مصدَّقة بالأبوستيل هو السبب الأشيع للتأخير؛ يجب التأكد من ذلك مع العميل قبل التقديم." },
    ],
    relatedIds: ["companies-law-summary"],
  },
  {
    id: "client-onboarding-checklist",
    title: "قائمة إجراءات بدء التعامل مع عميل جديد",
    category: "Firm Policies & SOPs",
    type: "policy",
    author: "ليلى حسن",
    updated: "8 يونيو 2026",
    summary: "قائمة داخلية تغطي فحص تعارض المصالح وخطاب التكليف وفتح ملف القضية للعملاء الجدد.",
    tags: ["بدء التعامل", "إجراء معتمد"],
    body: [
      { heading: "الخطوات", text: "إجراء فحص تعارض المصالح، ثم إرسال خطاب التكليف، ثم استيفاء مستندات اعرف عميلك، ثم فتح ملف القضية — قبل أي عمل قابل للفوترة." },
    ],
    relatedIds: ["conflict-check-policy", "engagement-letter-template"],
  },
  {
    id: "conflict-check-policy",
    title: "إجراءات فحص تعارض المصالح",
    category: "Firm Policies & SOPs",
    type: "policy",
    author: "أحمد السيد",
    updated: "12 يونيو 2026",
    summary: "إجراء المكتب لفحص تعارض المصالح قبل قبول عميل جديد أو قضية جديدة.",
    tags: ["تعارض المصالح", "إجراء معتمد", "امتثال"],
    body: [
      { heading: "الإجراء", text: "يُبحث في قاعدة بيانات العملاء والقضايا عن اسم الطرف المقابل المحتمل وأي كيانات مرتبطة به قبل قبول التكليف. وتُعرض أي مطابقة جزئية على مالك المكتب قبل المضي قدمًا." },
    ],
    relatedIds: ["client-onboarding-checklist"],
  },
];

export function getKbItem(id: string): KbItem | undefined {
  return KB_ITEMS.find((item) => item.id === id);
}

export function getKbItems(ids: string[]): KbItem[] {
  return ids.map((id) => KB_ITEMS.find((item) => item.id === id)).filter((i): i is KbItem => Boolean(i));
}

export const AI_RECOMMENDATIONS: { itemId: string; reason: string }[] = [
  {
    itemId: "nda-delta-foods-precedent",
    reason: "بنية دفاع في الإخلال بالعقد مشابهة لقضية نبيل ضد شركة النيل للتجارة.",
  },
  {
    itemId: "standard-nda-template",
    reason: "النموذج الأساسي المستخدم في مسودة اتفاقية عدم الإفشاء الجارية لدلتا للأغذية.",
  },
  {
    itemId: "client-update-email-template",
    reason: "يطابق تحديث تأجيل الجلسة المعلّق في قضية نبيل ضد شركة النيل للتجارة.",
  },
];
