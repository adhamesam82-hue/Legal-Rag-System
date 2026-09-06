"""
اختبارات التحقق الصارم من إعادة رسم شاشة تفاصيل القضية (matters/[id]/page.tsx)
ومكوناتها التابعة في (components/matter/*.tsx) على مكتبة السجل (T-053 / الموجة الرابعة).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
MATTER_DETAIL_PAGE = REPO_ROOT / "web" / "app" / "matters" / "[id]" / "page.tsx"
MATTER_COMPONENTS_DIR = REPO_ROOT / "web" / "components" / "matter"

TARGET_COMPONENT_FILES = [
    MATTER_COMPONENTS_DIR / "shared.tsx",
    MATTER_COMPONENTS_DIR / "FinancialStrip.tsx",
    MATTER_COMPONENTS_DIR / "DashboardTab.tsx",
    MATTER_COMPONENTS_DIR / "CaseFile.tsx",
    MATTER_COMPONENTS_DIR / "CreateCaseDialog.tsx",
    MATTER_COMPONENTS_DIR / "SubCases.tsx",
    MATTER_COMPONENTS_DIR / "ActivitiesTab.tsx",
    MATTER_COMPONENTS_DIR / "CalendarTab.tsx",
    MATTER_COMPONENTS_DIR / "CommunicationsTab.tsx",
    MATTER_COMPONENTS_DIR / "CustomFieldsTab.tsx",
    MATTER_COMPONENTS_DIR / "FinanceTabs.tsx",
]

ALL_TARGET_FILES = [MATTER_DETAIL_PAGE] + TARGET_COMPONENT_FILES

FORBIDDEN_ASTRYX_COMPONENTS = [
    "@astryxdesign/core/Heading",
    "@astryxdesign/core/Text",
    "@astryxdesign/core/Card",
    "@astryxdesign/core/Button",
    "@astryxdesign/core/Badge",
    "@astryxdesign/core/Icon",
    "@astryxdesign/core/Avatar",
    "@astryxdesign/core/List",
    "@astryxdesign/core/ListItem",
    "@astryxdesign/core/TabList",
    "@astryxdesign/core/Tab",
    "@astryxdesign/core/TabMenu",
    "@astryxdesign/core/TextInput",
    "@astryxdesign/core/TextArea",
    "@astryxdesign/core/Selector",
    "@astryxdesign/core/DateInput",
    "@astryxdesign/core/NumberInput",
    "@astryxdesign/core/Link",
    "@astryxdesign/core/Dialog",
    "@astryxdesign/core/EmptyState",
    "@astryxdesign/core/SegmentedControl",
    "@astryxdesign/core/Layout",
    "@astryxdesign/core/Stack",
    "@astryxdesign/core/Grid",
    "@astryxdesign/core/Divider",
    "@astryxdesign/core/Collapsible",
    "@astryxdesign/core/MetadataList",
]


def test_matter_detail_files_exist():
    """التحقق من وجود صفحة تفاصيل القضية وكافة مكونات مساحة العمل التابعة (١٢ ملفاً)."""
    for file_path in ALL_TARGET_FILES:
        assert file_path.exists(), f"الملف المطلوب غير موجود: {file_path}"


def test_matter_detail_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد الشاشة ومكوناتها على مكتبة السجل والتخلص التام من أي مكون بصري من Astryx."""
    page_content = MATTER_DETAIL_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل الأساسية في صفحة تفاصيل القضية
    assert "@/components/ui/Button" in page_content
    assert "@/components/ui/Badge" in page_content
    assert "@/components/ui/Input" in page_content
    assert "@/components/ui/Select" in page_content
    assert "@/components/ui/Dialog" in page_content
    assert "@/components/ui/EmptyState" in page_content
    assert "@/components/ui/Icon" in page_content

    # التحقق من خلو كافة الملفات من استيراد أي مكون بصري من Astryx
    for file_path in ALL_TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        for forbidden in FORBIDDEN_ASTRYX_COMPONENTS:
            assert forbidden not in content, (
                f"تم العثور على استيراد بصري ممنوع من Astryx في {file_path.name}: {forbidden}"
            )


def test_zero_inlined_colors_in_matter_detail_screen():
    """التحقق الصارم من عدم وجود أي ألوان مدمجة (#hex أو oklch حرفي) في شاشة تفاصيل القضية ومكوناتها."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")

    for file_path in ALL_TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, (
            f"تم العثور على ألوان مدمجة في {file_path.name}: {matches}"
        )


def test_single_api_convention_in_matter_detail_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على Button و Badge."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")

    for file_path in ALL_TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        match = button_badge_pattern.search(content)
        assert not match, (
            f"تم العثور على خاصية ملغاة في {file_path.name}: {match.group(0)}"
        )


def test_matter_detail_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على اللقطة الموحدة WorkspaceData وكافة الـ 20 مورداً، والتبويبات الـ 11."""
    page_content = MATTER_DETAIL_PAGE.read_text(encoding="utf-8")

    # التحقق من تحميل كافة موارد اللقطة الموحدة
    expected_resources = [
        "api.matters.get",
        "api.matters.case",
        "api.matters.contacts",
        "api.clients.get",
        "api.matters.customFields",
        "api.matters.conflictChecks",
        "api.documents.list",
        "api.tasks.list",
        "api.time.list",
        "api.expenses.list",
        "api.invoices.list",
        "api.matters.notes",
        "api.matters.timeline",
        "api.hearings.list",
        "api.activity",
        "api.matters.trustBalance",
        "api.trust.transactions",
        "api.trust.accounts",
        "api.communications.list",
        "api.matters.threads",
        "api.matters.portals",
    ]
    for res in expected_resources:
        assert res in page_content, f"المورد المفقود في صفحة تفاصيل القضية: {res}"

    # التحقق من الخطافات والعمليات
    assert "useResource" in page_content
    assert "useOrg" in page_content
    assert "useMemberName" in page_content
    assert "useFormat" in page_content
    assert "useEnumLabel" in page_content
    assert "useTranslator" in page_content
    assert "practice.matters.update" in page_content
    assert "practice.matters.duplicate" in page_content
    assert "practice.matters.addNote" in page_content
    assert "practice.tasks.create" in page_content
    assert "practice.tasks.update" in page_content

    # التحقق من التبويبات الـ 11 (7 رئيسية و 4 إضافية)
    expected_tabs = [
        "dashboard",
        "activities",
        "calendar",
        "communications",
        "documents",
        "tasks",
        "bills",
        "notes",
        "customFields",
        "transactions",
        "timeline",
    ]
    for tab in expected_tabs:
        assert f'value: "{tab}"' in page_content or f'tab === "{tab}"' in page_content, (
            f"التبويب مفقود: {tab}"
        )

    # التحقق من المكونات التمييزية والشرطية
    assert "MatterTypeBadge" in page_content
    assert "MatterStatusMark" in page_content
    assert "FinancialStrip" in page_content


def test_matter_subcomponents_logic_preserved():
    """التحقق الصارم من الحفاظ على منطق المكونات الفرعية والعمليات المالية والنزاعات."""
    # FinancialStrip
    strip_content = (MATTER_COMPONENTS_DIR / "FinancialStrip.tsx").read_text(encoding="utf-8")
    assert "financialsOf" in strip_content
    assert "onQuickBill" in strip_content
    assert "onOpenBills" in strip_content
    assert "onRecordDeposit" in strip_content

    # CaseFile & SubCases
    casefile_content = (MATTER_COMPONENTS_DIR / "CaseFile.tsx").read_text(encoding="utf-8")
    assert "CASE_FILE_FIELDS" in casefile_content
    assert "useOpenSections" in casefile_content
    assert "practice.cases.update" in casefile_content

    subcases_content = (MATTER_COMPONENTS_DIR / "SubCases.tsx").read_text(encoding="utf-8")
    assert "PrimaryBadge" in subcases_content
    assert "ParentLine" in subcases_content
    assert "practice.cases.update" in subcases_content

    # ActivitiesTab
    activities_content = (MATTER_COMPONENTS_DIR / "ActivitiesTab.tsx").read_text(encoding="utf-8")
    assert "practice.time.create" in activities_content
    assert "practice.expenses.create" in activities_content

    # FinanceTabs
    finance_content = (MATTER_COMPONENTS_DIR / "FinanceTabs.tsx").read_text(encoding="utf-8")
    assert "practice.invoices.generate" in finance_content
    assert "practice.trust.createAccount" in finance_content
    assert "practice.trust.record" in finance_content

    # CommunicationsTab
    comms_content = (MATTER_COMPONENTS_DIR / "CommunicationsTab.tsx").read_text(encoding="utf-8")
    assert "practice.communications.log" in comms_content
    assert "practice.matters.startThread" in comms_content
    assert "practice.portals.reply" in comms_content
    assert "practice.matters.invitePortal" in comms_content

    # CustomFieldsTab
    custom_content = (MATTER_COMPONENTS_DIR / "CustomFieldsTab.tsx").read_text(encoding="utf-8")
    assert "practice.matters.setCustomField" in custom_content
    assert "customFields.create" in custom_content
    assert "customFields.remove" in custom_content
