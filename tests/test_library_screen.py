"""
اختبارات التحقق الصارم من إعادة رسم شاشة المكتبة القانونية (library/page.tsx) على مكتبة السجل (T-053).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
LIBRARY_PAGE = REPO_ROOT / "web" / "app" / "library" / "page.tsx"


def test_library_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة المكتبة على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert LIBRARY_PAGE.exists()
    content = LIBRARY_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل الأساسية
    assert '@/components/ui/Card' in content
    assert '@/components/ui/Badge' in content
    assert '@/components/ui/Alert' in content
    assert '@/components/ui/Input' in content
    assert '@/components/ui/EmptyState' in content
    assert '@/components/ui/Skeleton' in content
    assert '@/components/ui/Icon' in content

    # منع استيراد مكونات Astryx المرئية التي حلت محلها مكونات السجل
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Banner",
        "@astryxdesign/core/Spinner",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في library/page.tsx: {forbidden}"


def test_zero_inlined_colors_in_library_screen():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة المكتبة."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    content = LIBRARY_PAGE.read_text(encoding="utf-8")
    matches = color_pattern.findall(content)
    assert not matches, f"تم العثور على ألوان مدمجة في library/page.tsx: {matches}"


def test_single_api_convention_in_library_screen():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label على الشارات."""
    content = LIBRARY_PAGE.read_text(encoding="utf-8")
    badge_label_pattern = re.compile(r"<Badge[^>]*\blabel=")
    assert not badge_label_pattern.search(content), "تم العثور على خاصية label ملغاة على Badge في library/page.tsx"


def test_library_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق المكتبة دون أي مساس."""
    content = LIBRARY_PAGE.read_text(encoding="utf-8")

    # التحقق من وجود نداء api.instruments("EG")
    assert re.search(r"api\s*\.\s*instruments\(\s*[\"']EG[\"']\s*\)", content)
    assert "setInstruments" in content
    assert "visible" in content
    assert "totalArticles" in content
    assert "instrument.reference" in content
    assert "instrument.article_count" in content
