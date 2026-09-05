"""
اختبارات التحقق الصارم من إعادة رسم شاشة الجلسات (hearings/page.tsx) على مكتبة السجل (T-053 / الموجة الثانية).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
HEARINGS_PAGE = REPO_ROOT / "web" / "app" / "hearings" / "page.tsx"


def test_hearings_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة الجلسات على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert HEARINGS_PAGE.exists()
    content = HEARINGS_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل
    assert '@/components/ui/Table' in content
    assert '@/components/ui/Button' in content
    assert '@/components/ui/Badge' in content
    assert '@/components/ui/Input' in content
    assert '@/components/ui/Select' in content
    assert '@/components/ui/Dialog' in content
    assert '@/components/ui/EmptyState' in content
    assert '@/components/ui/Icon' in content
    assert '@/components/ui/Card' in content

    # منع استيراد مكونات Astryx المرئية القديمة
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Banner",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Table",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/DateInput",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في hearings/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_hearings_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة الجلسات."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = HEARINGS_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في hearings/page.tsx: {matches}"


def test_single_api_convention_in_hearings_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = HEARINGS_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في hearings/page.tsx: {match.group(0)}"


def test_hearings_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق الجلسات دون أي مساس."""
    content = HEARINGS_PAGE.read_text(encoding="utf-8")

    # التحقق من استدعاءات API للجلسات
    assert "api.hearings.list" in content
    assert "practice.hearings.create" in content
    assert "api.matters.list" in content

    # التحقق من الحالات الافتراضية
    assert 'ANY = "any"' in content
    assert 'UNDECIDED = "undecided"' in content
    assert "useResource" in content
    assert "useOrg" in content
    assert "ProximityBadge" in content
    assert "HEARING_OUTCOMES" in content
