import type { Catalog } from "@astryxdesign/core/i18n";

// /plans and /subscribe (T-041), and the trial bar in Shell.tsx.
//
// The plan names (basic/pro/enterprise) are PROVISIONAL -- the owner has not
// decided them, their prices, or their limits. Every price and feature slot
// says so explicitly rather than showing an invented number or a list
// copied from a competitor; see migrations/0026_subscription.sql and
// tickets/T-041.md for what is and is not decided yet.

export const en: Catalog = {
  "@legalos.plans.trialBar.daysLeft": {
    defaultMessage: "{days, plural, =0 {Your free trial ends today} one {Your free trial ends in # day} other {Your free trial ends in # days}}",
  },
  "@legalos.plans.trialBar.expired": { defaultMessage: "Your free trial has ended" },
  "@legalos.plans.trialBar.until": { defaultMessage: "Until {date}" },
  "@legalos.plans.trialBar.viewPlans": { defaultMessage: "View plans" },

  "@legalos.plans.heading": { defaultMessage: "Plans" },
  "@legalos.plans.subtitle": {
    defaultMessage:
      "Pricing hasn't been set yet. These are placeholders so you can tell us which one interests you — nothing is charged, and your trial keeps running either way.",
  },
  "@legalos.plans.priceTbd": { defaultMessage: "Price to be announced" },
  "@legalos.plans.featuresTbd": { defaultMessage: "Features are still being decided." },
  "@legalos.plans.plan.basic.name": { defaultMessage: "Basic" },
  "@legalos.plans.plan.pro.name": { defaultMessage: "Professional" },
  "@legalos.plans.plan.enterprise.name": { defaultMessage: "Enterprise" },
  "@legalos.plans.plan.basic.blurb": { defaultMessage: "For a solo lawyer or a small practice." },
  "@legalos.plans.plan.pro.blurb": { defaultMessage: "For a growing firm handling more cases." },
  "@legalos.plans.plan.enterprise.blurb": { defaultMessage: "For a large firm with its own requirements." },
  "@legalos.plans.wantThis": { defaultMessage: "I'd like this plan" },
  "@legalos.plans.contactSales": { defaultMessage: "Contact sales" },
  "@legalos.plans.chosen": { defaultMessage: "Chosen" },
  "@legalos.plans.recording": { defaultMessage: "Recording…" },
  "@legalos.plans.recordFailed": { defaultMessage: "Could not record your choice." },
  "@legalos.plans.thanksTitle": { defaultMessage: "Thanks — we've noted your choice." },
  "@legalos.plans.thanksBody": {
    defaultMessage: "Payment isn't enabled yet. We'll reach out when it is; your free trial keeps running until {date}.",
  },
  "@legalos.plans.ownerOnly": {
    defaultMessage: "Only an Owner can choose a plan for the firm. You can still see what's here.",
  },
  "@legalos.plans.legalNotice": {
    defaultMessage: "Prices, when set, will be software subscription fees. They do not include legal fees or legal services.",
  },
  "@legalos.plans.viewSubscribePage": { defaultMessage: "View the payment page" },

  "@legalos.subscribe.heading": { defaultMessage: "Subscribe" },
  "@legalos.subscribe.notEnabled": { defaultMessage: "Payment isn't enabled yet." },
  "@legalos.subscribe.withChoiceBody": {
    defaultMessage: "You chose the {plan} plan, and we've saved it. We'll email you once payment is available. Your free trial keeps running until {date}.",
  },
  "@legalos.subscribe.noChoiceBody": {
    defaultMessage: "You haven't chosen a plan yet. Your free trial keeps running until {date}.",
  },
  "@legalos.subscribe.expiredBody": {
    defaultMessage: "Your free trial has ended, but nothing in the product has been locked while payment isn't available.",
  },
  "@legalos.subscribe.goToPlans": { defaultMessage: "Choose a plan" },

  "@legalos.settings.plan.heading": { defaultMessage: "Plan & billing" },
  "@legalos.settings.plan.subtitle": { defaultMessage: "Your firm's current plan and free trial." },
  "@legalos.settings.plan.currentTrial": { defaultMessage: "Free trial" },
  "@legalos.settings.plan.intentLabel": { defaultMessage: "Plan you're interested in" },
  "@legalos.settings.plan.noIntent": { defaultMessage: "No plan chosen yet." },
  "@legalos.settings.plan.viewPlans": { defaultMessage: "View plans" },

  "@legalos.common.noOrg.trialLine": {
    defaultMessage: "{days, plural, one {Your free trial is # day with every feature.} other {Your free trial is # days with every feature.}}",
  },

  "@legalos.discount.haveACode": { defaultMessage: "Have a discount code?" },
  "@legalos.discount.codePlaceholder": { defaultMessage: "Enter a code" },
  "@legalos.discount.apply": { defaultMessage: "Apply" },
  "@legalos.discount.applying": { defaultMessage: "Applying…" },
  "@legalos.discount.applyFailed": { defaultMessage: "Could not apply this code." },
  "@legalos.discount.appliedTrialDays": {
    defaultMessage: "{days, plural, one {A discount code added # day to your free trial.} other {A discount code added # days to your free trial.}}",
  },
  "@legalos.discount.appliedFuture": {
    defaultMessage: "A discount code is saved on your firm: {amount} off will apply once billing is enabled.",
  },
  "@legalos.discount.percent": { defaultMessage: "{value}%" },
  "@legalos.discount.firmCreatedCodeFailed": {
    defaultMessage: "Your firm was created. The discount code could not be applied.",
  },
  "@legalos.discount.continueWithoutCode": { defaultMessage: "Continue to the product" },
};

export const ar: Catalog = {
  "@legalos.plans.trialBar.daysLeft": {
    defaultMessage: "{days, plural, =0 {تجربتك المجانية تنتهي اليوم} one {تجربتك المجانية تنتهي بعد يوم واحد} two {تجربتك المجانية تنتهي بعد يومين} few {تجربتك المجانية تنتهي بعد # أيام} many {تجربتك المجانية تنتهي بعد # يومًا} other {تجربتك المجانية تنتهي بعد # يوم}}",
  },
  "@legalos.plans.trialBar.expired": { defaultMessage: "انتهت تجربتك المجانية" },
  "@legalos.plans.trialBar.until": { defaultMessage: "حتى {date}" },
  "@legalos.plans.trialBar.viewPlans": { defaultMessage: "عرض الباقات" },

  "@legalos.plans.heading": { defaultMessage: "الباقات" },
  "@legalos.plans.subtitle": {
    defaultMessage:
      "لم تُحدَّد الأسعار بعد. هذه عناوين مؤقتة لتخبرنا أيها يهمّك — لا يُخصم منك شيء، وتجربتك المجانية مستمرة على أي حال.",
  },
  "@legalos.plans.priceTbd": { defaultMessage: "السعر يُعلن قريبًا" },
  "@legalos.plans.featuresTbd": { defaultMessage: "الميزات قيد التحديد." },
  "@legalos.plans.plan.basic.name": { defaultMessage: "الأساسية" },
  "@legalos.plans.plan.pro.name": { defaultMessage: "الاحترافية" },
  "@legalos.plans.plan.enterprise.name": { defaultMessage: "للمكاتب الكبيرة" },
  "@legalos.plans.plan.basic.blurb": { defaultMessage: "لمحامٍ منفرد أو مكتب صغير." },
  "@legalos.plans.plan.pro.blurb": { defaultMessage: "لمكتب نامٍ يتولى عددًا أكبر من القضايا." },
  "@legalos.plans.plan.enterprise.blurb": { defaultMessage: "لمكتب كبير له متطلباته الخاصة." },
  "@legalos.plans.wantThis": { defaultMessage: "أرغب في هذه الباقة" },
  "@legalos.plans.contactSales": { defaultMessage: "تواصل مع المبيعات" },
  "@legalos.plans.chosen": { defaultMessage: "مُختارة" },
  "@legalos.plans.recording": { defaultMessage: "جارٍ التسجيل…" },
  "@legalos.plans.recordFailed": { defaultMessage: "تعذّر تسجيل اختيارك." },
  "@legalos.plans.thanksTitle": { defaultMessage: "شكرًا — سجّلنا اختيارك." },
  "@legalos.plans.thanksBody": {
    defaultMessage: "الدفع لم يُفعَّل بعد. سنتواصل معك حين يُتاح، وتجربتك المجانية مستمرة حتى {date}.",
  },
  "@legalos.plans.ownerOnly": {
    defaultMessage: "المالك وحده يستطيع اختيار باقة للمكتب. يمكنك رؤية هذه الصفحة رغم ذلك.",
  },
  "@legalos.plans.legalNotice": {
    defaultMessage: "الأسعار، حين تُحدَّد، رسوم اشتراك برمجي، ولا تشمل أتعابًا أو خدمات قانونية.",
  },
  "@legalos.plans.viewSubscribePage": { defaultMessage: "عرض صفحة الدفع" },

  "@legalos.subscribe.heading": { defaultMessage: "الاشتراك" },
  "@legalos.subscribe.notEnabled": { defaultMessage: "بوابة الدفع لم تُفعَّل بعد." },
  "@legalos.subscribe.withChoiceBody": {
    defaultMessage: "اخترتَ باقة {plan}، ونحفظ اختيارك. سنراسلك حين يُتاح الدفع، وتجربتك المجانية مستمرة حتى {date}.",
  },
  "@legalos.subscribe.noChoiceBody": {
    defaultMessage: "لم تختر باقة بعد. تجربتك المجانية مستمرة حتى {date}.",
  },
  "@legalos.subscribe.expiredBody": {
    defaultMessage: "انتهت تجربتك المجانية، لكن لم يُقفَل شيء في المنتج ما دام الدفع غير متاح.",
  },
  "@legalos.subscribe.goToPlans": { defaultMessage: "اختر باقة" },

  "@legalos.settings.plan.heading": { defaultMessage: "الباقة والفوترة" },
  "@legalos.settings.plan.subtitle": { defaultMessage: "باقة المكتب الحالية وتجربته المجانية." },
  "@legalos.settings.plan.currentTrial": { defaultMessage: "تجربة مجانية" },
  "@legalos.settings.plan.intentLabel": { defaultMessage: "الباقة التي تهمّك" },
  "@legalos.settings.plan.noIntent": { defaultMessage: "لم تُختر باقة بعد." },
  "@legalos.settings.plan.viewPlans": { defaultMessage: "عرض الباقات" },

  "@legalos.common.noOrg.trialLine": {
    defaultMessage: "{days, plural, one {تجربتك المجانية يوم واحد بكل الميزات.} two {تجربتك المجانية يومان بكل الميزات.} few {تجربتك المجانية # أيام بكل الميزات.} many {تجربتك المجانية # يومًا بكل الميزات.} other {تجربتك المجانية # يوم بكل الميزات.}}",
  },

  "@legalos.discount.haveACode": { defaultMessage: "لديك كود خصم؟" },
  "@legalos.discount.codePlaceholder": { defaultMessage: "أدخل الكود" },
  "@legalos.discount.apply": { defaultMessage: "تطبيق" },
  "@legalos.discount.applying": { defaultMessage: "جارٍ التطبيق…" },
  "@legalos.discount.applyFailed": { defaultMessage: "تعذّر تطبيق هذا الكود." },
  "@legalos.discount.appliedTrialDays": {
    defaultMessage: "{days, plural, one {كود خصم أضاف يومًا واحدًا إلى تجربتك المجانية.} two {كود خصم أضاف يومين إلى تجربتك المجانية.} few {كود خصم أضاف # أيام إلى تجربتك المجانية.} many {كود خصم أضاف # يومًا إلى تجربتك المجانية.} other {كود خصم أضاف # يوم إلى تجربتك المجانية.}}",
  },
  "@legalos.discount.appliedFuture": {
    defaultMessage: "كود خصم محفوظ على مكتبك: سيُطبَّق خصم {amount} حين يُفعَّل الاشتراك.",
  },
  "@legalos.discount.percent": { defaultMessage: "{value}٪" },
  "@legalos.discount.firmCreatedCodeFailed": {
    defaultMessage: "أُنشئ مكتبك. لم نستطع تطبيق كود الخصم.",
  },
  "@legalos.discount.continueWithoutCode": { defaultMessage: "المتابعة إلى المنتج" },
};
