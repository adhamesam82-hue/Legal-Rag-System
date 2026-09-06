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
    assert "@/components/ui/Icon" in content
    assert "@/components/ui/Tooltip" in content

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


def test_dashboard_template_parity_and_five_sections():
    """التحقق الصارم من مطابقة الأقسام الخمسة للقالب واستدعاء الرؤى بالتوازي (T-059)."""
    content = DASHBOARD_PAGE.read_text(encoding="utf-8")

    # ١ · استدعاء التجميع والرؤى بالتوازي
    assert "api.dashboard(30)" in content
    assert "api.dashboardInsights" in content

    # ٢ · القسم الأول: الترويسة وشريط الأدوات
    assert "على مستوى المكتب" in content
    assert "ملفاتي" in content
    assert "تصدير" in content
    assert "قريبًا" in content
    assert "قضية جديدة" in content
    assert "CreateMatterDialog" in content

    # ٣ · القسم الثاني: بطاقات المؤشرات الأربعة الثابتة و sparkline تساعي النقاط
    assert "قضايا نشطة" in content
    assert "المهام المفتوحة" in content
    assert "الوقت غير المفوتَر" in content
    assert "المستحقات" in content
    assert 'viewBox="0 0 120 30"' in content
    assert "kpi_series" in content
    assert "kpi_deltas" in content

    # ٤ · القسم الثالث: حركة القضايا وتوزيع القضايا
    assert "حركة القضايا خلال الأشهر" in content
    assert "توزيع القضايا حسب النوع" in content
    assert "matters_movement" in content
    assert "matters_by_type" in content

    # ٥ · القسم الرابع: النشاط الأخير والقادم خلال 30 يومًا
    assert "النشاط الأخير" in content
    assert "القادم خلال ٣٠ يومًا" in content
    assert "recent_matters" in content

    # ٦ · القسم الخامس: مهامي اليوم والتحصيلات وسجل النشاط
    assert "مهامي اليوم" in content
    assert "التحصيلات" in content
    assert "سجل النشاط" in content
    assert "handleToggleTask" in content
    assert "top_collection_rate" in content
