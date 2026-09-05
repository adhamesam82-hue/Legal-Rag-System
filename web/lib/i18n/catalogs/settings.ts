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
  "@legalos.settings.nav.appearance": { defaultMessage: "Appearance & display" },
  "@legalos.settings.appearance.heading": { defaultMessage: "Appearance & display" },
  "@legalos.settings.appearance.subtitle": {
    defaultMessage: "Customise how Al-Sijil looks and feels on this device.",
  },

  "@legalos.settings.appearance.theme.heading": { defaultMessage: "Interface theme" },
  "@legalos.settings.appearance.theme.description": {
    defaultMessage: "Select from four curated visual modes for the app shell and sidebar.",
  },
  "@legalos.settings.appearance.theme.light": { defaultMessage: "Light" },
  "@legalos.settings.appearance.theme.lightDesc": { defaultMessage: "Clean light surface and sidebar" },
  "@legalos.settings.appearance.theme.dark": { defaultMessage: "Dark" },
  "@legalos.settings.appearance.theme.darkDesc": { defaultMessage: "Deep dark surface and sidebar" },
  "@legalos.settings.appearance.theme.mixed": { defaultMessage: "Mixed" },
  "@legalos.settings.appearance.theme.mixedDesc": { defaultMessage: "Light surface with dark sidebar" },
  "@legalos.settings.appearance.theme.mixedInv": { defaultMessage: "Inverted mixed" },
  "@legalos.settings.appearance.theme.mixedInvDesc": { defaultMessage: "Dark surface with light sidebar" },

  "@legalos.settings.appearance.density.heading": { defaultMessage: "Display density" },
  "@legalos.settings.appearance.density.description": {
    defaultMessage: "Controls vertical row padding across tables, lists, and form rows.",
  },
  "@legalos.settings.appearance.density.comfortable": { defaultMessage: "Comfortable" },
  "@legalos.settings.appearance.density.comfortableBadge": { defaultMessage: "18px" },
  "@legalos.settings.appearance.density.comfortableDesc": {
    defaultMessage: "Spacious padding for relaxed scanning and touch devices",
  },
  "@legalos.settings.appearance.density.medium": { defaultMessage: "Medium" },
  "@legalos.settings.appearance.density.mediumBadge": { defaultMessage: "14px" },
  "@legalos.settings.appearance.density.mediumDesc": {
    defaultMessage: "Default balanced density for daily legal workflows",
  },
  "@legalos.settings.appearance.density.compact": { defaultMessage: "Compact" },
  "@legalos.settings.appearance.density.compactBadge": { defaultMessage: "10px" },
  "@legalos.settings.appearance.density.compactDesc": {
    defaultMessage: "Dense display maximizing data visibility on screen",
  },

  "@legalos.settings.appearance.radius.heading": { defaultMessage: "Corner radius" },
  "@legalos.settings.appearance.radius.description": {
    defaultMessage: "Adjust the roundness of cards, buttons, badges, and modals.",
  },
  "@legalos.settings.appearance.radius.sliderAria": { defaultMessage: "Corner radius in pixels" },
  "@legalos.settings.appearance.radius.derivedNote": {
    defaultMessage: "Inner components (--rs) automatically follow via max(4px, --r - 4px).",
  },
  "@legalos.settings.appearance.radius.previewHeading": { defaultMessage: "Live preview" },
  "@legalos.settings.appearance.radius.previewCardTitle": { defaultMessage: "Contract drafting" },
  "@legalos.settings.appearance.radius.previewBadge": { defaultMessage: "Active matter" },
  "@legalos.settings.appearance.radius.previewButton": { defaultMessage: "Save matter" },

  "@legalos.settings.appearance.sidebar.heading": { defaultMessage: "Sidebar behaviour" },
  "@legalos.settings.appearance.sidebar.description": {
    defaultMessage: "Keep the navigation sidebar collapsed to an icon rail by default.",
  },
  "@legalos.settings.appearance.sidebar.collapseLabel": {
    defaultMessage: "Keep sidebar collapsed by default",
  },

  "@legalos.settings.appearance.reset.heading": { defaultMessage: "Reset appearance" },
  "@legalos.settings.appearance.reset.description": {
    defaultMessage: "Clear all local appearance customizations and restore default values.",
  },
  "@legalos.settings.appearance.reset.button": { defaultMessage: "Reset to defaults" },
  "@legalos.settings.appearance.reset.confirm": {
    defaultMessage: "Are you sure you want to reset all appearance settings to their defaults?",
  },
  "@legalos.settings.appearance.reset.done": {
    defaultMessage: "Appearance settings restored to defaults.",
  },

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
  "@legalos.settings.firm.logoFailed": { defaultMessage: "Could not upload the logo." },
  "@legalos.settings.firm.logoUnavailable": {
    defaultMessage:
      "Uploading a logo is not available yet — there is nowhere to store it. Until then the firm's initials are used.",
  },
  "@legalos.settings.firm.saving": { defaultMessage: "Saving…" },
  "@legalos.settings.firm.saved": { defaultMessage: "Firm details saved." },
  "@legalos.settings.firm.saveFailed": {
    defaultMessage: "Could not save the firm's details.",
  },
  "@legalos.settings.firm.ownerOnly": {
    defaultMessage:
      "Only an Owner can change these. They appear on every invoice the firm sends.",
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
  "@legalos.settings.users.scopeLabel": { defaultMessage: "Case access" },
  "@legalos.settings.users.scopeAll": { defaultMessage: "All cases" },
  "@legalos.settings.users.scopeAssigned": { defaultMessage: "Their cases only" },
  "@legalos.settings.users.scopeFailed": { defaultMessage: "Could not change case access." },
  "@legalos.settings.users.inviteFailed": { defaultMessage: "Could not send the invitation." },
  "@legalos.settings.users.removeFailed": { defaultMessage: "Could not remove this member." },
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
  "@legalos.settings.users.inviteSent": {
    defaultMessage: "Invitation emailed to {email}.",
  },
  "@legalos.settings.users.inviteExpiry": { defaultMessage: "Expires {date}" },
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
  // Shown when the invitation was created but no mail went out -- an
  // unconfigured mail provider, or a send that failed. The invitation is
  // valid either way, so the owner is given the link rather than an error.
  "@legalos.settings.invite.notEmailedTitle": {
    defaultMessage: "Invitation created, but no email was sent",
  },
  "@legalos.settings.invite.notEmailedBody": {
    defaultMessage: "Send this link to {email} yourself. It expires in 7 days.",
  },
  "@legalos.settings.invite.copyLink": { defaultMessage: "Copy link" },
  "@legalos.settings.invite.copied": { defaultMessage: "Copied" },
  "@legalos.settings.invite.done": { defaultMessage: "Done" },

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
  "@legalos.settings.profile.titleLabel": { defaultMessage: "Job title" },
  "@legalos.settings.profile.identityReadOnly": { defaultMessage: "Your name and title are set by the firm. Ask an owner to change them." },
  "@legalos.settings.profile.languageHeading": { defaultMessage: "Language" },
  "@legalos.settings.profile.roleDescription.owner": { defaultMessage: "Full access to every case, plus firm billing and team management." },
  "@legalos.settings.profile.roleDescription.lawyer": { defaultMessage: "Works cases, records time, and files documents." },
  "@legalos.settings.profile.roleDescription.staff": { defaultMessage: "Schedules hearings, files documents, and handles client funds." },
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

  // --- T-034: the settings screen's remaining sections ---------------------

  "@legalos.settings.firm.specialtiesLabel": { defaultMessage: "Practice areas" },
  "@legalos.settings.firm.specialtiesHint": {
    defaultMessage: "Shapes the matter-type suggestions and distribution reports.",
  },
  "@legalos.settings.firm.specialtiesPlaceholder": { defaultMessage: "Choose what the firm handles" },
  "@legalos.settings.firm.governorateLabel": { defaultMessage: "Governorate" },
  "@legalos.settings.firm.mainCourtLabel": { defaultMessage: "Main court" },
  "@legalos.settings.firm.firmSizeLabel": { defaultMessage: "Firm size" },
  "@legalos.settings.firm.firmSize.solo": { defaultMessage: "Solo practitioner" },
  "@legalos.settings.firm.firmSize.small": { defaultMessage: "Small (2\u201310)" },
  "@legalos.settings.firm.firmSize.medium": { defaultMessage: "Medium (11\u201350)" },
  "@legalos.settings.firm.firmSize.large": { defaultMessage: "Large (50+)" },
  "@legalos.settings.firm.clientKindLabel": { defaultMessage: "Client base" },
  "@legalos.settings.firm.clientKind.individuals": { defaultMessage: "Mostly individuals" },
  "@legalos.settings.firm.clientKind.companies": { defaultMessage: "Mostly companies" },
  "@legalos.settings.firm.clientKind.mixed": { defaultMessage: "Mixed" },

  "@legalos.settings.identity.heading": { defaultMessage: "Brand identity" },
  "@legalos.settings.identity.subtitle": {
    defaultMessage: "What appears on invoices, generated documents, and the firm's letterhead.",
  },
  "@legalos.settings.identity.legalNameLabel": { defaultMessage: "Full legal name" },
  "@legalos.settings.identity.legalNameHint": {
    defaultMessage: "If different from the firm name above -- printed on invoices when set.",
  },
  "@legalos.settings.identity.taxIdLabel": { defaultMessage: "Tax ID" },
  "@legalos.settings.identity.barNumberLabel": { defaultMessage: "Bar registration number" },
  "@legalos.settings.identity.websiteLabel": { defaultMessage: "Website" },
  "@legalos.settings.identity.brandColorLabel": { defaultMessage: "Brand colour" },
  "@legalos.settings.identity.brandColorHint": {
    defaultMessage: "From the design system's own palette, so contrast stays correct everywhere it appears.",
  },

  "@legalos.settings.preferences.heading": { defaultMessage: "Preferences" },
  "@legalos.settings.preferences.subtitle": {
    defaultMessage: "Language, time zone, and how dates and amounts are shown.",
  },
  "@legalos.settings.preferences.localeLabel": { defaultMessage: "Language" },
  "@legalos.settings.preferences.locale.ar": { defaultMessage: "Arabic" },
  "@legalos.settings.preferences.locale.en": { defaultMessage: "English" },
  "@legalos.settings.preferences.timezoneLabel": { defaultMessage: "Time zone" },
  "@legalos.settings.preferences.dateFormatLabel": { defaultMessage: "Date format" },
  "@legalos.settings.preferences.currencyLabel": { defaultMessage: "Default currency" },
  "@legalos.settings.preferences.currencyHint": { defaultMessage: "Three-letter code, e.g. EGP." },
  "@legalos.settings.preferences.currencyInvalid": {
    defaultMessage: "Must be a three-letter code, e.g. EGP or USD.",
  },

  "@legalos.settings.billing.heading": { defaultMessage: "Billing" },
  "@legalos.settings.billing.subtitle": {
    defaultMessage:
      "How new invoices are numbered and pre-filled. Every invoice already sent keeps its own figures -- changing these does not touch it.",
  },
  "@legalos.settings.billing.patternLabel": { defaultMessage: "Invoice numbering pattern" },
  "@legalos.settings.billing.patternHint": {
    defaultMessage: "Leave blank for the built-in INV-{year}-{seq}. Must end with {seq}.",
  },
  "@legalos.settings.billing.patternError.unknown": {
    defaultMessage: "Only {year} and {seq} are allowed as placeholders.",
  },
  "@legalos.settings.billing.patternError.mustEndWithSeq": {
    defaultMessage: "The pattern must end with {seq}, exactly once.",
  },
  "@legalos.settings.billing.taxRateLabel": { defaultMessage: "Default tax rate (%)" },
  "@legalos.settings.billing.taxRateHint": {
    defaultMessage: "Pre-fills new invoices only. Never applied to an invoice already created.",
  },
  "@legalos.settings.billing.taxRateInvalid": { defaultMessage: "Must be between 0 and 100." },
  "@legalos.settings.billing.termsLabel": { defaultMessage: "Default payment terms (days)" },
  "@legalos.settings.billing.termsInvalid": { defaultMessage: "Cannot be negative." },

  "@legalos.settings.requiredFields.heading": { defaultMessage: "Required fields" },
  "@legalos.settings.requiredFields.subtitle": {
    defaultMessage: "Which optional fields this firm considers essential when opening a matter or registering a client.",
  },
  "@legalos.settings.requiredFields.notEnforcedYet": {
    defaultMessage:
      "This records the firm's choice. The matter and client forms do not check it yet.",
  },
  "@legalos.settings.requiredFields.matterGroup": { defaultMessage: "When opening a matter" },
  "@legalos.settings.requiredFields.matter.matter_number": { defaultMessage: "Matter number" },
  "@legalos.settings.requiredFields.matter.description": { defaultMessage: "Description" },
  "@legalos.settings.requiredFields.matter.budget_amount": { defaultMessage: "Budget" },
  "@legalos.settings.requiredFields.matter.tags": { defaultMessage: "Tags" },
  "@legalos.settings.requiredFields.matter.staff": { defaultMessage: "Assigned staff" },
  "@legalos.settings.requiredFields.clientGroup": { defaultMessage: "When registering a client" },
  "@legalos.settings.requiredFields.client.industry": { defaultMessage: "Industry" },
  "@legalos.settings.requiredFields.client.client_since": { defaultMessage: "Client since" },
  "@legalos.settings.requiredFields.client.registration_number": { defaultMessage: "Registration number" },
  "@legalos.settings.requiredFields.client.tax_id": { defaultMessage: "Tax ID" },
  "@legalos.settings.requiredFields.client.address": { defaultMessage: "Address" },
  "@legalos.settings.requiredFields.client.phone": { defaultMessage: "Phone" },
  "@legalos.settings.requiredFields.client.email": { defaultMessage: "Email" },
  "@legalos.settings.requiredFields.client.notes": { defaultMessage: "Notes" },

  "@legalos.settings.notifications.loading": { defaultMessage: "Loading notification settings\u2026" },
  "@legalos.settings.notifications.heading": { defaultMessage: "Notifications" },
  "@legalos.settings.notifications.subtitle": {
    defaultMessage: "Your own reminder channels -- every member sets these regardless of role.",
  },
  "@legalos.settings.notifications.saveFailed": { defaultMessage: "Could not save this preference." },
  "@legalos.settings.notifications.noneAvailable": {
    defaultMessage: "No reminder channel is configured on this install yet.",
  },
  "@legalos.settings.notifications.emailLabel": { defaultMessage: "Email reminders" },
  "@legalos.settings.notifications.emailHint": {
    defaultMessage: "A hearing, deadline, or task reminder by email.",
  },
  "@legalos.settings.notifications.pushLabel": { defaultMessage: "Push notifications" },
  "@legalos.settings.notifications.pushHint": {
    defaultMessage: "The same reminders, pushed to a registered device.",
  },
};

export const ar: Catalog = {
  "@legalos.settings.heading": { defaultMessage: "الإعدادات" },
  "@legalos.settings.sectionsNavLabel": { defaultMessage: "أقسام الإعدادات" },
  "@legalos.settings.group.myAccount": { defaultMessage: "حسابي" },
  "@legalos.settings.nav.profile": { defaultMessage: "الملف الشخصي" },
  "@legalos.settings.nav.appearance": { defaultMessage: "المظهر والعرض" },
  "@legalos.settings.appearance.heading": { defaultMessage: "المظهر والعرض" },
  "@legalos.settings.appearance.subtitle": {
    defaultMessage: "تخصيص مظهر وشعور نظام السِّجل على هذا الجهاز.",
  },

  "@legalos.settings.appearance.theme.heading": { defaultMessage: "نمط الواجهة" },
  "@legalos.settings.appearance.theme.description": {
    defaultMessage: "اختر بين أربعة أنماط بصرية مدروسة للقشرة والشريط الجانبي.",
  },
  "@legalos.settings.appearance.theme.light": { defaultMessage: "فاتح" },
  "@legalos.settings.appearance.theme.lightDesc": { defaultMessage: "واجهة فاتحة وشريط جانبي فاتح" },
  "@legalos.settings.appearance.theme.dark": { defaultMessage: "داكن" },
  "@legalos.settings.appearance.theme.darkDesc": { defaultMessage: "واجهة داكنة وشريط جانبي داكن" },
  "@legalos.settings.appearance.theme.mixed": { defaultMessage: "مختلط" },
  "@legalos.settings.appearance.theme.mixedDesc": { defaultMessage: "واجهة فاتحة مع شريط جانبي داكن" },
  "@legalos.settings.appearance.theme.mixedInv": { defaultMessage: "مختلط عكسي" },
  "@legalos.settings.appearance.theme.mixedInvDesc": { defaultMessage: "واجهة داكنة مع شريط جانبي فاتح" },

  "@legalos.settings.appearance.density.heading": { defaultMessage: "كثافة العرض" },
  "@legalos.settings.appearance.density.description": {
    defaultMessage: "التحكم في التباعد الرأسي وهوامش الأسطر في الجداول والقوائم.",
  },
  "@legalos.settings.appearance.density.comfortable": { defaultMessage: "مريح" },
  "@legalos.settings.appearance.density.comfortableBadge": { defaultMessage: "١٨ بكسل" },
  "@legalos.settings.appearance.density.comfortableDesc": {
    defaultMessage: "تباعد رحب لقراءة مريحة وتصفح سلس على مختلف الأجهزة",
  },
  "@legalos.settings.appearance.density.medium": { defaultMessage: "متوسط" },
  "@legalos.settings.appearance.density.mediumBadge": { defaultMessage: "١٤ بكسل" },
  "@legalos.settings.appearance.density.mediumDesc": {
    defaultMessage: "الكثافة الافتراضية المتوازنة لبيئات العمل اليومية",
  },
  "@legalos.settings.appearance.density.compact": { defaultMessage: "مضغوط" },
  "@legalos.settings.appearance.density.compactBadge": { defaultMessage: "١٠ بكسل" },
  "@legalos.settings.appearance.density.compactDesc": {
    defaultMessage: "عرض مكثف يزيد من كمية البيانات المرئية في الشاشة",
  },

  "@legalos.settings.appearance.radius.heading": { defaultMessage: "استدارة الحواف والزوايا" },
  "@legalos.settings.appearance.radius.description": {
    defaultMessage: "ضبط درجة استدارة البطاقات والأزرار والشارات والنوافذ المنبثقة.",
  },
  "@legalos.settings.appearance.radius.sliderAria": { defaultMessage: "درجة الاستدارة بالبكسل" },
  "@legalos.settings.appearance.radius.derivedNote": {
    defaultMessage: "العناصر الداخلية (--rs) تتبع تلقائياً باشتقاق max(4px, --r - 4px).",
  },
  "@legalos.settings.appearance.radius.previewHeading": { defaultMessage: "معاينة حية" },
  "@legalos.settings.appearance.radius.previewCardTitle": { defaultMessage: "صياغة عقد تجاري" },
  "@legalos.settings.appearance.radius.previewBadge": { defaultMessage: "قضية نشطة" },
  "@legalos.settings.appearance.radius.previewButton": { defaultMessage: "حفظ القضية" },

  "@legalos.settings.appearance.sidebar.heading": { defaultMessage: "سلوك الشريط الجانبي" },
  "@legalos.settings.appearance.sidebar.description": {
    defaultMessage: "إبقاء شريط التنقل الجانبي مطوياً في وضع الأيقونات افتراضياً.",
  },
  "@legalos.settings.appearance.sidebar.collapseLabel": {
    defaultMessage: "إبقاء الشريط الجانبي مطوياً افتراضياً",
  },

  "@legalos.settings.appearance.reset.heading": { defaultMessage: "إعادة ضبط المظهر" },
  "@legalos.settings.appearance.reset.description": {
    defaultMessage: "مسح كافة تفضيلات المظهر المحفوظة واستعادة القيم الافتراضية الأصلية.",
  },
  "@legalos.settings.appearance.reset.button": { defaultMessage: "إعادة الضبط للافتراضيات" },
  "@legalos.settings.appearance.reset.confirm": {
    defaultMessage: "هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية للمظهر؟",
  },
  "@legalos.settings.appearance.reset.done": {
    defaultMessage: "تمت استعادة إعدادات المظهر الافتراضية بنجاح.",
  },

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
    defaultMessage: "PNG أو JPG أو SVG. يُفضَّل 512×512 بكسل، وبحد أقصى 2 ميجابايت.",
  },
  "@legalos.settings.firm.logoFailed": { defaultMessage: "تعذّر رفع الشعار." },
  "@legalos.settings.firm.logoUnavailable": {
    defaultMessage:
      "رفع الشعار غير متاح بعد — لا يوجد مكان لتخزينه. وحتى ذلك الحين تُستخدَم الأحرف الأولى من اسم المكتب.",
  },
  "@legalos.settings.firm.saving": { defaultMessage: "جارٍ الحفظ…" },
  "@legalos.settings.firm.saved": { defaultMessage: "حُفظت بيانات المكتب." },
  "@legalos.settings.firm.saveFailed": {
    defaultMessage: "تعذّر حفظ بيانات المكتب.",
  },
  "@legalos.settings.firm.ownerOnly": {
    defaultMessage:
      "المالك وحده يمكنه تعديل هذه البيانات، فهي تظهر على كل فاتورة يصدرها المكتب.",
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
    defaultMessage: "الدعوات روابط تُستخدم مرة واحدة وتنتهي صلاحيتها بعد 7 أيام من إرسالها.",
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
  "@legalos.settings.users.scopeLabel": { defaultMessage: "الوصول للقضايا" },
  "@legalos.settings.users.scopeAll": { defaultMessage: "كل القضايا" },
  "@legalos.settings.users.scopeAssigned": { defaultMessage: "قضاياه فقط" },
  "@legalos.settings.users.scopeFailed": { defaultMessage: "تعذّر تغيير الوصول للقضايا." },
  "@legalos.settings.users.inviteFailed": { defaultMessage: "تعذّر إرسال الدعوة." },
  "@legalos.settings.users.removeFailed": { defaultMessage: "تعذّرت إزالة هذا العضو." },
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
  "@legalos.settings.users.inviteSent": {
    defaultMessage: "أُرسلت الدعوة بالبريد إلى {email}.",
  },
  "@legalos.settings.users.inviteExpiry": { defaultMessage: "تنتهي في {date}" },
  "@legalos.settings.users.status.pending": { defaultMessage: "معلَّقة" },
  "@legalos.settings.users.status.expired": { defaultMessage: "منتهية" },
  "@legalos.settings.users.status.revoked": { defaultMessage: "ملغاة" },

  "@legalos.settings.invite.title": { defaultMessage: "دعوة عضو للفريق" },
  "@legalos.settings.invite.subtitle": {
    defaultMessage:
      "سيصله بريد إلكتروني يتضمن رابطاً للانضمام إلى {firm}. تنتهي صلاحية الدعوات بعد 7 أيام.",
  },
  "@legalos.settings.invite.emailLabel": { defaultMessage: "البريد الإلكتروني" },
  "@legalos.settings.invite.roleLabel": { defaultMessage: "الصلاحية" },
  "@legalos.settings.invite.roleHint": {
    defaultMessage: "لا يمكن دعوة الأعضاء الجدد إلا بصلاحية محامٍ أو سكرتير.",
  },
  "@legalos.settings.invite.send": { defaultMessage: "إرسال الدعوة" },
  "@legalos.settings.invite.notEmailedTitle": {
    defaultMessage: "أُنشئت الدعوة، لكن لم يُرسَل بريد",
  },
  "@legalos.settings.invite.notEmailedBody": {
    defaultMessage: "أرسل هذا الرابط إلى {email} بنفسك. تنتهي صلاحيته بعد 7 أيام.",
  },
  "@legalos.settings.invite.copyLink": { defaultMessage: "نسخ الرابط" },
  "@legalos.settings.invite.copied": { defaultMessage: "تم النسخ" },
  "@legalos.settings.invite.done": { defaultMessage: "تم" },

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
    defaultMessage: "JPG أو PNG، بحد أدنى 256×256 بكسل. وإلا فستظهر الأحرف الأولى من اسمك.",
  },
  "@legalos.settings.profile.detailsHeading": { defaultMessage: "البيانات" },
  "@legalos.settings.profile.fullName": { defaultMessage: "الاسم بالكامل" },
  "@legalos.settings.profile.jobTitle": { defaultMessage: "المسمى الوظيفي" },
  "@legalos.settings.profile.emailAddress": { defaultMessage: "البريد الإلكتروني" },
  "@legalos.settings.profile.phone": { defaultMessage: "الهاتف" },
  "@legalos.settings.profile.interfaceLanguage": { defaultMessage: "لغة الواجهة" },
  "@legalos.settings.profile.discardChanges": { defaultMessage: "تجاهل التغييرات" },
  "@legalos.settings.profile.titleLabel": { defaultMessage: "المسمى الوظيفي" },
  "@legalos.settings.profile.identityReadOnly": { defaultMessage: "اسمك ومسماك يحددهما المكتب. اطلب من المالك تغييرهما." },
  "@legalos.settings.profile.languageHeading": { defaultMessage: "اللغة" },
  "@legalos.settings.profile.roleDescription.owner": { defaultMessage: "وصول كامل إلى كل القضايا، إضافة إلى فوترة المكتب وإدارة الفريق." },
  "@legalos.settings.profile.roleDescription.lawyer": { defaultMessage: "يباشر القضايا ويسجّل الوقت ويودع المستندات." },
  "@legalos.settings.profile.roleDescription.staff": { defaultMessage: "ينظّم الجلسات ويودع المستندات ويتابع أمانات الموكّلين." },
  "@legalos.settings.profile.roleHeading": { defaultMessage: "الصلاحية والوصول" },
  "@legalos.settings.profile.ownerDescription": {
    defaultMessage: "وصول كامل إلى كل القضايا، إضافة إلى فوترة المكتب وإدارة الفريق.",
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
      "نبّهني قبل يوم من أي جلسة في قضية أنا المسؤول عنها.",
  },
  "@legalos.settings.profile.mentionLabel": { defaultMessage: "الإشارات في الرسائل" },
  "@legalos.settings.profile.mentionDescription": {
    defaultMessage: "أبلغني عندما يشير زميل إليّ في قناة قضية.",
  },
  "@legalos.settings.profile.securityHeading": { defaultMessage: "الأمان" },
  "@legalos.settings.profile.password": { defaultMessage: "كلمة المرور" },
  "@legalos.settings.profile.passwordChanged": {
    defaultMessage: "آخر تغيير منذ 4 أشهر",
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

  // --- T-034: بقية أقسام شاشة الإعدادات -------------------------------------

  "@legalos.settings.firm.specialtiesLabel": { defaultMessage: "مجالات الممارسة" },
  "@legalos.settings.firm.specialtiesHint": {
    defaultMessage: "تحدّد اقتراحات أنواع القضايا وتقارير التوزيع.",
  },
  "@legalos.settings.firm.specialtiesPlaceholder": { defaultMessage: "اختر ما يتعامل معه المكتب" },
  "@legalos.settings.firm.governorateLabel": { defaultMessage: "المحافظة" },
  "@legalos.settings.firm.mainCourtLabel": { defaultMessage: "المحكمة الرئيسية" },
  "@legalos.settings.firm.firmSizeLabel": { defaultMessage: "حجم المكتب" },
  "@legalos.settings.firm.firmSize.solo": { defaultMessage: "محامٍ منفرد" },
  "@legalos.settings.firm.firmSize.small": { defaultMessage: "صغير (٢–١٠)" },
  "@legalos.settings.firm.firmSize.medium": { defaultMessage: "متوسط (١١–٥٠)" },
  "@legalos.settings.firm.firmSize.large": { defaultMessage: "كبير (+٥٠)" },
  "@legalos.settings.firm.clientKindLabel": { defaultMessage: "نوع الموكّلين" },
  "@legalos.settings.firm.clientKind.individuals": { defaultMessage: "أفراد في الغالب" },
  "@legalos.settings.firm.clientKind.companies": { defaultMessage: "شركات في الغالب" },
  "@legalos.settings.firm.clientKind.mixed": { defaultMessage: "مزيج" },

  "@legalos.settings.identity.heading": { defaultMessage: "الهوية البصرية" },
  "@legalos.settings.identity.subtitle": {
    defaultMessage: "ما يظهر على الفواتير والمستندات المُنشأة وترويسة المكتب.",
  },
  "@legalos.settings.identity.legalNameLabel": { defaultMessage: "الاسم القانوني الكامل" },
  "@legalos.settings.identity.legalNameHint": {
    defaultMessage: "إن اختلف عن اسم المكتب أعلاه — يُطبع على الفواتير عند تعبئته.",
  },
  "@legalos.settings.identity.taxIdLabel": { defaultMessage: "الرقم الضريبي" },
  "@legalos.settings.identity.barNumberLabel": { defaultMessage: "رقم القيد بالنقابة" },
  "@legalos.settings.identity.websiteLabel": { defaultMessage: "الموقع الإلكتروني" },
  "@legalos.settings.identity.brandColorLabel": { defaultMessage: "لون الهوية" },
  "@legalos.settings.identity.brandColorHint": {
    defaultMessage: "من لوحة نظام التصميم نفسها، فيبقى التباين صحيحًا أينما ظهر.",
  },

  "@legalos.settings.preferences.heading": { defaultMessage: "التفضيلات" },
  "@legalos.settings.preferences.subtitle": {
    defaultMessage: "اللغة والمنطقة الزمنية وطريقة عرض التواريخ والمبالغ.",
  },
  "@legalos.settings.preferences.localeLabel": { defaultMessage: "اللغة" },
  "@legalos.settings.preferences.locale.ar": { defaultMessage: "العربية" },
  "@legalos.settings.preferences.locale.en": { defaultMessage: "الإنجليزية" },
  "@legalos.settings.preferences.timezoneLabel": { defaultMessage: "المنطقة الزمنية" },
  "@legalos.settings.preferences.dateFormatLabel": { defaultMessage: "تنسيق التاريخ" },
  "@legalos.settings.preferences.currencyLabel": { defaultMessage: "العملة الافتراضية" },
  "@legalos.settings.preferences.currencyHint": { defaultMessage: "رمز من ثلاثة أحرف، مثل EGP." },
  "@legalos.settings.preferences.currencyInvalid": {
    defaultMessage: "يجب أن يكون رمزًا من ثلاثة أحرف، مثل EGP أو USD.",
  },

  "@legalos.settings.billing.heading": { defaultMessage: "الفوترة" },
  "@legalos.settings.billing.subtitle": {
    defaultMessage: "كيف تُرقَّم الفواتير الجديدة وتُملأ ابتداءً. كل فاتورة أُرسلت بالفعل تحتفظ بأرقامها — تغيير هذه القيم لا يمسّها.",
  },
  "@legalos.settings.billing.patternLabel": { defaultMessage: "نمط ترقيم الفواتير" },
  "@legalos.settings.billing.patternHint": {
    defaultMessage: "اتركه فارغًا لاستخدام النمط المدمج INV-{year}-{seq}. يجب أن ينتهي بـ{seq}.",
  },
  "@legalos.settings.billing.patternError.unknown": {
    defaultMessage: "يُسمح فقط بـ{year} و{seq} كعناصر نائبة.",
  },
  "@legalos.settings.billing.patternError.mustEndWithSeq": {
    defaultMessage: "يجب أن ينتهي النمط بـ{seq}، مرة واحدة فقط.",
  },
  "@legalos.settings.billing.taxRateLabel": { defaultMessage: "نسبة الضريبة الافتراضية (٪)" },
  "@legalos.settings.billing.taxRateHint": {
    defaultMessage: "تملأ الفواتير الجديدة فقط. لا تُطبَّق أبدًا على فاتورة أُنشئت بالفعل.",
  },
  "@legalos.settings.billing.taxRateInvalid": { defaultMessage: "يجب أن تكون بين ٠ و١٠٠." },
  "@legalos.settings.billing.termsLabel": { defaultMessage: "مهلة السداد الافتراضية (أيام)" },
  "@legalos.settings.billing.termsInvalid": { defaultMessage: "لا يمكن أن تكون سالبة." },

  "@legalos.settings.requiredFields.heading": { defaultMessage: "الحقول الإلزامية" },
  "@legalos.settings.requiredFields.subtitle": {
    defaultMessage: "الحقول الاختيارية التي يعتبرها المكتب أساسية عند فتح قضية أو تسجيل موكّل.",
  },
  "@legalos.settings.requiredFields.notEnforcedYet": {
    defaultMessage: "هذا يسجّل اختيار المكتب. نماذج القضايا والموكّلين لا تتحقق منه بعد.",
  },
  "@legalos.settings.requiredFields.matterGroup": { defaultMessage: "عند فتح قضية" },
  "@legalos.settings.requiredFields.matter.matter_number": { defaultMessage: "رقم القضية" },
  "@legalos.settings.requiredFields.matter.description": { defaultMessage: "الوصف" },
  "@legalos.settings.requiredFields.matter.budget_amount": { defaultMessage: "الميزانية" },
  "@legalos.settings.requiredFields.matter.tags": { defaultMessage: "الوسوم" },
  "@legalos.settings.requiredFields.matter.staff": { defaultMessage: "الفريق المُسنَد" },
  "@legalos.settings.requiredFields.clientGroup": { defaultMessage: "عند تسجيل موكّل" },
  "@legalos.settings.requiredFields.client.industry": { defaultMessage: "النشاط" },
  "@legalos.settings.requiredFields.client.client_since": { defaultMessage: "موكّل منذ" },
  "@legalos.settings.requiredFields.client.registration_number": { defaultMessage: "رقم السجل" },
  "@legalos.settings.requiredFields.client.tax_id": { defaultMessage: "الرقم الضريبي" },
  "@legalos.settings.requiredFields.client.address": { defaultMessage: "العنوان" },
  "@legalos.settings.requiredFields.client.phone": { defaultMessage: "الهاتف" },
  "@legalos.settings.requiredFields.client.email": { defaultMessage: "البريد الإلكتروني" },
  "@legalos.settings.requiredFields.client.notes": { defaultMessage: "ملاحظات" },

  "@legalos.settings.notifications.loading": { defaultMessage: "جارٍ تحميل إعدادات الإشعارات…" },
  "@legalos.settings.notifications.heading": { defaultMessage: "الإشعارات" },
  "@legalos.settings.notifications.subtitle": {
    defaultMessage: "قنواتك الخاصة للتذكير — كل عضو يضبطها لنفسه أيًا كانت صلاحيته.",
  },
  "@legalos.settings.notifications.saveFailed": { defaultMessage: "تعذّر حفظ هذا التفضيل." },
  "@legalos.settings.notifications.noneAvailable": {
    defaultMessage: "لا توجد قناة تذكير مُفعَّلة على هذا التثبيت بعد.",
  },
  "@legalos.settings.notifications.emailLabel": { defaultMessage: "تذكير بالبريد الإلكتروني" },
  "@legalos.settings.notifications.emailHint": {
    defaultMessage: "تذكير بجلسة أو موعد نهائي أو مهمة عبر البريد الإلكتروني.",
  },
  "@legalos.settings.notifications.pushLabel": { defaultMessage: "إشعارات فورية" },
  "@legalos.settings.notifications.pushHint": {
    defaultMessage: "التذكيرات نفسها، تُرسَل إلى جهاز مسجَّل.",
  },
};
