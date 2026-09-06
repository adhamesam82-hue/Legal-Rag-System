"""
اختبارات التحقق الصارم من إعادة رسم شاشة تفاصيل القضية القضائية (cases/[id]/page.tsx) على مكتبة السجل (T-053 / الموجة الخامسة).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CASE_DETAIL_PAGE = REPO_ROOT / "web" / "app" / "cases" / "[id]" / "page.tsx"


def test_case_detail_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة تفاصيل القضية على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert CASE_DETAIL_PAGE.exists()
    content = CASE_DETAIL_PAGE.read_text(encoding="utf-8")

    assert "@/components/ui/Card" in content
    assert "@/components/ui/Badge" in content
    assert "@/components/ui/EmptyState" in content
    assert "@/components/ui/Icon" in content

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
        "@astryxdesign/core/MetadataList",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في cases/[id]/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_case_detail_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة تفاصيل القضية."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = CASE_DETAIL_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في cases/[id]/page.tsx: {matches}"


def test_single_api_convention_in_case_detail_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = CASE_DETAIL_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في cases/[id]/page.tsx: {match.group(0)}"


def test_case_detail_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق تفاصيل القضية دون أي مساس."""
    content = CASE_DETAIL_PAGE.read_text(encoding="utf-8")

    assert "api.cases.get" in content
    assert "useResource" in content
    assert "useFormat" in content
    assert "useTranslator" in content
    assert "useDirection" in content
    assert "daysUntil" in content
    assert "ParentLine" in content
    assert "PrimaryBadge" in content
    assert "CaseRefItem" in content
