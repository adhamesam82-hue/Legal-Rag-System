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

  // Seven navigation sections (T-051)
  "@legalos.shell.nav.section.overview": { defaultMessage: "Overview" },
  "@legalos.shell.nav.section.clients": { defaultMessage: "Clients" },
  "@legalos.shell.nav.section.practice": { defaultMessage: "Practice" },
  "@legalos.shell.nav.section.content": { defaultMessage: "Content & Knowledge" },
  "@legalos.shell.nav.section.ai": { defaultMessage: "AI" },
  "@legalos.shell.nav.section.finance": { defaultMessage: "Finance" },
  "@legalos.shell.nav.section.team": { defaultMessage: "Team & System" },

  // Navigation items
  "@legalos.shell.nav.dashboard": { defaultMessage: "Dashboard" },
  "@legalos.shell.nav.clients": { defaultMessage: "Clients" },
  "@legalos.shell.nav.crm": { defaultMessage: "CRM" },
  "@legalos.shell.nav.matters": { defaultMessage: "Matters" },
  "@legalos.shell.nav.hearings": { defaultMessage: "Hearings" },
  "@legalos.shell.nav.calendar": { defaultMessage: "Calendar" },
  "@legalos.shell.nav.tasks": { defaultMessage: "Tasks" },
  "@legalos.shell.nav.documents": { defaultMessage: "Documents" },
  "@legalos.shell.nav.lawLibrary": { defaultMessage: "Law Library" },
  "@legalos.shell.nav.knowledgeBase": { defaultMessage: "Forms & Templates" },
  "@legalos.shell.nav.legalQuestion": { defaultMessage: "Legal Question" },
  "@legalos.shell.nav.aiAssistant": { defaultMessage: "AI Assistant" },
  "@legalos.shell.nav.legalResearch": { defaultMessage: "Legal Research" },
  "@legalos.shell.nav.contractReview": { defaultMessage: "Contract Review" },
  "@legalos.shell.nav.timeTracking": { defaultMessage: "Time Tracking" },
  "@legalos.shell.nav.billing": { defaultMessage: "Billing" },
  "@legalos.shell.nav.accounting": { defaultMessage: "Accounting" },
  "@legalos.shell.nav.reports": { defaultMessage: "Reports" },
  "@legalos.shell.nav.messages": { defaultMessage: "Messages" },
  "@legalos.shell.nav.automation": { defaultMessage: "Automation" },
  "@legalos.shell.nav.settings": { defaultMessage: "Settings" },

  // Gated feature indicators
  "@legalos.shell.nav.lockedBadge": { defaultMessage: "Locked" },
  "@legalos.shell.nav.lockedTitle": { defaultMessage: "{path} — gated by {feature}" },
  "@legalos.shell.nav.lockedAria": { defaultMessage: "{label} — gated feature" },

  // Four shell themes
  "@legalos.shell.theme.light": { defaultMessage: "Light" },
  "@legalos.shell.theme.dark": { defaultMessage: "Dark" },
  "@legalos.shell.theme.mixed": { defaultMessage: "Mixed: Dark Sidebar" },
  "@legalos.shell.theme.mixedInv": { defaultMessage: "Mixed Inverse: Light Sidebar" },

  // Collapse / Expand
  "@legalos.shell.collapse": { defaultMessage: "Collapse sidebar" },
  "@legalos.shell.expand": { defaultMessage: "Expand sidebar" },
  "@legalos.shell.languageToggle.toArabic": { defaultMessage: "التبديل إلى العربية" },
  "@legalos.shell.languageToggle.toEnglish": { defaultMessage: "Switch to English" },
  "@legalos.shell.themeToggle.toLight": { defaultMessage: "Switch to light mode" },
  "@legalos.shell.themeToggle.toDark": { defaultMessage: "Switch to dark mode" },

  // Search & command palette
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

  // Account menu
  "@legalos.shell.account.menuAriaLabel": { defaultMessage: "User account menu" },
  "@legalos.shell.account.profile": { defaultMessage: "Profile" },
  "@legalos.shell.account.firmSettings": { defaultMessage: "Firm settings" },
  "@legalos.shell.account.signOut": { defaultMessage: "Sign out" },

  // Breadcrumb (T-060)
  "@legalos.shell.breadcrumb.ariaLabel": { defaultMessage: "Breadcrumbs" },
  "@legalos.shell.breadcrumb.home": { defaultMessage: "Home" },
  "@legalos.shell.breadcrumb.loading": { defaultMessage: "Loading…" },
  "@legalos.shell.nav.plans": { defaultMessage: "Plans" },
  "@legalos.shell.nav.subscribe": { defaultMessage: "Subscribe" },

  // Firm plan card (T-058)
  "@legalos.shell.plan.trial": { defaultMessage: "Trial" },
  "@legalos.shell.plan.basic": { defaultMessage: "Basic" },
  "@legalos.shell.plan.pro": { defaultMessage: "Professional" },
  "@legalos.shell.plan.enterprise": { defaultMessage: "Enterprise" },
  "@legalos.shell.planCard.title": { defaultMessage: "Firm plan" },
  "@legalos.shell.planCard.titleWithPlan": { defaultMessage: "Firm plan — {plan}" },
  "@legalos.shell.planCard.usersCount": { defaultMessage: "{current} of {total} users" },
  "@legalos.shell.planCard.expiresOn": { defaultMessage: "Ends {date}" },
  "@legalos.shell.planCard.trialExpired": { defaultMessage: "Trial expired" },
  "@legalos.shell.planCard.collapsedTooltip": { defaultMessage: "Firm plan: {plan} · {users} · {expiry}" },
};

export const ar: Catalog = {
  "@legalos.shell.brand": { defaultMessage: "السِّجل" },
  "@legalos.shell.brandTagline": { defaultMessage: "إدارة مكاتب المحاماة" },
  "@legalos.shell.mainNavAriaLabel": { defaultMessage: "التنقل الرئيسي" },
  "@legalos.shell.firm.alSayed": { defaultMessage: "السيد وشركاه" },
  "@legalos.shell.firm.cairoLegal": { defaultMessage: "مجموعة القاهرة القانونية" },

  // Seven navigation sections (T-051)
  "@legalos.shell.nav.section.overview": { defaultMessage: "عام" },
  "@legalos.shell.nav.section.clients": { defaultMessage: "الموكّلون" },
  "@legalos.shell.nav.section.practice": { defaultMessage: "الممارسة القانونية" },
  "@legalos.shell.nav.section.content": { defaultMessage: "المحتوى والمدوّنة" },
  "@legalos.shell.nav.section.ai": { defaultMessage: "الذكاء الاصطناعي" },
  "@legalos.shell.nav.section.finance": { defaultMessage: "الشؤون المالية" },
  "@legalos.shell.nav.section.team": { defaultMessage: "الفريق والنظام" },

  // Navigation items
  "@legalos.shell.nav.dashboard": { defaultMessage: "لوحة التحكم" },
  "@legalos.shell.nav.clients": { defaultMessage: "الموكّلون" },
  "@legalos.shell.nav.crm": { defaultMessage: "إدارة العلاقات" },
  "@legalos.shell.nav.matters": { defaultMessage: "القضايا" },
  "@legalos.shell.nav.hearings": { defaultMessage: "يوميّة الجلسات" },
  "@legalos.shell.nav.calendar": { defaultMessage: "التقويم" },
  "@legalos.shell.nav.tasks": { defaultMessage: "المهام" },
  "@legalos.shell.nav.documents": { defaultMessage: "المستندات" },
  "@legalos.shell.nav.lawLibrary": { defaultMessage: "مكتبة القوانين" },
  "@legalos.shell.nav.knowledgeBase": { defaultMessage: "النماذج والقوالب" },
  "@legalos.shell.nav.legalQuestion": { defaultMessage: "السؤال القانوني" },
  "@legalos.shell.nav.aiAssistant": { defaultMessage: "المساعد الذكي" },
  "@legalos.shell.nav.legalResearch": { defaultMessage: "البحث القانوني" },
  "@legalos.shell.nav.contractReview": { defaultMessage: "مراجعة العقود" },
  "@legalos.shell.nav.timeTracking": { defaultMessage: "تتبّع الوقت" },
  "@legalos.shell.nav.billing": { defaultMessage: "الفوترة" },
  "@legalos.shell.nav.accounting": { defaultMessage: "المحاسبة" },
  "@legalos.shell.nav.reports": { defaultMessage: "التقارير" },
  "@legalos.shell.nav.messages": { defaultMessage: "الرسائل" },
  "@legalos.shell.nav.automation": { defaultMessage: "الأتمتة" },
  "@legalos.shell.nav.settings": { defaultMessage: "الإعدادات" },

  // Gated feature indicators
  "@legalos.shell.nav.lockedBadge": { defaultMessage: "محجوب" },
  "@legalos.shell.nav.lockedTitle": { defaultMessage: "{path} — محجوبة بمفتاح {feature}" },
  "@legalos.shell.nav.lockedAria": { defaultMessage: "{label} — ميزة محجوبة" },

  // Four shell themes
  "@legalos.shell.theme.light": { defaultMessage: "فاتح" },
  "@legalos.shell.theme.dark": { defaultMessage: "داكن" },
  "@legalos.shell.theme.mixed": { defaultMessage: "مختلط: قائمة داكنة" },
  "@legalos.shell.theme.mixedInv": { defaultMessage: "مختلط عكسي: قائمة فاتحة" },

  // Collapse / Expand
  "@legalos.shell.collapse": { defaultMessage: "طي الشريط الجانبي" },
  "@legalos.shell.expand": { defaultMessage: "توسيع الشريط الجانبي" },
  "@legalos.shell.languageToggle.toArabic": { defaultMessage: "التبديل إلى العربية" },
  "@legalos.shell.languageToggle.toEnglish": { defaultMessage: "Switch to English" },
  "@legalos.shell.themeToggle.toLight": { defaultMessage: "التبديل إلى الوضع الفاتح" },
  "@legalos.shell.themeToggle.toDark": { defaultMessage: "التبديل إلى الوضع الداكن" },

  // Search & command palette
  "@legalos.shell.search.ariaLabel": { defaultMessage: "البحث في LegalOS" },
  "@legalos.shell.search.button": { defaultMessage: "بحث" },
  "@legalos.shell.search.emptyBootstrap": {
    defaultMessage: "ابحث في القضايا والموكّلين والمستندات",
  },
  "@legalos.shell.search.placeholder": {
    defaultMessage: "ابحث برقم القضية أو اسم الموكّل…",
  },
  "@legalos.shell.search.empty": { defaultMessage: "لا يوجد ما يطابق البحث" },
  "@legalos.shell.search.group.navigation": { defaultMessage: "الانتقال إلى" },
  "@legalos.shell.search.group.clients": { defaultMessage: "الموكّلون" },
  "@legalos.shell.search.group.matters": { defaultMessage: "القضايا" },
  "@legalos.shell.search.group.documents": { defaultMessage: "المستندات" },
  "@legalos.shell.search.hint.navigate": { defaultMessage: "تنقّل" },
  "@legalos.shell.search.hint.select": { defaultMessage: "فتح" },
  "@legalos.shell.search.hint.close": { defaultMessage: "إغلاق" },

  // Account menu
  "@legalos.shell.account.menuAriaLabel": { defaultMessage: "قائمة حساب المستخدم" },
  "@legalos.shell.account.profile": { defaultMessage: "الملف الشخصي" },
  "@legalos.shell.account.firmSettings": { defaultMessage: "إعدادات المكتب" },
  "@legalos.shell.account.signOut": { defaultMessage: "تسجيل الخروج" },

  // Breadcrumb (T-060)
  "@legalos.shell.breadcrumb.ariaLabel": { defaultMessage: "مسار التنقل" },
  "@legalos.shell.breadcrumb.home": { defaultMessage: "الرئيسية" },
  "@legalos.shell.breadcrumb.loading": { defaultMessage: "جارٍ التحميل…" },
  "@legalos.shell.nav.plans": { defaultMessage: "الباقات" },
  "@legalos.shell.nav.subscribe": { defaultMessage: "الاشتراك" },

  // بطاقة خطة المكتب (T-058)
  "@legalos.shell.plan.trial": { defaultMessage: "التجربة" },
  "@legalos.shell.plan.basic": { defaultMessage: "الأساسية" },
  "@legalos.shell.plan.pro": { defaultMessage: "الاحترافية" },
  "@legalos.shell.plan.enterprise": { defaultMessage: "للمكاتب الكبيرة" },
  "@legalos.shell.planCard.title": { defaultMessage: "خطة المكتب" },
  "@legalos.shell.planCard.titleWithPlan": { defaultMessage: "خطة المكتب — {plan}" },
  "@legalos.shell.planCard.usersCount": { defaultMessage: "{current} من {total} مستخدمًا" },
  "@legalos.shell.planCard.expiresOn": { defaultMessage: "تنتهي {date}" },
  "@legalos.shell.planCard.trialExpired": { defaultMessage: "انتهت التجربة" },
  "@legalos.shell.planCard.collapsedTooltip": { defaultMessage: "خطة المكتب: {plan} · {users} · {expiry}" },
};
