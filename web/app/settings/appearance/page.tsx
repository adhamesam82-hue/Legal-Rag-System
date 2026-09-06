"use client";

import React, { useState } from "react";
import { useTranslator } from "@astryxdesign/core/i18n";
import {
  useAppearance,
  ACCENT_PRESETS,
  type ThemeMode,
  type DensityMode,
  type AccentColor,
} from "@/lib/appearance";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * شاشة إعدادات المظهر والعرض (T-054 / E-5):
 * - صفر نداء شبكة (AC10) — تخزين محلي كامل في localStorage
 * - الأنماط الأربعة: light · dark · mixed · mixed-inv (AC1)
 * - كثافة العرض: comfortable (18px) · medium (14px) · compact (10px) (AC1)
 * - منزلق الزوايا الحر 4–22 بكسل بخطوة 1 مع اشتقاق --rs = max(4, --r - 4) (AC6)
 * - طي الشريط الجانبي (AC1)
 * - إعادة الضبط للافتراضيات (AC8)
 * - جميع النصوص مسترجعة عبر كالوج الترجمة settings.ts (AC11)
 * - لا حواف بأرقام ثابتة في الواجهة (AC7)
 */
export default function AppearanceSettingsPage() {
  const t = useTranslator();
  const { settings, updateSettings, resetSettings } = useAppearance();
  const [resetMessageVisible, setResetMessageVisible] = useState(false);

  const currentTheme = settings.theme;
  const currentDensity = settings.density;
  const currentRadius = settings.radius;
  const derivedRs = Math.max(4, currentRadius - 4);
  const currentBrandHue = settings.brandHue;
  const currentAccent = settings.accent;
  const isSidebarCollapsed = settings.sidebarCollapsed;

  // خيارات الأنماط الأربعة
  const themeOptions: {
    id: ThemeMode;
    labelKey: string;
    descKey: string;
    icon: string;
  }[] = [
    {
      id: "mixed",
      labelKey: "@legalos.settings.appearance.theme.mixed",
      descKey: "@legalos.settings.appearance.theme.mixedDesc",
      icon: "contrast",
    },
    {
      id: "light",
      labelKey: "@legalos.settings.appearance.theme.light",
      descKey: "@legalos.settings.appearance.theme.lightDesc",
      icon: "light_mode",
    },
    {
      id: "dark",
      labelKey: "@legalos.settings.appearance.theme.dark",
      descKey: "@legalos.settings.appearance.theme.darkDesc",
      icon: "dark_mode",
    },
    {
      id: "mixed-inv",
      labelKey: "@legalos.settings.appearance.theme.mixedInv",
      descKey: "@legalos.settings.appearance.theme.mixedInvDesc",
      icon: "invert_colors",
    },
  ];

  // خيارات الكثافة الثلاثة
  const densityOptions: {
    id: DensityMode;
    labelKey: string;
    descKey: string;
    badgeKey: string;
    padPx: string;
  }[] = [
    {
      id: "comfortable",
      labelKey: "@legalos.settings.appearance.density.comfortable",
      descKey: "@legalos.settings.appearance.density.comfortableDesc",
      badgeKey: "@legalos.settings.appearance.density.comfortableBadge",
      padPx: "18px",
    },
    {
      id: "medium",
      labelKey: "@legalos.settings.appearance.density.medium",
      descKey: "@legalos.settings.appearance.density.mediumDesc",
      badgeKey: "@legalos.settings.appearance.density.mediumBadge",
      padPx: "14px",
    },
    {
      id: "compact",
      labelKey: "@legalos.settings.appearance.density.compact",
      descKey: "@legalos.settings.appearance.density.compactDesc",
      badgeKey: "@legalos.settings.appearance.density.compactBadge",
      padPx: "10px",
    },
  ];

  const handleThemeSelect = (theme: ThemeMode) => {
    updateSettings({ theme });
  };

  const handleDensitySelect = (density: DensityMode) => {
    updateSettings({ density });
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val)) {
      updateSettings({ radius: val });
    }
  };

  const handleBrandHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val)) {
      updateSettings({ brandHue: val });
    }
  };

  const handleBrandHuePreset = (hue: number) => {
    updateSettings({ brandHue: hue });
  };

  const handleAccentSelect = (accent: AccentColor) => {
    updateSettings({ accent });
  };

  const handleSidebarToggle = (collapsed: boolean) => {
    updateSettings({ sidebarCollapsed: collapsed });
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      t("@legalos.settings.appearance.reset.confirm"),
    );
    if (!confirmed) return;

    resetSettings();
    setResetMessageVisible(true);
    setTimeout(() => {
      setResetMessageVisible(false);
    }, 4000);
  };

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6"
      style={{
        color: "var(--text)",
        fontFamily: "var(--font-family-body)",
      }}
    >
      {/* ترويسة الصفحة */}
      <div className="flex flex-col gap-1 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-xl font-bold md:text-2xl" style={{ color: "var(--text)" }}>
          {t("@legalos.settings.appearance.heading")}
        </h1>
        <p className="text-sm" style={{ color: "var(--text2)" }}>
          {t("@legalos.settings.appearance.subtitle")}
        </p>
      </div>

      {/* تنبيه تأكيد إعادة الضبط عند التفعيل */}
      {resetMessageVisible && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 p-3 text-sm transition-all"
          style={{
            borderRadius: "var(--rs)",
            backgroundColor: "var(--success-soft)",
            color: "var(--success)",
            border: "1px solid var(--success)",
          }}
        >
          <Icon name="check_circle" size={20} />
          <span>{t("@legalos.settings.appearance.reset.done")}</span>
        </div>
      )}

      {/* بطاقة 1: نمط الواجهة (الأوضاع الأربعة) */}
      <section
        aria-labelledby="theme-heading"
        className="flex flex-col gap-4 p-5 border shadow-sm"
        style={{
          borderRadius: "var(--r)",
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="theme-heading" className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {t("@legalos.settings.appearance.theme.heading")}
          </h2>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.appearance.theme.description")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {themeOptions.map((opt) => {
            const isSelected = currentTheme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThemeSelect(opt.id)}
                aria-pressed={isSelected}
                className="group relative flex flex-col items-start gap-3 p-4 text-start transition-all focus:outline-none focus-visible:ring-2"
                style={{
                  borderRadius: "var(--rs)",
                  border: isSelected
                    ? "2px solid var(--primary)"
                    : "1px solid var(--border)",
                  backgroundColor: isSelected
                    ? "var(--surface2)"
                    : "var(--surface)",
                  boxShadow: isSelected ? "var(--shadow)" : "none",
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className="flex h-9 w-9 items-center justify-center transition-colors"
                    style={{
                      borderRadius: "var(--rs)",
                      backgroundColor: isSelected
                        ? "var(--primary)"
                        : "var(--surface3)",
                      color: isSelected ? "var(--primary-fg)" : "var(--text2)",
                    }}
                  >
                    <Icon name={opt.icon} size={20} />
                  </div>
                  {isSelected && (
                    <span
                      className="flex h-5 w-5 items-center justify-center"
                      style={{ color: "var(--primary)" }}
                    >
                      <Icon name="check" size={18} />
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {t(opt.labelKey)}
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: "var(--text3)" }}>
                    {t(opt.descKey)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* بطاقة 2: كثافة العرض (Comfortable, Medium, Compact) */}
      <section
        aria-labelledby="density-heading"
        className="flex flex-col gap-4 p-5 border shadow-sm"
        style={{
          borderRadius: "var(--r)",
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="density-heading" className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {t("@legalos.settings.appearance.density.heading")}
          </h2>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.appearance.density.description")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {densityOptions.map((opt) => {
            const isSelected = currentDensity === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleDensitySelect(opt.id)}
                aria-pressed={isSelected}
                className="flex flex-col items-start gap-2 p-4 text-start transition-all focus:outline-none focus-visible:ring-2"
                style={{
                  borderRadius: "var(--rs)",
                  border: isSelected
                    ? "2px solid var(--primary)"
                    : "1px solid var(--border)",
                  backgroundColor: isSelected
                    ? "var(--surface2)"
                    : "var(--surface)",
                  boxShadow: isSelected ? "var(--shadow)" : "none",
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {t(opt.labelKey)}
                  </span>
                  <Badge color={isSelected ? "primary" : "neutral"} size="sm">
                    {t(opt.badgeKey)}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text3)" }}>
                  {t(opt.descKey)}
                </p>
                {/* تمثيل بصري لحجم التباعد */}
                <div
                  className="mt-1 flex w-full flex-col gap-1 border-t pt-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div
                    className="flex w-full items-center justify-between text-[11px]"
                    style={{
                      height: opt.padPx,
                      color: "var(--text3)",
                      backgroundColor: "var(--surface3)",
                      borderRadius: "calc(var(--rs) / 2)",
                      paddingInline: "8px",
                    }}
                  >
                    <span>--rowpad</span>
                    <span>{opt.padPx}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* بطاقة 3: درجة لون العلامة الأساسي (منزلق 0–360 بخطوة 5) */}
      <section
        aria-labelledby="brandhue-heading"
        className="flex flex-col gap-5 p-5 border shadow-sm"
        style={{
          borderRadius: "var(--r)",
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 id="brandhue-heading" className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {t("@legalos.settings.appearance.brandHue.heading")}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-xs font-semibold px-2 py-0.5 border flex items-center gap-1.5"
                style={{
                  borderRadius: "var(--rs)",
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface2)",
                  color: "var(--primary)",
                }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--primary)" }}
                />
                --brand-h: {currentBrandHue}
              </span>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.appearance.brandHue.description")}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>
            {t("@legalos.settings.appearance.brandHue.derivedNote")}
          </p>
        </div>

        {/* المنزلق التفاعلي الحر مع التدرج اللوني الكامل */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center justify-between text-xs font-medium" style={{ color: "var(--text3)" }}>
            <span>0°</span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              {currentBrandHue}°
            </span>
            <span>360°</span>
          </div>

          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={currentBrandHue}
            onChange={handleBrandHueChange}
            aria-label={t("@legalos.settings.appearance.brandHue.sliderAria")}
            aria-valuenow={currentBrandHue}
            aria-valuemin={0}
            aria-valuemax={360}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg accent-[var(--primary)]"
            style={{
              backgroundColor: "var(--surface3)",
            }}
          />

          {/* أزرار سريعة للدرجات الخمس المحورية: 0، 90، 180، 265، 340 */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[0, 90, 180, 265, 340].map((hue) => {
              const isSelected = currentBrandHue === hue;
              return (
                <button
                  key={hue}
                  type="button"
                  onClick={() => handleBrandHuePreset(hue)}
                  aria-pressed={isSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2"
                  style={{
                    borderRadius: "var(--rs)",
                    border: isSelected
                      ? "2px solid var(--primary)"
                      : "1px solid var(--border)",
                    backgroundColor: isSelected
                      ? "var(--surface2)"
                      : "var(--surface)",
                    color: isSelected ? "var(--primary)" : "var(--text2)",
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: `oklch(0.55 0.14 ${hue})`,
                    }}
                  />
                  <span>{hue}°</span>
                  {hue === 265 && <span className="text-[10px] opacity-75">(الافتراضي)</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* بطاقة 4: خيارات لون التمييز (الألوان الأربعة المعتمدة) */}
      <section
        aria-labelledby="accent-heading"
        className="flex flex-col gap-4 p-5 border shadow-sm"
        style={{
          borderRadius: "var(--r)",
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 id="accent-heading" className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {t("@legalos.settings.appearance.accent.heading")}
            </h2>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
              style={{
                borderRadius: "var(--rs)",
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
              }}
            >
              <Icon name="palette" size={15} />
              <span>{t("@legalos.settings.appearance.accent.previewBadge")}</span>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.appearance.accent.description")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACCENT_PRESETS.map((opt) => {
            const isSelected = currentAccent === opt.value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleAccentSelect(opt.value)}
                aria-pressed={isSelected}
                className="group relative flex flex-col items-start gap-3 p-4 text-start transition-all focus:outline-none focus-visible:ring-2"
                style={{
                  borderRadius: "var(--rs)",
                  border: isSelected
                    ? "2px solid var(--primary)"
                    : "1px solid var(--border)",
                  backgroundColor: isSelected
                    ? "var(--surface2)"
                    : "var(--surface)",
                  boxShadow: isSelected ? "var(--shadow)" : "none",
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className="flex h-9 w-9 items-center justify-center transition-transform group-hover:scale-105"
                    style={{
                      borderRadius: "var(--rs)",
                      backgroundColor: opt.value,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
                    }}
                  >
                    {isSelected && (
                      <span style={{ color: "#ffffff" }}>
                        <Icon name="check" size={18} />
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span
                      className="flex h-5 w-5 items-center justify-center"
                      style={{ color: "var(--primary)" }}
                    >
                      <Icon name="check_circle" size={18} />
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {t(opt.labelKey)}
                  </span>
                  <span className="text-xs leading-relaxed" style={{ color: "var(--text3)" }}>
                    {t(opt.descKey)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* بطاقة 5: استدارة الحواف والزوايا (منزلق حر 4–22 بكسل بخطوة 1) */}
      <section
        aria-labelledby="radius-heading"
        className="flex flex-col gap-5 p-5 border shadow-sm"
        style={{
          borderRadius: "var(--r)",
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 id="radius-heading" className="text-base font-semibold" style={{ color: "var(--text)" }}>
              {t("@legalos.settings.appearance.radius.heading")}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-xs font-semibold px-2 py-0.5 border"
                style={{
                  borderRadius: "var(--rs)",
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface2)",
                  color: "var(--primary)",
                }}
              >
                --r: {currentRadius}px
              </span>
              <span
                className="font-mono text-xs px-2 py-0.5 border"
                style={{
                  borderRadius: "var(--rs)",
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface2)",
                  color: "var(--text2)",
                }}
              >
                --rs: {derivedRs}px
              </span>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.appearance.radius.description")}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>
            {t("@legalos.settings.appearance.radius.derivedNote")}
          </p>
        </div>

        {/* المنزلق التفاعلي الحر */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center justify-between text-xs font-medium" style={{ color: "var(--text3)" }}>
            <span>4px</span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              {currentRadius}px
            </span>
            <span>22px</span>
          </div>

          <input
            type="range"
            min={4}
            max={22}
            step={1}
            value={currentRadius}
            onChange={handleRadiusChange}
            aria-label={t("@legalos.settings.appearance.radius.sliderAria")}
            aria-valuenow={currentRadius}
            aria-valuemin={4}
            aria-valuemax={22}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg accent-[var(--primary)]"
            style={{
              backgroundColor: "var(--surface3)",
            }}
          />
        </div>

        {/* المعاينة الحية للعناصر لتأكيد الاستجابة الحية والتصيير السليم */}
        <div
          className="flex flex-col gap-3 p-4 border"
          style={{
            borderRadius: "var(--rs)",
            borderColor: "var(--border)",
            backgroundColor: "var(--surface2)",
          }}
        >
          <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.appearance.radius.previewHeading")}
          </span>

          <div className="flex flex-wrap items-center gap-3">
            {/* بطاقة تجريبية */}
            <div
              className="flex items-center gap-2.5 border p-3 shadow-xs"
              style={{
                borderRadius: "var(--r)",
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center"
                style={{
                  borderRadius: "var(--rs)",
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
              >
                <Icon name="folder_open" size={18} />
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                {t("@legalos.settings.appearance.radius.previewCardTitle")}
              </span>
            </div>

            {/* شارة تجريبية */}
            <Badge color="success" size="md">
              {t("@legalos.settings.appearance.radius.previewBadge")}
            </Badge>

            {/* زر تجريبي أساسي يتبع درجة اللون */}
            <Button variant="primary" size="sm">
              {t("@legalos.settings.appearance.radius.previewButton")}
            </Button>

            {/* شارة تمييز تجريبية تتبع لون التمييز المشتق */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold shadow-xs"
              style={{
                borderRadius: "var(--rs)",
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
              }}
            >
              <Icon name="palette" size={15} />
              <span>{t("@legalos.settings.appearance.accent.previewBadge")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* بطاقة 6: سلوك الشريط الجانبي */}
      <section
        aria-labelledby="sidebar-heading"
        className="flex items-center justify-between gap-4 p-5 border shadow-sm"
        style={{
          borderRadius: "var(--r)",
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="sidebar-heading" className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {t("@legalos.settings.appearance.sidebar.heading")}
          </h2>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.appearance.sidebar.description")}
          </p>
        </div>

        <Switch
          id="sidebar-collapsed-switch"
          checked={isSidebarCollapsed}
          onChange={handleSidebarToggle}
          size="md"
          label={t("@legalos.settings.appearance.sidebar.collapseLabel")}
        />
      </section>

      {/* بطاقة 7: إعادة الضبط للافتراضيات */}
      <section
        aria-labelledby="reset-heading"
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border shadow-sm"
        style={{
          borderRadius: "var(--r)",
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="reset-heading" className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {t("@legalos.settings.appearance.reset.heading")}
          </h2>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            {t("@legalos.settings.appearance.reset.description")}
          </p>
        </div>

        <Button
          variant="outline-danger"
          size="sm"
          onClick={handleReset}
        >
          {t("@legalos.settings.appearance.reset.button")}
        </Button>
      </section>
    </div>
  );
}
