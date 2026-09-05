import type { Catalog } from "@astryxdesign/core/i18n";

export const en: Catalog = {
  "@legalos.shell.brand": { defaultMessage: "Al-Sijil" },
  "@legalos.shell.brandTagline": { defaultMessage: "Law Firm Management" },
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
  "@legalos.shell.nav.hearings": { defaultMessage: "Hearings" },
  "@legalos.shell.nav.calendar": { defaultMessage: "Calendar" },
  "@legalos.shell.nav.tasks": { defaultMessage: "Tasks" },
  "@legalos.shell.nav.documents": { defaultMessage: "Documents" },
  "@legalos.shell.nav.lawLibrary": { defaultMessage: "Law Library" },
  "@legalos.shell.nav.knowledgeBase": { defaultMessage: "Forms & Templates" },
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

  // No "ask AI" any more: the palette searches the firm's own records, and
  // the assistant is off for this release. A button that offers something it
  // cannot do costs more than a shorter label.
  "@legalos.shell.search.ariaLabel": { defaultMessage: "Search LegalOS" },
  "@legalos.shell.search.button": { defaultMessage: "Search" },
  "@legalos.shell.search.emptyBootstrap": {
    defaultMessage: "Search matters, clients and documents",
  },
  "@legalos.shell.search.placeholder": {
    defaultMessage: "Search matters, clients, documents…",
  },
  "@legalos.shell.search.empty": { defaultMessage: "Nothing matched" },
  "@legalos.shell.search.group.navigation": { defaultMessage: "Go to" },
  "@legalos.shell.search.group.clients": { defaultMessage: "Clients" },
  "@legalos.shell.search.group.matters": { defaultMessage: "Matters" },
  "@legalos.shell.search.group.documents": { defaultMessage: "Documents" },
  "@legalos.shell.search.hint.navigate": { defaultMessage: "Move" },
  "@legalos.shell.search.hint.select": { defaultMessage: "Open" },
  "@legalos.shell.search.hint.close": { defaultMessage: "Close" },

  "@legalos.shell.account.menuAriaLabel": { defaultMessage: "أحمد السيد account menu" },
  "@legalos.shell.account.profile": { defaultMessage: "Profile" },
  "@legalos.shell.account.firmSettings": { defaultMessage: "Firm settings" },
  "@legalos.shell.account.signOut": { defaultMessage: "Sign out" },
};

export const ar: Catalog = {
  "@legalos.shell.brand": { defaultMessage: "السِّجل" },
  "@legalos.shell.brandTagline": { defaultMessage: "إدارة مكاتب المحاماة" },
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
  "@legalos.shell.nav.hearings": { defaultMessage: "الجلسات" },
  "@legalos.shell.nav.calendar": { defaultMessage: "التقويم" },
  "@legalos.shell.nav.tasks": { defaultMessage: "المهام" },
  "@legalos.shell.nav.documents": { defaultMessage: "المستندات" },
  "@legalos.shell.nav.lawLibrary": { defaultMessage: "المكتبة القانونية" },
  "@legalos.shell.nav.knowledgeBase": { defaultMessage: "نماذج وقوالب" },
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

  "@legalos.shell.search.ariaLabel": { defaultMessage: "البحث في LegalOS" },
  "@legalos.shell.search.button": { defaultMessage: "بحث" },
  "@legalos.shell.search.emptyBootstrap": {
    defaultMessage: "ابحث في القضايا والموكّلين والمستندات",
  },
  "@legalos.shell.search.placeholder": {
    defaultMessage: "ابحث في القضايا والموكّلين والمستندات…",
  },
  "@legalos.shell.search.empty": { defaultMessage: "لا يوجد ما يطابق البحث" },
  "@legalos.shell.search.group.navigation": { defaultMessage: "الانتقال إلى" },
  "@legalos.shell.search.group.clients": { defaultMessage: "الموكّلون" },
  "@legalos.shell.search.group.matters": { defaultMessage: "القضايا" },
  "@legalos.shell.search.group.documents": { defaultMessage: "المستندات" },
  "@legalos.shell.search.hint.navigate": { defaultMessage: "تنقّل" },
  "@legalos.shell.search.hint.select": { defaultMessage: "فتح" },
  "@legalos.shell.search.hint.close": { defaultMessage: "إغلاق" },

  "@legalos.shell.account.menuAriaLabel": { defaultMessage: "قائمة حساب أحمد السيد" },
  "@legalos.shell.account.profile": { defaultMessage: "الملف الشخصي" },
  "@legalos.shell.account.firmSettings": { defaultMessage: "إعدادات المكتب" },
  "@legalos.shell.account.signOut": { defaultMessage: "تسجيل الخروج" },
};
