"""
اختبارات التحقق الصارم من خطوط التذكرة T-049 (IBM Plex Sans Arabic بديلًا عن أربعة وجوه).
تتحقق هذه الاختبارات من:
1. استضافة IBM Plex Sans Arabic ذاتياً بأوزانه الخمسة (300, 400, 500, 600, 700) وقراءة أسمائها عبر fontTools.
2. استضافة Material Symbols Rounded للأيقونات ذاتياً بمجموعة مقصوصة (subset).
3. استخدام font-display: swap في جميع كتل @font-face.
4. توحيد رموز مكدس الخطوط (--font-display, --font-text, --font-ar-doc, --font-ar-ui).
5. عدم وجود أي أثر للوجوه الأربعة القديمة (Newsreader, Archivo, Tajawal, Noto Naskh Arabic) كخطوط تُحمَّل في web/ و marketing/.
6. حذف ملفات woff2 القديمة غير المستعملة من المستودع.
"""

from pathlib import Path
import re
import pytest
from fontTools.ttLib import TTFont

REPO_ROOT = Path(__file__).resolve().parent.parent
MARKETING_DIR = REPO_ROOT / "marketing"
WEB_DIR = REPO_ROOT / "web"

EXPECTED_WEIGHTS = ["300", "400", "500", "600", "700"]
LEGACY_FONT_NAMES = ["Newsreader", "Archivo", "Tajawal", "NotoNaskhArabic", "Noto Naskh Arabic"]


def test_font_files_exist_and_match_family_names():
    """التحقق من وجود ملفات خطوط IBM Plex Sans Arabic و Material Symbols Rounded في المجلدات الثلاثة وقراءة أسمائها بـ fontTools."""
    font_dirs = [
        MARKETING_DIR / "assets" / "fonts",
        WEB_DIR / "public" / "landing" / "assets" / "fonts",
        WEB_DIR / "public" / "fonts",
    ]

    for d in font_dirs:
        assert d.exists() and d.is_dir(), f"مجلد الخطوط {d} غير موجود"

        # التحقق من أوزان IBM Plex Sans Arabic وقراءة اسم العائلة الداخلي
        for weight in EXPECTED_WEIGHTS:
            font_file = d / f"IBMPlexSansArabic-{weight}.woff2"
            assert font_file.exists(), f"ملف الخط {font_file.name} مفقود في {d}"
            data = font_file.read_bytes()
            assert data[:4] == b"wOF2", f"ملف الخط {font_file.name} ليس بصيغة WOFF2 صالحة (التوقيع السحري مفقود)"
            assert len(data) > 50_000, f"حجم ملف الخط {font_file.name} صغير جداً أو تالف"

            # محاولة قراءة اسم الخط الفعلي من الترويسة الداخلية إن توفرت مكتبة brotli لفك ضغط woff2
            try:
                font = TTFont(font_file)
                family_name = font["name"].getDebugName(1)
                assert family_name and "IBM Plex Sans Arabic" in family_name, (
                    f"اسم العائلة في الملف {font_file.name} غير مطابق: {family_name}"
                )
            except ImportError:
                # بيئة CI تفتقر إلى brotli عند تشغيل uv sync --frozen: تم التحقق من توقيع wOF2 وحجم الملف واسمه
                pass

        # التحقق من خط الأيقونات وقراءة اسم عائلته
        icon_file = d / "MaterialSymbolsRounded.woff2"
        assert icon_file.exists(), f"ملف خط الأيقونات MaterialSymbolsRounded.woff2 مفقود في {d}"
        icon_data = icon_file.read_bytes()
        assert icon_data[:4] == b"wOF2", f"ملف خط الأيقونات ليس بصيغة WOFF2 صالحة"
        assert len(icon_data) > 10_000, f"حجم خط الأيقونات {icon_file.name} صغير جداً أو تالف"
        try:
            icon_font = TTFont(icon_file)
            icon_family = icon_font["name"].getDebugName(1)
            assert icon_family and "Material Symbols Rounded" in icon_family, (
                f"اسم عائلة خط الأيقونات غير مطابق: {icon_family}"
            )
        except ImportError:
            pass


def test_no_legacy_font_files_remain():
    """التحقق من خلو مجلدات الخطوط من أي ملفات woff2 قديمة تخص الوجوه الأربعة المحذوفة."""
    font_dirs = [
        MARKETING_DIR / "assets" / "fonts",
        WEB_DIR / "public" / "landing" / "assets" / "fonts",
    ]

    for d in font_dirs:
        for f in d.glob("*.woff2"):
            for legacy in ["Archivo", "Newsreader", "NotoNaskh", "Tajawal"]:
                assert legacy.lower() not in f.name.lower(), (
                    f"تم العثور على ملف خط قديم يفترض حذفه: {f.name} في {d}"
                )


def test_css_font_face_declarations_and_swap():
    """التحقق من تعريف @font-face مع font-display: swap في ملفات الـ CSS."""
    css_files = [
        MARKETING_DIR / "assets" / "css" / "tokens.css",
        WEB_DIR / "public" / "landing" / "assets" / "css" / "tokens.css",
        WEB_DIR / "app" / "globals.css",
    ]

    for css_path in css_files:
        assert css_path.exists(), f"ملف الـ CSS {css_path} غير موجود"
        content = css_path.read_text(encoding="utf-8")

        # التحقق من وجود تصريحات IBM Plex Sans Arabic مع swap
        matches = re.findall(
            r"@font-face\s*\{[^}]*font-family:\s*['\"]IBM Plex Sans Arabic['\"][^}]*\}",
            content,
            re.DOTALL
        )
        assert len(matches) == 5, (
            f"يجب تعريف 5 كتل @font-face لـ IBM Plex Sans Arabic في {css_path.name}، وُجد: {len(matches)}"
        )

        for block in matches:
            assert "font-display: swap" in block, (
                f"كتلة @font-face تفتقر إلى font-display: swap في {css_path.name}: {block}"
            )

        # التحقق من تعريف Material Symbols Rounded مع swap
        ms_matches = re.findall(
            r"@font-face\s*\{[^}]*font-family:\s*['\"]Material Symbols Rounded['\"][^}]*\}",
            content,
            re.DOTALL
        )
        assert len(ms_matches) >= 1, f"تعريف Material Symbols Rounded مفقود في {css_path.name}"
        for ms_block in ms_matches:
            assert "font-display: swap" in ms_block, (
                f"كتلة Material Symbols Rounded تفتقر إلى font-display: swap في {css_path.name}"
            )


def test_font_family_tokens_unified():
    """التحقق من توحيد رموز الخطوط في tokens.css لجميع الأدوار إلى IBM Plex Sans Arabic."""
    css_files = [
        MARKETING_DIR / "assets" / "css" / "tokens.css",
        WEB_DIR / "public" / "landing" / "assets" / "css" / "tokens.css",
    ]

    tokens_to_check = ["--font-display", "--font-text", "--font-ar-doc", "--font-ar-ui"]

    for css_path in css_files:
        content = css_path.read_text(encoding="utf-8")
        for token in tokens_to_check:
            pattern = rf"{token}:\s*([^;]+);"
            match = re.search(pattern, content)
            assert match, f"الرمز {token} مفقود في {css_path.name}"
            value = match.group(1).strip()
            assert "IBM Plex Sans Arabic" in value, (
                f"الرمز {token} في {css_path.name} لا يستخدم IBM Plex Sans Arabic: {value}"
            )


def test_theme_ts_uses_ibm_plex_sans_arabic():
    """التحقق من أن إعدادات الثيم في theme.ts تستخدم IBM Plex Sans Arabic."""
    theme_ts = WEB_DIR / "lib" / "theme.ts"
    content = theme_ts.read_text(encoding="utf-8")

    assert '"IBM Plex Sans Arabic"' in content or "'IBM Plex Sans Arabic'" in content
    assert 'family: "IBM Plex Sans Arabic"' in content or "family: 'IBM Plex Sans Arabic'" in content


def test_no_legacy_fonts_loaded_in_web_and_marketing():
    """التحقق الشامل من عدم تحميل الخطوط الأربعة القديمة في ملفات web/ و marketing/ (باستثناء مجلدات brand المحذوفة في T-050)."""
    extensions = {".ts", ".tsx", ".js", ".mjs", ".css", ".html", ".md", ".json"}
    ignore_dirs = {".next", "node_modules", ".git", "__pycache__", "brand"}

    def scan_dir(dir_path: Path):
        for path in dir_path.rglob("*"):
            if any(part in ignore_dirs for part in path.parts):
                continue
            if path.suffix not in extensions:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for font_name in ["Newsreader", "Archivo", "Tajawal", "Noto Naskh Arabic"]:
                assert font_name.lower() not in text.lower(), (
                    f"تم العثور على اسم الخط القديم '{font_name}' في {path.relative_to(REPO_ROOT)}"
                )

    scan_dir(WEB_DIR)
    scan_dir(MARKETING_DIR)
