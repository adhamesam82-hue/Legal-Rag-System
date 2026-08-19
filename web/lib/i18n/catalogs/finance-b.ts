import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  // ---------------------------------------------------------------------
  // Billing detail (app/billing/[id]/page.tsx)
  // ---------------------------------------------------------------------
  "@legalos.billingDetail.loading": { defaultMessage: "Loading invoice…" },
  "@legalos.billingDetail.backToBilling": { defaultMessage: "Billing" },

  "@legalos.billingDetail.status.draft": { defaultMessage: "Draft" },
  "@legalos.billingDetail.status.sent": { defaultMessage: "Sent" },
  "@legalos.billingDetail.status.paid": { defaultMessage: "Paid" },
  "@legalos.billingDetail.status.overdue": { defaultMessage: "Overdue" },

  "@legalos.billingDetail.sendInvoice": { defaultMessage: "Send invoice" },
  "@legalos.billingDetail.markAsPaid": { defaultMessage: "Mark as paid" },

  "@legalos.billingDetail.lineItemsHeading": { defaultMessage: "Line items" },
  "@legalos.billingDetail.column.description": { defaultMessage: "Description" },
  "@legalos.billingDetail.column.quantity": { defaultMessage: "Quantity" },
  "@legalos.billingDetail.column.amount": { defaultMessage: "Amount" },
  "@legalos.billingDetail.linesTotal": { defaultMessage: "Lines total" },
  "@legalos.billingDetail.invoiceTotal": { defaultMessage: "Invoice total" },

  "@legalos.billingDetail.noLineItems.title": { defaultMessage: "No line items" },
  "@legalos.billingDetail.noLineItems.description": {
    defaultMessage: "This invoice carries a total of {amount} without an itemized breakdown.",
  },

  "@legalos.billingDetail.detailsHeading": { defaultMessage: "Details" },
  "@legalos.billingDetail.field.client": { defaultMessage: "Client" },
  "@legalos.billingDetail.field.matter": { defaultMessage: "Matter" },
  "@legalos.billingDetail.field.issued": { defaultMessage: "Issued" },
  "@legalos.billingDetail.field.due": { defaultMessage: "Due" },
  "@legalos.billingDetail.field.paid": { defaultMessage: "Paid" },
  "@legalos.billingDetail.field.amount": { defaultMessage: "Amount" },

  "@legalos.billingDetail.updateError": { defaultMessage: "Could not update this invoice." },

  // ---------------------------------------------------------------------
  // Accounting (app/accounting/page.tsx) — mock/placeholder pillar
  // ---------------------------------------------------------------------
  "@legalos.accounting.heading": { defaultMessage: "Accounting" },
  "@legalos.accounting.subtitle": {
    defaultMessage: "Firm financials · July 2026",
  },

  "@legalos.accounting.banner.title": { defaultMessage: "Sample figures — no backend yet" },
  "@legalos.accounting.banner.description": {
    defaultMessage:
      "This pillar has no data model behind it. Every number below is placeholder content, not a reading of your firm's records. Clients, matters, cases, documents, tasks, time and billing are live.",
  },

  "@legalos.accounting.month.feb": { defaultMessage: "Feb" },
  "@legalos.accounting.month.mar": { defaultMessage: "Mar" },
  "@legalos.accounting.month.apr": { defaultMessage: "Apr" },
  "@legalos.accounting.month.may": { defaultMessage: "May" },
  "@legalos.accounting.month.jun": { defaultMessage: "Jun" },
  "@legalos.accounting.month.jul": { defaultMessage: "Jul" },

  "@legalos.accounting.stat.revenue.label": { defaultMessage: "Revenue ({month})" },
  "@legalos.accounting.stat.expenses.label": { defaultMessage: "Expenses ({month})" },
  "@legalos.accounting.stat.profit.label": { defaultMessage: "Profit ({month})" },
  "@legalos.accounting.stat.margin.label": { defaultMessage: "Net margin" },
  "@legalos.accounting.stat.margin.description": {
    defaultMessage: "Revenue less all operating expenses",
  },
  "@legalos.accounting.stat.revenueChange": { defaultMessage: "+12.3% vs. last month" },
  "@legalos.accounting.stat.expensesChange": { defaultMessage: "+6.8% vs. last month" },
  "@legalos.accounting.stat.profitChange": { defaultMessage: "{percent}% vs. last month" },

  "@legalos.accounting.chart.revenueExpenses.heading": {
    defaultMessage: "Revenue against expenses",
  },
  "@legalos.accounting.chart.legend.revenue": { defaultMessage: "Revenue" },
  "@legalos.accounting.chart.legend.expenses": { defaultMessage: "Expenses" },
  "@legalos.accounting.chart.cashFlow.heading": { defaultMessage: "Cash flow" },
  "@legalos.accounting.chart.cashFlow.tooltipLabel": { defaultMessage: "Net cash" },
  "@legalos.accounting.chart.cashFlow.caption": {
    defaultMessage: "Net of collections and operating outflows each month.",
  },

  "@legalos.accounting.expenses.heading": { defaultMessage: "Operating expenses" },
  "@legalos.accounting.expenses.total": { defaultMessage: "Total" },
  "@legalos.accounting.column.category": { defaultMessage: "Category" },
  "@legalos.accounting.column.yearToDate": { defaultMessage: "Year to date" },

  "@legalos.accounting.expense.salaries": { defaultMessage: "Salaries and wages" },
  "@legalos.accounting.expense.rent": { defaultMessage: "Office rent" },
  "@legalos.accounting.expense.courtFees": { defaultMessage: "Court and filing fees" },
  "@legalos.accounting.expense.software": { defaultMessage: "Software and subscriptions" },
  "@legalos.accounting.expense.insurance": { defaultMessage: "Professional insurance" },
  "@legalos.accounting.expense.travel": { defaultMessage: "Travel and client meetings" },
  "@legalos.accounting.expense.utilities": { defaultMessage: "Utilities and other" },

  "@legalos.accounting.payouts.heading": { defaultMessage: "Partner payouts" },
  "@legalos.accounting.payouts.reportsLink": { defaultMessage: "Reports" },
  "@legalos.accounting.column.partner": { defaultMessage: "Partner" },
  "@legalos.accounting.column.share": { defaultMessage: "Share" },
  "@legalos.accounting.column.monthPayout": { defaultMessage: "{month} payout" },

  // Team names are data: the same people, spelled the same way, in either
  // UI language — matching TEAM in scripts/seed_demo_firm.py.
  "@legalos.accounting.person.ahmed": { defaultMessage: "أحمد السيد" },
  "@legalos.accounting.person.mona": { defaultMessage: "منى فاروق" },
  "@legalos.accounting.person.youssef": { defaultMessage: "يوسف عادل" },
  "@legalos.accounting.person.layla": { defaultMessage: "ليلى حسن" },

  "@legalos.accounting.payroll.heading": { defaultMessage: "Payroll" },
  "@legalos.accounting.payroll.role.ownerPartner": { defaultMessage: "Owner · Partner" },
  "@legalos.accounting.payroll.role.lawyerPartner": { defaultMessage: "Lawyer · Partner" },
  "@legalos.accounting.payroll.role.lawyer": { defaultMessage: "Lawyer" },
  "@legalos.accounting.payroll.role.staff": { defaultMessage: "Staff" },
  "@legalos.accounting.payroll.note.partnerDraw": { defaultMessage: "Paid via partner draw" },
  "@legalos.accounting.payroll.note.monthlySalary": { defaultMessage: "Monthly salary" },
  "@legalos.accounting.payroll.caption": {
    defaultMessage: "Partner draws are settled through payouts above, not payroll.",
  },

  // ---------------------------------------------------------------------
  // Reports (app/reports/page.tsx) — mock/placeholder pillar
  // ---------------------------------------------------------------------
  "@legalos.reports.heading": { defaultMessage: "Reports" },
  "@legalos.reports.subtitle": { defaultMessage: "Firm performance · February to July 2026" },

  "@legalos.reports.banner.title": { defaultMessage: "Sample figures — no backend yet" },
  "@legalos.reports.banner.description": {
    defaultMessage:
      "This pillar has no data model behind it. Every number below is placeholder content, not a reading of your firm's records. Clients, matters, cases, documents, tasks, time and billing are live.",
  },

  "@legalos.reports.export.ariaLabel": { defaultMessage: "Export reports" },
  "@legalos.reports.export.button": { defaultMessage: "Export" },

  "@legalos.reports.month.feb": { defaultMessage: "Feb" },
  "@legalos.reports.month.mar": { defaultMessage: "Mar" },
  "@legalos.reports.month.apr": { defaultMessage: "Apr" },
  "@legalos.reports.month.may": { defaultMessage: "May" },
  "@legalos.reports.month.jun": { defaultMessage: "Jun" },
  "@legalos.reports.month.jul": { defaultMessage: "Jul" },

  "@legalos.reports.stat.revenue.label": { defaultMessage: "Revenue (6 months)" },
  "@legalos.reports.stat.collectionRate.label": { defaultMessage: "Collection rate" },
  "@legalos.reports.stat.mattersClosed.label": { defaultMessage: "Matters closed" },
  "@legalos.reports.stat.favourableOutcomes.label": { defaultMessage: "Favourable outcomes" },

  "@legalos.reports.billedCollected.heading": { defaultMessage: "Billed against collected" },
  "@legalos.reports.billedCollected.link": { defaultMessage: "Open billing" },
  "@legalos.reports.legend.billed": { defaultMessage: "Billed" },
  "@legalos.reports.legend.collected": { defaultMessage: "Collected" },

  "@legalos.reports.utilization.heading": { defaultMessage: "Lawyer utilization" },
  "@legalos.reports.utilization.description": {
    defaultMessage: "Billable hours logged this month against each fee earner's target.",
  },
  "@legalos.reports.utilization.hoursOfTarget": { defaultMessage: "{billable}h of {target}h" },
  "@legalos.reports.utilization.ariaLabel": { defaultMessage: "{name} utilization" },
  "@legalos.reports.utilization.caption": {
    defaultMessage: "Sustained utilization above 85% is a burnout signal, not a target to beat.",
  },

  "@legalos.reports.outcomes.heading": { defaultMessage: "Case outcomes" },
  "@legalos.reports.outcome.settled": { defaultMessage: "Settled" },
  "@legalos.reports.outcome.wonAtJudgment": { defaultMessage: "Won at judgment" },
  "@legalos.reports.outcome.withdrawn": { defaultMessage: "Withdrawn" },
  "@legalos.reports.outcome.lost": { defaultMessage: "Lost" },
  "@legalos.reports.outcome.countPercent": { defaultMessage: "{count} ({percent}%)" },

  "@legalos.reports.completion.heading": { defaultMessage: "Matters opened against closed" },
  "@legalos.reports.completion.link": { defaultMessage: "All matters" },
  "@legalos.reports.legend.opened": { defaultMessage: "Opened" },
  "@legalos.reports.legend.closed": { defaultMessage: "Closed" },
  "@legalos.reports.completion.caption": {
    defaultMessage:
      "New matters have outpaced closures in 4 of the last 6 months — the active caseload is growing.",
  },

  "@legalos.reports.person.ahmed": { defaultMessage: "أحمد السيد" },
  "@legalos.reports.person.mona": { defaultMessage: "منى فاروق" },
  "@legalos.reports.person.youssef": { defaultMessage: "يوسف عادل" },
  "@legalos.reports.person.layla": { defaultMessage: "ليلى حسن" },
};

export const ar: Catalog = {
  // ---------------------------------------------------------------------
  // Billing detail
  // ---------------------------------------------------------------------
  "@legalos.billingDetail.loading": { defaultMessage: "جارٍ تحميل الفاتورة…" },
  "@legalos.billingDetail.backToBilling": { defaultMessage: "الفوترة" },

  "@legalos.billingDetail.status.draft": { defaultMessage: "مسودة" },
  "@legalos.billingDetail.status.sent": { defaultMessage: "مُرسلة" },
  "@legalos.billingDetail.status.paid": { defaultMessage: "مدفوعة" },
  "@legalos.billingDetail.status.overdue": { defaultMessage: "متأخرة" },

  "@legalos.billingDetail.sendInvoice": { defaultMessage: "إرسال الفاتورة" },
  "@legalos.billingDetail.markAsPaid": { defaultMessage: "تحديد كمدفوعة" },

  "@legalos.billingDetail.lineItemsHeading": { defaultMessage: "بنود الفاتورة" },
  "@legalos.billingDetail.column.description": { defaultMessage: "الوصف" },
  "@legalos.billingDetail.column.quantity": { defaultMessage: "الكمية" },
  "@legalos.billingDetail.column.amount": { defaultMessage: "المبلغ" },
  "@legalos.billingDetail.linesTotal": { defaultMessage: "إجمالي البنود" },
  "@legalos.billingDetail.invoiceTotal": { defaultMessage: "إجمالي الفاتورة" },

  "@legalos.billingDetail.noLineItems.title": { defaultMessage: "لا توجد بنود" },
  "@legalos.billingDetail.noLineItems.description": {
    defaultMessage: "تحمل هذه الفاتورة إجمالي {amount} دون تفصيل للبنود.",
  },

  "@legalos.billingDetail.detailsHeading": { defaultMessage: "التفاصيل" },
  "@legalos.billingDetail.field.client": { defaultMessage: "العميل" },
  "@legalos.billingDetail.field.matter": { defaultMessage: "القضية" },
  "@legalos.billingDetail.field.issued": { defaultMessage: "تاريخ الإصدار" },
  "@legalos.billingDetail.field.due": { defaultMessage: "تاريخ الاستحقاق" },
  "@legalos.billingDetail.field.paid": { defaultMessage: "تاريخ السداد" },
  "@legalos.billingDetail.field.amount": { defaultMessage: "المبلغ" },

  "@legalos.billingDetail.updateError": { defaultMessage: "تعذّر تحديث هذه الفاتورة." },

  // ---------------------------------------------------------------------
  // Accounting
  // ---------------------------------------------------------------------
  "@legalos.accounting.heading": { defaultMessage: "المحاسبة" },
  "@legalos.accounting.subtitle": {
    defaultMessage: "البيانات المالية للمكتب · يوليو 2026",
  },

  "@legalos.accounting.banner.title": { defaultMessage: "أرقام تجريبية — لا يوجد نظام خلفي بعد" },
  "@legalos.accounting.banner.description": {
    defaultMessage:
      "لا يوجد نموذج بيانات فعلي خلف هذا القسم بعد. كل رقم أدناه محتوى تجريبي وليس بيانات فعلية من سجلات مكتبك. أما العملاء والقضايا والجلسات والمستندات والمهام وتتبع الوقت والفوترة فهي وظائف فعلية ومتصلة بالنظام.",
  },

  "@legalos.accounting.month.feb": { defaultMessage: "فبراير" },
  "@legalos.accounting.month.mar": { defaultMessage: "مارس" },
  "@legalos.accounting.month.apr": { defaultMessage: "أبريل" },
  "@legalos.accounting.month.may": { defaultMessage: "مايو" },
  "@legalos.accounting.month.jun": { defaultMessage: "يونيو" },
  "@legalos.accounting.month.jul": { defaultMessage: "يوليو" },

  "@legalos.accounting.stat.revenue.label": { defaultMessage: "الإيرادات ({month})" },
  "@legalos.accounting.stat.expenses.label": { defaultMessage: "المصروفات ({month})" },
  "@legalos.accounting.stat.profit.label": { defaultMessage: "الأرباح ({month})" },
  "@legalos.accounting.stat.margin.label": { defaultMessage: "هامش الربح الصافي" },
  "@legalos.accounting.stat.margin.description": {
    defaultMessage: "الإيرادات بعد خصم جميع المصروفات التشغيلية",
  },
  "@legalos.accounting.stat.revenueChange": { defaultMessage: "+12.3% مقارنة بالشهر الماضي" },
  "@legalos.accounting.stat.expensesChange": { defaultMessage: "+6.8% مقارنة بالشهر الماضي" },
  "@legalos.accounting.stat.profitChange": { defaultMessage: "{percent}% مقارنة بالشهر الماضي" },

  "@legalos.accounting.chart.revenueExpenses.heading": {
    defaultMessage: "الإيرادات مقابل المصروفات",
  },
  "@legalos.accounting.chart.legend.revenue": { defaultMessage: "الإيرادات" },
  "@legalos.accounting.chart.legend.expenses": { defaultMessage: "المصروفات" },
  "@legalos.accounting.chart.cashFlow.heading": { defaultMessage: "التدفق النقدي" },
  "@legalos.accounting.chart.cashFlow.tooltipLabel": { defaultMessage: "صافي النقد" },
  "@legalos.accounting.chart.cashFlow.caption": {
    defaultMessage: "صافي التحصيلات بعد المصروفات التشغيلية لكل شهر.",
  },

  "@legalos.accounting.expenses.heading": { defaultMessage: "المصروفات التشغيلية" },
  "@legalos.accounting.expenses.total": { defaultMessage: "الإجمالي" },
  "@legalos.accounting.column.category": { defaultMessage: "الفئة" },
  "@legalos.accounting.column.yearToDate": { defaultMessage: "منذ بداية العام" },

  "@legalos.accounting.expense.salaries": { defaultMessage: "الرواتب والأجور" },
  "@legalos.accounting.expense.rent": { defaultMessage: "إيجار المكتب" },
  "@legalos.accounting.expense.courtFees": { defaultMessage: "الرسوم القضائية ورسوم القيد" },
  "@legalos.accounting.expense.software": { defaultMessage: "البرمجيات والاشتراكات" },
  "@legalos.accounting.expense.insurance": { defaultMessage: "التأمين المهني" },
  "@legalos.accounting.expense.travel": { defaultMessage: "السفر واجتماعات العملاء" },
  "@legalos.accounting.expense.utilities": { defaultMessage: "المرافق ومصروفات أخرى" },

  "@legalos.accounting.payouts.heading": { defaultMessage: "مستحقات الشركاء" },
  "@legalos.accounting.payouts.reportsLink": { defaultMessage: "التقارير" },
  "@legalos.accounting.column.partner": { defaultMessage: "الشريك" },
  "@legalos.accounting.column.share": { defaultMessage: "الحصة" },
  "@legalos.accounting.column.monthPayout": { defaultMessage: "مستحقات {month}" },

  "@legalos.accounting.person.ahmed": { defaultMessage: "أحمد السيد" },
  "@legalos.accounting.person.mona": { defaultMessage: "منى فاروق" },
  "@legalos.accounting.person.youssef": { defaultMessage: "يوسف عادل" },
  "@legalos.accounting.person.layla": { defaultMessage: "ليلى حسن" },

  "@legalos.accounting.payroll.heading": { defaultMessage: "الرواتب" },
  "@legalos.accounting.payroll.role.ownerPartner": { defaultMessage: "مالك · شريك" },
  "@legalos.accounting.payroll.role.lawyerPartner": { defaultMessage: "محامٍ · شريك" },
  "@legalos.accounting.payroll.role.lawyer": { defaultMessage: "محامٍ" },
  "@legalos.accounting.payroll.role.staff": { defaultMessage: "طاقم إداري" },
  "@legalos.accounting.payroll.note.partnerDraw": { defaultMessage: "يُصرف عبر مسحوبات الشركاء" },
  "@legalos.accounting.payroll.note.monthlySalary": { defaultMessage: "راتب شهري" },
  "@legalos.accounting.payroll.caption": {
    defaultMessage: "تُسوّى مسحوبات الشركاء عبر المستحقات أعلاه، وليس من خلال الرواتب.",
  },

  // ---------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------
  "@legalos.reports.heading": { defaultMessage: "التقارير" },
  "@legalos.reports.subtitle": { defaultMessage: "أداء المكتب · من فبراير إلى يوليو 2026" },

  "@legalos.reports.banner.title": { defaultMessage: "أرقام تجريبية — لا يوجد نظام خلفي بعد" },
  "@legalos.reports.banner.description": {
    defaultMessage:
      "لا يوجد نموذج بيانات فعلي خلف هذا القسم بعد. كل رقم أدناه محتوى تجريبي وليس بيانات فعلية من سجلات مكتبك. أما العملاء والقضايا والجلسات والمستندات والمهام وتتبع الوقت والفوترة فهي وظائف فعلية ومتصلة بالنظام.",
  },

  "@legalos.reports.export.ariaLabel": { defaultMessage: "تصدير التقارير" },
  "@legalos.reports.export.button": { defaultMessage: "تصدير" },

  "@legalos.reports.month.feb": { defaultMessage: "فبراير" },
  "@legalos.reports.month.mar": { defaultMessage: "مارس" },
  "@legalos.reports.month.apr": { defaultMessage: "أبريل" },
  "@legalos.reports.month.may": { defaultMessage: "مايو" },
  "@legalos.reports.month.jun": { defaultMessage: "يونيو" },
  "@legalos.reports.month.jul": { defaultMessage: "يوليو" },

  "@legalos.reports.stat.revenue.label": { defaultMessage: "الإيرادات (6 أشهر)" },
  "@legalos.reports.stat.collectionRate.label": { defaultMessage: "معدل التحصيل" },
  "@legalos.reports.stat.mattersClosed.label": { defaultMessage: "القضايا المغلقة" },
  "@legalos.reports.stat.favourableOutcomes.label": { defaultMessage: "النتائج الإيجابية" },

  "@legalos.reports.billedCollected.heading": { defaultMessage: "المُفوتَر مقابل المُحصَّل" },
  "@legalos.reports.billedCollected.link": { defaultMessage: "فتح الفوترة" },
  "@legalos.reports.legend.billed": { defaultMessage: "المُفوتَر" },
  "@legalos.reports.legend.collected": { defaultMessage: "المُحصَّل" },

  "@legalos.reports.utilization.heading": { defaultMessage: "معدل استخدام المحامين" },
  "@legalos.reports.utilization.description": {
    defaultMessage: "الساعات القابلة للفوترة المسجلة هذا الشهر مقابل الهدف المحدد لكل محامٍ.",
  },
  "@legalos.reports.utilization.hoursOfTarget": { defaultMessage: "{billable} س من {target} س" },
  "@legalos.reports.utilization.ariaLabel": { defaultMessage: "معدل استخدام {name}" },
  "@legalos.reports.utilization.caption": {
    defaultMessage: "استمرار معدل الاستخدام فوق 85% مؤشر إرهاق، لا هدف يجب تجاوزه.",
  },

  "@legalos.reports.outcomes.heading": { defaultMessage: "نتائج القضايا" },
  "@legalos.reports.outcome.settled": { defaultMessage: "تسوية" },
  "@legalos.reports.outcome.wonAtJudgment": { defaultMessage: "كسب بحكم قضائي" },
  "@legalos.reports.outcome.withdrawn": { defaultMessage: "سحب الدعوى" },
  "@legalos.reports.outcome.lost": { defaultMessage: "خسارة" },
  "@legalos.reports.outcome.countPercent": { defaultMessage: "{count} ({percent}%)" },

  "@legalos.reports.completion.heading": { defaultMessage: "القضايا المفتوحة مقابل المغلقة" },
  "@legalos.reports.completion.link": { defaultMessage: "جميع القضايا" },
  "@legalos.reports.legend.opened": { defaultMessage: "مفتوحة" },
  "@legalos.reports.legend.closed": { defaultMessage: "مغلقة" },
  "@legalos.reports.completion.caption": {
    defaultMessage:
      "تجاوز عدد القضايا الجديدة عدد القضايا المغلقة في 4 من آخر 6 أشهر — أي أن حجم العمل النشط في تزايد.",
  },

  "@legalos.reports.person.ahmed": { defaultMessage: "أحمد السيد" },
  "@legalos.reports.person.mona": { defaultMessage: "منى فاروق" },
  "@legalos.reports.person.youssef": { defaultMessage: "يوسف عادل" },
  "@legalos.reports.person.layla": { defaultMessage: "ليلى حسن" },
};
