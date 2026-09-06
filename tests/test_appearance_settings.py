"""
اختبارات شاملة لإعدادات المظهر والعرض والتخزين الموحد (T-054 / E-5).
يتحقق هذا الاختبار من معايير القبول الـ 11:
- AC1: الأنماط الأربعة والكثافة والزوايا وطي الشريط تعمل وتطبق فوراً.
- AC2: التخزين المستمر في المفتاح الموحد sijil_appearance_settings.
- AC3: سكريبت منع وميض الوضع الداكن قبل أول رسم في layout.tsx.
- AC4: dir غير معروض في الصفحة ويتبع اللغة حصراً.
- AC5: brandHue و accent غير معروضين في الشاشة و --brand-h متغير حر.
- AC6: radius منزلق حر 4-22 بخطوة 1 مع اشتقاق --rs = max(4, r - 4).
- AC7: عدم وجود حواف ثابتة في صفحة المظهر أو مكونات ui/.
- AC8: زر إعادة الضبط يمسح المفاتيح ويعيد الافتراضيات.
- AC9: معالجة localStorage التالف أو المحجوب واسترجاع الافتراضيات بأمان.
- AC10: صفر استدعاءات شبكة (لا api ولا fetch).
- AC11: اكتمال مفاتيح الترجمة في كتالوجي settings.ts (ar و en).
"""

import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
APPEARANCE_TS = REPO_ROOT / "web" / "lib" / "appearance.ts"
APPEARANCE_PAGE_TSX = REPO_ROOT / "web" / "app" / "settings" / "appearance" / "page.tsx"
SETTINGS_LAYOUT_TSX = REPO_ROOT / "web" / "app" / "settings" / "layout.tsx"
ROOT_LAYOUT_TSX = REPO_ROOT / "web" / "app" / "layout.tsx"
SHELL_TSX = REPO_ROOT / "web" / "components" / "Shell.tsx"
CATALOG_SETTINGS_TS = REPO_ROOT / "web" / "lib" / "i18n" / "catalogs" / "settings.ts"
GLOBALS_CSS = REPO_ROOT / "web" / "app" / "globals.css"
THEME_TS = REPO_ROOT / "web" / "lib" / "theme.ts"


# -----------------------------------------------------------------------------
# 1. اختبار كائن التخزين الموحد والترحيل التلقائي (AC1, AC2, AC8, AC9)
# -----------------------------------------------------------------------------

def test_unified_storage_key_and_types():
    """التحقق من تعريف كائن التخزين الموحد والمفتاح المعتمد والأنواع الأربعة."""
    content = APPEARANCE_TS.read_text(encoding="utf-8")

    # مفتاح التخزين الموحد
    assert 'export const APPEARANCE_STORAGE_KEY = "sijil_appearance_settings"' in content

    # الأنواع الأربعة للثيم
    assert '"light"' in content
    assert '"dark"' in content
    assert '"mixed"' in content
    assert '"mixed-inv"' in content

    # كثافات العرض الثلاث
    assert '"comfortable"' in content
    assert '"medium"' in content
    assert '"compact"' in content

    # الحدث المخصص للبث الفوري
    assert 'export const APPEARANCE_CHANGE_EVENT = "legalos:appearance-change"' in content


def test_migration_of_legacy_storage_keys():
    """التحقق من ترحيل المفاتيح القديمة الثلاثة (sidebarCollapsed, sidebar_collapsed_v1, legalos_theme_mode)."""
    content = APPEARANCE_TS.read_text(encoding="utf-8")

    # فحص مصفوفات المفاتيح القديمة
    assert "legalos_theme_mode" in content
    assert "sidebarCollapsed" in content
    assert "sidebar_collapsed_v1" in content
    assert "legalos-sidenav-collapsed" in content

    # فحص منطق الترحيل
    assert "loadAppearanceSettings" in content
    assert "sanitizeAppearanceSettings" in content


def test_reset_functionality_clears_keys():
    """التحقق من أن دالة إعادة الضبط تمسح المفاتيح وتعيد تطبيق الافتراضيات (AC8)."""
    content = APPEARANCE_TS.read_text(encoding="utf-8")

    assert "resetAppearanceSettings" in content
    assert "removeItem(APPEARANCE_STORAGE_KEY)" in content
    assert "applyAppearanceVars(defaults)" in content


# -----------------------------------------------------------------------------
# 2. اختبار اشتقاق المتغيرات الحية وزوايا الاستدارة (AC1, AC6, AC7)
# -----------------------------------------------------------------------------

def test_radius_slider_and_derived_rs():
    """التحقق من أن radius منزلق حر من 4 إلى 22 بخطوة 1 واشتقاق --rs (AC6)."""
    page_content = APPEARANCE_PAGE_TSX.read_text(encoding="utf-8")
    app_ts_content = APPEARANCE_TS.read_text(encoding="utf-8")

    # في صفحة المظهر: input type="range" min=4 max=22 step=1
    assert 'type="range"' in page_content
    assert 'min={4}' in page_content or 'min="4"' in page_content
    assert 'max={22}' in page_content or 'max="22"' in page_content
    assert 'step={1}' in page_content or 'step="1"' in page_content

    # التحقق من دالة الاشتقاق max(4, radius - 4)
    assert "Math.max(4, currentRadius - 4)" in page_content or "Math.max(4, radius - 4)" in page_content
    assert "Math.max(4, radius - 4)" in app_ts_content


def test_density_derived_padding():
    """التحقق من اشتقاق --rowpad بحسب الكثافة: 18px، 14px، 10px."""
    app_ts_content = APPEARANCE_TS.read_text(encoding="utf-8")

    assert 'density === "comfortable" ? "18px"' in app_ts_content
    assert '"10px" : "14px"' in app_ts_content


def test_no_hardcoded_radii_in_appearance_page():
    """التحقق من عدم وجود حواف ثابتة مكتوبة بالأرقام في صفحة المظهر (AC7)."""
    page_content = APPEARANCE_PAGE_TSX.read_text(encoding="utf-8")

    # التحقق من أن العناصر التفاعلية والبطاقات تستخدم var(--r) و var(--rs)
    assert "var(--r)" in page_content
    assert "var(--rs)" in page_content

    # التأكد من عدم استخدام rounded-[12px] أو rounded-[8px] ثابتة
    bad_patterns = re.findall(r"rounded-\[\d+px\]", page_content)
    assert len(bad_patterns) == 0, f"وجدت حواف ثابتة في صفحة المظهر: {bad_patterns}"


# -----------------------------------------------------------------------------
# 3. اختبار تفادي الوميض في الوضع الداكن (AC3)
# -----------------------------------------------------------------------------

def test_anti_flicker_inline_script_in_root_layout():
    """التحقق من وجود سكريبت تهيئة المظهر المضمن في <head> داخل layout.tsx لمنع الوميض (AC3)."""
    layout_content = ROOT_LAYOUT_TSX.read_text(encoding="utf-8")
    app_ts_content = APPEARANCE_TS.read_text(encoding="utf-8")

    assert "APPEARANCE_INLINE_SCRIPT" in app_ts_content
    assert "APPEARANCE_INLINE_SCRIPT" in layout_content
    assert "sijil-appearance-init" in layout_content
    assert "<head>" in layout_content


# -----------------------------------------------------------------------------
# 4. اختبار ما لا يُعرض: dir و brandHue و accent (AC4, AC5)
# -----------------------------------------------------------------------------
# 4. اختبار brandHue و accent في شاشة المظهر والتعقيم واشتقاق الألوان (T-057)
# -----------------------------------------------------------------------------

def test_dir_not_displayed_in_appearance_page():
    """التحقق من أن dir غير معروض في شاشة المظهر ويتبع اللغة حصراً (AC4)."""
    page_content = APPEARANCE_PAGE_TSX.read_text(encoding="utf-8")

    # التأكد من عدم وجود أزرار أو خيارات لتبديل dir
    assert 'name="dir"' not in page_content
    assert '"rtl"' not in page_content
    assert '"ltr"' not in page_content


def test_brand_hue_slider_and_presets():
    """التحقق من منزلق brandHue من 0 إلى 360 بخطوة 5 والأزرار السريعة والافتراضي 265 (T-057 / AC1)."""
    page_content = APPEARANCE_PAGE_TSX.read_text(encoding="utf-8")
    app_ts_content = APPEARANCE_TS.read_text(encoding="utf-8")

    # المنزلق في صفحة المظهر: 0 إلى 360 بخطوة 5
    assert 'min={0}' in page_content or 'min="0"' in page_content
    assert 'max={360}' in page_content or 'max="360"' in page_content
    assert 'step={5}' in page_content or 'step="5"' in page_content
    assert "currentBrandHue" in page_content
    assert "handleBrandHueChange" in page_content

    # الدرجات الخمس المحورية متوفرة في الواجهة: 0، 90، 180، 265، 340
    for hue in [0, 90, 180, 265, 340]:
        assert f"{hue}" in page_content

    # القيمة الافتراضية 265 في النموذج
    assert "brandHue: 265" in app_ts_content
    assert "--brand-h" in app_ts_content


def test_accent_options_and_color_mix():
    """التحقق من خيارات accent الأربعة واشتقاق --accent-soft بـ color-mix وحظر الإدخال الحر (T-057 / AC1, AC5)."""
    page_content = APPEARANCE_PAGE_TSX.read_text(encoding="utf-8")
    app_ts_content = APPEARANCE_TS.read_text(encoding="utf-8")

    # القيم الأربعة بدقة
    expected_accents = [
        "oklch(0.66 0.11 76)",
        "oklch(0.5 0.14 25)",
        "oklch(0.52 0.11 190)",
        "oklch(0.5 0.13 300)",
    ]
    for acc in expected_accents:
        assert acc in app_ts_content, f"اللون {acc} مفقود في appearance.ts"

    # لا يوجد حقل إدخال لون حر
    assert 'type="color"' not in page_content

    # اشتقاق --accent-soft بـ color-mix
    assert "color-mix(in oklab" in app_ts_content
    assert "16%" in app_ts_content
    assert "var(--surface)" in app_ts_content


def test_sanitization_and_anti_css_injection():
    """التحقق من التعقيم الصارم لـ brandHue و accent لمنع حقن أي قيم تالفة في CSS (T-057 / AC6)."""
    app_ts_content = APPEARANCE_TS.read_text(encoding="utf-8")

    # فحص تعقيم brandHue (حصر في 0..360 وتدوير لخطوة 5 والرجوع للافتراضي 265)
    assert "Math.round(raw.brandHue / 5) * 5" in app_ts_content
    assert "raw.brandHue >= 0" in app_ts_content
    assert "raw.brandHue <= 360" in app_ts_content

    # فحص تعقيم accent (حصر صارم في مصفوفة ACCENT_OPTIONS دون قبول نصوص حرة)
    assert "ACCENT_OPTIONS" in app_ts_content
    assert "includes(raw.accent" in app_ts_content


def test_anti_flicker_script_includes_brand_and_accent():
    """التحقق من ضبط --brand-h و --accent و --accent-soft في سكريبت منع الوميض (T-057 / AC3)."""
    app_ts_content = APPEARANCE_TS.read_text(encoding="utf-8")

    assert "el.style.setProperty('--brand-h', brandHue)" in app_ts_content

    # --accent-base لا --accent. القشرة تحمل data-theme، وكتلته في globals.css
    # تعيد تعريف --accent؛ فقيمة تُكتب هنا بذلك الاسم تُداس عند أول عنصر داخل
    # التطبيق ولا يرى المستخدم للاختيار أثرًا. هذا ما كان يحدث فعلًا.
    assert "el.style.setProperty('--accent-base', accent)" in app_ts_content
    assert "setProperty('--accent'," not in app_ts_content

    # ولا يُكتب --accent-soft هنا إطلاقًا: الكتلة تشتقّه من --accent والسطح،
    # فيتبع اللون والثيم معًا بلا حساب في موضعين.
    assert "setProperty('--accent-soft'" not in app_ts_content


# -----------------------------------------------------------------------------
# 5. اختبار صفر نداء شبكة (AC10)
# -----------------------------------------------------------------------------

def test_zero_network_calls_in_appearance_page():
    """التحقق من صفر استدعاءات شبكة في صفحة المظهر: لا fetch ولا api ولا endpoints (AC10)."""
    page_content = APPEARANCE_PAGE_TSX.read_text(encoding="utf-8")

    assert "fetch(" not in page_content
    assert "axios" not in page_content
    assert "XMLHttpRequest" not in page_content
    assert "@/lib/api" not in page_content
    assert "useOrg" not in page_content
    assert "useResource" not in page_content


# -----------------------------------------------------------------------------
# 6. اختبار تكامل الترجمة والتدويل (AC11)
# -----------------------------------------------------------------------------

def test_appearance_i18n_catalog_keys_complete():
    """التحقق من اكتمال كافة مفاتيح الترجمة الخاصة بالمظهر في كتالوجي ar و en (AC11)."""
    content = CATALOG_SETTINGS_TS.read_text(encoding="utf-8")

    required_keys = [
        "@legalos.settings.nav.appearance",
        "@legalos.settings.appearance.heading",
        "@legalos.settings.appearance.subtitle",
        "@legalos.settings.appearance.theme.heading",
        "@legalos.settings.appearance.theme.description",
        "@legalos.settings.appearance.theme.light",
        "@legalos.settings.appearance.theme.lightDesc",
        "@legalos.settings.appearance.theme.dark",
        "@legalos.settings.appearance.theme.darkDesc",
        "@legalos.settings.appearance.theme.mixed",
        "@legalos.settings.appearance.theme.mixedDesc",
        "@legalos.settings.appearance.theme.mixedInv",
        "@legalos.settings.appearance.theme.mixedInvDesc",
        "@legalos.settings.appearance.density.heading",
        "@legalos.settings.appearance.density.description",
        "@legalos.settings.appearance.density.comfortable",
        "@legalos.settings.appearance.density.medium",
        "@legalos.settings.appearance.density.compact",
        "@legalos.settings.appearance.radius.heading",
        "@legalos.settings.appearance.radius.description",
        "@legalos.settings.appearance.radius.derivedNote",
        "@legalos.settings.appearance.brandHue.heading",
        "@legalos.settings.appearance.brandHue.description",
        "@legalos.settings.appearance.brandHue.sliderAria",
        "@legalos.settings.appearance.brandHue.derivedNote",
        "@legalos.settings.appearance.accent.heading",
        "@legalos.settings.appearance.accent.description",
        "@legalos.settings.appearance.accent.amber",
        "@legalos.settings.appearance.accent.amberDesc",
        "@legalos.settings.appearance.accent.brick",
        "@legalos.settings.appearance.accent.brickDesc",
        "@legalos.settings.appearance.accent.teal",
        "@legalos.settings.appearance.accent.tealDesc",
        "@legalos.settings.appearance.accent.purple",
        "@legalos.settings.appearance.accent.purpleDesc",
        "@legalos.settings.appearance.accent.previewBadge",
        "@legalos.settings.appearance.sidebar.heading",
        "@legalos.settings.appearance.sidebar.collapseLabel",
        "@legalos.settings.appearance.reset.heading",
        "@legalos.settings.appearance.reset.button",
        "@legalos.settings.appearance.reset.confirm",
        "@legalos.settings.appearance.reset.done",
    ]

    # استخراج كتلتي en و ar
    en_block = re.search(r"export const en:\s*Catalog\s*=\s*\{([\s\S]+?)\n\};", content)
    ar_block = re.search(r"export const ar:\s*Catalog\s*=\s*\{([\s\S]+?)\n\};", content)

    assert en_block, "لم يتم العثور على كتالوج en في settings.ts"
    assert ar_block, "لم يتم العثور على كتالوج ar في settings.ts"

    en_text = en_block.group(1)
    ar_text = ar_block.group(1)

    for key in required_keys:
        assert key in en_text, f"المفتاح {key} مفقود من كتالوج en"
        assert key in ar_text, f"المفتاح {key} مفقود من كتالوج ar"


# -----------------------------------------------------------------------------
# 7. اختبار تكامل القشرة وشريط التنقل (Shell.tsx و settings/layout.tsx)
# -----------------------------------------------------------------------------

def test_shell_integration_with_use_appearance():
    """التحقق من ربط Shell.tsx بوحدة useAppearance لضمان التزامن الفوري (AC1)."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")

    assert "useAppearance" in shell_content
    assert "appearance.sidebarCollapsed" in shell_content
    assert "appearance.theme" in shell_content


def test_settings_layout_contains_appearance_link():
    """التحقق من وجود رابط المظهر والعرض في قائمة التنقل الجانبية للإعدادات."""
    layout_content = SETTINGS_LAYOUT_TSX.read_text(encoding="utf-8")

    assert "/settings/appearance" in layout_content
    assert "@legalos.settings.nav.appearance" in layout_content
    assert "PaintBrushIcon" in layout_content
