import type { Catalog } from "@astryxdesign/core/i18n";

// Messages and Automation are mock-data pillars with no backend. This covers
// their chrome; the channel names, message bodies, automation names, triggers
// and workflow-step copy stay in the mock data, the same treatment matter
// names and knowledge-base entries get — a real backend would store those as
// the firm wrote them.

export const en: Catalog = {
  // --- Messages ---------------------------------------------------------
  "@legalos.messages.jumpTo.label": { defaultMessage: "Jump to" },
  "@legalos.messages.jumpTo.placeholder": {
    defaultMessage: "Jump to a channel or person...",
  },
  "@legalos.messages.matterChannels": { defaultMessage: "Matter channels" },
  "@legalos.messages.directMessages": { defaultMessage: "Direct messages" },
  "@legalos.messages.memberCount": {
    defaultMessage: "{count, plural, one {# member} other {# members}}",
  },
  "@legalos.messages.members": { defaultMessage: "Members" },
  "@legalos.messages.attachFile": { defaultMessage: "Attach a file" },
  "@legalos.messages.aiSummary": { defaultMessage: "AI Summary" },
  "@legalos.messages.empty.title": { defaultMessage: "No messages yet" },
  "@legalos.messages.empty.description": {
    defaultMessage:
      "Start the conversation — messages here are only visible to people on this matter.",
  },

  // --- Automation -------------------------------------------------------
  "@legalos.automation.heading": { defaultMessage: "Automation" },
  "@legalos.automation.subtitle": {
    defaultMessage:
      "Rule-based workflows that run automatically when something happens in LegalOS.",
  },
  "@legalos.automation.newAutomation": { defaultMessage: "New automation" },
  "@legalos.automation.toggle": { defaultMessage: "Turn {name} {state}" },
  "@legalos.automation.toggle.on": { defaultMessage: "on" },
  "@legalos.automation.toggle.off": { defaultMessage: "off" },
  "@legalos.automation.stepCount": {
    defaultMessage: "{count, plural, one {# step} other {# steps}}",
  },
  "@legalos.automation.triggerAndSteps": { defaultMessage: "{trigger} · {steps}" },
  "@legalos.automation.status.active": { defaultMessage: "Active" },
  "@legalos.automation.status.paused": { defaultMessage: "Paused" },
  "@legalos.automation.trigger": { defaultMessage: "Trigger" },
  "@legalos.automation.activity": { defaultMessage: "Activity" },
  "@legalos.automation.workflowSteps": { defaultMessage: "Workflow steps" },
};

export const ar: Catalog = {
  // --- Messages ---------------------------------------------------------
  "@legalos.messages.jumpTo.label": { defaultMessage: "انتقال سريع" },
  "@legalos.messages.jumpTo.placeholder": {
    defaultMessage: "انتقل إلى قناة أو شخص...",
  },
  "@legalos.messages.matterChannels": { defaultMessage: "قنوات الملفات" },
  "@legalos.messages.directMessages": { defaultMessage: "الرسائل المباشرة" },
  "@legalos.messages.memberCount": {
    defaultMessage:
      "{count, plural, zero {لا أعضاء} one {عضو واحد} two {عضوان} few {# أعضاء} many {# عضواً} other {# عضو}}",
  },
  "@legalos.messages.members": { defaultMessage: "الأعضاء" },
  "@legalos.messages.attachFile": { defaultMessage: "إرفاق ملف" },
  "@legalos.messages.aiSummary": { defaultMessage: "ملخص الذكاء الاصطناعي" },
  "@legalos.messages.empty.title": { defaultMessage: "لا توجد رسائل بعد" },
  "@legalos.messages.empty.description": {
    defaultMessage:
      "ابدأ المحادثة — الرسائل هنا مرئية فقط لمن يعملون على هذا الملف.",
  },

  // --- Automation -------------------------------------------------------
  "@legalos.automation.heading": { defaultMessage: "الأتمتة" },
  "@legalos.automation.subtitle": {
    defaultMessage:
      "مسارات عمل قائمة على قواعد تعمل تلقائياً عند وقوع حدث في LegalOS.",
  },
  "@legalos.automation.newAutomation": { defaultMessage: "أتمتة جديدة" },
  "@legalos.automation.toggle": { defaultMessage: "{state} {name}" },
  "@legalos.automation.toggle.on": { defaultMessage: "تشغيل" },
  "@legalos.automation.toggle.off": { defaultMessage: "إيقاف" },
  "@legalos.automation.stepCount": {
    defaultMessage:
      "{count, plural, zero {لا خطوات} one {خطوة واحدة} two {خطوتان} few {# خطوات} many {# خطوة} other {# خطوة}}",
  },
  "@legalos.automation.triggerAndSteps": { defaultMessage: "{trigger} · {steps}" },
  "@legalos.automation.status.active": { defaultMessage: "مفعَّلة" },
  "@legalos.automation.status.paused": { defaultMessage: "متوقفة" },
  "@legalos.automation.trigger": { defaultMessage: "المُشغِّل" },
  "@legalos.automation.activity": { defaultMessage: "النشاط" },
  "@legalos.automation.workflowSteps": { defaultMessage: "خطوات سير العمل" },
};
