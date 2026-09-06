"""
اختبارات التحقق الصارم من إعادة رسم شاشة المستندات (documents/page.tsx) ومكوناتها التابعة على مكتبة السجل (T-053 / الموجة الرابعة).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCUMENTS_PAGE = REPO_ROOT / "web" / "app" / "documents" / "page.tsx"
DOCUMENTS_COMPONENTS_DIR = REPO_ROOT / "web" / "components" / "documents"
DOC_TYPE_DIALOG = DOCUMENTS_COMPONENTS_DIR / "DocTypeDialog.tsx"
DOCUMENT_CARD = DOCUMENTS_COMPONENTS_DIR / "DocumentCard.tsx"
MANAGE_TAGS_DIALOG = DOCUMENTS_COMPONENTS_DIR / "ManageTagsDialog.tsx"
TAGS_DIALOG = DOCUMENTS_COMPONENTS_DIR / "TagsDialog.tsx"

ALL_TARGET_FILES = [
    DOCUMENTS_PAGE,
    DOC_TYPE_DIALOG,
    DOCUMENT_CARD,
    MANAGE_TAGS_DIALOG,
    TAGS_DIALOG,
]


def test_documents_files_exist():
    """التحقق من وجود صفحة المستندات وكافة مكوناتها التابعة."""
    for file_path in ALL_TARGET_FILES:
        assert file_path.exists(), f"الملف غير موجود: {file_path}"


def test_documents_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة المستندات ومكوناتها على components/ui والتخلص التام من مكونات Astryx Core البصرية."""
    page_content = DOCUMENTS_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل في صفحة المستندات
    assert "@/components/ui/Button" in page_content
    assert "@/components/ui/Badge" in page_content
    assert "@/components/ui/Input" in page_content
    assert "@/components/ui/Table" in page_content
    assert "@/components/ui/EmptyState" in page_content

    # قائمة المكونات البصرية الممنوعة من Astryx Core
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Icon",
        "@astryxdesign/core/List",
        "@astryxdesign/core/ListItem",
        "@astryxdesign/core/Link",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/MultiSelector",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/DateInput",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/Token",
        "@astryxdesign/core/TreeList",
        "@astryxdesign/core/Collapsible",
        "@astryxdesign/core/Table",
        "@astryxdesign/core/StatusDot",
        "@astryxdesign/core/Avatar",
        "@astryxdesign/core/SegmentedControl",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
        "@astryxdesign/core/Grid",
        "@astryxdesign/core/Divider",
    ]

    for file_path in ALL_TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        for forbidden in forbidden_astryx:
            assert forbidden not in content, (
                f"تم العثور على استيراد ممنوع من Astryx في {file_path.name}: {forbidden}"
            )


def test_zero_inlined_colors_in_documents_screen():
    """التحقق الصارم من عدم وجود أي ألوان مدمجة (#hex أو oklch حرفي) في شاشة المستندات ومكوناتها."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")

    for file_path in ALL_TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, (
            f"تم العثور على ألوان مدمجة في {file_path.name}: {matches}"
        )


def test_single_api_convention_in_documents_screen():
    """التحقق من توحيد واجهة المكونات (Single API) وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")

    for file_path in ALL_TARGET_FILES:
        content = file_path.read_text(encoding="utf-8")
        match = button_badge_pattern.search(content)
        assert not match, (
            f"تم العثور على خاصية مزدوجة ملغاة في {file_path.name}: {match.group(0)}"
        )


def test_documents_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على الخطافات وربط البيانات والمعالجات والتصفية الخماسية ووضعي العرض."""
    page_content = DOCUMENTS_PAGE.read_text(encoding="utf-8")

    # التحقق من نقاط النهاية وموارد الخادم
    assert "api.documents.list" in page_content
    assert "api.documents.facets" in page_content
    assert "api.matters.list" in page_content
    assert "api.clients.list" in page_content
    assert "api.documentTags.list" in page_content
    assert "practice.documents.upload" in page_content

    # التحقق من الخطافات الأساسية
    assert "useResource" in page_content
    assert "useOrg" in page_content
    assert "useMemberName" in page_content
    assert "useFormat" in page_content
    assert "useTranslator" in page_content
    assert "useDocTypeLabel" in page_content
    assert "useEnumLabel" in page_content
    assert "debouncedQuery" in page_content

    # التحقق من محاور التصفية الخماسية
    assert "view" in page_content
    assert "matterId" in page_content
    assert "clientId" in page_content
    assert "docType" in page_content
    assert "tagIds" in page_content

    # التحقق من وضعي العرض والتخزين المحلي
    assert "useViewMode" in page_content
    assert "useOpenGroups" in page_content
    assert "legalos-documents-view" in page_content
    assert "legalos-documents-tree-open" in page_content

    # التحقق من مكونات النوافذ التابعة
    assert "TagsDialog" in page_content
    assert "DocTypeDialog" in page_content
    assert "ManageTagsDialog" in page_content
    assert "DocumentCard" in page_content
    assert "fileIcon" in page_content


def test_document_subcomponents_logic_preserved():
    """التحقق من سلامة منطق معالجات ومكونات المستندات الفرعية."""
    doc_type_content = DOC_TYPE_DIALOG.read_text(encoding="utf-8")
    assert "practice.documents.update" in doc_type_content
    assert "doc_type" in doc_type_content

    card_content = DOCUMENT_CARD.read_text(encoding="utf-8")
    assert "useThumbnail" in card_content
    assert "useSeen" in card_content
    assert "fileIcon" in card_content
    assert "contentBlob" in card_content

    manage_tags_content = MANAGE_TAGS_DIALOG.read_text(encoding="utf-8")
    assert "documentTags.create" in manage_tags_content
    assert "documentTags.update" in manage_tags_content
    assert "documentTags.remove" in manage_tags_content
    assert "confirmDelete" in manage_tags_content

    tags_dialog_content = TAGS_DIALOG.read_text(encoding="utf-8")
    assert "practice.documents.setTags" in tags_dialog_content
    assert "TagToken" in tags_dialog_content
