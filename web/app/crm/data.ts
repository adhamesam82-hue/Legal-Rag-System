// Mock data for the CRM (prospective-client pipeline) pillar. No CRM backend
// exists yet — this is the UI-concept pass. Distinct from `/clients`, which
// covers existing client companies.
//
// The records are Arabic for the same reason the seeded firm in
// scripts/seed_demo_firm.py is: this is an Egyptian practice's own file, and
// it reads in Arabic whichever language the UI is set to. Stage labels,
// column headers and every other piece of chrome still come from the
// catalogs and follow the locale toggle.

export type LeadStage =
  | "new"
  | "contacted"
  | "consultation"
  | "proposal"
  | "won"
  | "lost";

export type ConflictStatus = "clear" | "pending" | "flagged";

export type TimelineEntryType =
  | "call"
  | "email"
  | "whatsapp"
  | "meeting"
  | "note"
  | "stage";

export interface TimelineEntry {
  type: TimelineEntryType;
  who: string;
  text: string;
  time: string;
}

export interface ConsultationInfo {
  status: "none" | "scheduled" | "completed";
  date?: string; // human label, e.g. "الأربعاء 31 يوليو"
  time?: string; // e.g. "5:00 م"
}

export interface Lead {
  id: string;
  name: string;
  company: boolean;
  matterType: string;
  source: string;
  estValue: number;
  stage: LeadStage;
  assignedTo: string;
  createdLabel: string;
  conflictStatus: ConflictStatus;
  conflictNote: string;
  consultation: ConsultationInfo;
  notes: string[];
  timeline: TimelineEntry[];
  lostReason?: string;
}

export const STAGE_META: Record<
  LeadStage,
  { labelKey: string; badgeVariant: "neutral" | "blue" | "cyan" | "orange" | "success" | "red" }
> = {
  new: { labelKey: "@legalos.crm.stage.new", badgeVariant: "neutral" },
  contacted: { labelKey: "@legalos.crm.stage.contacted", badgeVariant: "blue" },
  consultation: { labelKey: "@legalos.crm.stage.consultation", badgeVariant: "cyan" },
  proposal: { labelKey: "@legalos.crm.stage.proposal", badgeVariant: "orange" },
  won: { labelKey: "@legalos.crm.stage.won", badgeVariant: "success" },
  lost: { labelKey: "@legalos.crm.stage.lost", badgeVariant: "red" },
};

export const STAGE_ORDER: LeadStage[] = [
  "new",
  "contacted",
  "consultation",
  "proposal",
  "won",
  "lost",
];

// formatEGP/formatEGPCompact used to live here, pinned to "en-US". They are
// now the locale-aware pair in lib/i18n/format.ts, reached via useFormat().

export const LEADS: Lead[] = [
  {
    id: "rania-mahmoud",
    name: "رانيا محمود",
    company: false,
    matterType: "أحوال شخصية — تسوية طلاق",
    source: "توصية — منى فاروق",
    estValue: 45000,
    stage: "new",
    assignedTo: "منى فاروق",
    createdLabel: "منذ يوم",
    conflictStatus: "pending",
    conflictNote: "طُلب فحص تعارض المصالح، وفي انتظار نتيجة البحث في السجلات.",
    consultation: { status: "none" },
    notes: [
      "وصلت بتوصية من شقيقة أحد عملاء المكتب. تريد استشارة أولى قبل التعاقد.",
    ],
    timeline: [
      { type: "stage", who: "منى فاروق", text: "أُنشئ العميل المحتمل من استمارة التوصية", time: "منذ يوم" },
      { type: "call", who: "منى فاروق", text: "مكالمة تعارف قصيرة — عرض الخطوات التالية وهيكل الأتعاب", time: "منذ 20 ساعة" },
    ],
  },
  {
    id: "cairo-steel-works",
    name: "مصانع القاهرة للحديد والصلب",
    company: true,
    matterType: "صياغة عقود تجارية",
    source: "استفسار عبر الموقع",
    estValue: 120000,
    stage: "new",
    assignedTo: "أحمد السيد",
    createdLabel: "منذ يومين",
    conflictStatus: "clear",
    conflictNote: "لا توجد مطابقات في القضايا الجارية أو المنتهية.",
    consultation: { status: "none" },
    notes: [
      "يحتاج نموذج عقد توريد معتمد، بالإضافة إلى مراجعة ثلاثة عقود موردين قائمة.",
    ],
    timeline: [
      { type: "stage", who: "النظام", text: "ورد العميل المحتمل عبر نموذج التواصل بالموقع", time: "منذ يومين" },
      { type: "email", who: "أحمد السيد", text: "أُرسل استبيان تحديد نطاق العمل", time: "منذ يوم" },
    ],
  },
  {
    id: "nourhan-gaber",
    name: "نورهان جابر",
    company: false,
    matterType: "نزاع عقاري",
    source: "توصية — عميل حالي",
    estValue: 60000,
    stage: "contacted",
    assignedTo: "يوسف عادل",
    createdLabel: "منذ 5 أيام",
    conflictStatus: "clear",
    conflictNote: "لا توجد مطابقات في القضايا الجارية أو المنتهية.",
    consultation: { status: "none" },
    notes: [
      "نزاع على حدود عقار مجاور بالجيزة. لديها جزء من المستندات وتسعى لاستكمال الباقي.",
    ],
    timeline: [
      { type: "stage", who: "يوسف عادل", text: "أُنشئ العميل المحتمل بناءً على توصية", time: "منذ 5 أيام" },
      { type: "call", who: "يوسف عادل", text: "مناقشة خلفية النزاع وتسلسله الزمني", time: "منذ 4 أيام" },
      { type: "whatsapp", who: "نورهان جابر", text: "أرسلت صورًا من عقد الملكية والمساحة", time: "منذ يومين" },
    ],
  },
  {
    id: "fawzy-textiles",
    name: "مجموعة فوزي للغزل والنسيج",
    company: true,
    matterType: "إعادة هيكلة شركات",
    source: "تواصل عبر لينكدإن",
    estValue: 350000,
    stage: "contacted",
    assignedTo: "أحمد السيد",
    createdLabel: "منذ 6 أيام",
    conflictStatus: "flagged",
    conflictNote:
      "تعارض محتمل — أحد أعضاء مجلس إدارة مجموعة فوزي للغزل والنسيج عضو كذلك في مجلس إدارة خصم لشركة النيل للتجارة في قضية جارية. أُحيل الأمر إلى الشريك للمراجعة قبل التعاقد.",
    consultation: { status: "none" },
    notes: [
      "إعادة هيكلة شركتين تابعتين قبل جولة استثمار مرتقبة. قيمة مرتفعة وتحتاج موافقة الشريك بسبب تنبيه التعارض.",
    ],
    timeline: [
      { type: "stage", who: "أحمد السيد", text: "أُنشئ العميل المحتمل بعد رد على تواصل لينكدإن", time: "منذ 6 أيام" },
      { type: "note", who: "النظام", text: "فحص التعارض نبّه إلى علاقة محتملة — راجع حالة التعارض", time: "منذ 5 أيام" },
      { type: "email", who: "أحمد السيد", text: "تم إبلاغهم باستلام الطلب وأن المراجعة جارية", time: "منذ 3 أيام" },
    ],
  },
  {
    id: "samir-abdelaziz",
    name: "سمير عبد العزيز",
    company: false,
    matterType: "ملكية فكرية — تسجيل علامة تجارية",
    source: "زيارة مباشرة للمكتب",
    estValue: 25000,
    stage: "consultation",
    assignedTo: "أحمد السيد",
    createdLabel: "منذ 4 أيام",
    conflictStatus: "clear",
    conflictNote: "لا توجد مطابقات في القضايا الجارية أو المنتهية.",
    consultation: { status: "scheduled", date: "الخميس 1 أغسطس", time: "11:00 ص" },
    notes: [
      "يريد تسجيل علامة تجارية لعلامة أغذية معبأة جديدة. إجراء مباشر ويُتوقع إنجازه سريعًا.",
    ],
    timeline: [
      { type: "stage", who: "أحمد السيد", text: "حضر إلى المكتب وسُجّل كعميل محتمل", time: "منذ 4 أيام" },
      { type: "call", who: "أحمد السيد", text: "تأكيد نطاق العمل وتقدير الأتعاب", time: "منذ 3 أيام" },
      { type: "stage", who: "أحمد السيد", text: "حُجزت الاستشارة الخميس 1 أغسطس الساعة 11:00 ص", time: "منذ يوم" },
    ],
  },
  {
    id: "nile-logistics",
    name: "شركة النيل للخدمات اللوجستية",
    company: true,
    matterType: "مراجعة عقود عمل",
    source: "توصية — مجموعة خليل القابضة",
    estValue: 90000,
    stage: "consultation",
    assignedTo: "منى فاروق",
    createdLabel: "منذ 3 أيام",
    conflictStatus: "clear",
    conflictNote: "لا توجد مطابقات في القضايا الجارية أو المنتهية.",
    consultation: { status: "scheduled", date: "الأربعاء 31 يوليو", time: "5:00 م" },
    notes: [
      "مراجعة عقود العمل المعتمدة قبل موجة توظيف جديدة. جاءت التوصية مباشرةً من المدير المالي لمجموعة خليل القابضة.",
    ],
    timeline: [
      { type: "stage", who: "منى فاروق", text: "أُنشئ العميل المحتمل بتوصية من مجموعة خليل القابضة", time: "منذ 3 أيام" },
      { type: "whatsapp", who: "شركة النيل للخدمات اللوجستية", text: "أرسلت نماذج العقود الحالية للمراجعة", time: "منذ يومين" },
      { type: "stage", who: "منى فاروق", text: "حُجزت الاستشارة اليوم الساعة 5:00 م", time: "منذ يوم" },
    ],
  },
  {
    id: "heba-elmasry",
    name: "هبة المصري",
    company: false,
    matterType: "تخطيط التركات",
    source: "استفسار هاتفي",
    estValue: 55000,
    stage: "proposal",
    assignedTo: "أحمد السيد",
    createdLabel: "منذ 9 أيام",
    conflictStatus: "clear",
    conflictNote: "لا توجد مطابقات في القضايا الجارية أو المنتهية.",
    consultation: { status: "completed", date: "الجمعة 24 يوليو", time: "10:00 ص" },
    notes: [
      "تريد خطة تركة كاملة تشمل وصية وتوكيلًا. سارت الاستشارة على ما يرام، وأُرسل العرض وننتظر القرار.",
    ],
    timeline: [
      { type: "stage", who: "أحمد السيد", text: "أُنشئ العميل المحتمل بعد مكالمة واردة", time: "منذ 9 أيام" },
      { type: "meeting", who: "أحمد السيد", text: "عُقدت الاستشارة بمقر المكتب", time: "منذ 7 أيام" },
      { type: "email", who: "أحمد السيد", text: "أُرسل عرض التعاقد وجدول الأتعاب", time: "منذ 5 أيام" },
    ],
  },
  {
    id: "al-rawi-construction",
    name: "الراوي للمقاولات",
    company: true,
    matterType: "تقاضٍ — نزاع على مستحقات",
    source: "توصية — شركة النيل للتجارة",
    estValue: 480000,
    stage: "proposal",
    assignedTo: "أحمد السيد",
    createdLabel: "منذ 11 يومًا",
    conflictStatus: "flagged",
    conflictNote:
      "تعارض محتمل — الخصم في قضية نبيل ضد شركة النيل للتجارة يشترك مع الراوي للمقاولات في أحد أعضاء مجلس الإدارة. في انتظار مراجعة الشريك قبل توقيع خطاب التكليف.",
    consultation: { status: "completed", date: "الأربعاء 22 يوليو", time: "2:00 م" },
    notes: [
      "نزاع على مستحقات عن أعمال مقاولات منتهية، بقيمة تقارب 480,000 جنيه. قيمة مرتفعة، وأُرسل العرض لكن التعاقد موقوف لحين انتهاء مراجعة التعارض.",
      "العميل يستعجل الرد — يجب متابعة المراجعة قبل نهاية الأسبوع.",
    ],
    timeline: [
      { type: "stage", who: "أحمد السيد", text: "أُنشئ العميل المحتمل بتوصية من شركة النيل للتجارة", time: "منذ 11 يومًا" },
      { type: "note", who: "النظام", text: "فحص التعارض نبّه إلى عضوية مشتركة بمجلس الإدارة — راجع حالة التعارض", time: "منذ 10 أيام" },
      { type: "meeting", who: "أحمد السيد", text: "عُقدت الاستشارة لبحث النزاع على المستحقات", time: "منذ 9 أيام" },
      { type: "email", who: "أحمد السيد", text: "أُرسل عرض التعاقد مع الإشارة إلى أن مراجعة التعارض جارية", time: "منذ 6 أيام" },
      { type: "whatsapp", who: "الراوي للمقاولات", text: "سألوا عن موعد الانتهاء من المراجعة", time: "منذ يوم" },
    ],
  },
  {
    id: "mostafa-kamel",
    name: "مصطفى كامل",
    company: false,
    matterType: "طلاق وحضانة",
    source: "استفسار عبر الموقع",
    estValue: 40000,
    stage: "won",
    assignedTo: "منى فاروق",
    createdLabel: "منذ 21 يومًا",
    conflictStatus: "clear",
    conflictNote: "لا توجد مطابقات في القضايا الجارية أو المنتهية.",
    consultation: { status: "completed", date: "الجمعة 10 يوليو", time: "11:00 ص" },
    notes: ["وُقّع خطاب التكليف. فُتح ملف القضية هذا الأسبوع."],
    timeline: [
      { type: "stage", who: "منى فاروق", text: "أُنشئ العميل المحتمل من استفسار الموقع", time: "منذ 21 يومًا" },
      { type: "meeting", who: "منى فاروق", text: "عُقدت الاستشارة واتُّفق على نطاق العمل", time: "منذ 18 يومًا" },
      { type: "email", who: "منى فاروق", text: "أُرسل خطاب التكليف ووُقّع من الطرفين", time: "منذ 14 يومًا" },
      { type: "stage", who: "منى فاروق", text: "سُجّل كعميل مكتسب — فُتح ملف القضية", time: "منذ 13 يومًا" },
    ],
  },
  {
    id: "delta-pharma",
    name: "دلتا فارما للتوزيع",
    company: true,
    matterType: "مراجعة الامتثال التنظيمي",
    source: "فعالية قطاعية",
    estValue: 210000,
    stage: "lost",
    assignedTo: "يوسف عادل",
    createdLabel: "منذ 26 يومًا",
    conflictStatus: "clear",
    conflictNote: "لا توجد مطابقات في القضايا الجارية أو المنتهية.",
    consultation: { status: "completed", date: "الأربعاء 15 يوليو", time: "3:00 م" },
    notes: ["اختاروا مكتبًا له حضور دائم بمقر في القاهرة."],
    lostReason: "اختاروا مكتبًا منافسًا له مقر قائم بالقاهرة.",
    timeline: [
      { type: "stage", who: "يوسف عادل", text: "أُنشئ العميل المحتمل بعد لقاء في مؤتمر لقطاع الأدوية", time: "منذ 26 يومًا" },
      { type: "meeting", who: "يوسف عادل", text: "عُقدت الاستشارة لتحديد نطاق مراجعة الامتثال", time: "منذ 20 يومًا" },
      { type: "email", who: "يوسف عادل", text: "أُرسل العرض", time: "منذ 16 يومًا" },
      { type: "stage", who: "يوسف عادل", text: "سُجّل كعميل مفقود — اختار مكتبًا له مقر بالقاهرة", time: "منذ 10 أيام" },
    ],
  },
];

export function getLead(id: string): Lead | undefined {
  return LEADS.find((lead) => lead.id === id);
}
