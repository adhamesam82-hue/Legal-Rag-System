"""
اختبارات التحقق الصارم من إعادة رسم شاشة الفوترة (billing/page.tsx) ومكونها التابع (CreateInvoiceDialog.tsx) على مكتبة السجل (T-053 / الموجة الرابعة).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
BILLING_PAGE = REPO_ROOT / "web" / "app" / "billing" / "page.tsx"
CREATE_INVOICE_DIALOG = REPO_ROOT / "web" / "components" / "billing" / "CreateInvoiceDialog.tsx"

TARGET_FILES = [BILLING_PAGE, CREATE_INVOICE_DIALOG]


def test_billing_files_exist():
    """التحقق من وجود صفحة الفوترة والمكون التابع لإنشاء الفواتير."""
    for file_path in TARGET_FILES:
        assert file_path.exists(), f"الملف غير موجود: {file_path}"


def test_billing_uses_sijil_ui_library_and_no_astryx_visual_components():
    """التحقق من اعتماد شاشة الفوترة ومكونها على components/ui والتخلص التام من مكونات Astryx Core البصرية."""
    page_content = BILLING_PAGE.read_text(encoding="utf-8")
    dialog_content = CREATE_INVOICE_DIALOG.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل في صفحة الفوترة
    assert "@/components/ui/Card" in page_content
    assert "@/components/ui/Button" in page_content
    assert "@/components/ui/Select" in page_content
    assert "@/components/ui/Dialog" in page_content
    assert "@/components/ui/Table" in page_content
    assert "@/components/ui/EmptyState" in page_content
    assert "@/components/ui/Icon" in page_content

    # التحقق من استيراد مكونات السجل في نافذة إنشاء الفاتورة
    assert "@/components/ui/Button" in dialog_content
    assert "@/components/ui/Input" in dialog_content
    assert "@/components/ui/Select" in dialog_content
    assert "@/components/ui/Dialog" in dialog_content
    assert "@/components/ui/Icon" in dialog_content

    # قائمة المكونات البصرية الممنوعة من Astryx Core
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
        "@astryxdesign/core/TextArea",
        "@astryxdesign/core/DateInput",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Table",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
        "@astryxdesign/core/Grid",
    ]

    for file_path in TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        for forbidden in forbidden_astryx:
            assert forbidden not in content, (
                f"تم العثور على استيراد بصري محظور في {file_path.name}: {forbidden}"
            )


def test_zero_inlined_colors_in_billing_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch حرفي) في شاشة الفوترة والمكون التابع."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    for file_path in TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, f"تم العثور على ألوان مدمجة في {file_path.name}: {matches}"


def test_single_api_convention_in_billing_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    for file_path in TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        match = button_badge_pattern.search(content)
        assert not match, f"تم العثور على خاصية مزدوجة ملغاة في {file_path.name}: {match.group(0)}"


def test_billing_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على الخطافات والعمليات الحسابية وربط البيانات والمخطط البياني في شاشة الفوترة ومكونها."""
    page_content = BILLING_PAGE.read_text(encoding="utf-8")
    dialog_content = CREATE_INVOICE_DIALOG.read_text(encoding="utf-8")

    # التحقق من استدعاءات API في صفحة الفوترة
    assert "api.invoices.list" in page_content
    assert "api.invoices.summary" in page_content
    assert "practice.invoices.setStatus" in page_content
    assert "practice.invoices.generate" in page_content
    assert "api.matters.list" in page_content
    assert "api.time.list" in page_content

    # التحقق من الخطافات في صفحة الفوترة
    assert "useResource" in page_content
    assert "useOrg" in page_content
    assert "useFormat" in page_content
    assert "useTranslator" in page_content
    assert "useEnumLabel" in page_content
    assert "useState" in page_content
    assert "useMemo" in page_content

    # التحقق من الحسابات وثوابت KPIs
    assert "byMonth" in page_content
    assert "invoiced" in page_content
    assert "collected" in page_content
    assert "kpis" in page_content

    # التحقق من المخطط البياني Recharts
    assert "ResponsiveContainer" in page_content
    assert "BarChart" in page_content
    assert "Bar" in page_content
    assert "CartesianGrid" in page_content
    assert "XAxis" in page_content
    assert "YAxis" in page_content
    assert "Tooltip" in page_content
    assert "Legend" in page_content

    # التحقق من استدعاءات API والخطافات في نافذة إنشاء الفاتورة
    assert "practice.invoices.create" in dialog_content
    assert "api.clients.list" in dialog_content
    assert "api.matters.list" in dialog_content
    assert "useResource" in dialog_content
    assert "useOrg" in dialog_content
    assert "useFormat" in dialog_content
    assert "useTranslator" in dialog_content
    assert "useState" in dialog_content

    # التحقق من حسابات بنود الفاتورة والضرائب
    assert "totalsOf" in dialog_content
    assert "fromPiastres" in dialog_content
    assert "taxRatePercent" in dialog_content
    assert "tax_rate" in dialog_content
