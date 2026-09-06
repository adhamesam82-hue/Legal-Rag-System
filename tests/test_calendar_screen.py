"""
اختبارات التحقق الصارم من إعادة رسم شاشة التقويم (calendar/page.tsx) على مكتبة السجل (T-053 / الموجة الثالثة).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CALENDAR_PAGE = REPO_ROOT / "web" / "app" / "calendar" / "page.tsx"


def test_calendar_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة التقويم على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert CALENDAR_PAGE.exists()
    content = CALENDAR_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل
    assert "@/components/ui/Card" in content
    assert "@/components/ui/Button" in content
    assert "@/components/ui/Badge" in content
    assert "@/components/ui/Input" in content
    assert "@/components/ui/Select" in content
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
        "@astryxdesign/core/Icon",
        "@astryxdesign/core/List",
        "@astryxdesign/core/Link",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/DateInput",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/SegmentedControl",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
        "@astryxdesign/core/Grid",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في calendar/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_calendar_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة التقويم."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = CALENDAR_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في calendar/page.tsx: {matches}"


def test_single_api_convention_in_calendar_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = CALENDAR_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في calendar/page.tsx: {match.group(0)}"


def test_calendar_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات ومنطق التقويم وحسابات الأشهر دون أي مساس."""
    content = CALENDAR_PAGE.read_text(encoding="utf-8")

    # التحقق من استدعاءات API
    assert "api.hearings.list" in content
    assert "api.tasks.list" in content
    assert "api.matters.list" in content
    assert "api.cases.list" in content
    assert "practice.hearings.create" in content

    # التحقق من الخطافات والمتغيرات الحسابية
    assert "useResource" in content
    assert "useOrg" in content
    assert "useMemberName" in content
    assert "useTranslator" in content
    assert "useFormat" in content
    assert "todayIso" in content
    assert "monthKey" in content
    assert "shiftMonth" in content
    assert "MAX_CHIPS_PER_DAY" in content
    assert "WEEKDAY_KEYS" in content
    assert "KIND_LABEL_KEY" in content
