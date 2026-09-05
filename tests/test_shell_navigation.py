"""
اختبارات آلية للتحقق من قشرة التطبيق والتنقل بالشريط الجانبي والعلوي (T-051 / E-5).
يتحقق هذا الاختبار من:
1. تنظيم المجموعات السبع للشريط الجانبي ومساراتها الدقيقة.
2. قراءة الأقفال من features.ts حصراً دون قوائم موازية ثانية.
3. اكتمال مفاتيح الترجمة والتدويل في كتالوجي ar و en.
4. حفظ واسترجاع حالة طي الشريط الجانبي في التخزين المحلي (localStorage).
5. تمييز البند النشط والتوافق مع الأنماط الأربعة والخصائص المنطقية.
"""

import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHELL_TSX = REPO_ROOT / "web" / "components" / "Shell.tsx"
CATALOG_SHELL_TS = REPO_ROOT / "web" / "lib" / "i18n" / "catalogs" / "shell.ts"
FEATURES_TS = REPO_ROOT / "web" / "lib" / "features.ts"


# -----------------------------------------------------------------------------
# 1. اختبار تنظيم المجموعات السبع ومساراتها
# -----------------------------------------------------------------------------

def test_seven_navigation_sections_structure_and_routes():
    """التحقق من وجود وتنظيم المجموعات السبع ومساراتها بدقة وفقاً لقالب السجل والتذكرة T-051."""
    content = SHELL_TSX.read_text(encoding="utf-8")

    expected_sections = [
        {
            "title_key": "@legalos.shell.nav.section.overview",
            "routes": ["/dashboard"],
        },
        {
            "title_key": "@legalos.shell.nav.section.clients",
            "routes": ["/clients", "/crm"],
        },
        {
            "title_key": "@legalos.shell.nav.section.practice",
            "routes": ["/matters", "/hearings", "/calendar", "/tasks"],
        },
        {
            "title_key": "@legalos.shell.nav.section.content",
            "routes": ["/documents", "/library", "/knowledge-base"],
        },
        {
            "title_key": "@legalos.shell.nav.section.ai",
            "routes": ["/ai-assistant", "/ai-assistant", "/legal-research", "/contract-review"],
        },
        {
            "title_key": "@legalos.shell.nav.section.finance",
            "routes": ["/time-tracking", "/billing", "/accounting", "/reports"],
        },
        {
            "title_key": "@legalos.shell.nav.section.team",
            "routes": ["/messages", "/automation", "/settings"],
        },
    ]

    # التحقق من تعريف مصفوفة المجموعات في Shell.tsx
    assert "SHELL_NAV_SECTIONS" in content or "ALL_NAV_SECTIONS" in content, (
        "لم يتم العثور على تعريف مصفوفة أقسام التنقل في Shell.tsx"
    )

    for section in expected_sections:
        assert section["title_key"] in content, (
            f"مفتاح عنوان القسم مفقود: {section['title_key']}"
        )
        for route in section["routes"]:
            assert f'href: "{route}"' in content or f"href: '{route}'" in content, (
                f"مسار التنقل مفقود من القسم: {route}"
            )


# -----------------------------------------------------------------------------
# 2. اختبار قراءة الأقفال من features.ts حصراً
# -----------------------------------------------------------------------------

def test_locks_read_exclusively_from_features_ts():
    """التحقق من أن الأقفال تُقرأ من features.ts عبر دالة isPathEnabled حصراً دون قوائم مكررة."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")

    # التحقق من استيراد isPathEnabled من features
    import_match = re.search(r'import\s*\{[^}]*isPathEnabled[^}]*\}\s*from\s*["\']@/lib/features["\']', shell_content)
    assert import_match, "يجب استيراد isPathEnabled من @/lib/features في Shell.tsx"

    # التحقق من استدعاء isPathEnabled لتحديد حالة الحجب
    assert "isPathEnabled(" in shell_content, "يجب فحص المسار عبر isPathEnabled(item.href)"

    # التحقق من عدم وجود مصفوفة ثانية مشفرة للمقفولات (Anti-pattern check)
    forbidden_patterns = [
        r"const\s+LOCKED_ROUTES\s*=",
        r"const\s+GATED_ROUTES\s*=",
        r"const\s+LOCKED_FEATURES\s*=",
        r"const\s+DISABLED_PATHS\s*=",
    ]
    for pattern in forbidden_patterns:
        assert not re.search(pattern, shell_content), (
            f"ممنوع إنشاء قائمة مقفولات ثانية في القشرة: وُجد النمط {pattern}"
        )


# -----------------------------------------------------------------------------
# 3. اختبار وجود مفاتيح الترجمة بالكامل في كتالوجي ar و en
# -----------------------------------------------------------------------------

def test_i18n_translation_keys_in_ar_and_en():
    """التحقق من وجود كافة المفاتيح في كتالوجي shell.ts (العربية والإنجليزية) وعدم وجود نصوص صلبة."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")
    catalog_content = CATALOG_SHELL_TS.read_text(encoding="utf-8")

    # استخراج كافة مفاتيح @legalos.shell.* من Shell.tsx
    keys_in_shell = set(re.findall(r'["\'](@legalos\.shell\.[a-zA-Z0-9_.]+)["\']', shell_content))
    assert len(keys_in_shell) > 0, "لم يتم العثور على مفاتيح ترجمة في Shell.tsx"

    # استخراج مفاتيح كتالوج en
    en_match = re.search(r'export const en:\s*Catalog\s*=\s*\{([\s\S]+?)\n\};', catalog_content)
    assert en_match, "لم يتم العثور على كتالوج en في shell.ts"
    en_keys = set(re.findall(r'["\'](@legalos\.shell\.[a-zA-Z0-9_.]+)["\']', en_match.group(1)))

    # استخراج مفاتيح كتالوج ar
    ar_match = re.search(r'export const ar:\s*Catalog\s*=\s*\{([\s\S]+?)\n\};', catalog_content)
    assert ar_match, "لم يتم العثور على كتالوج ar في shell.ts"
    ar_keys = set(re.findall(r'["\'](@legalos\.shell\.[a-zA-Z0-9_.]+)["\']', ar_match.group(1)))

    # التحقق من أن كل مفتاح في Shell.tsx موجود في كلا الكتالوجين
    for key in keys_in_shell:
        assert key in en_keys, f"المفتاح {key} مفقود من كتالوج en"
        assert key in ar_keys, f"المفتاح {key} مفقود من كتالوج ar"


# -----------------------------------------------------------------------------
# 4. اختبار حفظ حالة طي الشريط الجانبي في localStorage
# -----------------------------------------------------------------------------

def test_sidebar_persistent_collapse_in_localstorage():
    """التحقق من حفظ واسترجاع حالة طي الشريط الجانبي في التخزين المحلي بمفتاح sidebarCollapsed."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")

    # التحقق من وجود اسم المفتاح المطلوب sidebarCollapsed
    assert "sidebarCollapsed" in shell_content, (
        "يجب استخدام المفتاح sidebarCollapsed في localStorage كما هو مطلوب في التذكرة T-051"
    )

    # التحقق من قراءة التخزين المحلي واسترجاع الحالة
    assert "localStorage.getItem(" in shell_content, (
        "يجب استرجاع حالة الطي من localStorage عند تحميل القشرة"
    )

    # التحقق من حفظ التخزين المحلي عند التبديل
    assert "localStorage.setItem(" in shell_content, (
        "يجب حفظ حالة الطي في localStorage عند التبديل"
    )


# -----------------------------------------------------------------------------
# 5. اختبار تمييز البند النشط ودعم الأنماط الأربعة والخصائص المنطقية
# -----------------------------------------------------------------------------

def test_active_item_and_four_theme_modes():
    """التحقق من تمييز البند النشط ودعم الأوضاع الأربعة واستخدام الخصائص المنطقية."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")

    # تمييز البند النشط باستخدام pathname
    assert "pathname" in shell_content, "يجب استخدام pathname لتحديد البند النشط"
    assert "usePathname" in shell_content, "يجب استدعاء usePathname"

    # التحقق من دعم الأنماط الأربعة
    theme_modes = ["light", "dark", "mixed", "mixed-inv"]
    for mode in theme_modes:
        assert mode in shell_content, f"النمط {mode} يجب أن يكون معرفاً ومدعوماً في القشرة"

    assert "data-theme" in shell_content, "يجب استخدام data-theme لتطبيق الثيم على القشرة والشريط"

    # التحقق من الخصائص المنطقية (RTL-friendly)
    logical_properties = [
        "borderInlineEnd",
        "insetInlineEnd",
    ]
    for prop in logical_properties:
        assert prop in shell_content or (prop == "borderInlineEnd" and "border-inline-end" in shell_content), (
            f"يجب استخدام الخاصية المنطقية {prop}"
        )


# -----------------------------------------------------------------------------
# 6. اختبار مزامنة ثيم Astryx ونظافة الكود من الحقول الميتة ومصادر الخطوط (المراجعة)
# -----------------------------------------------------------------------------

def test_astryx_theme_sync_and_code_cleanliness():
    """التحقق من مزامنة ثيم Astryx في الأوضاع الأربعة، وخلو Shell.tsx من countKey، واستخدام رمز الخط."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")

    # 1. التحقق من عدم وجود الحقل الميت countKey
    assert "countKey" not in shell_content, (
        "يجب أن يكون حقل countKey محذوفاً تماماً من Shell.tsx لمنع وجود حقول ميتة"
    )

    # 2. التحقق من مزامنة setParentMode في الأوضاع الأربعة عبر targetShellTheme
    assert "targetShellTheme" in shell_content or "setParentMode(shellTheme)" in shell_content, (
        "يجب مزامنة setParentMode لجميع الأوضاع الأربعة (بما فيها mixed و mixed-inv)"
    )

    # 3. التحقق من استخدام رمز الخط الموحد بدلاً من مكدس نصوص مدمج
    assert "var(--font-family-body)" in shell_content, (
        "يجب أن تستخدم القشرة var(--font-family-body) لتوحيد مصدر الخط مع منظومة الرموز"
    )

