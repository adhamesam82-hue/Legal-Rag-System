"""
اختبارات التحقق الصارم من إعادة رسم شاشة تتبع الوقت (time-tracking/page.tsx) على مكتبة السجل (T-053 / الموجة الرابعة).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
TIME_TRACKING_PAGE = REPO_ROOT / "web" / "app" / "time-tracking" / "page.tsx"


def test_time_tracking_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة تتبع الوقت على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert TIME_TRACKING_PAGE.exists()
    content = TIME_TRACKING_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل
    assert "@/components/ui/Card" in content
    assert "@/components/ui/Button" in content
    assert "@/components/ui/Badge" in content
    assert "@/components/ui/Input" in content
    assert "@/components/ui/Select" in content
    assert "@/components/ui/Checkbox" in content
    assert "@/components/ui/Dialog" in content
    assert "@/components/ui/Table" in content
    assert "@/components/ui/EmptyState" in content
    assert "@/components/ui/Icon" in content

    # منع استيراد أي مكونات Astryx المرئية القديمة
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Icon",
        "@astryxdesign/core/Divider",
        "@astryxdesign/core/Link",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/NumberInput",
        "@astryxdesign/core/DateInput",
        "@astryxdesign/core/CheckboxInput",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/SegmentedControl",
        "@astryxdesign/core/ProgressBar",
        "@astryxdesign/core/Table",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
        "@astryxdesign/core/Grid",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في time-tracking/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_time_tracking_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة تتبع الوقت."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = TIME_TRACKING_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في time-tracking/page.tsx: {matches}"


def test_single_api_convention_in_time_tracking_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = TIME_TRACKING_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في time-tracking/page.tsx: {match.group(0)}"


def test_time_tracking_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات وحسابات تتبع الوقت والمؤقت الحي ودوال الحذف والإضافة."""
    content = TIME_TRACKING_PAGE.read_text(encoding="utf-8")

    # التحقق من استدعاءات API
    assert "api.time.list" in content
    assert "api.matters.list" in content
    assert "practice.time.create" in content
    assert "practice.time.remove" in content

    # التحقق من الخطافات
    assert "useResource" in content
    assert "useOrg" in content
    assert "useMemberName" in content
    assert "useTranslator" in content
    assert "useFormat" in content
    assert "useState" in content
    assert "useEffect" in content
    assert "useMemo" in content

    # التحقق من المتغيرات والحسابات وثوابت المؤقت الحي
    assert "WEEKLY_TARGET_HOURS = 40" in content
    assert "weekDays" in content
    assert "formatDuration" in content
    assert "todayIso" in content
    assert "TIMER_STORAGE_KEY" in content
    assert "localStorage" in content

    # التحقق من المخطط البياني Recharts
    assert "ResponsiveContainer" in content
    assert "BarChart" in content
    assert "Bar" in content
    assert "CartesianGrid" in content
    assert "XAxis" in content
    assert "YAxis" in content
    assert "Tooltip" in content
    assert "Legend" in content
