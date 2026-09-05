"""
اختبارات التحقق الصارم من نقل الموقع التسويقي وصفحة الهبوط إلى هوية «السِّجل» (التذكرة T-055).

تتحقق هذه الاختبارات من:
1. خلو ملفات marketing/ و web/public/landing/ تماماً من أي بقايا لهوية الختم القديمة (#A6301F, #12161C, seal, Stamp).
2. وجود رموز هوية السجل الموحدة sijil-tokens.css ومطابقتها لمصدر الحقيقة web/lib/theme.ts واستيرادها في tokens.css.
3. خلو الترجمة العربية في marketing/i18n/ar.json من أي سلاسل مفقودة ونجاح فحص scripts/build-ar.py --check.
4. مطابقة وتزامن ملفات صفحة الهبوط في web/public/landing/ مع ملفات marketing/.
5. توثيق هوية «السِّجل» ولوحتها وخطوطها في وثائق التصميم DESIGN.md و README.md.
"""

import pathlib
import re
import subprocess
import sys
import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
MARKETING_DIR = REPO_ROOT / "marketing"
LANDING_DIR = REPO_ROOT / "web" / "public" / "landing"


def test_no_seal_stamp_or_legacy_hex_residues():
    """AC1: التحقق الصارم من عدم وجود A6301F ولا 12161C ولا seal ولا Stamp في marketing/ و web/public/landing/."""
    # نمط regex دقيق يطابق الرموز والأكواد الممنوعة
    forbidden_pattern = re.compile(r"(?i)(A6301F|12161C|#seal|seal|stamp)")

    # امتدادات الملفات المراد فحصها
    extensions = {".html", ".css", ".js", ".json", ".svg", ".md", ".py"}
    ignore_dirs = {"__pycache__", ".git"}

    found_violations = []

    for base_dir in [MARKETING_DIR, LANDING_DIR]:
        assert base_dir.exists(), f"المجلد {base_dir} غير موجود"
        for path in base_dir.rglob("*"):
            if any(part in ignore_dirs for part in path.parts):
                continue
            if not path.is_file() or path.suffix not in extensions:
                continue

            text = path.read_text(encoding="utf-8", errors="ignore")
            matches = forbidden_pattern.findall(text)
            if matches:
                found_violations.append(f"{path.relative_to(REPO_ROOT)}: {set(matches)}")

    assert not found_violations, (
        f"تم العثور على مراجع لهوية الختم القديمة في الملفات التالية:\n" + "\n".join(found_violations)
    )


def test_sijil_tokens_exist_and_single_source_of_truth():
    """AC2: التحقق من وجود sijil-tokens.css ومطابقتها التامة لـ theme.ts واستيرادها في tokens.css."""
    tokens_css = MARKETING_DIR / "assets" / "css" / "sijil-tokens.css"
    assert tokens_css.exists(), "ملف sijil-tokens.css مفقود في marketing/assets/css/"

    tokens_content = tokens_css.read_text(encoding="utf-8")
    assert "--brand-h: 265;" in tokens_content
    assert "--primary:" in tokens_content
    assert "--accent:" in tokens_content
    assert "@generated from web/lib/theme.ts" in tokens_content

    # التحقق من أن tokens.css يستورد sijil-tokens.css
    main_tokens = MARKETING_DIR / "assets" / "css" / "tokens.css"
    main_content = main_tokens.read_text(encoding="utf-8")
    assert '@import "./sijil-tokens.css";' in main_content

    # تشغيل سكريبت build-tokens.py --check للتأكد من عدم وجود أي انحراف عن theme.ts
    res = subprocess.run(
        [sys.executable, str(MARKETING_DIR / "scripts" / "build-tokens.py"), "--check"],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    assert res.returncode == 0, f"فشل فحص build-tokens.py --check:\n{res.stdout}\n{res.stderr}"


def test_build_ar_check_clean():
    """AC7: التحقق من نجاح فحص build-ar.py --check دون أي سلاسل مفقودة أو ملفات قديمة."""
    res = subprocess.run(
        [sys.executable, str(MARKETING_DIR / "scripts" / "build-ar.py"), "--check"],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    assert res.returncode == 0, f"فشل فحص build-ar.py --check:\n{res.stdout}\n{res.stderr}"
    assert "ar/index.html is up to date" in res.stdout


def test_landing_matches_marketing():
    """AC4 & AC7: التحقق من مطابقة صفحة الهبوط في web/public/landing لملفات التسويق marketing/."""
    assert LANDING_DIR.exists()

    # ملفات CSS الأساسية يجب أن تتطابق حرفياً
    css_files = ["sijil-tokens.css", "tokens.css", "sections.css"]
    for fname in css_files:
        marketing_css = (MARKETING_DIR / "assets" / "css" / fname).read_text(encoding="utf-8")
        landing_css = (LANDING_DIR / "assets" / "css" / fname).read_text(encoding="utf-8")
        assert marketing_css == landing_css, f"عدم تطابق في ملف الـ CSS: {fname}"

    # خطوط الويب يجب أن تتطابق
    font_files = [
        "IBMPlexSansArabic-300.woff2",
        "IBMPlexSansArabic-400.woff2",
        "IBMPlexSansArabic-500.woff2",
        "IBMPlexSansArabic-600.woff2",
        "IBMPlexSansArabic-700.woff2",
        "MaterialSymbolsRounded.woff2",
    ]
    for fname in font_files:
        m_font = (MARKETING_DIR / "assets" / "fonts" / fname).read_bytes()
        l_font = (LANDING_DIR / "assets" / "fonts" / fname).read_bytes()
        assert m_font == l_font, f"عدم تطابق في ملف الخط: {fname}"

    # التحقق من وجود index.html و ar/index.html في صفحة الهبوط واستخدام بادئة /landing/assets/
    l_index = (LANDING_DIR / "index.html").read_text(encoding="utf-8")
    assert "Al-Sijil" in l_index
    assert "/landing/assets/" in l_index

    l_ar_index = (LANDING_DIR / "ar" / "index.html").read_text(encoding="utf-8")
    assert "السِّجل" in l_ar_index
    assert "/landing/assets/" in l_ar_index


def test_documentation_describes_sijil_identity():
    """AC6: التحقق من توثيق هوية السجل الجديدة في DESIGN.md و README.md."""
    design_doc = (MARKETING_DIR / "DESIGN.md").read_text(encoding="utf-8")
    readme_doc = (MARKETING_DIR / "README.md").read_text(encoding="utf-8")

    for doc in [design_doc, readme_doc]:
        assert "Al-Sijil" in doc or "السِّجل" in doc
        assert "sijil-tokens.css" in doc
        assert "IBM Plex Sans Arabic" in doc


def test_no_alsigil_product_name_in_displayed_surfaces():
    """التحقق الصارم من استبدال اسم alsigil بـ Al-Sijil والسِّجل في كافة النصوص المعروضة وصفحات HTML وترجمة ar.json."""
    html_files = [
        MARKETING_DIR / "index.html",
        MARKETING_DIR / "ar" / "index.html",
        LANDING_DIR / "index.html",
        LANDING_DIR / "ar" / "index.html",
    ]
    for html_file in html_files:
        assert html_file.exists(), f"الملف {html_file} غير موجود"
        content = html_file.read_text(encoding="utf-8")
        # استبعاد النطاقات المسموحة مثل alsigil.com
        sanitized = re.sub(r"alsigil\.com", "", content, flags=re.IGNORECASE)
        # لا يجوز ظهور alsigil كاسم منتج في أي صفحة HTML
        matches = re.findall(r"\balsigil\b", sanitized, flags=re.IGNORECASE)
        assert not matches, f"تم العثور على اسم المنتج القديم 'alsigil' في {html_file.name}: {matches}"

    # فحص ملف الترجمة ar.json
    ar_json = MARKETING_DIR / "i18n" / "ar.json"
    ar_content = ar_json.read_text(encoding="utf-8")
    sanitized_json = re.sub(r"alsigil\.com", "", ar_content, flags=re.IGNORECASE)
    matches_json = re.findall(r"\balsigil\b", sanitized_json, flags=re.IGNORECASE)
    assert not matches_json, f"تم العثور على 'alsigil' في {ar_json.name}: {matches_json}"

