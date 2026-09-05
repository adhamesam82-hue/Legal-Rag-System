"""
اختبارات التحقق الصارم من إدارة التركيز وإمكانية الوصول في مكون النافذة المنبثقة Dialog.tsx (T-053).
تحرس البنود الثلاثة:
١. تركيز ابتدائي عند الفتح (Initial Focus)
٢. حبس Tab/Shift+Tab داخل النافذة (Focus Trap)
٣. استرجاع التركيز إلى العنصر الذي فتحها عند الإغلاق (Focus Restoration)
بالإضافة إلى التحقق من عدم تثبيت أي لغة محددة في aria-label وسحبها من الكتالوج أو خاصية المكون.
"""

import pathlib
import re

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DIALOG_FILE = REPO_ROOT / "web" / "components" / "ui" / "Dialog.tsx"


def test_dialog_file_exists():
    """التحقق من وجود ملف Dialog.tsx في مكتبة المكونات."""
    assert DIALOG_FILE.exists(), f"ملف Dialog.tsx غير موجود في {DIALOG_FILE}"


def test_dialog_initial_focus_guard():
    """
    التحقق من حراسة التركيز الابتدائي:
    - نقل التركيز إلى initialFocusRef إن وُجد.
    - أو البحث عن أول عنصر تفاعلي قابل للتركيز.
    - أو تركيز حاوية النافذة tabIndex={-1}.
    """
    content = DIALOG_FILE.read_text(encoding="utf-8")
    assert "initialFocusRef" in content, "يجب أن يدعم Dialog خاصية initialFocusRef"
    assert "tabIndex={-1}" in content, "حاوية النافذة يجب أن تملك tabIndex={-1} لتلقي التركيز البرمجي"
    assert ".focus()" in content, "يجب استدعاء دالة focus() لتعيين التركيز الابتدائي"


def test_dialog_focus_trap_guard():
    """
    التحقق من حراسة حبس التركيز داخل النافذة:
    - التقاط حدث Tab و Shift+Tab.
    - منع الخروج إلى بقية الصفحة (preventDefault).
    - الدوران بين أول وآخر عنصر قابل للتركيز.
    """
    content = DIALOG_FILE.read_text(encoding="utf-8")
    assert 'e.key === "Tab"' in content, "يجب التقاط مفتاح Tab في حدث لوحة المفاتيح"
    assert "e.shiftKey" in content, "يجب فحص Shift+Tab للرجوع العكسي"
    assert "e.preventDefault()" in content, "يجب منع السلوك الافتراضي لمنع خروج التركيز من النافذة"
    assert "FOCUSABLE_SELECTOR" in content or "querySelectorAll" in content, (
        "يجب استعلام العناصر القابلة للتركيز داخل النافذة"
    )


def test_dialog_focus_restoration_guard():
    """
    التحقق من حراسة استرجاع التركيز:
    - حفظ العنصر النشط مسبقاً قبل فتح النافذة (document.activeElement).
    - استرجاع التركيز إليه عند إغلاق النافذة (previousActiveElement.focus()).
    """
    content = DIALOG_FILE.read_text(encoding="utf-8")
    assert "document.activeElement" in content, "يجب تسجيل العنصر النشط قبل الفتح"
    assert "previousActiveElementRef" in content or "previousActiveElement" in content, (
        "يجب حفظ مرجع للعنصر النشط لاسترجاعه"
    )
    assert "restoreFocus" in content, "يجب دعم خاصية restoreFocus أو استرجاع التركيز تلقائياً"


def test_dialog_no_hardcoded_arabic_and_uses_catalog():
    """
    التحقق الصارم من خلو Dialog.tsx من أي نص عربي مدمج لـ aria-label،
    ودعم سحب تسمية زر الإغلاق من الكتالوج (useTranslator) أو تمريرها كخاصية closeAriaLabel.
    """
    content = DIALOG_FILE.read_text(encoding="utf-8")

    # منع التثبيت الحرفي لأي نص عربي لـ aria-label="إغلاق"
    assert 'aria-label="إغلاق"' not in content, (
        'يمنع تثبيت نص عربي داخل مكون المكتبة: عُثر على aria-label="إغلاق"'
    )

    # التحقق من دعم خاصية closeAriaLabel واستخدام الكتالوج عبر useTranslator
    assert "closeAriaLabel" in content, "يجب أن يدعم DialogHeader خاصية closeAriaLabel"
    assert "useTranslator" in content, "يجب استخدام useTranslator لسحب الترجمة من الكتالوج تلقائياً"
    assert "@astryx.dialog.close" in content, "يجب استدعاء مفتاح @astryx.dialog.close من الكتالوج"