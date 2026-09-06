"""
اختبارات التحقق الصارم من إعادة رسم شاشة الإعدادات الرئيسية (settings/page.tsx) ومكونات أقسامها على مكتبة السجل (T-053).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
SETTINGS_PAGE = REPO_ROOT / "web" / "app" / "settings" / "page.tsx"
SETTINGS_LAYOUT = REPO_ROOT / "web" / "app" / "settings" / "layout.tsx"
SETTINGS_DIR = REPO_ROOT / "web" / "components" / "settings"


def test_settings_surfaces_use_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة الإعدادات وأقسامها على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert SETTINGS_PAGE.exists()
    settings_files = [SETTINGS_PAGE] + list(SETTINGS_DIR.glob("*.tsx"))
    assert len(settings_files) >= 8

    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Banner",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Spinner",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/TextArea",
        "@astryxdesign/core/NumberInput",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/MultiSelector",
        "@astryxdesign/core/Switch",
        "@astryxdesign/core/Divider",
        "@astryxdesign/core/FileInput",
        "@astryxdesign/core/CheckboxList",
        "@astryxdesign/core/Avatar",
        "@astryxdesign/core/Token",
        "@astryxdesign/core/Stack",
    ]

    for f in settings_files:
        content = f.read_text(encoding="utf-8")
        for forbidden in forbidden_astryx:
            assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في {f.name}: {forbidden}"


def test_zero_inlined_colors_in_settings_surfaces():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة الإعدادات وأقسامها."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    settings_files = [SETTINGS_PAGE] + list(SETTINGS_DIR.glob("*.tsx"))

    for f in settings_files:
        content = f.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, f"تم العثور على ألوان مدمجة في {f.name}: {matches}"


def test_single_api_convention_in_settings_surfaces():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات في الإعدادات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    settings_files = [SETTINGS_PAGE] + list(SETTINGS_DIR.glob("*.tsx"))

    for f in settings_files:
        content = f.read_text(encoding="utf-8")
        match = button_badge_pattern.search(content)
        assert not match, f"تم العثور على خاصية مزدوجة ملغاة في {f.name}: {match.group(0)}"


def test_settings_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق الإعدادات دون أي مساس."""
    page_content = SETTINGS_PAGE.read_text(encoding="utf-8")
    assert "useOrg" in page_content
    assert "useResource" in page_content
    assert "api.organization" in page_content
    assert "reloadOrganizations" in page_content
    assert "ProfileSection" in page_content
    assert "IdentitySection" in page_content
    assert "PreferencesSection" in page_content
    assert "BillingSection" in page_content
    assert "RequiredFieldsSection" in page_content
    assert "PlanSection" in page_content
    assert "NotificationsSection" in page_content


def test_settings_layout_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق تخطيط الإعدادات (settings/layout.tsx) وخلوه من مكونات Astryx."""
    assert SETTINGS_LAYOUT.exists()
    content = SETTINGS_LAYOUT.read_text(encoding="utf-8")

    # 1. التحقق من الحفاظ على الخطافات والربط
    assert "usePathname" in content
    assert "useTranslator" in content
    assert "useOrg" in content
    assert "organizationName" in content
    assert "{children}" in content

    # 2. التحقق من مسارات التنقل للأقسام
    assert "/settings/profile" in content
    assert "/settings/appearance" in content
    assert "/settings" in content
    assert "/settings/users" in content

    # 3. التحقق من خلوه من مكونات Astryx العرضية واستخدام components/ui/Card
    assert "@/components/ui/Card" in content
    forbidden_astryx = [
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Icon",
        "@astryxdesign/core/List",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد Astryx غير مسموح به في settings/layout.tsx: {forbidden}"
