"""
اختبارات التحقق من إعادة رسم شاشة البحث (search/page.tsx) ومكون ArticleCard على مكتبة السجل (T-053).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
SEARCH_PAGE = REPO_ROOT / "web" / "app" / "search" / "page.tsx"
ARTICLE_CARD = REPO_ROOT / "web" / "components" / "ArticleCard.tsx"


def test_search_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة البحث على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert SEARCH_PAGE.exists()
    content = SEARCH_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل الأساسية
    assert '@/components/ui/Card' in content
    assert '@/components/ui/Button' in content
    assert '@/components/ui/Input' in content
    assert '@/components/ui/Switch' in content
    assert '@/components/ui/Alert' in content
    assert '@/components/ui/Badge' in content
    assert '@/components/ui/EmptyState' in content
    assert '@/components/ui/Skeleton' in content
    assert '@/components/ui/Icon' in content

    # منع استيراد مكونات Astryx المرئية التي حلت محلها مكونات السجل
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Banner",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Spinner",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/Switch",
        "@astryxdesign/core/EmptyState",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في search/page.tsx: {forbidden}"


def test_article_card_uses_sijil_ui_library():
    """التحقق من اعتماد مكون ArticleCard على مكونات السجل."""
    assert ARTICLE_CARD.exists()
    content = ARTICLE_CARD.read_text(encoding="utf-8")

    assert '@/components/ui/Card' in content
    assert '@/components/ui/Badge' in content
    assert '@/components/ui/Button' in content

    forbidden = ["@astryxdesign/core/Card", "@astryxdesign/core/Badge", "@astryxdesign/core/Button", "@astryxdesign/core/Text"]
    for f in forbidden:
        assert f not in content, f"تم العثور على استيراد Astryx قديم في ArticleCard: {f}"


def test_zero_inlined_colors_in_search_surfaces():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة البحث وبطاقة المقال."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")

    for path in [SEARCH_PAGE, ARTICLE_CARD]:
        content = path.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, f"تم العثور على ألوان مدمجة في {path.name}: {matches}"


def test_search_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق البحث دون أي مساس."""
    content = SEARCH_PAGE.read_text(encoding="utf-8")

    # التحقق من وجود نداء api.search مع كافة المعاملات
    assert "api.search(" in content
    assert 'jurisdiction: "EG"' in content
    assert "query: query.trim()" in content
    assert "expand" in content
    assert "limit: 15" in content

    # التحقق من ربط النتائج وتمريرها إلى ArticleCard
    assert "results?.articles.map(" in content
    assert "<ArticleCard" in content
    assert "article={article}" in content
    assert "rank={i + 1}" in content
    assert "showScore" in content
