"""
اختبارات التحقق الصارم من إعادة رسم صفحات الإعدادات الفرعية (settings/layout.tsx, settings/profile/page.tsx, settings/users/page.tsx) على مكتبة السجل (T-053).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
SETTINGS_DIR = REPO_ROOT / "web" / "app" / "settings"
SETTINGS_FILES = [
    SETTINGS_DIR / "layout.tsx",
    SETTINGS_DIR / "profile" / "page.tsx",
    SETTINGS_DIR / "users" / "page.tsx",
]


def test_settings_subpages_use_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد صفحات الإعدادات على components/ui والتخلص من مكونات Astryx Core العرضية."""
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Avatar",
        "@astryxdesign/core/List",
        "@astryxdesign/core/Link",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
        "@astryxdesign/core/Grid",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/Alert",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/Icon",
    ]

    for file_path in SETTINGS_FILES:
        assert file_path.exists(), f"الملف غير موجود: {file_path}"
        content = file_path.read_text(encoding="utf-8")
        for forbidden in forbidden_astryx:
            assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في {file_path.name}: {forbidden}"


def test_zero_inlined_colors_in_settings_subpages():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في صفحات الإعدادات."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    for file_path in SETTINGS_FILES:
        content = file_path.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, f"تم العثور على ألوان مدمجة في {file_path.name}: {matches}"


def test_single_api_convention_in_settings_subpages():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    for file_path in SETTINGS_FILES:
        content = file_path.read_text(encoding="utf-8")
        match = button_badge_pattern.search(content)
        assert not match, f"تم العثور على خاصية مزدوجة ملغاة في {file_path.name}: {match.group(0)}"


def test_settings_subpages_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق الإعدادات دون أي مساس."""
    users_content = (SETTINGS_DIR / "users" / "page.tsx").read_text(encoding="utf-8")
    profile_content = (SETTINGS_DIR / "profile" / "page.tsx").read_text(encoding="utf-8")

    assert "api.listOrgMembers" in users_content
    assert "api.createInvite" in users_content
    assert "api.listInvites" in users_content
    assert "useOrg" in users_content
    assert "useResource" in users_content

    assert "practice.me()" in profile_content
    assert "useLocale" in profile_content
