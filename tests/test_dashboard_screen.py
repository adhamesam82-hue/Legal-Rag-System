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
    overview_cat = (REPO_ROOT / "web" / "lib" / "i18n" / "catalogs" / "overview.ts").read_text(encoding="utf-8")

    # ١ · استدعاء التجميع والرؤى بالتوازي
    assert "api.dashboard(30)" in content
    assert "api.dashboardInsights" in content

    # ٢ · القسم الأول: الترويسة وشريط الأدوات
    assert "@legalos.dashboard.scope.firmWide" in content
    assert "@legalos.dashboard.scope.myFiles" in content
    assert "@legalos.dashboard.exportCsv" in content
    assert "handleExportCsv" in content
    assert "@legalos.dashboard.newMatter" in content
    assert "CreateMatterDialog" in content

    # التحقق من وجود الترجمات المقابلة في الفهرس
    assert "على مستوى المكتب" in overview_cat
    assert "ملفاتي" in overview_cat
    assert "تصدير" in overview_cat
    assert "قضية جديدة" in overview_cat

    # ٣ · القسم الثاني: بطاقات المؤشرات الأربعة الثابتة و sparkline تساعي النقاط
    assert "@legalos.dashboard.kpi.activeMatters" in content
    assert "@legalos.dashboard.kpi.openTasks" in content
    assert "@legalos.dashboard.kpi.unbilledTime" in content
    assert "@legalos.dashboard.kpi.outstanding" in content
    assert 'viewBox="0 0 120 30"' in content
    assert "kpi_series" in content
    assert "kpi_deltas" in content

    # ٤ · القسم الثالث: حركة القضايا وتوزيع القضايا
    assert "@legalos.dashboard.movement.title" in content
    assert "@legalos.dashboard.byType.title" in content
    assert "matters_movement" in content
    assert "matters_by_type" in content

    # ٥ · القسم الرابع: النشاط الأخير والقادم خلال 30 يومًا
    assert "@legalos.dashboard.recentMatters.title" in content
    assert "@legalos.dashboard.next30.heading" in content
    assert "recent_matters" in content

    # ٦ · القسم الخامس: مهامي اليوم والتحصيلات وسجل النشاط
    assert "@legalos.dashboard.myTasks.title" in content
    assert "@legalos.dashboard.collections.heading" in content
    assert "@legalos.dashboard.activity.title" in content
    assert "handleToggleTask" in content
    assert "top_collection_rate" in content


def test_zero_inlined_arabic_strings_in_dashboard_screen():
    """التحقق الصارم من خلو شاشة لوحة التحكم من النصوص العربية المباشرة (حاجب ١)."""
    content = DASHBOARD_PAGE.read_text(encoding="utf-8")
    code_without_multiline_comments = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
    inlined_arabic: list[tuple[int, str]] = []
    for line_num, line in enumerate(code_without_multiline_comments.splitlines(), 1):
        line_code = re.sub(r"//.*$", "", line)
        if re.search(r'["\'][^"\']*[\u0600-\u06FF][^"\']*["\']', line_code):
            inlined_arabic.append((line_num, line.strip()))
    assert not inlined_arabic, f"تم العثور على نصوص عربية مباشرة في dashboard/page.tsx: {inlined_arabic}"
