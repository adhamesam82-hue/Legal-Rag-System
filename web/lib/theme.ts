// ثيم LegalOS: لوحة رموز قالب «السِّجل» (Sijil Admin) المعتمدة كاملة (T-048 / E-5).
// قرار المالك 5 سبتمبر 2026: اعتماد القالب كمرجع بصري موحّد وإسقاط هوية الختم السابقة.
//
// تسقط ألوان هوية الختم السابقة، وتسقط الزوايا الحادة (2-5px)،
// وتتحرر درجة العلامة (--brand-h: 265) لتكون البنفسجي الأساسي للواجهة بدلاً من حصره للذكاء الاصطناعي.
//
// يعتمد النظام على لوحة متكاملة من 35 رمزاً في الثيمين الفاتح والداكن، تحكم الأسطح، النصوص،
// الحدود، الألوان الأساسية واللهجة، حالات النظام، والظلال والحلقات.
//
// [ملاحظة معمارية هامة بشأن مصدري الرموز]:
// 1. هذا الملف (theme.ts) هو المصدر الأساسي لمنظومة Astryx، وتُترجم رموزه إلى legalos.css عبر `astryx theme build`.
// 2. ملف web/app/globals.css يحتوي على نفس اللوحة معرّفة على :root, [data-theme="light"] و [data-theme="dark"]
//    لتمكين تبديل النطاقات المستقلة (الجذر والشريط الجانبي) لدعم أوضاع mixed و mixed-inv.
//    ضبط color-scheme: light/dark في كتلتي globals.css إلزامي لكي تعمل دالة light-dark() المستخدمة في الظلال (--shadow).
// 3. يتم التحقق آلياً من تطابق الرموز بين الملفين عبر اختبار: tests/test_theme_tokens.py لمنع أي تباعد مستقبلي.

import { defineTheme, type TokenName, type TokenValue } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

// خط الواجهة المعتمد (IBM Plex Sans Arabic) المستضاف ذاتياً (T-049 / E-5).
const FONT_FALLBACKS = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// الرموز المخصصة لقالب السِّجل (Sijil Admin) التي يتم توسيع منظومة الرموز بها
type SijilCustomTokenName =
  | "--brand-h"
  | "--r"
  | "--rs"
  | "--rowpad"
  | "--bg"
  | "--surface"
  | "--surface2"
  | "--surface3"
  | "--text"
  | "--text2"
  | "--text3"
  | "--border"
  | "--border2"
  | "--primary"
  | "--primary-h"
  | "--primary-fg"
  | "--primary-soft"
  | "--accent"
  | "--accent-fg"
  | "--accent-soft"
  | "--success"
  | "--success-soft"
  | "--warn"
  | "--warn-soft"
  | "--danger"
  | "--danger-soft"
  | "--info"
  | "--info-soft"
  | "--shadow"
  | "--shadow-lg"
  | "--ring";

// تقاطع نوعي آمن يضمن التحقق الصارم من أسماء الرموز وقيمها دون استخدام `as any`
type SijilThemeTokens = Partial<Record<TokenName | SijilCustomTokenName, TokenValue>>;

const sijilTokens: SijilThemeTokens = {
  // ---------------------------------------------------------------------------
  // 1. هندسة ودرجة العلامة — متغيّرات حرّة قابلة للتجاوز وقت التشغيل
  // ---------------------------------------------------------------------------
  "--brand-h": "265",
  "--r": "14px",
  "--rs": "max(4px, calc(var(--r) - 4px))",
  "--rowpad": "14px",

  // ---------------------------------------------------------------------------
  // 2. لوحة رموز القالب — 35 رمزاً لكل ثيم (الفاتح والداكن)
  // مستخرجة من scratch/design-mockup/sijil-admin/Sijil Admin.dc.html
  // ---------------------------------------------------------------------------

  // الأسطح (Surfaces)
  "--bg": ["oklch(0.963 0.005 265)", "oklch(0.168 0.014 265)"],
  "--surface": ["#ffffff", "oklch(0.212 0.016 265)"],
  "--surface2": ["oklch(0.978 0.004 265)", "oklch(0.245 0.018 265)"],
  "--surface3": ["oklch(0.952 0.007 265)", "oklch(0.282 0.02 265)"],

  // النصوص (Typography / Text)
  "--text": ["oklch(0.245 0.022 265)", "oklch(0.965 0.004 265)"],
  "--text2": ["oklch(0.5 0.02 265)", "oklch(0.755 0.012 265)"],
  "--text3": ["oklch(0.635 0.016 265)", "oklch(0.625 0.014 265)"],

  // الحدود (Borders)
  "--border": ["oklch(0.902 0.008 265)", "oklch(0.302 0.018 265)"],
  "--border2": ["oklch(0.84 0.012 265)", "oklch(0.385 0.022 265)"],

  // الأساسي (Primary — مشتق من --brand-h)
  "--primary": [
    "oklch(0.45 0.11 var(--brand-h, 265))",
    "oklch(0.7 0.13 var(--brand-h, 265))",
  ],
  "--primary-h": [
    "oklch(0.38 0.11 var(--brand-h, 265))",
    "oklch(0.78 0.12 var(--brand-h, 265))",
  ],
  "--primary-fg": [
    "#ffffff",
    "oklch(0.17 0.03 var(--brand-h, 265))",
  ],
  "--primary-soft": [
    "oklch(0.952 0.028 var(--brand-h, 265))",
    "oklch(0.3 0.055 var(--brand-h, 265))",
  ],

  // اللهجة (Accent)
  "--accent": ["oklch(0.66 0.11 76)", "oklch(0.79 0.12 80)"],
  "--accent-fg": ["#ffffff", "oklch(0.2 0.04 80)"],
  "--accent-soft": ["oklch(0.955 0.04 82)", "oklch(0.315 0.05 80)"],

  // الحالات (States — نجاح، تحذير، خطر، معلومات مع -soft لكل منها)
  "--success": ["oklch(0.53 0.12 155)", "oklch(0.74 0.14 155)"],
  "--success-soft": ["oklch(0.955 0.045 155)", "oklch(0.295 0.05 155)"],
  "--warn": ["oklch(0.63 0.13 68)", "oklch(0.82 0.13 78)"],
  "--warn-soft": ["oklch(0.958 0.055 78)", "oklch(0.31 0.05 78)"],
  "--danger": ["oklch(0.54 0.17 25)", "oklch(0.68 0.16 25)"],
  "--danger-soft": ["oklch(0.953 0.045 25)", "oklch(0.32 0.06 25)"],
  "--info": ["oklch(0.54 0.12 242)", "oklch(0.72 0.12 242)"],
  "--info-soft": ["oklch(0.952 0.04 242)", "oklch(0.3 0.05 242)"],

  // الظلال والحلقة (Shadows & Ring)
  "--shadow":
    "0 1px 2px light-dark(rgba(18, 22, 34, 0.05), rgba(0, 0, 0, 0.3)), 0 10px 26px -14px light-dark(rgba(18, 22, 34, 0.16), rgba(0, 0, 0, 0.6))",
  "--shadow-lg":
    "0 2px 6px light-dark(rgba(18, 22, 34, 0.06), rgba(0, 0, 0, 0.4)), 0 24px 60px -20px light-dark(rgba(18, 22, 34, 0.28), rgba(0, 0, 0, 0.75))",
  "--ring": [
    "oklch(0.45 0.11 var(--brand-h, 265) / 0.28)",
    "oklch(0.7 0.13 var(--brand-h, 265) / 0.35)",
  ],

  // ---------------------------------------------------------------------------
  // 3. إسناد رموز Astryx الدلالية إلى متغيرات اللوحة الموحدة [var(--*), var(--*)]
  // ---------------------------------------------------------------------------
  "--color-background-body": ["var(--bg)", "var(--bg)"],
  "--color-background-surface": ["var(--surface)", "var(--surface)"],
  "--color-background-card": ["var(--surface)", "var(--surface)"],
  "--color-background-popover": ["var(--surface2)", "var(--surface2)"],
  "--color-background-inverted": ["var(--text)", "var(--text)"],
  "--color-background-muted": ["var(--surface2)", "var(--surface2)"],

  "--color-border": ["var(--border)", "var(--border)"],
  "--color-border-emphasized": ["var(--border2)", "var(--border2)"],

  "--color-text-primary": ["var(--text)", "var(--text)"],
  "--color-text-secondary": ["var(--text2)", "var(--text2)"],
  "--color-text-disabled": ["var(--text3)", "var(--text3)"],

  "--color-accent": ["var(--primary)", "var(--primary)"],
  "--color-accent-muted": ["var(--primary-soft)", "var(--primary-soft)"],
  "--color-text-accent": "var(--primary)",
  "--color-icon-accent": "var(--primary)",

  "--color-success": ["var(--success)", "var(--success)"],
  "--color-success-muted": ["var(--success-soft)", "var(--success-soft)"],
  "--color-warning": ["var(--warn)", "var(--warn)"],
  "--color-warning-muted": ["var(--warn-soft)", "var(--warn-soft)"],
  "--color-error": ["var(--danger)", "var(--danger)"],
  "--color-error-muted": ["var(--danger-soft)", "var(--danger-soft)"],

  "--shadow-low": "var(--shadow)",
  "--shadow-med": "var(--shadow)",
  "--shadow-high": "var(--shadow-lg)",

  "--radius-none": "0px",
  "--radius-inner": "var(--rs)",
  "--radius-element": "var(--rs)",
  "--radius-container": "var(--r)",
  "--radius-page": "var(--r)",
  "--radius-full": "9999px",

  // سلم الأحجام الطباعية المحددة للواجهة
  "--font-size-xs": "0.6875rem",
  "--font-size-sm": "0.75rem",
  "--font-size-base": "0.8125rem",
  "--font-size-lg": "1rem",
  "--font-size-xl": "1.375rem",
  "--font-size-2xl": "1.625rem",
  "--text-heading-4-size": "0.875rem",
  "--text-label-size": "0.875rem",
};

export const legalosTheme = defineTheme({
  name: "legalos",
  extends: neutralTheme,
  typography: {
    scale: { base: 15, ratio: 1.2 },
    body: {
      family: "IBM Plex Sans Arabic",
      fallbacks: FONT_FALLBACKS,
    },
    heading: {
      family: "IBM Plex Sans Arabic",
      fallbacks: FONT_FALLBACKS,
    },
  },
  radius: { base: 14, multiplier: 1 },
  tokens: sijilTokens as unknown as Partial<Record<TokenName, TokenValue>>,
  components: {
    "app-shell": {
      base: { overflow: "hidden" },
    },
    layout: {
      base: {
        "--container-padding-inline-start": "0px",
        "--container-padding-inline-end": "0px",
        "--container-padding-block-start": "0px",
        "--container-padding-block-end": "0px",
      },
    },
    badge: {
      "variant:neutral": {
        backgroundColor: "var(--surface3)",
        color: "var(--text2)",
      },
      "variant:info": {
        backgroundColor: "var(--info-soft)",
        color: "var(--info)",
      },
      "variant:success": {
        backgroundColor: "var(--success-soft)",
        color: "var(--success)",
      },
      "variant:warning": {
        backgroundColor: "var(--warn-soft)",
        color: "var(--warn)",
      },
      "variant:error": {
        backgroundColor: "var(--danger-soft)",
        color: "var(--danger)",
      },
    },
    progressbar: {
      "variant:accent": { "--color-accent": "var(--primary)" },
    },
  },
});
