import type { Catalog } from "@astryxdesign/core/i18n";

// Role values (owner/lawyer/staff) are NOT duplicated here — they resolve
// through lib/i18n/catalogs/enums.ts via useEnumLabel().
//
// The members and invitations on the Users screen are mock data. Their
// "Joined Mar 2026" / "Invited 2 days ago" strings are parameterised rather
// than one key per hardcoded sentence, so they still translate correctly once
// a real backend supplies the values.

export const en: Catalog = {
  "@legalos.settings.heading": { defaultMessage: "Settings" },
  "@legalos.settings.sectionsNavLabel": { defaultMessage: "Settings sections" },
  "@legalos.settings.group.myAccount": { defaultMessage: "My account" },
  "@legalos.settings.nav.profile": { defaultMessage: "Profile" },
  "@legalos.settings.nav.firmSettings": { defaultMessage: "Firm settings" },
  "@legalos.settings.nav.users": { defaultMessage: "Users & permissions" },
  "@legalos.settings.nav.integrations": { defaultMessage: "Integrations" },
  "@legalos.settings.nav.branding": { defaultMessage: "Branding" },
  "@legalos.settings.nav.billing": { defaultMessage: "Billing" },
  "@legalos.settings.nav.apiKeys": { defaultMessage: "API keys" },
  "@legalos.settings.nav.aiModels": { defaultMessage: "AI models" },

  "@legalos.settings.firm.heading": { defaultMessage: "Firm settings" },
  "@legalos.settings.firm.subtitle": {
    defaultMessage:
      "General information about {firm}. Visible to every member of the firm.",
  },
  "@legalos.settings.firm.logoHeading": { defaultMessage: "Firm logo" },
  "@legalos.settings.firm.logoDescription": {
    defaultMessage: "Shown on invoices, generated documents, and the sidebar.",
  },
  "@legalos.settings.firm.uploadLogo": { defaultMessage: "Upload logo" },
  "@legalos.settings.firm.logoPlaceholder": {
    defaultMessage: "Drag a logo here, or click to browse",
  },
  "@legalos.settings.firm.logoHint": {
    defaultMessage: "PNG, JPG, or SVG. Recommended 512×512px, up to 2MB.",
  },
  "@legalos.settings.firm.detailsHeading": { defaultMessage: "Firm details" },
  "@legalos.settings.firm.nameLabel": { defaultMessage: "Firm name" },
  "@legalos.settings.firm.registrationLabel": {
    defaultMessage: "Commercial registration number",
  },
  "@legalos.settings.firm.registrationHint": {
    defaultMessage: "As registered with the Egyptian Commercial Registry.",
  },
  "@legalos.settings.firm.phoneLabel": { defaultMessage: "Phone" },
  "@legalos.settings.firm.addressLabel": { defaultMessage: "Address" },

  "@legalos.settings.action.cancel": { defaultMessage: "Cancel" },
  "@legalos.settings.action.saveChanges": { defaultMessage: "Save changes" },
  "@legalos.settings.action.discard": { defaultMessage: "Discard" },

  "@legalos.settings.users.heading": { defaultMessage: "Users & permissions" },
  "@legalos.settings.users.inviteMember": { defaultMessage: "Invite member" },
  "@legalos.settings.users.subtitle": {
    defaultMessage:
      "Manage who has access to {firm} and what they can do. Only Owners can invite new members.",
  },
  "@legalos.settings.users.invitationsHint": {
    defaultMessage: "Invitations are single-use links that expire 7 days after they're sent.",
  },
  "@legalos.settings.users.you": { defaultMessage: "You" },
  "@legalos.settings.users.nameWithYou": { defaultMessage: "{name} (you)" },
  "@legalos.settings.users.foundingMember": { defaultMessage: "Founding member" },
  "@legalos.settings.users.joined": { defaultMessage: "Joined {month} {year}" },
  "@legalos.settings.users.changeRoleToLawyer": {
    defaultMessage: "Change role to Lawyer",
  },
  "@legalos.settings.users.changeRoleToStaff": {
    defaultMessage: "Change role to Staff",
  },
  "@legalos.settings.users.removeFromFirm": { defaultMessage: "Remove from firm" },
  "@legalos.settings.users.pendingInvitations": {
    defaultMessage: "Pending invitations",
  },
  "@legalos.settings.users.resend": { defaultMessage: "Resend" },
  "@legalos.settings.users.invitePending": {
    defaultMessage: "Invited {sent} days ago · expires in {expires} days",
  },
  "@legalos.settings.users.inviteExpired": {
    defaultMessage: "Invited {sent} days ago · expired {expired} days ago",
  },
  "@legalos.settings.users.status.pending": { defaultMessage: "Pending" },
  "@legalos.settings.users.status.expired": { defaultMessage: "Expired" },
  "@legalos.settings.users.status.revoked": { defaultMessage: "Revoked" },

  "@legalos.settings.invite.title": { defaultMessage: "Invite a team member" },
  "@legalos.settings.invite.subtitle": {
    defaultMessage:
      "They'll get an email with a link to join {firm}. Invitations expire after 7 days.",
  },
  "@legalos.settings.invite.emailLabel": { defaultMessage: "Email address" },
  "@legalos.settings.invite.roleLabel": { defaultMessage: "Role" },
  "@legalos.settings.invite.roleHint": {
    defaultMessage: "New members can only be invited as Lawyer or Staff.",
  },
  "@legalos.settings.invite.send": { defaultMessage: "Send invite" },

  "@legalos.settings.profile.backToSettings": { defaultMessage: "Settings" },
  "@legalos.settings.profile.heading": { defaultMessage: "Your profile" },
  "@legalos.settings.profile.subtitle": {
    defaultMessage: "How you appear to the rest of {firm}.",
  },
  "@legalos.settings.profile.photoHeading": { defaultMessage: "Photo" },
  "@legalos.settings.profile.uploadPhotoLabel": { defaultMessage: "Upload a new photo" },
  "@legalos.settings.profile.uploadPhoto": { defaultMessage: "Upload photo" },
  "@legalos.settings.profile.removePhoto": { defaultMessage: "Remove photo" },
  "@legalos.settings.profile.remove": { defaultMessage: "Remove" },
  "@legalos.settings.profile.photoHint": {
    defaultMessage: "JPG or PNG, at least 256×256px. Falls back to your initials.",
  },
  "@legalos.settings.profile.detailsHeading": { defaultMessage: "Details" },
  "@legalos.settings.profile.fullName": { defaultMessage: "Full name" },
  "@legalos.settings.profile.jobTitle": { defaultMessage: "Job title" },
  "@legalos.settings.profile.emailAddress": { defaultMessage: "Email address" },
  "@legalos.settings.profile.phone": { defaultMessage: "Phone" },
  "@legalos.settings.profile.interfaceLanguage": { defaultMessage: "Interface language" },
  "@legalos.settings.profile.discardChanges": { defaultMessage: "Discard changes" },
  "@legalos.settings.profile.roleHeading": { defaultMessage: "Role and access" },
  "@legalos.settings.profile.ownerDescription": {
    defaultMessage: "Full access to every matter, plus firm billing and team management.",
  },
  "@legalos.settings.profile.ownerNote": {
    defaultMessage:
      "Only an Owner can change roles. A firm must always keep at least one Owner, so your own role cannot be changed while you are the only one.",
  },
  "@legalos.settings.profile.manageTeam": { defaultMessage: "Manage the team" },
  "@legalos.settings.profile.notificationsHeading": { defaultMessage: "Notifications" },
  "@legalos.settings.profile.digestLabel": { defaultMessage: "Daily email digest" },
  "@legalos.settings.profile.digestDescription": {
    defaultMessage: "A morning summary of hearings, deadlines, and assignments.",
  },
  "@legalos.settings.profile.hearingLabel": { defaultMessage: "Hearing reminders" },
  "@legalos.settings.profile.hearingDescription": {
    defaultMessage:
      "Alert me the day before any hearing on a matter I am responsible for.",
  },
  "@legalos.settings.profile.mentionLabel": { defaultMessage: "Mentions in messages" },
  "@legalos.settings.profile.mentionDescription": {
    defaultMessage: "Notify me when a colleague @mentions me in a matter channel.",
  },
  "@legalos.settings.profile.securityHeading": { defaultMessage: "Security" },
  "@legalos.settings.profile.password": { defaultMessage: "Password" },
  "@legalos.settings.profile.passwordChanged": {
    defaultMessage: "Last changed 4 months ago",
  },
  "@legalos.settings.profile.changePassword": { defaultMessage: "Change password" },
  "@legalos.settings.profile.twoFactor": { defaultMessage: "Two-factor authentication" },
  "@legalos.settings.profile.twoFactorHint": {
    defaultMessage:
      "Not enabled — strongly recommended for accounts with billing access.",
  },
  "@legalos.settings.profile.enableTwoFactor": {
    defaultMessage: "Enable two-factor authentication",
  },
  "@legalos.settings.profile.enable": { defaultMessage: "Enable" },
  "@legalos.settings.profile.activeSessions": { defaultMessage: "Active sessions" },
  "@legalos.settings.profile.thisDevice": { defaultMessage: "This device" },
  "@legalos.settings.profile.signOutOf": { defaultMessage: "Sign out of {device}" },
  "@legalos.settings.profile.signOut": { defaultMessage: "Sign out" },

  "@legalos.settings.month.jan": { defaultMessage: "Jan" },
  "@legalos.settings.month.feb": { defaultMessage: "Feb" },
  "@legalos.settings.month.mar": { defaultMessage: "Mar" },
  "@legalos.settings.month.apr": { defaultMessage: "Apr" },
  "@legalos.settings.month.may": { defaultMessage: "May" },
  "@legalos.settings.month.jun": { defaultMessage: "Jun" },
};

export const ar: Catalog = {
  "@legalos.settings.heading": { defaultMessage: "الإعدادات" },
  "@legalos.settings.sectionsNavLabel": { defaultMessage: "أقسام الإعدادات" },
  "@legalos.settings.group.myAccount": { defaultMessage: "حسابي" },
  "@legalos.settings.nav.profile": { defaultMessage: "الملف الشخصي" },
  "@legalos.settings.nav.firmSettings": { defaultMessage: "إعدادات المكتب" },
  "@legalos.settings.nav.users": { defaultMessage: "المستخدمون والصلاحيات" },
  "@legalos.settings.nav.integrations": { defaultMessage: "التكاملات" },
  "@legalos.settings.nav.branding": { defaultMessage: "الهوية البصرية" },
  "@legalos.settings.nav.billing": { defaultMessage: "الاشتراك والفوترة" },
  "@legalos.settings.nav.apiKeys": { defaultMessage: "مفاتيح الـ API" },
  "@legalos.settings.nav.aiModels": { defaultMessage: "نماذج الذكاء الاصطناعي" },

  "@legalos.settings.firm.heading": { defaultMessage: "إعدادات المكتب" },
  "@legalos.settings.firm.subtitle": {
    defaultMessage: "معلومات عامة عن {firm}. مرئية لكل أعضاء المكتب.",
  },
  "@legalos.settings.firm.logoHeading": { defaultMessage: "شعار المكتب" },
  "@legalos.settings.firm.logoDescription": {
    defaultMessage: "يظهر على الفواتير والمستندات المُنشأة وفي القائمة الجانبية.",
  },
  "@legalos.settings.firm.uploadLogo": { defaultMessage: "رفع الشعار" },
  "@legalos.settings.firm.logoPlaceholder": {
    defaultMessage: "اسحب الشعار هنا، أو انقر للاختيار",
  },
  "@legalos.settings.firm.logoHint": {
    defaultMessage: "PNG أو JPG أو SVG. يُفضَّل ٥١٢×٥١٢ بكسل، وبحد أقصى ٢ ميجابايت.",
  },
  "@legalos.settings.firm.detailsHeading": { defaultMessage: "بيانات المكتب" },
  "@legalos.settings.firm.nameLabel": { defaultMessage: "اسم المكتب" },
  "@legalos.settings.firm.registrationLabel": {
    defaultMessage: "رقم السجل التجاري",
  },
  "@legalos.settings.firm.registrationHint": {
    defaultMessage: "كما هو مقيَّد في السجل التجاري المصري.",
  },
  "@legalos.settings.firm.phoneLabel": { defaultMessage: "الهاتف" },
  "@legalos.settings.firm.addressLabel": { defaultMessage: "العنوان" },

  "@legalos.settings.action.cancel": { defaultMessage: "إلغاء" },
  "@legalos.settings.action.saveChanges": { defaultMessage: "حفظ التغييرات" },
  "@legalos.settings.action.discard": { defaultMessage: "تجاهل" },

  "@legalos.settings.users.heading": { defaultMessage: "المستخدمون والصلاحيات" },
  "@legalos.settings.users.inviteMember": { defaultMessage: "دعوة عضو" },
  "@legalos.settings.users.subtitle": {
    defaultMessage:
      "تحكَّم في من يملك حق الوصول إلى {firm} وما يمكنه فعله. المُلَّاك وحدهم يمكنهم دعوة أعضاء جدد.",
  },
  "@legalos.settings.users.invitationsHint": {
    defaultMessage: "الدعوات روابط تُستخدم مرة واحدة وتنتهي صلاحيتها بعد ٧ أيام من إرسالها.",
  },
  "@legalos.settings.users.you": { defaultMessage: "أنت" },
  "@legalos.settings.users.nameWithYou": { defaultMessage: "{name} (أنت)" },
  "@legalos.settings.users.foundingMember": { defaultMessage: "عضو مؤسس" },
  "@legalos.settings.users.joined": { defaultMessage: "انضم في {month} {year}" },
  "@legalos.settings.users.changeRoleToLawyer": {
    defaultMessage: "تغيير الصلاحية إلى محامٍ",
  },
  "@legalos.settings.users.changeRoleToStaff": {
    defaultMessage: "تغيير الصلاحية إلى موظف",
  },
  "@legalos.settings.users.removeFromFirm": { defaultMessage: "إزالة من المكتب" },
  "@legalos.settings.users.pendingInvitations": {
    defaultMessage: "الدعوات المعلَّقة",
  },
  "@legalos.settings.users.resend": { defaultMessage: "إعادة الإرسال" },
  "@legalos.settings.users.invitePending": {
    defaultMessage: "أُرسلت الدعوة منذ {sent} أيام · تنتهي خلال {expires} أيام",
  },
  "@legalos.settings.users.inviteExpired": {
    defaultMessage: "أُرسلت الدعوة منذ {sent} أيام · انتهت منذ {expired} يومين",
  },
  "@legalos.settings.users.status.pending": { defaultMessage: "معلَّقة" },
  "@legalos.settings.users.status.expired": { defaultMessage: "منتهية" },
  "@legalos.settings.users.status.revoked": { defaultMessage: "ملغاة" },

  "@legalos.settings.invite.title": { defaultMessage: "دعوة عضو للفريق" },
  "@legalos.settings.invite.subtitle": {
    defaultMessage:
      "سيصله بريد إلكتروني يتضمن رابطاً للانضمام إلى {firm}. تنتهي صلاحية الدعوات بعد ٧ أيام.",
  },
  "@legalos.settings.invite.emailLabel": { defaultMessage: "البريد الإلكتروني" },
  "@legalos.settings.invite.roleLabel": { defaultMessage: "الصلاحية" },
  "@legalos.settings.invite.roleHint": {
    defaultMessage: "لا يمكن دعوة الأعضاء الجدد إلا بصلاحية محامٍ أو موظف.",
  },
  "@legalos.settings.invite.send": { defaultMessage: "إرسال الدعوة" },

  "@legalos.settings.profile.backToSettings": { defaultMessage: "الإعدادات" },
  "@legalos.settings.profile.heading": { defaultMessage: "ملفك الشخصي" },
  "@legalos.settings.profile.subtitle": {
    defaultMessage: "كيف تظهر لباقي أعضاء {firm}.",
  },
  "@legalos.settings.profile.photoHeading": { defaultMessage: "الصورة الشخصية" },
  "@legalos.settings.profile.uploadPhotoLabel": { defaultMessage: "رفع صورة جديدة" },
  "@legalos.settings.profile.uploadPhoto": { defaultMessage: "رفع صورة" },
  "@legalos.settings.profile.removePhoto": { defaultMessage: "إزالة الصورة" },
  "@legalos.settings.profile.remove": { defaultMessage: "إزالة" },
  "@legalos.settings.profile.photoHint": {
    defaultMessage: "JPG أو PNG، بحد أدنى ٢٥٦×٢٥٦ بكسل. وإلا فستظهر الأحرف الأولى من اسمك.",
  },
  "@legalos.settings.profile.detailsHeading": { defaultMessage: "البيانات" },
  "@legalos.settings.profile.fullName": { defaultMessage: "الاسم بالكامل" },
  "@legalos.settings.profile.jobTitle": { defaultMessage: "المسمى الوظيفي" },
  "@legalos.settings.profile.emailAddress": { defaultMessage: "البريد الإلكتروني" },
  "@legalos.settings.profile.phone": { defaultMessage: "الهاتف" },
  "@legalos.settings.profile.interfaceLanguage": { defaultMessage: "لغة الواجهة" },
  "@legalos.settings.profile.discardChanges": { defaultMessage: "تجاهل التغييرات" },
  "@legalos.settings.profile.roleHeading": { defaultMessage: "الصلاحية والوصول" },
  "@legalos.settings.profile.ownerDescription": {
    defaultMessage: "وصول كامل إلى كل الملفات، إضافة إلى فوترة المكتب وإدارة الفريق.",
  },
  "@legalos.settings.profile.ownerNote": {
    defaultMessage:
      "المالك وحده يمكنه تغيير الصلاحيات. ويجب أن يبقى للمكتب مالك واحد على الأقل، لذلك لا يمكن تغيير صلاحيتك ما دمت المالك الوحيد.",
  },
  "@legalos.settings.profile.manageTeam": { defaultMessage: "إدارة الفريق" },
  "@legalos.settings.profile.notificationsHeading": { defaultMessage: "الإشعارات" },
  "@legalos.settings.profile.digestLabel": { defaultMessage: "ملخص يومي بالبريد" },
  "@legalos.settings.profile.digestDescription": {
    defaultMessage: "ملخص صباحي للجلسات والمواعيد النهائية والمهام المسندة.",
  },
  "@legalos.settings.profile.hearingLabel": { defaultMessage: "تذكير بالجلسات" },
  "@legalos.settings.profile.hearingDescription": {
    defaultMessage:
      "نبّهني قبل يوم من أي جلسة في ملف أنا المسؤول عنه.",
  },
  "@legalos.settings.profile.mentionLabel": { defaultMessage: "الإشارات في الرسائل" },
  "@legalos.settings.profile.mentionDescription": {
    defaultMessage: "أبلغني عندما يشير زميل إليّ في قناة ملف.",
  },
  "@legalos.settings.profile.securityHeading": { defaultMessage: "الأمان" },
  "@legalos.settings.profile.password": { defaultMessage: "كلمة المرور" },
  "@legalos.settings.profile.passwordChanged": {
    defaultMessage: "آخر تغيير منذ ٤ أشهر",
  },
  "@legalos.settings.profile.changePassword": { defaultMessage: "تغيير كلمة المرور" },
  "@legalos.settings.profile.twoFactor": { defaultMessage: "التحقق بخطوتين" },
  "@legalos.settings.profile.twoFactorHint": {
    defaultMessage:
      "غير مفعّل — يُوصى به بشدة للحسابات ذات صلاحية الفوترة.",
  },
  "@legalos.settings.profile.enableTwoFactor": {
    defaultMessage: "تفعيل التحقق بخطوتين",
  },
  "@legalos.settings.profile.enable": { defaultMessage: "تفعيل" },
  "@legalos.settings.profile.activeSessions": { defaultMessage: "الجلسات النشطة" },
  "@legalos.settings.profile.thisDevice": { defaultMessage: "هذا الجهاز" },
  "@legalos.settings.profile.signOutOf": { defaultMessage: "تسجيل الخروج من {device}" },
  "@legalos.settings.profile.signOut": { defaultMessage: "تسجيل الخروج" },

  "@legalos.settings.month.jan": { defaultMessage: "يناير" },
  "@legalos.settings.month.feb": { defaultMessage: "فبراير" },
  "@legalos.settings.month.mar": { defaultMessage: "مارس" },
  "@legalos.settings.month.apr": { defaultMessage: "أبريل" },
  "@legalos.settings.month.may": { defaultMessage: "مايو" },
  "@legalos.settings.month.jun": { defaultMessage: "يونيو" },
};
