"""
اختبارات التحقق الصارم من إعادة رسم الشاشات المقفولة خلف features.ts على مكتبة السجل (T-053).
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB_APP = REPO_ROOT / "web" / "app"

FEATURE_SCREENS = [
    WEB_APP / "accounting" / "page.tsx",
    WEB_APP / "ai-assistant" / "page.tsx",
    WEB_APP / "automation" / "page.tsx",
    WEB_APP / "contract-review" / "page.tsx",
    WEB_APP / "crm" / "page.tsx",
    WEB_APP / "crm" / "[id]" / "page.tsx",
    WEB_APP / "knowledge-base" / "page.tsx",
    WEB_APP / "knowledge-base" / "[id]" / "page.tsx",
    WEB_APP / "legal-research" / "page.tsx",
    WEB_APP / "messages" / "page.tsx",
    WEB_APP / "reports" / "page.tsx",
]


def test_feature_flagged_screens_use_sijil_ui_and_no_astryx_components():
    """التحقق من اعتماد الشاشات المقفولة على مكونات السجل وخلوها من مكونات Astryx Core العرضية."""
    forbidden_astryx = [
        "@astryxdesign/core/Heading",
        "@astryxdesign/core/Text",
        "@astryxdesign/core/Card",
        "@astryxdesign/core/Button",
        "@astryxdesign/core/Badge",
        "@astryxdesign/core/Avatar",
        "@astryxdesign/core/List",
        "@astryxdesign/core/Link",
        "@astryxdesign/core/EmptyState",
        "@astryxdesign/core/Layout",
        "@astryxdesign/core/Stack",
        "@astryxdesign/core/Grid",
        "@astryxdesign/core/TextInput",
        "@astryxdesign/core/Dialog",
        "@astryxdesign/core/Alert",
        "@astryxdesign/core/Banner",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/Switch",
        "@astryxdesign/core/Chat",
        "@astryxdesign/core/ProgressBar",
        "@astryxdesign/core/Table",
        "@astryxdesign/core/SegmentedControl",
        "@astryxdesign/core/StatusDot",
    ]

    for screen in FEATURE_SCREENS:
        assert screen.exists(), f"الشاشة غير موجودة: {screen}"
        content = screen.read_text(encoding="utf-8")
        for forbidden in forbidden_astryx:
            assert forbidden not in content, f"تم العثور على مكون محظور في {screen.relative_to(WEB_APP)}: {forbidden}"


def test_zero_inlined_colors_in_feature_flagged_screens():
    """التحقق من انعدام الألوان المدمجة (#hex أو oklch) في كل الشاشات المقفولة."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    for screen in FEATURE_SCREENS:
        content = screen.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, f"تم العثور على ألوان مدمجة في {screen.relative_to(WEB_APP)}: {matches}"


def test_single_api_convention_in_feature_flagged_screens():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading على الأزرار والشارات."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    for screen in FEATURE_SCREENS:
        content = screen.read_text(encoding="utf-8")
        match = button_badge_pattern.search(content)
        assert not match, f"تم العثور على خاصية مزدوجة ملغاة في {screen.relative_to(WEB_APP)}: {match.group(0)}"
