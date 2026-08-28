import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  // ---------------------------------------------------------------------
  // Time tracking (app/time-tracking/page.tsx)
  // ---------------------------------------------------------------------
  "@legalos.timeTracking.heading": { defaultMessage: "Time Tracking" },
  "@legalos.timeTracking.weekOf": { defaultMessage: "Week of {start} – {end}" },
  "@legalos.timeTracking.newTimeEntry": { defaultMessage: "New time entry" },
  "@legalos.timeTracking.loading": { defaultMessage: "Loading this week…" },

  "@legalos.timeTracking.day.sun": { defaultMessage: "Sun" },
  "@legalos.timeTracking.day.mon": { defaultMessage: "Mon" },
  "@legalos.timeTracking.day.tue": { defaultMessage: "Tue" },
  "@legalos.timeTracking.day.wed": { defaultMessage: "Wed" },
  "@legalos.timeTracking.day.thu": { defaultMessage: "Thu" },
  "@legalos.timeTracking.day.fri": { defaultMessage: "Fri" },
  "@legalos.timeTracking.day.sat": { defaultMessage: "Sat" },

  "@legalos.timeTracking.chart.heading": { defaultMessage: "Billable vs. non-billable hours" },
  "@legalos.timeTracking.chart.thisWeek": { defaultMessage: "This week" },
  "@legalos.timeTracking.chart.billable": { defaultMessage: "Billable" },
  "@legalos.timeTracking.chart.nonBillable": { defaultMessage: "Non-billable" },

  "@legalos.timeTracking.hoursShort": { defaultMessage: "{hours}h" },

  "@legalos.timeTracking.weekOverview.heading": { defaultMessage: "Week overview" },
  "@legalos.timeTracking.weekOverview.calendarViewLabel": { defaultMessage: "Calendar view" },
  "@legalos.timeTracking.weekOverview.week": { defaultMessage: "Week" },
  "@legalos.timeTracking.weekOverview.day": { defaultMessage: "Day" },
  "@legalos.timeTracking.weekOverview.today": { defaultMessage: "Today" },
  "@legalos.timeTracking.weekOverview.viewDay": { defaultMessage: "View {day}" },
  "@legalos.timeTracking.weekOverview.clear": { defaultMessage: "Clear" },
  "@legalos.timeTracking.weekOverview.view": { defaultMessage: "View" },

  "@legalos.timeTracking.entries.heading": { defaultMessage: "Time entries" },
  "@legalos.timeTracking.entries.showingDate": { defaultMessage: "Showing {date}" },
  "@legalos.timeTracking.entries.showingToday": { defaultMessage: "Showing today, {date}" },
  "@legalos.timeTracking.entries.showingFullWeek": { defaultMessage: "Showing full week" },
  "@legalos.timeTracking.entries.empty": {
    defaultMessage: "No time logged for this period yet.",
  },

  "@legalos.timeTracking.table.date": { defaultMessage: "Date" },
  "@legalos.timeTracking.table.matter": { defaultMessage: "Matter" },
  "@legalos.timeTracking.table.description": { defaultMessage: "Description" },
  "@legalos.timeTracking.table.lawyer": { defaultMessage: "Lawyer" },
  "@legalos.timeTracking.table.billable": { defaultMessage: "Billable" },
  "@legalos.timeTracking.table.duration": { defaultMessage: "Duration" },

  "@legalos.timeTracking.badge.nonBillable": { defaultMessage: "Non-billable" },
  "@legalos.timeTracking.badge.invoiced": { defaultMessage: "Invoiced" },

  "@legalos.timeTracking.summary.heading": { defaultMessage: "Timesheet summary" },
  "@legalos.timeTracking.summary.fullReport": { defaultMessage: "Full report" },
  "@legalos.timeTracking.summary.targetLabel": {
    defaultMessage: "Week to date, target {hours}h billable",
  },
  "@legalos.timeTracking.summary.empty": { defaultMessage: "No time logged this week." },
  "@legalos.timeTracking.summary.billableHours": { defaultMessage: "{hours}h billable" },
  "@legalos.timeTracking.summary.otherHours": { defaultMessage: "{hours}h other" },
  "@legalos.timeTracking.summary.utilizationAriaLabel": {
    defaultMessage: "{name} weekly utilization",
  },

  "@legalos.timeTracking.timer.heading": { defaultMessage: "Timer" },
  "@legalos.timeTracking.timer.running": { defaultMessage: "Running" },
  "@legalos.timeTracking.timer.matterLabel": { defaultMessage: "Matter" },
  "@legalos.timeTracking.timer.matterPlaceholder": { defaultMessage: "Select a matter" },
  "@legalos.timeTracking.timer.descriptionLabel": { defaultMessage: "Description" },
  "@legalos.timeTracking.timer.descriptionPlaceholder": {
    defaultMessage: "What are you working on?",
  },
  "@legalos.timeTracking.timer.stopAndLog": { defaultMessage: "Stop timer and log" },
  "@legalos.timeTracking.timer.start": { defaultMessage: "Start timer" },
  "@legalos.timeTracking.timer.stopShort": { defaultMessage: "Stop" },
  "@legalos.timeTracking.timer.startShort": { defaultMessage: "Start" },
  "@legalos.timeTracking.timer.pickMatterHint": {
    defaultMessage: "Pick a matter to start the timer.",
  },
  "@legalos.timeTracking.timer.error": { defaultMessage: "Could not log this time." },

  "@legalos.timeTracking.dialog.title": { defaultMessage: "New time entry" },
  "@legalos.timeTracking.dialog.matterLabel": { defaultMessage: "Matter" },
  "@legalos.timeTracking.dialog.matterPlaceholder": { defaultMessage: "Select a matter" },
  "@legalos.timeTracking.dialog.dateLabel": { defaultMessage: "Date" },
  "@legalos.timeTracking.dialog.hoursLabel": { defaultMessage: "Hours" },
  "@legalos.timeTracking.dialog.rateLabel": { defaultMessage: "Rate" },
  "@legalos.timeTracking.dialog.descriptionLabel": { defaultMessage: "Description" },
  "@legalos.timeTracking.dialog.descriptionPlaceholder": {
    defaultMessage: "Drafted appeal brief",
  },
  "@legalos.timeTracking.dialog.billableLabel": { defaultMessage: "Billable" },
  "@legalos.timeTracking.dialog.cancel": { defaultMessage: "Cancel" },
  "@legalos.timeTracking.dialog.saving": { defaultMessage: "Saving…" },
  "@legalos.timeTracking.dialog.logTime": { defaultMessage: "Log time" },
  "@legalos.timeTracking.dialog.error": { defaultMessage: "Could not save this entry." },

  // ---------------------------------------------------------------------
  // Billing (app/billing/page.tsx)
  // ---------------------------------------------------------------------
  "@legalos.billing.heading": { defaultMessage: "Billing" },
  "@legalos.billing.subheading": {
    defaultMessage: "Invoices raised against matters and clients",
  },
  "@legalos.billing.invoiceUnbilled": { defaultMessage: "Invoice unbilled time" },
  "@legalos.billing.loading": { defaultMessage: "Loading billing…" },

  "@legalos.billing.kpi.outstanding": { defaultMessage: "Total Outstanding" },
  "@legalos.billing.kpi.overdue": { defaultMessage: "Overdue" },
  "@legalos.billing.kpi.draft": { defaultMessage: "Draft — Pending Send" },
  "@legalos.billing.kpi.collected": { defaultMessage: "Collected this year" },
  "@legalos.billing.kpi.openInvoices": {
    defaultMessage: "{count, plural, one {# open invoice} other {# open invoices}}",
  },
  "@legalos.billing.kpi.pastDue": {
    defaultMessage: "{count, plural, one {# invoice past due} other {# invoices past due}}",
  },
  "@legalos.billing.kpi.notYetSent": {
    defaultMessage:
      "{count, plural, one {# draft not yet sent} other {# drafts not yet sent}}",
  },
  "@legalos.billing.kpi.invoicesPaid": {
    defaultMessage: "{count, plural, one {# invoice paid} other {# invoices paid}}",
  },

  "@legalos.billing.chart.heading": { defaultMessage: "Invoiced vs. collected" },
  "@legalos.billing.chart.lastMonths": {
    defaultMessage: "{count, plural, one {Last # month} other {Last # months}}",
  },
  "@legalos.billing.chart.invoiced": { defaultMessage: "Invoiced" },
  "@legalos.billing.chart.collected": { defaultMessage: "Collected" },

  "@legalos.billing.table.invoice": { defaultMessage: "Invoice" },
  "@legalos.billing.detail.heading": { defaultMessage: "Details" },
  "@legalos.billing.detail.lineItems": { defaultMessage: "Line items" },
  "@legalos.billing.detail.noLineItems": { defaultMessage: "No line items" },
  "@legalos.billing.detail.noLineItemsDescription": {
    defaultMessage: "This invoice carries a total of {total} without an itemized breakdown.",
  },
  "@legalos.billing.table.client": { defaultMessage: "Client" },
  "@legalos.billing.table.matter": { defaultMessage: "Matter" },
  "@legalos.billing.table.issued": { defaultMessage: "Issued" },
  "@legalos.billing.table.due": { defaultMessage: "Due" },
  "@legalos.billing.table.status": { defaultMessage: "Status" },
  "@legalos.billing.table.amount": { defaultMessage: "Amount" },

  "@legalos.billing.action.send": { defaultMessage: "Send" },
  "@legalos.billing.action.markPaid": { defaultMessage: "Mark paid" },

  "@legalos.billing.status.draft": { defaultMessage: "Draft" },
  "@legalos.billing.status.sent": { defaultMessage: "Sent" },
  "@legalos.billing.status.paid": { defaultMessage: "Paid" },
  "@legalos.billing.status.overdue": { defaultMessage: "Overdue" },

  "@legalos.billing.invoices.heading": { defaultMessage: "Invoices" },
  "@legalos.billing.invoices.emptyTitle": { defaultMessage: "No invoices yet" },
  "@legalos.billing.invoices.emptyDescription": {
    defaultMessage: "Log billable time against a matter, then raise an invoice for it.",
  },

  "@legalos.billing.error.updateInvoice": { defaultMessage: "Could not update this invoice." },

  "@legalos.billing.dialog.title": { defaultMessage: "Invoice unbilled time" },
  "@legalos.billing.dialog.description": {
    defaultMessage:
      "Drafts an invoice covering every unbilled billable hour logged against the matter. Those hours are then locked to that invoice.",
  },
  "@legalos.billing.dialog.noneAvailable": {
    defaultMessage: "No matter has unbilled billable time right now.",
  },
  "@legalos.billing.dialog.matterLabel": { defaultMessage: "Matter" },
  "@legalos.billing.dialog.loadingPlaceholder": { defaultMessage: "Loading…" },
  "@legalos.billing.dialog.matterPlaceholder": { defaultMessage: "Select a matter to bill" },
  "@legalos.billing.dialog.cancel": { defaultMessage: "Cancel" },
  "@legalos.billing.dialog.drafting": { defaultMessage: "Drafting…" },
  "@legalos.billing.dialog.draftInvoice": { defaultMessage: "Draft invoice" },
  "@legalos.billing.dialog.error": { defaultMessage: "Could not draft this invoice." },
};

export const ar: Catalog = {
  // ---------------------------------------------------------------------
  // Time tracking (app/time-tracking/page.tsx)
  // ---------------------------------------------------------------------
  "@legalos.timeTracking.heading": { defaultMessage: "تتبع الوقت" },
  "@legalos.timeTracking.weekOf": { defaultMessage: "أسبوع {start} – {end}" },
  "@legalos.timeTracking.newTimeEntry": { defaultMessage: "إدخال وقت جديد" },
  "@legalos.timeTracking.loading": { defaultMessage: "جارٍ تحميل هذا الأسبوع…" },

  "@legalos.timeTracking.day.sun": { defaultMessage: "أحد" },
  "@legalos.timeTracking.day.mon": { defaultMessage: "اثنين" },
  "@legalos.timeTracking.day.tue": { defaultMessage: "ثلاثاء" },
  "@legalos.timeTracking.day.wed": { defaultMessage: "أربعاء" },
  "@legalos.timeTracking.day.thu": { defaultMessage: "خميس" },
  "@legalos.timeTracking.day.fri": { defaultMessage: "جمعة" },
  "@legalos.timeTracking.day.sat": { defaultMessage: "سبت" },

  "@legalos.timeTracking.chart.heading": {
    defaultMessage: "الساعات القابلة للفوترة مقابل غير القابلة للفوترة",
  },
  "@legalos.timeTracking.chart.thisWeek": { defaultMessage: "هذا الأسبوع" },
  "@legalos.timeTracking.chart.billable": { defaultMessage: "قابلة للفوترة" },
  "@legalos.timeTracking.chart.nonBillable": { defaultMessage: "غير قابلة للفوترة" },

  "@legalos.timeTracking.hoursShort": { defaultMessage: "{hours} س" },

  "@legalos.timeTracking.weekOverview.heading": { defaultMessage: "نظرة عامة على الأسبوع" },
  "@legalos.timeTracking.weekOverview.calendarViewLabel": {
    defaultMessage: "طريقة عرض التقويم",
  },
  "@legalos.timeTracking.weekOverview.week": { defaultMessage: "أسبوع" },
  "@legalos.timeTracking.weekOverview.day": { defaultMessage: "يوم" },
  "@legalos.timeTracking.weekOverview.today": { defaultMessage: "اليوم" },
  "@legalos.timeTracking.weekOverview.viewDay": { defaultMessage: "عرض يوم {day}" },
  "@legalos.timeTracking.weekOverview.clear": { defaultMessage: "مسح" },
  "@legalos.timeTracking.weekOverview.view": { defaultMessage: "عرض" },

  "@legalos.timeTracking.entries.heading": { defaultMessage: "إدخالات الوقت" },
  "@legalos.timeTracking.entries.showingDate": { defaultMessage: "عرض {date}" },
  "@legalos.timeTracking.entries.showingToday": { defaultMessage: "عرض اليوم، {date}" },
  "@legalos.timeTracking.entries.showingFullWeek": { defaultMessage: "عرض الأسبوع كاملاً" },
  "@legalos.timeTracking.entries.empty": {
    defaultMessage: "لم يُسجَّل أي وقت لهذه الفترة بعد.",
  },

  "@legalos.timeTracking.table.date": { defaultMessage: "التاريخ" },
  "@legalos.timeTracking.table.matter": { defaultMessage: "القضية" },
  "@legalos.timeTracking.table.description": { defaultMessage: "الوصف" },
  "@legalos.timeTracking.table.lawyer": { defaultMessage: "المحامي" },
  "@legalos.timeTracking.table.billable": { defaultMessage: "الفوترة" },
  "@legalos.timeTracking.table.duration": { defaultMessage: "المدة" },

  "@legalos.timeTracking.badge.nonBillable": { defaultMessage: "غير قابلة للفوترة" },
  "@legalos.timeTracking.badge.invoiced": { defaultMessage: "مفوترة" },

  "@legalos.timeTracking.summary.heading": { defaultMessage: "ملخص كشف الوقت" },
  "@legalos.timeTracking.summary.fullReport": { defaultMessage: "التقرير الكامل" },
  "@legalos.timeTracking.summary.targetLabel": {
    defaultMessage: "حتى الآن هذا الأسبوع، الهدف {hours} ساعة قابلة للفوترة",
  },
  "@legalos.timeTracking.summary.empty": { defaultMessage: "لم يُسجَّل أي وقت هذا الأسبوع." },
  "@legalos.timeTracking.summary.billableHours": {
    defaultMessage: "{hours} ساعة قابلة للفوترة",
  },
  "@legalos.timeTracking.summary.otherHours": { defaultMessage: "{hours} ساعة أخرى" },
  "@legalos.timeTracking.summary.utilizationAriaLabel": {
    defaultMessage: "معدل استخدام {name} الأسبوعي",
  },

  "@legalos.timeTracking.timer.heading": { defaultMessage: "المؤقت" },
  "@legalos.timeTracking.timer.running": { defaultMessage: "قيد التشغيل" },
  "@legalos.timeTracking.timer.matterLabel": { defaultMessage: "القضية" },
  "@legalos.timeTracking.timer.matterPlaceholder": { defaultMessage: "اختر قضيةً" },
  "@legalos.timeTracking.timer.descriptionLabel": { defaultMessage: "الوصف" },
  "@legalos.timeTracking.timer.descriptionPlaceholder": {
    defaultMessage: "ما الذي تعمل عليه؟",
  },
  "@legalos.timeTracking.timer.stopAndLog": { defaultMessage: "إيقاف المؤقت وتسجيل الوقت" },
  "@legalos.timeTracking.timer.start": { defaultMessage: "بدء المؤقت" },
  "@legalos.timeTracking.timer.stopShort": { defaultMessage: "إيقاف" },
  "@legalos.timeTracking.timer.startShort": { defaultMessage: "بدء" },
  "@legalos.timeTracking.timer.pickMatterHint": {
    defaultMessage: "اختر قضيةً لبدء المؤقت.",
  },
  "@legalos.timeTracking.timer.error": { defaultMessage: "تعذّر تسجيل هذا الوقت." },

  "@legalos.timeTracking.dialog.title": { defaultMessage: "إدخال وقت جديد" },
  "@legalos.timeTracking.dialog.matterLabel": { defaultMessage: "القضية" },
  "@legalos.timeTracking.dialog.matterPlaceholder": { defaultMessage: "اختر قضيةً" },
  "@legalos.timeTracking.dialog.dateLabel": { defaultMessage: "التاريخ" },
  "@legalos.timeTracking.dialog.hoursLabel": { defaultMessage: "الساعات" },
  "@legalos.timeTracking.dialog.rateLabel": { defaultMessage: "السعر" },
  "@legalos.timeTracking.dialog.descriptionLabel": { defaultMessage: "الوصف" },
  "@legalos.timeTracking.dialog.descriptionPlaceholder": {
    defaultMessage: "صياغة مذكرة استئناف",
  },
  "@legalos.timeTracking.dialog.billableLabel": { defaultMessage: "قابل للفوترة" },
  "@legalos.timeTracking.dialog.cancel": { defaultMessage: "إلغاء" },
  "@legalos.timeTracking.dialog.saving": { defaultMessage: "جارٍ الحفظ…" },
  "@legalos.timeTracking.dialog.logTime": { defaultMessage: "تسجيل الوقت" },
  "@legalos.timeTracking.dialog.error": { defaultMessage: "تعذّر حفظ هذا الإدخال." },

  // ---------------------------------------------------------------------
  // Billing (app/billing/page.tsx)
  // ---------------------------------------------------------------------
  "@legalos.billing.heading": { defaultMessage: "الفوترة" },
  "@legalos.billing.subheading": {
    defaultMessage: "الفواتير الصادرة على القضايا والموكّلين",
  },
  "@legalos.billing.invoiceUnbilled": { defaultMessage: "فوترة الوقت غير المفوتر" },
  "@legalos.billing.loading": { defaultMessage: "جارٍ تحميل الفوترة…" },

  "@legalos.billing.kpi.outstanding": { defaultMessage: "إجمالي المستحق" },
  "@legalos.billing.kpi.overdue": { defaultMessage: "متأخر السداد" },
  "@legalos.billing.kpi.draft": { defaultMessage: "مسودة — بانتظار الإرسال" },
  "@legalos.billing.kpi.collected": { defaultMessage: "المُحصَّل هذا العام" },
  "@legalos.billing.kpi.openInvoices": {
    defaultMessage:
      "{count, plural, zero {لا فواتير مفتوحة} one {فاتورة واحدة مفتوحة} two {فاتورتان مفتوحتان} few {# فواتير مفتوحة} many {# فاتورة مفتوحة} other {# فاتورة مفتوحة}}",
  },
  "@legalos.billing.kpi.pastDue": {
    defaultMessage:
      "{count, plural, zero {لا فواتير متأخرة} one {فاتورة واحدة متأخرة} two {فاتورتان متأخرتان} few {# فواتير متأخرة} many {# فاتورة متأخرة} other {# فاتورة متأخرة}}",
  },
  "@legalos.billing.kpi.notYetSent": {
    defaultMessage:
      "{count, plural, zero {لا مسودات بانتظار الإرسال} one {مسودة واحدة بانتظار الإرسال} two {مسودتان بانتظار الإرسال} few {# مسودات بانتظار الإرسال} many {# مسودة بانتظار الإرسال} other {# مسودة بانتظار الإرسال}}",
  },
  "@legalos.billing.kpi.invoicesPaid": {
    defaultMessage:
      "{count, plural, zero {لا فواتير مسددة} one {فاتورة واحدة مسددة} two {فاتورتان مسددتان} few {# فواتير مسددة} many {# فاتورة مسددة} other {# فاتورة مسددة}}",
  },

  "@legalos.billing.chart.heading": { defaultMessage: "المفوتر مقابل المُحصَّل" },
  "@legalos.billing.chart.lastMonths": {
    defaultMessage:
      "{count, plural, zero {آخر # شهر} one {آخر شهر} two {آخر شهرين} few {آخر # أشهر} many {آخر # شهراً} other {آخر # شهر}}",
  },
  "@legalos.billing.chart.invoiced": { defaultMessage: "مفوتر" },
  "@legalos.billing.chart.collected": { defaultMessage: "محصَّل" },

  "@legalos.billing.table.invoice": { defaultMessage: "الفاتورة" },
  "@legalos.billing.detail.heading": { defaultMessage: "البيانات" },
  "@legalos.billing.detail.lineItems": { defaultMessage: "بنود الفاتورة" },
  "@legalos.billing.detail.noLineItems": { defaultMessage: "لا توجد بنود" },
  "@legalos.billing.detail.noLineItemsDescription": {
    defaultMessage: "هذه الفاتورة بإجمالي {total} دون تفصيل بالبنود.",
  },
  "@legalos.billing.table.client": { defaultMessage: "الموكّل" },
  "@legalos.billing.table.matter": { defaultMessage: "القضية" },
  "@legalos.billing.table.issued": { defaultMessage: "تاريخ الإصدار" },
  "@legalos.billing.table.due": { defaultMessage: "تاريخ الاستحقاق" },
  "@legalos.billing.table.status": { defaultMessage: "الحالة" },
  "@legalos.billing.table.amount": { defaultMessage: "المبلغ" },

  "@legalos.billing.action.send": { defaultMessage: "إرسال" },
  "@legalos.billing.action.markPaid": { defaultMessage: "تحديد كمسدد" },

  "@legalos.billing.status.draft": { defaultMessage: "مسودة" },
  "@legalos.billing.status.sent": { defaultMessage: "مرسلة" },
  "@legalos.billing.status.paid": { defaultMessage: "مسددة" },
  "@legalos.billing.status.overdue": { defaultMessage: "متأخرة" },

  "@legalos.billing.invoices.heading": { defaultMessage: "الفواتير" },
  "@legalos.billing.invoices.emptyTitle": { defaultMessage: "لا توجد فواتير بعد" },
  "@legalos.billing.invoices.emptyDescription": {
    defaultMessage: "سجّل وقتاً قابلاً للفوترة على إحدى القضايا، ثم أصدر فاتورة بها.",
  },

  "@legalos.billing.error.updateInvoice": { defaultMessage: "تعذّر تحديث هذه الفاتورة." },

  "@legalos.billing.dialog.title": { defaultMessage: "فوترة الوقت غير المفوتر" },
  "@legalos.billing.dialog.description": {
    defaultMessage:
      "يُنشئ مسودة فاتورة تغطي كل ساعة قابلة للفوترة لم تُفوتر بعد على القضية. تُقفل هذه الساعات بعدها على تلك الفاتورة.",
  },
  "@legalos.billing.dialog.noneAvailable": {
    defaultMessage: "لا توجد حالياً أي قضية بها وقت قابل للفوترة غير مفوتر.",
  },
  "@legalos.billing.dialog.matterLabel": { defaultMessage: "القضية" },
  "@legalos.billing.dialog.loadingPlaceholder": { defaultMessage: "جارٍ التحميل…" },
  "@legalos.billing.dialog.matterPlaceholder": { defaultMessage: "اختر قضيةً للفوترة" },
  "@legalos.billing.dialog.cancel": { defaultMessage: "إلغاء" },
  "@legalos.billing.dialog.drafting": { defaultMessage: "جارٍ الصياغة…" },
  "@legalos.billing.dialog.draftInvoice": { defaultMessage: "صياغة فاتورة" },
  "@legalos.billing.dialog.error": { defaultMessage: "تعذّر صياغة هذه الفاتورة." },
};
