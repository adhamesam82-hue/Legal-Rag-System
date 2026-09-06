"""
اختبارات التحقق الصارم من إعادة رسم شاشة تفاصيل الفاتورة (billing/[id]/page.tsx) على مكتبة السجل (T-053 / الموجة الخامسة).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
BILLING_DETAIL_PAGE = REPO_ROOT / "web" / "app" / "billing" / "[id]" / "page.tsx"


def test_billing_detail_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة تفاصيل الفاتورة على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert BILLING_DETAIL_PAGE.exists()
    content = BILLING_DETAIL_PAGE.read_text(encoding="utf-8")

    assert "@/components/ui/Card" in content
    assert "@/components/ui/Button" in content
    assert "@/components/ui/Table" in content
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
        "@astryxdesign/core/TextArea",
        "@astryxdesign/core/Divider",
        "@astryxdesign/core/Table",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في billing/[id]/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_billing_detail_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة تفاصيل الفاتورة."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = BILLING_DETAIL_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في billing/[id]/page.tsx: {matches}"


def test_single_api_convention_in_billing_detail_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = BILLING_DETAIL_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في billing/[id]/page.tsx: {match.group(0)}"


def test_billing_detail_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق تفاصيل الفاتورة دون أي مساس."""
    content = BILLING_DETAIL_PAGE.read_text(encoding="utf-8")

    assert "api.invoices.get" in content
    assert "practice.invoices.setStatus" in content
    assert "practice.invoices.setNotes" in content
    assert "useResource" in content
    assert "useOrg" in content
    assert "useLocale" in content
    assert "useFormat" in content
    assert "useTranslator" in content
