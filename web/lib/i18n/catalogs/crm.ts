import type { Catalog } from "@astryxdesign/core/i18n";

// Lead names, matterType and source stay in the mock data untranslated: a real
// CRM stores those as the intake operator entered them (one source value is
// "Referral — Mona Farouk", a person's name), so they are content rather than
// UI vocabulary — the same treatment matter and client names get elsewhere.

export const en: Catalog = {
  "@legalos.crm.heading": { defaultMessage: "CRM Pipeline" },
  "@legalos.crm.viewExistingClients": { defaultMessage: "View existing clients" },
  "@legalos.crm.newLead": { defaultMessage: "New lead" },

  "@legalos.crm.kpi.openLeads": { defaultMessage: "Open leads" },
  "@legalos.crm.kpi.openLeadsDetail": {
    defaultMessage: "{count, plural, one {Across # active stage} other {Across # active stages}}",
  },
  "@legalos.crm.kpi.pipelineValue": { defaultMessage: "Open pipeline value" },
  "@legalos.crm.kpi.pipelineValueDetail": { defaultMessage: "Estimated, not yet won" },
  "@legalos.crm.kpi.wonThisMonth": { defaultMessage: "Won this month" },
  "@legalos.crm.kpi.wonDetail": {
    defaultMessage: "{count, plural, one {# lead converted} other {# leads converted}}",
  },
  "@legalos.crm.kpi.conflictsFlagged": { defaultMessage: "Conflict checks flagged" },
  "@legalos.crm.kpi.conflictsDetail": { defaultMessage: "Awaiting partner review" },

  "@legalos.crm.stage.new": { defaultMessage: "New Lead" },
  "@legalos.crm.stage.contacted": { defaultMessage: "Contacted" },
  "@legalos.crm.stage.consultation": { defaultMessage: "Consultation Scheduled" },
  "@legalos.crm.stage.proposal": { defaultMessage: "Proposal Sent" },
  "@legalos.crm.stage.won": { defaultMessage: "Won" },
  "@legalos.crm.stage.lost": { defaultMessage: "Lost" },

  "@legalos.crm.stageTotal": { defaultMessage: "{value} in this stage" },
  "@legalos.crm.conflictFlagged": { defaultMessage: "Conflict flagged" },
  "@legalos.crm.detail.notFoundTitle": { defaultMessage: "Lead not found" },
  "@legalos.crm.detail.notFoundDescription": {
    defaultMessage: "This lead may have been removed or the link is out of date.",
  },
  "@legalos.crm.detail.backToPipeline": { defaultMessage: "Back to pipeline" },
  "@legalos.crm.detail.allLeads": { defaultMessage: "All leads" },
  "@legalos.crm.detail.logInteraction": { defaultMessage: "Log interaction" },
  "@legalos.crm.detail.convertToClient": { defaultMessage: "Convert to client" },
  "@legalos.crm.detail.timeline": { defaultMessage: "Timeline" },
  "@legalos.crm.detail.messagesHeading": { defaultMessage: "Emails & WhatsApp messages" },
  "@legalos.crm.detail.messagesEmptyTitle": { defaultMessage: "No messages logged" },
  "@legalos.crm.detail.messagesEmptyDescription": {
    defaultMessage: "Emails and WhatsApp messages logged for this lead appear here.",
  },
  "@legalos.crm.detail.notes": { defaultMessage: "Notes" },
  "@legalos.crm.detail.addNoteLabel": { defaultMessage: "Add a note" },
  "@legalos.crm.detail.addNotePlaceholder": {
    defaultMessage: "Add a note about this lead…",
  },
  "@legalos.crm.detail.addNote": { defaultMessage: "Add note" },
  "@legalos.crm.detail.leadDetails": { defaultMessage: "Lead details" },
  "@legalos.crm.detail.field.source": { defaultMessage: "Source" },
  "@legalos.crm.detail.field.estimatedValue": { defaultMessage: "Estimated value" },
  "@legalos.crm.detail.field.assignedTo": { defaultMessage: "Assigned to" },
  "@legalos.crm.detail.field.created": { defaultMessage: "Created" },
  "@legalos.crm.detail.conflictCheck": { defaultMessage: "Conflict check" },
  "@legalos.crm.detail.consultation": { defaultMessage: "Consultation" },
  "@legalos.crm.detail.completed": { defaultMessage: "Completed" },
  "@legalos.crm.detail.scheduled": { defaultMessage: "Scheduled" },
  "@legalos.crm.detail.noConsultation": {
    defaultMessage: "No consultation scheduled yet.",
  },
  "@legalos.crm.detail.scheduleConsultation": {
    defaultMessage: "Schedule consultation",
  },
  "@legalos.crm.detail.consultationDateLabel": {
    defaultMessage: "Consultation date and time",
  },
  "@legalos.crm.detail.confirm": { defaultMessage: "Confirm" },
  "@legalos.crm.detail.cancel": { defaultMessage: "Cancel" },
  "@legalos.crm.detail.askAi": { defaultMessage: "Ask AI" },
  "@legalos.crm.detail.askAiPrompt": {
    defaultMessage: "Draft a follow-up email to {name} summarizing next steps for {matterType}.",
  },
  "@legalos.crm.detail.draftFollowUp": { defaultMessage: "Draft follow-up" },
  "@legalos.crm.conflict.clear": { defaultMessage: "No conflicts found" },
  "@legalos.crm.conflict.pending": { defaultMessage: "Conflict check in progress" },
  "@legalos.crm.conflict.flagged": {
    defaultMessage: "Potential conflict — review required",
  },
  "@legalos.crm.empty.title": { defaultMessage: "No leads" },
  "@legalos.crm.empty.description": {
    defaultMessage: "Leads moved to this stage appear here.",
  },
};

export const ar: Catalog = {
  "@legalos.crm.heading": { defaultMessage: "مسار العملاء المحتملين" },
  "@legalos.crm.viewExistingClients": { defaultMessage: "عرض العملاء الحاليين" },
  "@legalos.crm.newLead": { defaultMessage: "عميل محتمل جديد" },

  "@legalos.crm.kpi.openLeads": { defaultMessage: "العملاء المحتملون النشطون" },
  "@legalos.crm.kpi.openLeadsDetail": {
    defaultMessage:
      "{count, plural, zero {لا مراحل نشطة} one {عبر مرحلة نشطة واحدة} two {عبر مرحلتين نشطتين} few {عبر # مراحل نشطة} many {عبر # مرحلة نشطة} other {عبر # مرحلة نشطة}}",
  },
  "@legalos.crm.kpi.pipelineValue": { defaultMessage: "قيمة المسار المفتوحة" },
  "@legalos.crm.kpi.pipelineValueDetail": { defaultMessage: "تقديرية، لم تُحسم بعد" },
  "@legalos.crm.kpi.wonThisMonth": { defaultMessage: "المحسوم هذا الشهر" },
  "@legalos.crm.kpi.wonDetail": {
    defaultMessage:
      "{count, plural, zero {لم يتحوّل أي عميل} one {تحوّل عميل واحد} two {تحوّل عميلان} few {تحوّل # عملاء} many {تحوّل # عميلاً} other {تحوّل # عميل}}",
  },
  "@legalos.crm.kpi.conflictsFlagged": { defaultMessage: "تعارضات مصالح مرصودة" },
  "@legalos.crm.kpi.conflictsDetail": { defaultMessage: "بانتظار مراجعة الشريك" },

  "@legalos.crm.stage.new": { defaultMessage: "عميل محتمل جديد" },
  "@legalos.crm.stage.contacted": { defaultMessage: "تم التواصل" },
  "@legalos.crm.stage.consultation": { defaultMessage: "استشارة مجدولة" },
  "@legalos.crm.stage.proposal": { defaultMessage: "أُرسل العرض" },
  "@legalos.crm.stage.won": { defaultMessage: "محسوم" },
  "@legalos.crm.stage.lost": { defaultMessage: "خسارة" },

  "@legalos.crm.stageTotal": { defaultMessage: "{value} في هذه المرحلة" },
  "@legalos.crm.conflictFlagged": { defaultMessage: "تعارض مصالح" },
  "@legalos.crm.detail.notFoundTitle": { defaultMessage: "العميل المحتمل غير موجود" },
  "@legalos.crm.detail.notFoundDescription": {
    defaultMessage: "ربما حُذف هذا العميل المحتمل أو أن الرابط لم يعد صالحاً.",
  },
  "@legalos.crm.detail.backToPipeline": { defaultMessage: "العودة إلى المسار" },
  "@legalos.crm.detail.allLeads": { defaultMessage: "كل العملاء المحتملين" },
  "@legalos.crm.detail.logInteraction": { defaultMessage: "تسجيل تواصل" },
  "@legalos.crm.detail.convertToClient": { defaultMessage: "تحويل إلى عميل" },
  "@legalos.crm.detail.timeline": { defaultMessage: "التسلسل الزمني" },
  "@legalos.crm.detail.messagesHeading": {
    defaultMessage: "رسائل البريد الإلكتروني وواتساب",
  },
  "@legalos.crm.detail.messagesEmptyTitle": { defaultMessage: "لا توجد رسائل مسجَّلة" },
  "@legalos.crm.detail.messagesEmptyDescription": {
    defaultMessage: "ستظهر هنا رسائل البريد وواتساب المسجَّلة لهذا العميل المحتمل.",
  },
  "@legalos.crm.detail.notes": { defaultMessage: "ملاحظات" },
  "@legalos.crm.detail.addNoteLabel": { defaultMessage: "إضافة ملاحظة" },
  "@legalos.crm.detail.addNotePlaceholder": {
    defaultMessage: "أضف ملاحظة عن هذا العميل المحتمل…",
  },
  "@legalos.crm.detail.addNote": { defaultMessage: "إضافة الملاحظة" },
  "@legalos.crm.detail.leadDetails": { defaultMessage: "بيانات العميل المحتمل" },
  "@legalos.crm.detail.field.source": { defaultMessage: "مصدر العميل" },
  "@legalos.crm.detail.field.estimatedValue": { defaultMessage: "القيمة التقديرية" },
  "@legalos.crm.detail.field.assignedTo": { defaultMessage: "مسند إلى" },
  "@legalos.crm.detail.field.created": { defaultMessage: "تاريخ الإنشاء" },
  "@legalos.crm.detail.conflictCheck": { defaultMessage: "فحص تعارض المصالح" },
  "@legalos.crm.detail.consultation": { defaultMessage: "الاستشارة" },
  "@legalos.crm.detail.completed": { defaultMessage: "تمت" },
  "@legalos.crm.detail.scheduled": { defaultMessage: "مجدولة" },
  "@legalos.crm.detail.noConsultation": {
    defaultMessage: "لم تُجدول استشارة بعد.",
  },
  "@legalos.crm.detail.scheduleConsultation": { defaultMessage: "جدولة استشارة" },
  "@legalos.crm.detail.consultationDateLabel": {
    defaultMessage: "تاريخ ووقت الاستشارة",
  },
  "@legalos.crm.detail.confirm": { defaultMessage: "تأكيد" },
  "@legalos.crm.detail.cancel": { defaultMessage: "إلغاء" },
  "@legalos.crm.detail.askAi": { defaultMessage: "اسأل الذكاء الاصطناعي" },
  "@legalos.crm.detail.askAiPrompt": {
    defaultMessage: "صِغ رسالة متابعة إلى {name} تلخّص الخطوات التالية بخصوص {matterType}.",
  },
  "@legalos.crm.detail.draftFollowUp": { defaultMessage: "صياغة رسالة متابعة" },
  "@legalos.crm.conflict.clear": { defaultMessage: "لا يوجد تعارض مصالح" },
  "@legalos.crm.conflict.pending": { defaultMessage: "فحص تعارض المصالح جارٍ" },
  "@legalos.crm.conflict.flagged": {
    defaultMessage: "تعارض مصالح محتمل — يتطلب مراجعة",
  },
  "@legalos.crm.empty.title": { defaultMessage: "لا يوجد عملاء محتملون" },
  "@legalos.crm.empty.description": {
    defaultMessage: "سيظهر هنا العملاء المحتملون المنقولون إلى هذه المرحلة.",
  },
};
