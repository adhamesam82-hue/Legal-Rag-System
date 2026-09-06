"""
اختبارات التحقق الصارم من إعادة رسم شاشة تفاصيل الموكل (clients/[id]/page.tsx) على مكتبة السجل (T-053 / الموجة الخامسة).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CLIENT_DETAIL_PAGE = REPO_ROOT / "web" / "app" / "clients" / "[id]" / "page.tsx"


def test_client_detail_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة تفاصيل الموكل على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert CLIENT_DETAIL_PAGE.exists()
    content = CLIENT_DETAIL_PAGE.read_text(encoding="utf-8")

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
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في clients/[id]/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_client_detail_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة تفاصيل الموكل."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = CLIENT_DETAIL_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في clients/[id]/page.tsx: {matches}"


def test_single_api_convention_in_client_detail_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = CLIENT_DETAIL_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في clients/[id]/page.tsx: {match.group(0)}"


def test_client_detail_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق تفاصيل الموكل دون أي مساس."""
    content = CLIENT_DETAIL_PAGE.read_text(encoding="utf-8")

    assert "api.clients.get" in content
    assert "api.matters.list" in content
    assert "api.invoices.list" in content
    assert "api.activity" in content
    assert "useResource" in content
    assert "useMemberName" in content
    assert "useFormat" in content
    assert "useEnumLabel" in content
    assert "useTranslator" in content
