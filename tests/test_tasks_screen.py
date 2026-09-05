"""
اختبارات التحقق الصارم من إعادة رسم شاشة المهام (tasks/page.tsx) على مكتبة السجل (T-053 / الموجة الثانية).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
TASKS_PAGE = REPO_ROOT / "web" / "app" / "tasks" / "page.tsx"


def test_tasks_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة المهام على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert TASKS_PAGE.exists()
    content = TASKS_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل
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
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في tasks/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_tasks_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة المهام."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = TASKS_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في tasks/page.tsx: {matches}"


def test_single_api_convention_in_tasks_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = TASKS_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في tasks/page.tsx: {match.group(0)}"


def test_tasks_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق المهام دون أي مساس."""
    content = TASKS_PAGE.read_text(encoding="utf-8")

    # التحقق من استدعاءات API للمهام
    assert "api.tasks.list" in content
    assert "api.me" in content
    assert "practice.tasks.update" in content
    assert "practice.tasks.create" in content
    assert "api.matters.list" in content

    # التحقق من الحالات الافتراضية
    assert 'useState<Filter>("all")' in content
    assert "useResource" in content
    assert "useOrg" in content
    assert "useMemberName" in content
    assert "useFormat" in content
    assert "useEnumLabel" in content
    assert "daysUntil" in content
    assert "todayIso" in content