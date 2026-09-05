"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * أنماط الواجهة الأربعة المعتمدة في قالب السِّجل (T-048 / T-051 / T-054 / E-5):
 * - light: واجهة وقائمة جانبية فاتحتان
 * - dark: واجهة وقائمة جانبية داكنتان
 * - mixed: واجهة فاتحة وقائمة جانبية داكنة (الافتراضي)
 * - mixed-inv: واجهة داكنة وقائمة جانبية فاتحة
 */
export type ThemeMode = "light" | "dark" | "mixed" | "mixed-inv";

/**
 * كثافة العرض والتباعد للأسطر والقوائم:
 * - comfortable: مريح (18px)
 * - medium: متوسط (14px) - الافتراضي
 * - compact: مضغوط (10px)
 */
export type DensityMode = "comfortable" | "medium" | "compact";

/**
 * كائن التخزين الموحد لإعدادات المظهر (AppearanceSettings)
 */
export interface AppearanceSettings {
  theme: ThemeMode;
  density: DensityMode;
  radius: number; // 4..22 step 1, default 14
  sidebarCollapsed: boolean; // default false
}

/** مفتاح التخزين الموحد في localStorage */
export const APPEARANCE_STORAGE_KEY = "sijil_appearance_settings";

/** المفاتيح القديمة للترحيل والتوافق العكسي (T-051) */
export const LEGACY_THEME_KEYS = ["legalos_theme_mode", "legalos-theme-mode"] as const;
export const LEGACY_SIDEBAR_KEYS = [
  "sidebarCollapsed",
  "sidebar_collapsed_v1",
  "legalos-sidenav-collapsed",
] as const;

/** اسم الحدث المخصص لبث تحديثات المظهر لجميع المكونات الحية */
export const APPEARANCE_CHANGE_EVENT = "legalos:appearance-change";

/** القيم الافتراضية المعتمدة وفقاً لعقد التذكرة T-054 */
export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: "mixed",
  density: "medium",
  radius: 14,
  sidebarCollapsed: false,
};

/**
 * التحقق الصارم من صحة إعدادات المظهر وتصحيح أي قيم تالفة أو خارج النطاق
 */
export function sanitizeAppearanceSettings(input: unknown): AppearanceSettings {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_APPEARANCE_SETTINGS };
  }

  const raw = input as Record<string, unknown>;

  // فحص النمط (theme)
  const validThemes: ThemeMode[] = ["light", "dark", "mixed", "mixed-inv"];
  const theme: ThemeMode =
    typeof raw.theme === "string" && validThemes.includes(raw.theme as ThemeMode)
      ? (raw.theme as ThemeMode)
      : DEFAULT_APPEARANCE_SETTINGS.theme;

  // فحص الكثافة (density)
  const validDensities: DensityMode[] = ["comfortable", "medium", "compact"];
  const density: DensityMode =
    typeof raw.density === "string" && validDensities.includes(raw.density as DensityMode)
      ? (raw.density as DensityMode)
      : DEFAULT_APPEARANCE_SETTINGS.density;

  // فحص زوايا الاستدارة (radius: 4..22)
  let radius = DEFAULT_APPEARANCE_SETTINGS.radius;
  if (typeof raw.radius === "number" && !Number.isNaN(raw.radius)) {
    radius = Math.min(22, Math.max(4, Math.round(raw.radius)));
  }

  // فحص طي الشريط الجانبي (sidebarCollapsed)
  const sidebarCollapsed =
    typeof raw.sidebarCollapsed === "boolean"
      ? raw.sidebarCollapsed
      : DEFAULT_APPEARANCE_SETTINGS.sidebarCollapsed;

  return {
    theme,
    density,
    radius,
    sidebarCollapsed,
  };
}

/**
 * قراءة الإعدادات مع ترحيل تلقائي للمفاتيح القديمة المنفصلة
 */
export function loadAppearanceSettings(): AppearanceSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_APPEARANCE_SETTINGS };
  }

  try {
    const unifiedRaw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (unifiedRaw) {
      try {
        const parsed = JSON.parse(unifiedRaw);
        return sanitizeAppearanceSettings(parsed);
      } catch {
        // قيمة تالفة في المفتاح الموحد -> يتم استرجاع الافتراضيات
        return { ...DEFAULT_APPEARANCE_SETTINGS };
      }
    }

    // ترحيل المفاتيح القديمة إن وُجدت
    let migratedTheme: ThemeMode | undefined;
    for (const key of LEGACY_THEME_KEYS) {
      const val = window.localStorage.getItem(key);
      if (val && ["light", "dark", "mixed", "mixed-inv"].includes(val)) {
        migratedTheme = val as ThemeMode;
        break;
      }
    }

    let migratedCollapsed: boolean | undefined;
    for (const key of LEGACY_SIDEBAR_KEYS) {
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        migratedCollapsed = val === "true" || val === "1";
        break;
      }
    }

    if (migratedTheme !== undefined || migratedCollapsed !== undefined) {
      const migratedSettings: AppearanceSettings = {
        theme: migratedTheme ?? DEFAULT_APPEARANCE_SETTINGS.theme,
        density: DEFAULT_APPEARANCE_SETTINGS.density,
        radius: DEFAULT_APPEARANCE_SETTINGS.radius,
        sidebarCollapsed: migratedCollapsed ?? DEFAULT_APPEARANCE_SETTINGS.sidebarCollapsed,
      };

      // حفظ الكائن الموحد الجديد
      try {
        window.localStorage.setItem(
          APPEARANCE_STORAGE_KEY,
          JSON.stringify(migratedSettings),
        );
      } catch {
        // تجاهل أخطاء الحصة أو التخزين المحجوب
      }

      return migratedSettings;
    }
  } catch {
    // التخزين المحلي معطل أو محجوب
  }

  return { ...DEFAULT_APPEARANCE_SETTINGS };
}

/**
 * حفظ الإعدادات في التخزين الموحد مع بث حدث التحديث وتطبيق المتغيرات الحية
 */
export function saveAppearanceSettings(settings: AppearanceSettings): void {
  if (typeof window === "undefined") return;

  const sanitized = sanitizeAppearanceSettings(settings);

  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(sanitized));
    // مزامنة المفاتيح القديمة لضمان التوافق مع أي نصوص برمجية خارجية متبقية
    window.localStorage.setItem(LEGACY_THEME_KEYS[0], sanitized.theme);
    window.localStorage.setItem(
      LEGACY_SIDEBAR_KEYS[0],
      String(sanitized.sidebarCollapsed),
    );
  } catch {
    // تجاهل أخطاء التخزين
  }

  // تطبيق متغيرات الـ CSS الحية على document.documentElement
  applyAppearanceVars(sanitized);

  // بث حدث التحديث لجميع المكونات في الشاشة
  try {
    window.dispatchEvent(
      new CustomEvent<AppearanceSettings>(APPEARANCE_CHANGE_EVENT, {
        detail: sanitized,
      }),
    );
  } catch {
    // معالجة المتصفحات القديمة إن وُجدت
  }
}

/**
 * إعادة ضبط المظهر: يمسح التخزين ويعيد تطبيق الافتراضيات بالكامل
 */
export function resetAppearanceSettings(): AppearanceSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_APPEARANCE_SETTINGS };
  }

  try {
    window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
    for (const key of LEGACY_THEME_KEYS) {
      window.localStorage.removeItem(key);
    }
    for (const key of LEGACY_SIDEBAR_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // تجاهل أخطاء التخزين
  }

  const defaults = { ...DEFAULT_APPEARANCE_SETTINGS };
  applyAppearanceVars(defaults);

  try {
    window.dispatchEvent(
      new CustomEvent<AppearanceSettings>(APPEARANCE_CHANGE_EVENT, {
        detail: defaults,
      }),
    );
  } catch {
    // تجاهل
  }

  return defaults;
}

/**
 * تطبيق متغيرات CSS الحية على عنصر المستند (أو عنصر القشرة المحدد)
 * - --r: زاوية الاستدارة الحرة (4-22px)
 * - --rs: زاوية الاستدارة الصغيرة المشتقة: max(4px, --r - 4px)
 * - --rowpad: هوامش الأسطر (comfortable: 18px, medium: 14px, compact: 10px)
 */
export function applyAppearanceVars(
  settings: AppearanceSettings,
  targetElement?: HTMLElement | null,
): void {
  if (typeof document === "undefined") return;

  const target = targetElement ?? document.documentElement;
  if (!target) return;

  const { radius, density, theme } = settings;

  // حساب المتغيرات المشتقة وفقاً للمواصفة
  const rPx = `${radius}px`;
  const rsPx = `${Math.max(4, radius - 4)}px`;
  const rowpad =
    density === "comfortable" ? "18px" : density === "compact" ? "10px" : "14px";

  target.style.setProperty("--r", rPx);
  target.style.setProperty("--rs", rsPx);
  target.style.setProperty("--rowpad", rowpad);

  // تحديث ثيم القشرة الرئيسي على جذر الصفحة
  const shellTheme = theme === "dark" || theme === "mixed-inv" ? "dark" : "light";
  target.setAttribute("data-theme", shellTheme);
}

/**
 * سكريبت تهيئة سريع يُحقن في <head> لمنع وميض الوضع الداكن (Anti-Flicker)
 * يُنفذ تزامناً قبل أول رسم للشاشة من قبل المتصفح
 */
export const APPEARANCE_INLINE_SCRIPT = `
(function() {
  try {
    var key = '${APPEARANCE_STORAGE_KEY}';
    var raw = localStorage.getItem(key);
    var s = null;
    if (raw) {
      try { s = JSON.parse(raw); } catch(e) {}
    }
    if (!s) {
      var oldTheme = localStorage.getItem('legalos_theme_mode') || localStorage.getItem('legalos-theme-mode');
      var oldCollapse = localStorage.getItem('sidebarCollapsed') || localStorage.getItem('sidebar_collapsed_v1');
      if (oldTheme || oldCollapse !== null) {
        s = {
          theme: (oldTheme && ['light','dark','mixed','mixed-inv'].indexOf(oldTheme) >= 0) ? oldTheme : 'mixed',
          sidebarCollapsed: oldCollapse === 'true' || oldCollapse === '1',
          density: 'medium',
          radius: 14
        };
      }
    }
    var theme = (s && s.theme) || 'mixed';
    var radius = (s && typeof s.radius === 'number' && !isNaN(s.radius)) ? Math.min(22, Math.max(4, Math.round(s.radius))) : 14;
    var density = (s && s.density) || 'medium';
    var shellTheme = (theme === 'dark' || theme === 'mixed-inv') ? 'dark' : 'light';
    var el = document.documentElement;
    el.setAttribute('data-theme', shellTheme);
    el.style.setProperty('--r', radius + 'px');
    el.style.setProperty('--rs', Math.max(4, radius - 4) + 'px');
    var pads = { comfortable: '18px', medium: '14px', compact: '10px' };
    el.style.setProperty('--rowpad', pads[density] || '14px');
  } catch (e) {}
})();
`.trim();

/**
 * خطاف تفاعلي لإدارة إعدادات المظهر (useAppearance)
 * يزود المكونات بالقراءة والكتابة المباشرة مع التزامن الفوري التلقائي
 */
export function useAppearance() {
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  // استرجاع الإعدادات عند التحميل بالمتصفح
  useEffect(() => {
    const loaded = loadAppearanceSettings();
    setSettings(loaded);
    applyAppearanceVars(loaded);
    setIsHydrated(true);

    // الاستماع لأي تغييرات تحدث في أي مكان أو تبويب آخر
    const handleAppearanceChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppearanceSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
        applyAppearanceVars(customEvent.detail);
      } else {
        const fresh = loadAppearanceSettings();
        setSettings(fresh);
        applyAppearanceVars(fresh);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY) {
        const fresh = loadAppearanceSettings();
        setSettings(fresh);
        applyAppearanceVars(fresh);
      }
    };

    window.addEventListener(APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // تحديث جزء من الإعدادات
  const updateSettings = useCallback((partial: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const updated: AppearanceSettings = {
        ...prev,
        ...partial,
      };
      saveAppearanceSettings(updated);
      return updated;
    });
  }, []);

  // إعادة الضبط للافتراضيات
  const resetSettings = useCallback(() => {
    const defaults = resetAppearanceSettings();
    setSettings(defaults);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isHydrated,
  };
}
