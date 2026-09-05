"""
اختبارات التحقق الصارم لمكتبة مكونات السجل (T-052 / E-5)
تتحقق من:
1. خلو كافة مكونات web/components/ui/ من أي ألوان مدمجة (# أو oklch).
2. خلو كافة المكونات من أي استيراد لمنطق البيانات (lib/api, lib/practice).
3. تغطية الأنماط الـ 8 والحالات الـ 6 للأزرار، وحالات المستندات الخمس للشارات.
4. احترام المتغيرات الهندسية الدلالية (--r, --rs, --rowpad).
5. حجب صفحة المعاينة dev-ui عن الإنتاج.
"""

import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
UI_DIR = ROOT_DIR / "web" / "components" / "ui"
DEV_UI_PAGE = ROOT_DIR / "web" / "app" / "dev-ui" / "page.tsx"


def test_zero_inlined_colors_in_ui_components():
    """
    التحقق الصارم من انعدام الألوان المدمجة (#hex أو oklch) في كل ملفات مكتبة المكونات.
    """
    assert UI_DIR.exists(), f"مجلد المكونات {UI_DIR} غير موجود"

    ui_files = list(UI_DIR.glob("*.ts")) + list(UI_DIR.glob("*.tsx"))
    assert len(ui_files) >= 10, "عدد ملفات المكونات أقل من المتوقع"

    hex_color_pattern = re.compile(r"#[0-9a-fA-F]{3,8}")
    oklch_pattern = re.compile(r"oklch\(")

    violations = []
    for f in ui_files:
        content = f.read_text(encoding="utf-8")
        hex_matches = hex_color_pattern.findall(content)
        oklch_matches = oklch_pattern.findall(content)

        if hex_matches:
            violations.append(f"{f.name}: ألوان hex سداسية مدمجة: {hex_matches}")
        if oklch_matches:
            violations.append(f"{f.name}: دالة oklch مدمجة: {oklch_matches}")

    assert not violations, "عُثر على ألوان مدمجة داخل مكتبة المكونات:\n" + "\n".join(violations)


def test_zero_data_logic_in_ui_components():
    """
    التحقق الصارم من انعدام أي استيراد لبيانات أو خطافات جلب داخل مكتبة المكونات.
    """
    ui_files = list(UI_DIR.glob("*.ts")) + list(UI_DIR.glob("*.tsx"))
    forbidden_imports = re.compile(r'from\s+["\'].*lib/(?:api|practice)["\']')

    violations = []
    for f in ui_files:
        content = f.read_text(encoding="utf-8")
        if forbidden_imports.search(content):
            violations.append(f"{f.name}: يحتوي على استيراد ممنوع لمنطق البيانات")

    assert not violations, "عُثر على استيرادات ممنوعة داخل مكتبة المكونات:\n" + "\n".join(violations)


def test_components_index_exports():
    """
    التحقق من تصدير كافة المكونات المطلوبة من index.ts
    """
    index_file = UI_DIR / "index.ts"
    assert index_file.exists(), "ملف التصدير web/components/ui/index.ts غير موجود"
    content = index_file.read_text(encoding="utf-8")

    expected_exports = [
        "Button",
        "Input",
        "Select",
        "Switch",
        "Checkbox",
        "Card",
        "Table",
        "Badge",
        "Alert",
        "Toolbar",
        "FilterBar",
        "EmptyState",
        "Skeleton",
        "Icon",
        "Chat",
        "Dialog",
    ]

    for item in expected_exports:
        assert f'export * from "./{item}";' in content, f"المكون {item} غير مصدّر في index.ts"


def test_button_variants_and_states():
    """
    التحقق من أن مكون الزر يدعم الأنماط الـ 8 والحالات الـ 6، وأن حالة loading تملك spinner ونص توضيحي.
    """
    button_file = UI_DIR / "Button.tsx"
    assert button_file.exists()
    content = button_file.read_text(encoding="utf-8")

    expected_variants = [
        "primary",
        "secondary",
        "ghost",
        "soft",
        "accent",
        "danger",
        "outline-danger",
        "link",
    ]
    for v in expected_variants:
        assert f'"{v}"' in content, f"النمط {v} غير معرف في Button.tsx"

    expected_states = ["default", "hover", "focus", "active", "disabled", "loading"]
    for s in expected_states:
        assert f'"{s}"' in content, f"الحالة {s} غير معرفة في Button.tsx"

    assert "spin 0.7s linear infinite" in content, "دوامة التحميل spin غير مدمجة في الزر"
    assert "جاري…" in content, "النص الافتراضي للتحميل «جاري…» غير معرف في الزر"


def test_document_status_badges_and_rowpad_geometry():
    """
    التحقق من توثيق حالات المستندات الخمس في الشارات، واعتماد الحواف والكثافة على المتغيرات.
    """
    badge_file = UI_DIR / "Badge.tsx"
    assert badge_file.exists()
    badge_content = badge_file.read_text(encoding="utf-8")

    for status, label in [
        ("draft", "مسودة"),
        ("review", "قيد المراجعة"),
        ("signed", "موقَّع"),
        ("filed", "مودَع"),
        ("final", "نهائي"),
    ]:
        assert f'"{status}"' in badge_content, f"حالة المستند {status} غير معرفة في Badge.tsx"
        assert label in badge_content, f"التسمية النصية {label} غير معرفة في Badge.tsx"

    table_file = UI_DIR / "Table.tsx"
    table_content = table_file.read_text(encoding="utf-8")
    assert "var(--rowpad)" in table_content, "الكثافة في Table.tsx يجب أن تعتمد على var(--rowpad)"

    card_file = UI_DIR / "Card.tsx"
    card_content = card_file.read_text(encoding="utf-8")
    assert "var(--r)" in card_content, "الحواف في Card.tsx يجب أن تعتمد على var(--r)"


def test_dev_ui_page_production_block():
    """
    التحقق من حجب صفحة المعاينة dev-ui عن الإنتاج عبر notFound و NODE_ENV.
    """
    assert DEV_UI_PAGE.exists(), f"صفحة المعاينة {DEV_UI_PAGE} غير موجودة"
    content = DEV_UI_PAGE.read_text(encoding="utf-8")

    assert "notFound" in content, "صفحة المعاينة يجب أن تستورد notFound"
    assert 'process.env.NODE_ENV === "production"' in content, (
        "صفحة المعاينة يجب أن تفحص NODE_ENV لمنع الوصول إليها في الإنتاج"
    )


def test_zero_fixed_border_radius_in_ui_components():
    """
    التحقق الصارم من انعدام الحواف الثابتة بالبكسل في مكتبة المكونات باستثناء 999px (أقراص pill).
    الحواف يجب أن تتبع المتغيرات الدلالية var(--rs) و var(--r) لضمان عمل منزلق التفضيلات في T-054.
    """
    ui_files = list(UI_DIR.glob("*.ts")) + list(UI_DIR.glob("*.tsx"))
    fixed_radius_pattern = re.compile(r'borderRadius:\s*["\']([0-9]+)px["\']')

    violations = []
    for f in ui_files:
        content = f.read_text(encoding="utf-8")
        matches = fixed_radius_pattern.findall(content)
        for m in matches:
            if m != "999":
                violations.append(f"{f.name}: حافة ثابتة غير مسموحة borderRadius: '{m}px'")

    assert not violations, "عُثر على حواف ثابتة بالبكسل تخالف معيار T-054:\n" + "\n".join(violations)


def test_single_api_convention_for_button_and_badge():
    """
    التحقق الصارم من توحيد واجهة المكونات (Single API Convention):
    - اعتماد التركيب القياسي (React Composition) عبر children للمحتوى.
    - اعتماد loading حصراً لحالة التحميل في Button.
    - منع وجود الخصائص المزدوجة label أو isLoading في ButtonProps و BadgeProps منعاً لفتح واجهتين للمكون نفسه.
    """
    button_file = UI_DIR / "Button.tsx"
    badge_file = UI_DIR / "Badge.tsx"

    button_content = button_file.read_text(encoding="utf-8")
    badge_content = badge_file.read_text(encoding="utf-8")

    # فحص ButtonProps
    assert "isLoading?:" not in button_content, "تم العثور على خاصية isLoading المزدوجة في Button.tsx"
    assert "label?:" not in button_content, "تم العثور على خاصية label المزدوجة في Button.tsx"
    assert "loading?:" in button_content, "يجب أن يحتوي ButtonProps على loading"

    # فحص BadgeProps
    assert "label?:" not in badge_content, "تم العثور على خاصية label المزدوجة في Badge.tsx"


