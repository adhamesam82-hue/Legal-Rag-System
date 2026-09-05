"""
اختبارات التحقق الصارم من إعادة رسم شاشة القضايا (matters/page.tsx) على مكتبة السجل (T-053 / الموجة الثانية).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
MATTERS_PAGE = REPO_ROOT / "web" / "app" / "matters" / "page.tsx"


def test_matters_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة القضايا على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert MATTERS_PAGE.exists()
    content = MATTERS_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل
    assert "@/components/ui/Table" in content
    assert "@/components/ui/Button" in content
    assert "@/components/ui/Badge" in content
    assert "@/components/ui/Input" in content
    assert "@/components/ui/Select" in content
    assert "@/components/ui/Checkbox" in content
    assert "@/components/ui/Card" in content
    assert "@/components/ui/Dialog" in content
    assert "@/components/ui/EmptyState" in content
    assert "@/components/ui/Icon" in content

    # منع استيراد مكونات Astryx المرئية القديمة
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Avatar",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/TextArea",
        "@astryxdesign/core/DateInput",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/MultiSelector",
        "@astryxdesign/core/Table",
        "@astryxdesign/core/Link",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في matters/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_matters_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة القضايا."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = MATTERS_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في matters/page.tsx: {matches}"


def test_single_api_convention_in_matters_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = MATTERS_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في matters/page.tsx: {match.group(0)}"


def test_matters_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق القضايا دون أي مساس."""
    content = MATTERS_PAGE.read_text(encoding="utf-8")

    # التحقق من استدعاءات API للقضايا
    assert "api.matters.list" in content
    assert "practice.matters.create" in content
    assert "api.clients.list" in content

    # التحقق من الحالات الافتراضية والخطافات
    assert "debouncedQuery" in content
    assert "useResource" in content
    assert "useOrg" in content
    assert "useMemberName" in content
    assert "useFormat" in content
    assert "MatterStatusMark" in content
    assert "MatterTypeBadge" in content
    assert "daysUntil" in content
    assert "todayIso" in content
    assert "MATTER_TYPES" in content