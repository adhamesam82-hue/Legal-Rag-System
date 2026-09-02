import type { Catalog } from "@astryxdesign/core/i18n";

// The three screens a person meets before they have a firm: sign-in (with the
// new-device code and the password reset), sign-up, and the invitation page.
// They used to carry Arabic in the source, which meant the English build
// showed an Arabic sign-in. Errors that come from Clerk itself are shown as
// received and are not in here: matching them by text would break on the
// next Clerk release.

export const en: Catalog = {
  // --- sign-in -----------------------------------------------------------
  "@legalos.auth.signIn.title": { defaultMessage: "Sign in" },
  "@legalos.auth.signIn.email": { defaultMessage: "Email address" },
  "@legalos.auth.signIn.password": { defaultMessage: "Password" },
  "@legalos.auth.signIn.submit": { defaultMessage: "Sign in" },
  "@legalos.auth.signIn.forgot": { defaultMessage: "Forgot your password?" },
  "@legalos.auth.signIn.noAccount": { defaultMessage: "No account yet?" },
  "@legalos.auth.signIn.createFirm": { defaultMessage: "Create your firm" },
  "@legalos.auth.signIn.errorTitle": { defaultMessage: "Could not sign in" },
  "@legalos.auth.signIn.unsupportedStep": {
    defaultMessage:
      "This account needs an extra verification step that is not supported here yet. Please contact support.",
  },
  "@legalos.auth.signIn.incomplete": {
    defaultMessage: "Could not complete the sign-in. Please try again.",
  },
  "@legalos.auth.code.label": { defaultMessage: "Verification code" },
  "@legalos.auth.code.verify": { defaultMessage: "Verify" },
  "@legalos.auth.code.resend": { defaultMessage: "Send a new code" },
  "@legalos.auth.code.resent": { defaultMessage: "A new code has been sent" },
  "@legalos.auth.code.errorTitle": { defaultMessage: "Could not verify" },
  "@legalos.auth.trust.intro": {
    defaultMessage: "New device or browser -- we sent a code to {email} to confirm it is you.",
  },
  // --- password reset ------------------------------------------------------
  "@legalos.auth.reset.title": { defaultMessage: "Reset your password" },
  "@legalos.auth.reset.intro": {
    defaultMessage: "Enter your email address and we will send a code to set a new password.",
  },
  "@legalos.auth.reset.sendCode": { defaultMessage: "Send the code" },
  "@legalos.auth.reset.sendErrorTitle": { defaultMessage: "Could not send the code" },
  "@legalos.auth.reset.backToSignIn": { defaultMessage: "Back to sign in" },
  "@legalos.auth.reset.sentIntro": {
    defaultMessage: "If {email} is registered with us, a code is on its way. Enter it below.",
  },
  "@legalos.auth.reset.changeEmail": { defaultMessage: "Use a different email" },
  "@legalos.auth.reset.verifyFailed": {
    defaultMessage: "Could not verify the code. Please try again.",
  },
  "@legalos.auth.reset.newPasswordTitle": { defaultMessage: "New password" },
  "@legalos.auth.reset.newPasswordIntro": {
    defaultMessage: "Choose a new password. Sessions open on other devices will be signed out.",
  },
  "@legalos.auth.reset.newPassword": { defaultMessage: "New password" },
  "@legalos.auth.reset.save": { defaultMessage: "Save and sign in" },
  "@legalos.auth.reset.saveErrorTitle": { defaultMessage: "Could not save the password" },
  "@legalos.auth.reset.saveFailed": {
    defaultMessage: "Could not save the new password. Please try again.",
  },
  // --- sign-up -------------------------------------------------------------
  "@legalos.auth.signUp.title": { defaultMessage: "Create an account" },
  "@legalos.auth.signUp.continue": { defaultMessage: "Continue" },
  "@legalos.auth.signUp.errorTitle": { defaultMessage: "Could not create the account" },
  "@legalos.auth.signUp.haveAccount": { defaultMessage: "Already have an account?" },
  "@legalos.auth.signUp.signIn": { defaultMessage: "Sign in" },
  "@legalos.auth.signUp.codeIntro": {
    defaultMessage: "We sent a code to {email}. Enter it below to finish creating your account.",
  },
  "@legalos.auth.signUp.sendErrorTitle": { defaultMessage: "Could not send the code" },
  // --- invitation ----------------------------------------------------------
  "@legalos.auth.invite.title": { defaultMessage: "Invitation to join" },
  "@legalos.auth.invite.loading": { defaultMessage: "Loading…" },
  "@legalos.auth.invite.loadErrorTitle": { defaultMessage: "Could not open the invitation" },
  "@legalos.auth.invite.notFound": {
    defaultMessage: "This link is not valid or no longer exists.",
  },
  "@legalos.auth.invite.loadFailed": {
    defaultMessage: "Could not load the invitation. Check your connection and try again.",
  },
  "@legalos.auth.invite.accepted.title": { defaultMessage: "This invitation has already been used" },
  "@legalos.auth.invite.accepted.body": {
    defaultMessage: "You have already joined the firm. Sign in to continue.",
  },
  "@legalos.auth.invite.expired.title": { defaultMessage: "This invitation has expired" },
  "@legalos.auth.invite.expired.body": {
    defaultMessage: "Invitations expire after seven days. Ask the firm's owner to send a new one.",
  },
  "@legalos.auth.invite.revoked.title": { defaultMessage: "This invitation was withdrawn" },
  "@legalos.auth.invite.revoked.body": {
    defaultMessage: "This invitation is no longer valid. Contact the firm's owner.",
  },
  "@legalos.auth.invite.invalid.title": { defaultMessage: "This invitation is not valid" },
  "@legalos.auth.invite.invalid.body": {
    defaultMessage: "Contact the firm's owner for a new invitation.",
  },
  "@legalos.auth.invite.goToSignIn": { defaultMessage: "Go to sign in" },
  "@legalos.auth.invite.invited": {
    defaultMessage: "You have been invited to join {firm} as {role}.",
  },
  "@legalos.auth.invite.acceptErrorTitle": { defaultMessage: "Could not accept the invitation" },
  "@legalos.auth.invite.acceptFailed": {
    defaultMessage: "Could not accept the invitation. Try again.",
  },
  "@legalos.auth.invite.accept": { defaultMessage: "Accept the invitation" },
  "@legalos.auth.invite.signInHint": {
    defaultMessage: "Sign in with the account for this email address to accept.",
  },
  "@legalos.auth.invite.signInToAccept": { defaultMessage: "Sign in to accept" },
  "@legalos.auth.invite.role.lawyer": { defaultMessage: "a lawyer" },
  "@legalos.auth.invite.role.staff": { defaultMessage: "a staff member" },
};

export const ar: Catalog = {
  // --- sign-in -----------------------------------------------------------
  "@legalos.auth.signIn.title": { defaultMessage: "تسجيل الدخول" },
  "@legalos.auth.signIn.email": { defaultMessage: "البريد الإلكتروني" },
  "@legalos.auth.signIn.password": { defaultMessage: "كلمة المرور" },
  "@legalos.auth.signIn.submit": { defaultMessage: "تسجيل الدخول" },
  "@legalos.auth.signIn.forgot": { defaultMessage: "نسيت كلمة المرور؟" },
  "@legalos.auth.signIn.noAccount": { defaultMessage: "ليس لديك حساب؟" },
  "@legalos.auth.signIn.createFirm": { defaultMessage: "أنشئ حساب مكتبك" },
  "@legalos.auth.signIn.errorTitle": { defaultMessage: "تعذر تسجيل الدخول" },
  "@legalos.auth.signIn.unsupportedStep": {
    defaultMessage:
      "يتطلب هذا الحساب خطوة تحقق إضافية غير مدعومة هنا حاليًا. يرجى التواصل مع الدعم.",
  },
  "@legalos.auth.signIn.incomplete": {
    defaultMessage: "تعذر إكمال تسجيل الدخول. يرجى المحاولة مرة أخرى.",
  },
  "@legalos.auth.code.label": { defaultMessage: "رمز التحقق" },
  "@legalos.auth.code.verify": { defaultMessage: "تحقق" },
  "@legalos.auth.code.resend": { defaultMessage: "إعادة إرسال الرمز" },
  "@legalos.auth.code.resent": { defaultMessage: "تم إرسال رمز جديد" },
  "@legalos.auth.code.errorTitle": { defaultMessage: "تعذر التحقق" },
  "@legalos.auth.trust.intro": {
    defaultMessage: "جهاز أو متصفح جديد — أرسلنا رمزًا إلى {email} لتأكيد هويتك.",
  },
  // --- password reset ------------------------------------------------------
  "@legalos.auth.reset.title": { defaultMessage: "استعادة كلمة المرور" },
  "@legalos.auth.reset.intro": {
    defaultMessage: "أدخل بريدك الإلكتروني وسنرسل إليه رمزًا لتعيين كلمة مرور جديدة.",
  },
  "@legalos.auth.reset.sendCode": { defaultMessage: "إرسال الرمز" },
  "@legalos.auth.reset.sendErrorTitle": { defaultMessage: "تعذر إرسال الرمز" },
  "@legalos.auth.reset.backToSignIn": { defaultMessage: "العودة إلى تسجيل الدخول" },
  "@legalos.auth.reset.sentIntro": {
    defaultMessage: "إن كان {email} مسجّلًا لدينا فقد أرسلنا إليه رمزًا. أدخله أدناه.",
  },
  "@legalos.auth.reset.changeEmail": { defaultMessage: "تغيير البريد الإلكتروني" },
  "@legalos.auth.reset.verifyFailed": {
    defaultMessage: "تعذر التحقق من الرمز. يرجى المحاولة مرة أخرى.",
  },
  "@legalos.auth.reset.newPasswordTitle": { defaultMessage: "كلمة مرور جديدة" },
  "@legalos.auth.reset.newPasswordIntro": {
    defaultMessage: "اختر كلمة مرور جديدة. ستُغلق الجلسات المفتوحة على الأجهزة الأخرى.",
  },
  "@legalos.auth.reset.newPassword": { defaultMessage: "كلمة المرور الجديدة" },
  "@legalos.auth.reset.save": { defaultMessage: "حفظ والدخول" },
  "@legalos.auth.reset.saveErrorTitle": { defaultMessage: "تعذر حفظ كلمة المرور" },
  "@legalos.auth.reset.saveFailed": {
    defaultMessage: "تعذر حفظ كلمة المرور الجديدة. يرجى المحاولة مرة أخرى.",
  },
  // --- sign-up -------------------------------------------------------------
  "@legalos.auth.signUp.title": { defaultMessage: "إنشاء حساب" },
  "@legalos.auth.signUp.continue": { defaultMessage: "متابعة" },
  "@legalos.auth.signUp.errorTitle": { defaultMessage: "تعذر إنشاء الحساب" },
  "@legalos.auth.signUp.haveAccount": { defaultMessage: "لديك حساب؟" },
  "@legalos.auth.signUp.signIn": { defaultMessage: "سجّل الدخول" },
  "@legalos.auth.signUp.codeIntro": {
    defaultMessage: "أرسلنا رمزًا إلى {email}. أدخله أدناه لإكمال إنشاء حسابك.",
  },
  "@legalos.auth.signUp.sendErrorTitle": { defaultMessage: "تعذر إرسال الرمز" },
  // --- invitation ----------------------------------------------------------
  "@legalos.auth.invite.title": { defaultMessage: "دعوة للانضمام" },
  "@legalos.auth.invite.loading": { defaultMessage: "جارٍ التحميل…" },
  "@legalos.auth.invite.loadErrorTitle": { defaultMessage: "تعذّر فتح الدعوة" },
  "@legalos.auth.invite.notFound": {
    defaultMessage: "هذا الرابط غير صحيح أو لم يعد موجودًا.",
  },
  "@legalos.auth.invite.loadFailed": {
    defaultMessage: "تعذّر تحميل الدعوة. تحقّق من اتصالك ثم أعد المحاولة.",
  },
  "@legalos.auth.invite.accepted.title": { defaultMessage: "هذه الدعوة مُستخدَمة بالفعل" },
  "@legalos.auth.invite.accepted.body": {
    defaultMessage: "انضممت إلى المكتب من قبل. سجّل الدخول للمتابعة.",
  },
  "@legalos.auth.invite.expired.title": { defaultMessage: "انتهت صلاحية هذه الدعوة" },
  "@legalos.auth.invite.expired.body": {
    defaultMessage: "تنتهي الدعوة بعد سبعة أيام. اطلب من صاحب المكتب إرسال دعوة جديدة.",
  },
  "@legalos.auth.invite.revoked.title": { defaultMessage: "أُلغيت هذه الدعوة" },
  "@legalos.auth.invite.revoked.body": {
    defaultMessage: "لم تعد هذه الدعوة صالحة. تواصل مع صاحب المكتب.",
  },
  "@legalos.auth.invite.invalid.title": { defaultMessage: "هذه الدعوة غير صالحة" },
  "@legalos.auth.invite.invalid.body": {
    defaultMessage: "تواصل مع صاحب المكتب للحصول على دعوة جديدة.",
  },
  "@legalos.auth.invite.goToSignIn": { defaultMessage: "الذهاب إلى تسجيل الدخول" },
  "@legalos.auth.invite.invited": {
    defaultMessage: "تمت دعوتك للانضمام إلى {firm} بصفة {role}.",
  },
  "@legalos.auth.invite.acceptErrorTitle": { defaultMessage: "تعذّر قبول الدعوة" },
  "@legalos.auth.invite.acceptFailed": {
    defaultMessage: "تعذّر قبول الدعوة. حاول مرة أخرى.",
  },
  "@legalos.auth.invite.accept": { defaultMessage: "قبول الدعوة" },
  "@legalos.auth.invite.signInHint": {
    defaultMessage: "سجّل الدخول بالحساب المرتبط بهذا البريد لقبول الدعوة.",
  },
  "@legalos.auth.invite.signInToAccept": { defaultMessage: "تسجيل الدخول للقبول" },
  "@legalos.auth.invite.role.lawyer": { defaultMessage: "محامٍ" },
  "@legalos.auth.invite.role.staff": { defaultMessage: "سكرتير" },
};
