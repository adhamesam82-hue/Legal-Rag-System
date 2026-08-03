import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  "@legalos.matters.heading": { defaultMessage: "Matters" },
  "@legalos.matters.count": {
    defaultMessage: "{count, plural, one {# matter} other {# matters}}",
  },
  "@legalos.matters.newMatter": { defaultMessage: "New matter" },
  "@legalos.matters.savingEllipsis": { defaultMessage: "Saving…" },

  // Enum labels shared across the list and detail views — these replace
  // lib/practice.ts's label() for matter-domain values so they can be
  // translated; label() itself stays untouched (it's shared across other
  // pages outside this catalog's scope).
  "@legalos.matters.status.active": { defaultMessage: "Active" },
  "@legalos.matters.status.onHold": { defaultMessage: "On Hold" },
  "@legalos.matters.status.closed": { defaultMessage: "Closed" },

  "@legalos.matters.type.litigation": { defaultMessage: "Litigation" },
  "@legalos.matters.type.corporate": { defaultMessage: "Corporate" },
  "@legalos.matters.type.tax": { defaultMessage: "Tax" },
  "@legalos.matters.type.labour": { defaultMessage: "Labour" },
  "@legalos.matters.type.familyProbate": { defaultMessage: "Family / Probate" },
  "@legalos.matters.type.contractReview": { defaultMessage: "Contract Review" },

  "@legalos.matters.billing.hourly": { defaultMessage: "Hourly" },
  "@legalos.matters.billing.fixedFee": { defaultMessage: "Fixed Fee" },
  "@legalos.matters.billing.retainer": { defaultMessage: "Retainer" },

  "@legalos.matters.docStatus.draft": { defaultMessage: "Draft" },
  "@legalos.matters.docStatus.underReview": { defaultMessage: "Under review" },
  "@legalos.matters.docStatus.signed": { defaultMessage: "Signed" },
  "@legalos.matters.docStatus.filed": { defaultMessage: "Filed" },
  "@legalos.matters.docStatus.final": { defaultMessage: "Final" },

  "@legalos.matters.timelineKind.milestone": { defaultMessage: "Milestone" },
  "@legalos.matters.timelineKind.filing": { defaultMessage: "Filing" },
  "@legalos.matters.timelineKind.communication": { defaultMessage: "Communication" },
  "@legalos.matters.timelineKind.billing": { defaultMessage: "Billing" },

  // Field labels reused across filters, the create dialog, and the detail header.
  "@legalos.matters.field.status": { defaultMessage: "Status" },
  "@legalos.matters.field.type": { defaultMessage: "Type" },
  "@legalos.matters.field.responsible": { defaultMessage: "Responsible" },
  "@legalos.matters.field.client": { defaultMessage: "Client" },
  "@legalos.matters.field.billing": { defaultMessage: "Billing" },
  "@legalos.matters.field.opened": { defaultMessage: "Opened" },
  "@legalos.matters.field.closed": { defaultMessage: "Closed" },
  "@legalos.matters.field.description": { defaultMessage: "Description" },
  "@legalos.matters.field.nextDeadline": { defaultMessage: "Next deadline" },

  // List page (app/matters/page.tsx)
  "@legalos.matters.list.search.label": { defaultMessage: "Search matters" },
  "@legalos.matters.list.search.placeholder": {
    defaultMessage: "Search by matter or client",
  },
  "@legalos.matters.list.filter.allTypes": { defaultMessage: "All types" },
  "@legalos.matters.list.filter.allStatuses": { defaultMessage: "All statuses" },
  "@legalos.matters.list.table.matter": { defaultMessage: "Matter" },
  "@legalos.matters.list.noDeadline": { defaultMessage: "None scheduled" },
  "@legalos.matters.list.deadlineBadge": {
    defaultMessage: "{date} · {days, plural, one {# day} other {# days}}",
  },
  // Overdue takes its own key rather than letting a negative {days} through:
  // "-1 يوم" is not a sentence in any language, and Arabic needs the count
  // word to agree with the number besides.
  "@legalos.matters.list.deadlineBadgeOverdue": {
    defaultMessage: "{date} · {days, plural, one {# day} other {# days}} overdue",
  },
  "@legalos.matters.list.emptyTitle": {
    defaultMessage: "No matters match your filters",
  },
  "@legalos.matters.list.emptyDescription": {
    defaultMessage: "Try a different search term, or open a new matter.",
  },
  "@legalos.matters.list.clearFilters": { defaultMessage: "Clear filters" },
  "@legalos.matters.list.loading": { defaultMessage: "Loading matters…" },

  // New matter dialog
  "@legalos.matters.dialog.nameLabel": { defaultMessage: "Matter name" },
  "@legalos.matters.dialog.namePlaceholder": {
    defaultMessage: "نبيل ضد شركة النيل للتجارة",
  },
  "@legalos.matters.dialog.selectClient": { defaultMessage: "Select a client" },
  "@legalos.matters.dialog.clientsLoading": { defaultMessage: "Loading clients…" },
  "@legalos.matters.dialog.selectLawyer": { defaultMessage: "Select a lawyer" },
  "@legalos.matters.dialog.submit": { defaultMessage: "Open matter" },
  "@legalos.matters.dialog.cancel": { defaultMessage: "Cancel" },
  "@legalos.matters.dialog.error": { defaultMessage: "Could not open this matter." },

  // Detail page (app/matters/[id]/page.tsx)
  "@legalos.matters.detail.loading": { defaultMessage: "Loading matter…" },
  "@legalos.matters.detail.subtitle": { defaultMessage: "{type} · opened {date}" },
  "@legalos.matters.detail.metaNameDate": { defaultMessage: "{name} · {date}" },
  "@legalos.matters.detail.hoursValue": { defaultMessage: "{hours}h" },

  "@legalos.matters.detail.tab.overview": { defaultMessage: "Overview" },
  "@legalos.matters.detail.tab.timeline": { defaultMessage: "Timeline" },
  "@legalos.matters.detail.tab.documents": { defaultMessage: "Documents" },
  "@legalos.matters.detail.tab.tasks": { defaultMessage: "Tasks" },
  "@legalos.matters.detail.tab.time": { defaultMessage: "Time & billing" },
  "@legalos.matters.detail.tab.notes": { defaultMessage: "Notes" },

  "@legalos.matters.detail.summary.heading": { defaultMessage: "Summary" },
  "@legalos.matters.detail.summary.noDescription": {
    defaultMessage: "No description recorded.",
  },

  "@legalos.matters.detail.linkedCase.heading": { defaultMessage: "Linked court case" },
  "@legalos.matters.detail.linkedCase.openCase": { defaultMessage: "Open case" },
  "@legalos.matters.detail.linkedCase.caseNumber": { defaultMessage: "Case number" },
  "@legalos.matters.detail.linkedCase.court": { defaultMessage: "Court" },
  "@legalos.matters.detail.linkedCase.opposingParty": {
    defaultMessage: "Opposing party",
  },

  "@legalos.matters.detail.openTasks.heading": { defaultMessage: "Open tasks" },
  "@legalos.matters.detail.openTasks.empty": { defaultMessage: "Nothing outstanding." },

  "@legalos.matters.detail.activity.heading": { defaultMessage: "Recent activity" },
  "@legalos.matters.detail.activity.empty": { defaultMessage: "No activity yet." },

  "@legalos.matters.detail.glance.heading": { defaultMessage: "At a glance" },
  "@legalos.matters.detail.glance.budget": { defaultMessage: "Budget" },
  "@legalos.matters.detail.glance.estimateSuffix": { defaultMessage: " (est.)" },
  "@legalos.matters.detail.glance.hoursLogged": { defaultMessage: "Hours logged" },
  "@legalos.matters.detail.glance.unbilled": { defaultMessage: "Unbilled" },

  "@legalos.matters.detail.team.heading": { defaultMessage: "Team" },
  "@legalos.matters.detail.team.supporting": { defaultMessage: "Supporting" },

  "@legalos.matters.detail.hearings.heading": { defaultMessage: "Hearings" },
  "@legalos.matters.detail.hearings.empty": { defaultMessage: "None scheduled." },
  "@legalos.matters.detail.hearings.defaultPurpose": { defaultMessage: "Hearing" },

  "@legalos.matters.detail.timeline.heading": { defaultMessage: "Matter timeline" },
  "@legalos.matters.detail.timeline.emptyTitle": { defaultMessage: "No milestones yet" },
  "@legalos.matters.detail.timeline.emptyDescription": {
    defaultMessage: "Filings, communications and billing events appear here.",
  },

  "@legalos.matters.detail.documents.heading": { defaultMessage: "Documents" },
  "@legalos.matters.detail.documents.allDocuments": { defaultMessage: "All documents" },
  "@legalos.matters.detail.documents.emptyTitle": { defaultMessage: "No documents" },
  "@legalos.matters.detail.documents.emptyDescription": {
    defaultMessage: "Upload documents from the Documents screen to file them here.",
  },

  "@legalos.matters.detail.tasks.heading": { defaultMessage: "Tasks" },
  "@legalos.matters.detail.tasks.allTasks": { defaultMessage: "All tasks" },
  "@legalos.matters.detail.tasks.emptyTitle": { defaultMessage: "No tasks" },
  "@legalos.matters.detail.tasks.emptyDescription": {
    defaultMessage: "Add tasks from the Tasks screen and assign them to this matter.",
  },
  "@legalos.matters.detail.tasks.dueDate": { defaultMessage: "{name} · due {date}" },
  "@legalos.matters.detail.tasks.overdue": { defaultMessage: "Overdue" },
  "@legalos.matters.detail.tasks.markDone": { defaultMessage: "Mark done" },
  "@legalos.matters.detail.tasks.reopen": { defaultMessage: "Reopen" },

  "@legalos.matters.detail.time.heading": { defaultMessage: "Time entries" },
  "@legalos.matters.detail.time.link": { defaultMessage: "Time tracking" },
  "@legalos.matters.detail.time.empty": {
    defaultMessage: "No time logged against this matter.",
  },
  "@legalos.matters.detail.time.defaultDescription": { defaultMessage: "Legal services" },
  "@legalos.matters.detail.time.invoiced": { defaultMessage: "Invoiced" },

  "@legalos.matters.detail.billing.hours": { defaultMessage: "Hours" },
  "@legalos.matters.detail.billing.billableValue": { defaultMessage: "Billable value" },

  "@legalos.matters.detail.invoices.heading": { defaultMessage: "Invoices" },
  "@legalos.matters.detail.invoices.empty": { defaultMessage: "No invoices raised." },

  "@legalos.matters.detail.notes.heading": { defaultMessage: "Notes" },
  "@legalos.matters.detail.notes.addLabel": { defaultMessage: "Add a note" },
  "@legalos.matters.detail.notes.placeholder": {
    defaultMessage: "What should the team know about this matter?",
  },
  "@legalos.matters.detail.notes.addButton": { defaultMessage: "Add note" },
  "@legalos.matters.detail.notes.emptyTitle": { defaultMessage: "No notes yet" },
  "@legalos.matters.detail.notes.emptyDescription": {
    defaultMessage: "Notes are visible to everyone on the matter.",
  },

  "@legalos.matters.detail.errors.note": { defaultMessage: "Could not save this note." },
  "@legalos.matters.detail.errors.status": {
    defaultMessage: "Could not update this matter.",
  },
  "@legalos.matters.detail.errors.task": { defaultMessage: "Could not update this task." },
};

export const ar: Catalog = {
  "@legalos.matters.heading": { defaultMessage: "الملفات" },
  "@legalos.matters.count": {
    defaultMessage:
      "{count, plural, zero {لا توجد ملفات} one {ملف واحد} two {ملفان} few {# ملفات} many {# ملفًا} other {# ملف}}",
  },
  "@legalos.matters.newMatter": { defaultMessage: "ملف جديد" },
  "@legalos.matters.savingEllipsis": { defaultMessage: "جارٍ الحفظ…" },

  "@legalos.matters.status.active": { defaultMessage: "نشط" },
  "@legalos.matters.status.onHold": { defaultMessage: "معلّق" },
  "@legalos.matters.status.closed": { defaultMessage: "مغلق" },

  "@legalos.matters.type.litigation": { defaultMessage: "التقاضي" },
  "@legalos.matters.type.corporate": { defaultMessage: "الشركات" },
  "@legalos.matters.type.tax": { defaultMessage: "الضرائب" },
  "@legalos.matters.type.labour": { defaultMessage: "العمل" },
  "@legalos.matters.type.familyProbate": { defaultMessage: "الأسرة والتركات" },
  "@legalos.matters.type.contractReview": { defaultMessage: "مراجعة العقود" },

  "@legalos.matters.billing.hourly": { defaultMessage: "بالساعة" },
  "@legalos.matters.billing.fixedFee": { defaultMessage: "أتعاب مقطوعة" },
  "@legalos.matters.billing.retainer": { defaultMessage: "أتعاب دورية" },

  "@legalos.matters.docStatus.draft": { defaultMessage: "مسودة" },
  "@legalos.matters.docStatus.underReview": { defaultMessage: "قيد المراجعة" },
  "@legalos.matters.docStatus.signed": { defaultMessage: "موقَّع" },
  "@legalos.matters.docStatus.filed": { defaultMessage: "مودَعة" },
  "@legalos.matters.docStatus.final": { defaultMessage: "نهائي" },

  "@legalos.matters.timelineKind.milestone": { defaultMessage: "معلم رئيسي" },
  "@legalos.matters.timelineKind.filing": { defaultMessage: "إيداع" },
  "@legalos.matters.timelineKind.communication": { defaultMessage: "مراسلة" },
  "@legalos.matters.timelineKind.billing": { defaultMessage: "فوترة" },

  "@legalos.matters.field.status": { defaultMessage: "الحالة" },
  "@legalos.matters.field.type": { defaultMessage: "النوع" },
  "@legalos.matters.field.responsible": { defaultMessage: "المسؤول" },
  "@legalos.matters.field.client": { defaultMessage: "العميل" },
  "@legalos.matters.field.billing": { defaultMessage: "الفوترة" },
  "@legalos.matters.field.opened": { defaultMessage: "تاريخ الفتح" },
  "@legalos.matters.field.closed": { defaultMessage: "تاريخ الإغلاق" },
  "@legalos.matters.field.description": { defaultMessage: "الوصف" },
  "@legalos.matters.field.nextDeadline": { defaultMessage: "الموعد النهائي القادم" },

  "@legalos.matters.list.search.label": { defaultMessage: "البحث في الملفات" },
  "@legalos.matters.list.search.placeholder": {
    defaultMessage: "ابحث باسم الملف أو العميل",
  },
  "@legalos.matters.list.filter.allTypes": { defaultMessage: "جميع الأنواع" },
  "@legalos.matters.list.filter.allStatuses": { defaultMessage: "جميع الحالات" },
  "@legalos.matters.list.table.matter": { defaultMessage: "الملف" },
  "@legalos.matters.list.noDeadline": { defaultMessage: "لا يوجد موعد محدد" },
  "@legalos.matters.list.deadlineBadge": {
    defaultMessage:
      "{date} · {days, plural, zero {اليوم} one {يوم واحد} two {يومان} few {# أيام} many {# يومًا} other {# يوم}}",
  },
  "@legalos.matters.list.deadlineBadgeOverdue": {
    defaultMessage:
      "{date} · متأخر {days, plural, one {يومًا واحدًا} two {يومين} few {# أيام} many {# يومًا} other {# يوم}}",
  },
  "@legalos.matters.list.emptyTitle": {
    defaultMessage: "لا توجد ملفات مطابقة لعوامل التصفية",
  },
  "@legalos.matters.list.emptyDescription": {
    defaultMessage: "جرّب كلمة بحث مختلفة، أو افتح ملفًا جديدًا.",
  },
  "@legalos.matters.list.clearFilters": { defaultMessage: "مسح عوامل التصفية" },
  "@legalos.matters.list.loading": { defaultMessage: "جارٍ تحميل الملفات…" },

  "@legalos.matters.dialog.nameLabel": { defaultMessage: "اسم الملف" },
  "@legalos.matters.dialog.namePlaceholder": {
    defaultMessage: "نبيل ضد شركة النيل للتجارة",
  },
  "@legalos.matters.dialog.selectClient": { defaultMessage: "اختر عميلاً" },
  "@legalos.matters.dialog.clientsLoading": { defaultMessage: "جارٍ تحميل العملاء…" },
  "@legalos.matters.dialog.selectLawyer": { defaultMessage: "اختر محاميًا" },
  "@legalos.matters.dialog.submit": { defaultMessage: "فتح الملف" },
  "@legalos.matters.dialog.cancel": { defaultMessage: "إلغاء" },
  "@legalos.matters.dialog.error": { defaultMessage: "تعذّر فتح هذا الملف." },

  "@legalos.matters.detail.loading": { defaultMessage: "جارٍ تحميل الملف…" },
  "@legalos.matters.detail.subtitle": { defaultMessage: "{type} · فُتح في {date}" },
  "@legalos.matters.detail.metaNameDate": { defaultMessage: "{name} · {date}" },
  "@legalos.matters.detail.hoursValue": { defaultMessage: "{hours} ساعة" },

  "@legalos.matters.detail.tab.overview": { defaultMessage: "نظرة عامة" },
  "@legalos.matters.detail.tab.timeline": { defaultMessage: "الجدول الزمني" },
  "@legalos.matters.detail.tab.documents": { defaultMessage: "المستندات" },
  "@legalos.matters.detail.tab.tasks": { defaultMessage: "المهام" },
  "@legalos.matters.detail.tab.time": { defaultMessage: "الوقت والفوترة" },
  "@legalos.matters.detail.tab.notes": { defaultMessage: "الملاحظات" },

  "@legalos.matters.detail.summary.heading": { defaultMessage: "الملخص" },
  "@legalos.matters.detail.summary.noDescription": {
    defaultMessage: "لا يوجد وصف مسجل.",
  },

  "@legalos.matters.detail.linkedCase.heading": { defaultMessage: "القضية المرتبطة" },
  "@legalos.matters.detail.linkedCase.openCase": { defaultMessage: "فتح القضية" },
  "@legalos.matters.detail.linkedCase.caseNumber": { defaultMessage: "رقم القضية" },
  "@legalos.matters.detail.linkedCase.court": { defaultMessage: "المحكمة" },
  "@legalos.matters.detail.linkedCase.opposingParty": { defaultMessage: "الطرف الخصم" },

  "@legalos.matters.detail.openTasks.heading": { defaultMessage: "المهام المفتوحة" },
  "@legalos.matters.detail.openTasks.empty": { defaultMessage: "لا توجد مهام معلّقة." },

  "@legalos.matters.detail.activity.heading": { defaultMessage: "النشاط الأخير" },
  "@legalos.matters.detail.activity.empty": { defaultMessage: "لا يوجد نشاط بعد." },

  "@legalos.matters.detail.glance.heading": { defaultMessage: "نظرة سريعة" },
  "@legalos.matters.detail.glance.budget": { defaultMessage: "الميزانية" },
  "@legalos.matters.detail.glance.estimateSuffix": { defaultMessage: " (تقديري)" },
  "@legalos.matters.detail.glance.hoursLogged": { defaultMessage: "الساعات المسجلة" },
  "@legalos.matters.detail.glance.unbilled": { defaultMessage: "غير مفوتَر" },

  "@legalos.matters.detail.team.heading": { defaultMessage: "الفريق" },
  "@legalos.matters.detail.team.supporting": { defaultMessage: "مساند" },

  "@legalos.matters.detail.hearings.heading": { defaultMessage: "الجلسات" },
  "@legalos.matters.detail.hearings.empty": { defaultMessage: "لا توجد جلسات مجدولة." },
  "@legalos.matters.detail.hearings.defaultPurpose": { defaultMessage: "جلسة" },

  "@legalos.matters.detail.timeline.heading": { defaultMessage: "الجدول الزمني للملف" },
  "@legalos.matters.detail.timeline.emptyTitle": { defaultMessage: "لا توجد معالم بعد" },
  "@legalos.matters.detail.timeline.emptyDescription": {
    defaultMessage: "تظهر هنا الإيداعات والمراسلات وأحداث الفوترة.",
  },

  "@legalos.matters.detail.documents.heading": { defaultMessage: "المستندات" },
  "@legalos.matters.detail.documents.allDocuments": { defaultMessage: "جميع المستندات" },
  "@legalos.matters.detail.documents.emptyTitle": { defaultMessage: "لا توجد مستندات" },
  "@legalos.matters.detail.documents.emptyDescription": {
    defaultMessage: "ارفع المستندات من شاشة المستندات لإدراجها هنا.",
  },

  "@legalos.matters.detail.tasks.heading": { defaultMessage: "المهام" },
  "@legalos.matters.detail.tasks.allTasks": { defaultMessage: "جميع المهام" },
  "@legalos.matters.detail.tasks.emptyTitle": { defaultMessage: "لا توجد مهام" },
  "@legalos.matters.detail.tasks.emptyDescription": {
    defaultMessage: "أضف مهامًا من شاشة المهام وخصّصها لهذا الملف.",
  },
  "@legalos.matters.detail.tasks.dueDate": { defaultMessage: "{name} · الاستحقاق {date}" },
  "@legalos.matters.detail.tasks.overdue": { defaultMessage: "متأخرة" },
  "@legalos.matters.detail.tasks.markDone": { defaultMessage: "إكمال" },
  "@legalos.matters.detail.tasks.reopen": { defaultMessage: "إعادة فتح" },

  "@legalos.matters.detail.time.heading": { defaultMessage: "سجلات الوقت" },
  "@legalos.matters.detail.time.link": { defaultMessage: "تتبع الوقت" },
  "@legalos.matters.detail.time.empty": {
    defaultMessage: "لم يُسجَّل وقت لهذا الملف.",
  },
  "@legalos.matters.detail.time.defaultDescription": { defaultMessage: "خدمات قانونية" },
  "@legalos.matters.detail.time.invoiced": { defaultMessage: "مفوتَر" },

  "@legalos.matters.detail.billing.hours": { defaultMessage: "الساعات" },
  "@legalos.matters.detail.billing.billableValue": { defaultMessage: "القيمة القابلة للفوترة" },

  "@legalos.matters.detail.invoices.heading": { defaultMessage: "الفواتير" },
  "@legalos.matters.detail.invoices.empty": { defaultMessage: "لم تُصدر أي فواتير." },

  "@legalos.matters.detail.notes.heading": { defaultMessage: "الملاحظات" },
  "@legalos.matters.detail.notes.addLabel": { defaultMessage: "إضافة ملاحظة" },
  "@legalos.matters.detail.notes.placeholder": {
    defaultMessage: "ما الذي يجب أن يعرفه الفريق عن هذا الملف؟",
  },
  "@legalos.matters.detail.notes.addButton": { defaultMessage: "إضافة ملاحظة" },
  "@legalos.matters.detail.notes.emptyTitle": { defaultMessage: "لا توجد ملاحظات بعد" },
  "@legalos.matters.detail.notes.emptyDescription": {
    defaultMessage: "الملاحظات مرئية لجميع العاملين على هذا الملف.",
  },

  "@legalos.matters.detail.errors.note": { defaultMessage: "تعذّر حفظ هذه الملاحظة." },
  "@legalos.matters.detail.errors.status": { defaultMessage: "تعذّر تحديث هذا الملف." },
  "@legalos.matters.detail.errors.task": { defaultMessage: "تعذّر تحديث هذه المهمة." },
};
