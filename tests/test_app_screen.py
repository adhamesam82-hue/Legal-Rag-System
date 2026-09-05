"""
اختبارات التحقق الصارم من إعادة رسم شاشة المحادثة والتطبيق الرئيسي (app/page.tsx) ومكون GroundedAnswer على مكتبة السجل (T-053).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
APP_PAGE = REPO_ROOT / "web" / "app" / "app" / "page.tsx"
GROUNDED_ANSWER = REPO_ROOT / "web" / "components" / "GroundedAnswer.tsx"
CHAT_COMPONENT = REPO_ROOT / "web" / "components" / "ui" / "Chat.tsx"


def test_app_page_uses_sijil_ui_library_and_no_astryx_components():
    """التحقق من اعتماد شاشة التطبيق على components/ui والتخلص من مكونات Astryx Core العرضية."""
    assert APP_PAGE.exists()
    content = APP_PAGE.read_text(encoding="utf-8")

    # التحقق من استيراد مكونات السجل
    assert '@/components/ui/Chat' in content
    assert '@/components/ui/Alert' in content
    assert '@/components/ui/EmptyState' in content
    assert '@/components/ui/Skeleton' in content
    assert '@/components/ui/Icon' in content

    # منع استيراد مكونات Astryx المرئية القديمة
    forbidden_astryx = [
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Banner",
        "@astryxdesign/core/Spinner",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Chat",
    ]
    for forbidden in forbidden_astryx:
        assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في app/page.tsx: {forbidden}"


def test_grounded_answer_uses_sijil_ui_library():
    """التحقق من اعتماد GroundedAnswer على مكونات السجل والتزامه بالواجهة الموحدة."""
    assert GROUNDED_ANSWER.exists()
    content = GROUNDED_ANSWER.read_text(encoding="utf-8")

    assert '@/components/ui/Alert' in content
    assert '@/components/ui/Card' in content
    assert '@/components/ui/Badge' in content
    assert '@/components/ui/Icon' in content

    # منع وجود label على Badge
    assert not re.search(r"<Badge[^>]*\blabel=", content), "تم العثور على خاصية label ملغاة على Badge في GroundedAnswer"

    forbidden = ["@astryxdesign/core/Banner", "@astryxdesign/core/Card", "@astryxdesign/core/Badge", "@astryxdesign/core/Text"]
    for f in forbidden:
        assert f not in content, f"تم العثور على استيراد Astryx قديم في GroundedAnswer: {f}"


def test_zero_inlined_colors_in_app_surfaces():
    """التحقق من عدم وجود أي ألوان مدمجة (#hex أو oklch) في شاشة التطبيق ومكونات المحادثة."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")

    for path in [APP_PAGE, GROUNDED_ANSWER, CHAT_COMPONENT]:
        content = path.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, f"تم العثور على ألوان مدمجة في {path.name}: {matches}"


def test_app_data_binding_and_handlers_preserved():
    """التحقق الصارم من الحفاظ على دوال وخطافات منطق المحادثة والسؤال دون أي مساس."""
    content = APP_PAGE.read_text(encoding="utf-8")

    # التحقق من وجود نداء api.ask
    assert "api.ask(" in content
    assert 'jurisdiction: "EG"' in content
    assert "question: trimmed" in content
    assert "useCorpusStats" in content
    assert "setTurns" in content
    assert "setPending" in content
    assert "GroundedAnswer" in content
