import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  "@legalos.shell.brand": { defaultMessage: "alsigil" },
  "@legalos.shell.mainNavAriaLabel": { defaultMessage: "Main navigation" },
  // Firm names are data, not chrome: a Cairo practice is called what it is
  // called on its letterhead, in either UI language. Same strings as the `ar`
  // catalog below, and as FIRM_NAME in scripts/seed_demo_firm.py.
  "@legalos.shell.firm.alSayed": { defaultMessage: "السيد وشركاه" },
  "@legalos.shell.firm.cairoLegal": { defaultMessage: "مجموعة القاهرة القانونية" },

  "@legalos.shell.nav.section.overview": { defaultMessage: "Overview" },
  "@legalos.shell.nav.section.clients": { defaultMessage: "Clients" },
  "@legalos.shell.nav.section.practice": { defaultMessage: "Practice" },
  "@legalos.shell.nav.section.content": { defaultMessage: "Content" },
  "@legalos.shell.nav.section.ai": { defaultMessage: "AI" },
  "@legalos.shell.nav.section.finance": { defaultMessage: "Finance" },
  "@legalos.shell.nav.section.team": { defaultMessage: "Team" },

  "@legalos.shell.nav.dashboard": { defaultMessage: "Dashboard" },
  "@legalos.shell.nav.crm": { defaultMessage: "CRM" },
  "@legalos.shell.nav.clients": { defaultMessage: "Clients" },
  "@legalos.shell.nav.matters": { defaultMessage: "Matters" },
  "@legalos.shell.nav.cases": { defaultMessage: "Cases" },
  "@legalos.shell.nav.calendar": { defaultMessage: "Calendar" },
  "@legalos.shell.nav.tasks": { defaultMessage: "Tasks" },
  "@legalos.shell.nav.documents": { defaultMessage: "Documents" },
  "@legalos.shell.nav.lawLibrary": { defaultMessage: "Law Library" },
  "@legalos.shell.nav.knowledgeBase": { defaultMessage: "Knowledge Base" },
  "@legalos.shell.nav.aiAssistant": { defaultMessage: "AI Assistant" },
  "@legalos.shell.nav.legalResearch": { defaultMessage: "Legal Research" },
  "@legalos.shell.nav.contractReview": { defaultMessage: "Contract Review" },
  "@legalos.shell.nav.timeTracking": { defaultMessage: "Time Tracking" },
  "@legalos.shell.nav.billing": { defaultMessage: "Billing" },
  "@legalos.shell.nav.accounting": { defaultMessage: "Accounting" },
  "@legalos.shell.nav.reports": { defaultMessage: "Reports" },
  "@legalos.shell.nav.messages": { defaultMessage: "Messages" },
  "@legalos.shell.nav.automation": { defaultMessage: "Automation" },

  "@legalos.shell.collapse": { defaultMessage: "Collapse" },
  "@legalos.shell.languageToggle.toArabic": { defaultMessage: "التبديل إلى العربية" },
  "@legalos.shell.languageToggle.toEnglish": { defaultMessage: "Switch to English" },
  "@legalos.shell.themeToggle.toLight": { defaultMessage: "Switch to light mode" },
  "@legalos.shell.themeToggle.toDark": { defaultMessage: "Switch to dark mode" },

  "@legalos.shell.search.ariaLabel": { defaultMessage: "Search LegalOS and ask AI" },
  "@legalos.shell.search.button": { defaultMessage: "Search or ask AI" },
  "@legalos.shell.search.emptyBootstrap": {
    defaultMessage: "Search matters, clients, documents — or ask AI a legal question",
  },

  "@legalos.shell.notifications.button": { defaultMessage: "Notifications" },
  "@legalos.shell.notifications.today": { defaultMessage: "Today" },
  "@legalos.shell.notifications.hearingReminder": {
    defaultMessage: "Hearing reminder — نبيل ضد شركة النيل للتجارة, 2:00 PM",
  },
  "@legalos.shell.notifications.inviteAccepted": {
    defaultMessage: "منى فاروق accepted your invite",
  },
  "@legalos.shell.notifications.contractReviewFinished": {
    defaultMessage: "Contract review finished: NDA — شركة دلتا للأغذية",
  },

  "@legalos.shell.account.menuAriaLabel": { defaultMessage: "أحمد السيد account menu" },
  "@legalos.shell.account.profile": { defaultMessage: "Profile" },
  "@legalos.shell.account.firmSettings": { defaultMessage: "Firm settings" },
  "@legalos.shell.account.signOut": { defaultMessage: "Sign out" },
};

export const ar: Catalog = {
  "@legalos.shell.brand": { defaultMessage: "alsigil" },
  "@legalos.shell.mainNavAriaLabel": { defaultMessage: "التنقل الرئيسي" },
  "@legalos.shell.firm.alSayed": { defaultMessage: "السيد وشركاه" },
  "@legalos.shell.firm.cairoLegal": { defaultMessage: "مجموعة القاهرة القانونية" },

  "@legalos.shell.nav.section.overview": { defaultMessage: "نظرة عامة" },
  "@legalos.shell.nav.section.clients": { defaultMessage: "الموكّلين" },
  "@legalos.shell.nav.section.practice": { defaultMessage: "الممارسة القانونية" },
  "@legalos.shell.nav.section.content": { defaultMessage: "المحتوى" },
  "@legalos.shell.nav.section.ai": { defaultMessage: "الذكاء الاصطناعي" },
  "@legalos.shell.nav.section.finance": { defaultMessage: "الشؤون المالية" },
  "@legalos.shell.nav.section.team": { defaultMessage: "الفريق" },

  "@legalos.shell.nav.dashboard": { defaultMessage: "لوحة التحكم" },
  "@legalos.shell.nav.crm": { defaultMessage: "إدارة علاقات الموكّلين" },
  "@legalos.shell.nav.clients": { defaultMessage: "الموكّلين" },
  "@legalos.shell.nav.matters": { defaultMessage: "القضايا" },
  "@legalos.shell.nav.cases": { defaultMessage: "الجلسات" },
  "@legalos.shell.nav.calendar": { defaultMessage: "التقويم" },
  "@legalos.shell.nav.tasks": { defaultMessage: "المهام" },
  "@legalos.shell.nav.documents": { defaultMessage: "المستندات" },
  "@legalos.shell.nav.lawLibrary": { defaultMessage: "المكتبة القانونية" },
  "@legalos.shell.nav.knowledgeBase": { defaultMessage: "قاعدة المعرفة" },
  "@legalos.shell.nav.aiAssistant": { defaultMessage: "المساعد الذكي" },
  "@legalos.shell.nav.legalResearch": { defaultMessage: "البحث القانوني" },
  "@legalos.shell.nav.contractReview": { defaultMessage: "مراجعة العقود" },
  "@legalos.shell.nav.timeTracking": { defaultMessage: "تتبع الوقت" },
  "@legalos.shell.nav.billing": { defaultMessage: "الفوترة" },
  "@legalos.shell.nav.accounting": { defaultMessage: "المحاسبة" },
  "@legalos.shell.nav.reports": { defaultMessage: "التقارير" },
  "@legalos.shell.nav.messages": { defaultMessage: "الرسائل" },
  "@legalos.shell.nav.automation": { defaultMessage: "الأتمتة" },

  "@legalos.shell.collapse": { defaultMessage: "طي القائمة" },
  "@legalos.shell.languageToggle.toArabic": { defaultMessage: "التبديل إلى العربية" },
  "@legalos.shell.languageToggle.toEnglish": { defaultMessage: "Switch to English" },
  "@legalos.shell.themeToggle.toLight": { defaultMessage: "التبديل إلى الوضع الفاتح" },
  "@legalos.shell.themeToggle.toDark": { defaultMessage: "التبديل إلى الوضع الداكن" },

  "@legalos.shell.search.ariaLabel": { defaultMessage: "البحث في LegalOS وسؤال الذكاء الاصطناعي" },
  "@legalos.shell.search.button": { defaultMessage: "بحث أو اسأل الذكاء الاصطناعي" },
  "@legalos.shell.search.emptyBootstrap": {
    defaultMessage: "ابحث في القضايا والموكّلين والمستندات — أو اسأل الذكاء الاصطناعي سؤالاً قانونياً",
  },

  "@legalos.shell.notifications.button": { defaultMessage: "الإشعارات" },
  "@legalos.shell.notifications.today": { defaultMessage: "اليوم" },
  "@legalos.shell.notifications.hearingReminder": {
    defaultMessage: "تذكير بجلسة — نبيل ضد شركة النيل للتجارة، الساعة 2:00 ظهراً",
  },
  "@legalos.shell.notifications.inviteAccepted": {
    defaultMessage: "قبلت منى فاروق دعوتك",
  },
  "@legalos.shell.notifications.contractReviewFinished": {
    defaultMessage: "اكتملت مراجعة العقد: اتفاقية عدم إفشاء — شركة دلتا للأغذية",
  },

  "@legalos.shell.account.menuAriaLabel": { defaultMessage: "قائمة حساب أحمد السيد" },
  "@legalos.shell.account.profile": { defaultMessage: "الملف الشخصي" },
  "@legalos.shell.account.firmSettings": { defaultMessage: "إعدادات المكتب" },
  "@legalos.shell.account.signOut": { defaultMessage: "تسجيل الخروج" },
};
