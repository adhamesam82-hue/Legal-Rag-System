"""
اختبارات التحقق الصارم من إعادة رسم شاشة لوحة التحكم (dashboard/page.tsx) على مكتبة السجل (T-056 / E-5).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DASHBOARD_PAGE = REPO_ROOT / "web" / "app" / "dashboard" / "page.tsx"


def test_dashboard_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة لوحة التحكم على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert DASHBOARD_PAGE.exists()
    content = DASHBOARD_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل
    assert "@/components/ui/Card" in content
    assert "@/components/ui/Badge" in content
    assert "@/components/ui/Icon" in content
    assert "@/components/ui/EmptyState" in content

    # منع استيراد مكونات Astryx المرئية القديمة
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Avatar",
        "@astryxdesign/core/CheckboxInput",
        "@astryxdesign/core/List",
        "@astryxdesign/core/Link",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/DateInput",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/SegmentedControl",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
        "@astryxdesign/core/Grid",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في dashboard/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_dashboard_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة لوحة التحكم."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = DASHBOARD_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في dashboard/page.tsx: {matches}"


def test_single_api_convention_in_dashboard_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = DASHBOARD_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في dashboard/page.tsx: {match.group(0)}"


def test_dashboard_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق لوحة التحكم والربط بالبيانات دون أي مساس."""
    content = DASHBOARD_PAGE.read_text(encoding="utf-8")

    # التحقق من استدعاءات API للوحة التحكم
    assert "api.dashboard(30)" in content
    assert "api.invoices.list()" in content
    assert "board.active_matters" in content
    assert "board.open_tasks" in content
    assert "board.overdue_tasks" in content
    assert "board.tasks_due_this_week" in content
    assert "board.unbilled_amount" in content
    assert "board.outstanding_amount" in content
    assert "board.hours_this_month" in content
    assert "board.upcoming" in content
    assert "board.recent_activity" in content

    # التحقق من الخطافات والمساعدات
    assert "useResource" in content
    assert "useOrg" in content
    assert "useMemberName" in content
    assert "useFormat" in content
    assert "useEnumLabel" in content
    assert "useTranslator" in content
    assert "daysUntil" in content
    assert "todayIso" in content
    assert "ProximityBadge" in content


def test_no_trend_arrows_or_invented_metrics_in_dashboard():
    """التحقق من إزالة أسهم الاتجاه تماماً وعدم اختراع أي نسب مئوية ثابتة (البند ٣)."""
    content = DASHBOARD_PAGE.read_text(encoding="utf-8")

    forbidden_patterns = [
        "arrow_upward",
        "arrow_downward",
        "+12%",
        "−4%",
        "-4%",
    ]
    for pattern in forbidden_patterns:
        assert pattern not in content, f"تم العثور على مؤشر اتجاه أو نسبة مخترعة في dashboard/page.tsx: {pattern}"
