"""
اختبارات التحقق الصارم من إعادة رسم شاشة الموكلين (clients/page.tsx) ومكوناتها على مكتبة السجل (T-053 / الموجة الثانية).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CLIENTS_PAGE = REPO_ROOT / "web" / "app" / "clients" / "page.tsx"


def test_clients_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة الموكلين على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert CLIENTS_PAGE.exists()
    content = CLIENTS_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل
    assert '@/components/ui/Table' in content
    assert '@/components/ui/Button' in content
    assert '@/components/ui/Badge' in content
    assert '@/components/ui/Input' in content
    assert '@/components/ui/Select' in content
    assert '@/components/ui/EmptyState' in content
    assert '@/components/ui/Alert' in content
    assert '@/components/ui/Dialog' in content
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
        "@astryxdesign/core/TextArea",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في clients/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_clients_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة الموكلين."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = CLIENTS_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في clients/page.tsx: {matches}"


def test_single_api_convention_in_clients_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    content = CLIENTS_PAGE.read_text(encoding="utf-8")
    match = button_badge_pattern.search(content)
    assert not match, f"تم العثور على خاصية مزدوجة ملغاة في clients/page.tsx: {match.group(0)}"


def test_clients_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق الموكلين دون أي مساس."""
    content = CLIENTS_PAGE.read_text(encoding="utf-8")

    # التحقق من استدعاءات API ونقاط النهاية الثلاث
    assert "api.clients.list" in content
    assert "api.matters.list" in content
    assert "api.activity" in content
    assert "practice.clients.create" in content

    # التحقق من الحالات الافتراضية للفلاتر
    assert 'useState<string>("all")' in content or "useState('all')" in content or 'useState("all")' in content
    assert "debouncedQuery" in content
    assert "rows" in content
    assert "useResource" in content
    assert "useOrg" in content
