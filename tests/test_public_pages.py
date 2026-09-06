"""
اختبارات التحقق الصارم من إعادة رسم الصفحات العامة والمشتركة على مكتبة السجل (T-053).
تشمل:
- web/app/article/[id]/page.tsx
- web/app/library/[id]/page.tsx
- web/app/plans/page.tsx
- web/app/subscribe/page.tsx
- web/app/invite/[token]/page.tsx
- web/app/sign-in/[[...sign-in]]/page.tsx
- web/app/sign-up/[[...sign-up]]/page.tsx
- web/components/AuthFrame.tsx
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB_APP = REPO_ROOT / "web" / "app"

PUBLIC_FILES = [
    WEB_APP / "article" / "[id]" / "page.tsx",
    WEB_APP / "library" / "[id]" / "page.tsx",
    WEB_APP / "plans" / "page.tsx",
    WEB_APP / "subscribe" / "page.tsx",
    WEB_APP / "invite" / "[token]" / "page.tsx",
    WEB_APP / "sign-in" / "[[...sign-in]]" / "page.tsx",
    WEB_APP / "sign-up" / "[[...sign-up]]" / "page.tsx",
    REPO_ROOT / "web" / "components" / "AuthFrame.tsx",
]


def test_public_pages_use_sijil_ui_library_and_no_astryx_visual_components():
    """التحقق من خلو الصفحات العامة من أي مكونات بصرية تابعة لـ Astryx Core."""
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
        "@astryxdesign/core/Banner",
        "@astryxdesign/core/Alert",
        "@astryxdesign/core/Selector",
        "@astryxdesign/core/Icon",
    ]

    for file_path in PUBLIC_FILES:
        assert file_path.exists(), f"الملف غير موجود: {file_path}"
        content = file_path.read_text(encoding="utf-8")
        for forbidden in forbidden_astryx:
            assert forbidden not in content, f"تم العثور على استيراد غير مسموح به في {file_path.name}: {forbidden}"


def test_zero_inlined_colors_in_public_pages():
    """التحقق من انعدام الألوان المدمجة (#hex أو oklch حرفي) في الصفحات العامة."""
    color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}|oklch\(")
    for file_path in PUBLIC_FILES:
        content = file_path.read_text(encoding="utf-8")
        matches = color_pattern.findall(content)
        assert not matches, f"تم العثور على ألوان مدمجة في {file_path.name}: {matches}"


def test_single_api_convention_in_public_pages():
    """التحقق من توحيد واجهة المكونات وعدم استخدام label أو isLoading."""
    button_badge_pattern = re.compile(r"<(Button|Badge)[^>]*\b(label|isLoading)=")
    for file_path in PUBLIC_FILES:
        content = file_path.read_text(encoding="utf-8")
        match = button_badge_pattern.search(content)
        assert not match, f"تم العثور على خاصية ملغاة في {file_path.name}: {match.group(0)}"


def test_public_pages_preserve_core_logic_and_handlers():
    """التحقق من الحفاظ الصارم على منطق التوثيق والاشتراكات."""
    invite_content = (WEB_APP / "invite" / "[token]" / "page.tsx").read_text(encoding="utf-8")
    assert "previewInvite" in invite_content
    assert "acceptInvite" in invite_content
    assert "setOrganizationId" in invite_content

    signin_content = (WEB_APP / "sign-in" / "[[...sign-in]]" / "page.tsx").read_text(encoding="utf-8")
    assert "signIn.password" in signin_content
    assert "signIn.finalize" in signin_content
    assert "signIn.mfa.verifyEmailCode" in signin_content
    assert "signIn.resetPasswordEmailCode" in signin_content

    signup_content = (WEB_APP / "sign-up" / "[[...sign-up]]" / "page.tsx").read_text(encoding="utf-8")
    assert "signUp.password" in signup_content
    assert "signUp.finalize" in signup_content
    assert "signUp.verifications" in signup_content

    subscribe_content = (WEB_APP / "subscribe" / "page.tsx").read_text(encoding="utf-8")
    assert "api.organization" in subscribe_content
    assert "useOrg" in subscribe_content
    assert "useResource" in subscribe_content
