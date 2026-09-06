"""
اختبارات التحقق الصارم لشريط المسار Breadcrumb التلقائي من القشرة (T-060 / E-5).
تتحقق هذه الاختبارات من:
1. رسم شريط المسار Breadcrumb تلقائياً من القشرة Shell داخل <main> فوق العناوين دون حاجة لاستدعائه من كل شاشة.
2. تصدير المكوّن من web/components/ui/index.ts وخلو صفحات التطبيق (page.tsx) من أي نسخ مكررة.
3. مطابقة المواصفة البصرية حرفياً من قالب السجل (11.5px، --text3 للسابق، --text2 بوزن 500 للحالي، فاصل 15px يتبع الاتجاه، فجوة 7px).
4. الربط التام بكتالوج واحد مشترك مع الشريط الجانبي (catalogs/shell.ts) في اللغتين العربية والإنجليزية.
5. بنية المستويين للشاشات المسطحة وثلاثة مستويات لشاشات التفاصيل مع هيكل تحميل Skeleton وصفر استدعاءات شبكة جديدة.
6. خلو المكوّن من الألوان المدمجة (#hex أو oklch) أو استيراد منطق البيانات أو الحواف الثابتة بالبكسل.
"""

import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHELL_TSX = REPO_ROOT / "web" / "components" / "Shell.tsx"
BREADCRUMB_TSX = REPO_ROOT / "web" / "components" / "ui" / "Breadcrumb.tsx"
UI_INDEX_TS = REPO_ROOT / "web" / "components" / "ui" / "index.ts"
CATALOG_SHELL_TS = REPO_ROOT / "web" / "lib" / "i18n" / "catalogs" / "shell.ts"
WEB_APP_DIR = REPO_ROOT / "web" / "app"


def test_breadcrumb_rendered_in_shell_automatically():
    """التحقق من أن شريط المسار يُرسم تلقائياً من القشرة Shell داخل <main> كأول عنصر."""
    assert SHELL_TSX.exists(), "ملف Shell.tsx غير موجود"
    content = SHELL_TSX.read_text(encoding="utf-8")

    # استيراد Breadcrumb في Shell
    assert "Breadcrumb" in content, "يجب استيراد Breadcrumb في Shell.tsx"
    assert re.search(r'import\s*\{[^}]*Breadcrumb[^}]*\}\s*from\s*["\']@/components/ui', content), (
        "يجب استيراد Breadcrumb من @/components/ui أو @/components/ui/Breadcrumb"
    )

    # التحقق من رسم <Breadcrumb /> كأول عنصر داخل <main>
    main_match = re.search(r'<main[^>]*>([\s\S]*?)</main>', content)
    assert main_match, "لم يتم العثور على وسم <main> في Shell.tsx"
    main_body = main_match.group(1).strip()

    assert "<Breadcrumb" in main_body, "يجب وضع <Breadcrumb /> داخل <main> في Shell.tsx"
    # التحقق من أن Breadcrumb يسبق {children}
    breadcrumb_pos = main_body.find("<Breadcrumb")
    children_pos = main_body.find("{children}")
    assert breadcrumb_pos < children_pos, "يجب أن يقع Breadcrumb أول عنصر داخل <main> فوق {children}"


def test_breadcrumb_component_exists_and_exported():
    """التحقق من وجود مكون Breadcrumb.tsx وتصديره في index.ts وخلو الصفحات من نسخ مكررة."""
    assert BREADCRUMB_TSX.exists(), "ملف web/components/ui/Breadcrumb.tsx غير موجود"

    index_content = UI_INDEX_TS.read_text(encoding="utf-8")
    assert 'export * from "./Breadcrumb";' in index_content, "يجب تصدير Breadcrumb من web/components/ui/index.ts"

    # التحقق من عدم وجود أي تعريف مكرر لشريط مسار داخل أي page.tsx
    for page_file in WEB_APP_DIR.rglob("page.tsx"):
        page_text = page_file.read_text(encoding="utf-8")
        assert "function Breadcrumb(" not in page_text, f"عُثر على مكوّن Breadcrumb مكرر في {page_file}"
        assert "const Breadcrumb =" not in page_text, f"عُثر على مكوّن Breadcrumb مكرر في {page_file}"
        assert "<Breadcrumbs" not in page_text, f"عُثر على استخدام قديم أو شاذ لـ <Breadcrumbs> في {page_file}"


def test_breadcrumb_visual_spec_and_design_system():
    """التحقق من مطابقة المواصفات البصرية حرفياً من القالب وقواعد نظام التصميم."""
    content = BREADCRUMB_TSX.read_text(encoding="utf-8")

    # 1. الحجم 11.5px
    assert "11.5px" in content, "يجب أن يكون حجم الخط 11.5px"

    # 2. الفجوة 7px
    assert "7px" in content, "يجب أن تكون الفجوة 7px"

    # 3. الألوان الدلالية
    assert "var(--text3)" in content, "يجب استخدام var(--text3) للأجزاء السابقة"
    assert "var(--text2)" in content, "يجب استخدام var(--text2) للجزء الحالي"
    assert "500" in content, "يجب أن يكون وزن خط الجزء الحالي 500"

    # 4. الفواصل حسب الاتجاه (chevron_left في RTL و chevron_right في LTR)
    assert "chevron_left" in content, "يجب استخدام chevron_left للاتجاه العربي RTL"
    assert "chevron_right" in content, "يجب استخدام chevron_right للاتجاه الإنجليزي LTR"
    assert "15px" in content, "يجب أن يكون حجم أيقونة الفاصل 15px"

    # 5. خلو المكوّن من الألوان المدمجة (# أو oklch)
    assert not re.search(r"#[0-9a-fA-F]{3,8}", content), "ممنوع استخدام ألوان hex مدمجة في Breadcrumb.tsx"
    assert "oklch(" not in content, "ممنوع استخدام oklch مدمج في Breadcrumb.tsx"

    # 6. خلو المكوّن من استيراد منطق البيانات
    assert not re.search(r'from\s+["\'].*lib/(?:api|practice)["\']', content), (
        "ممنوع استيراد lib/api أو lib/practice في مكون Breadcrumb"
    )

    # 7. الحواف تتبع المتغيرات الدلالية
    fixed_radius_matches = re.findall(r'borderRadius:\s*["\']([0-9]+)px["\']', content)
    for m in fixed_radius_matches:
        assert m == "999", f"حافة ثابتة غير مسموحة: {m}px"


def test_breadcrumb_i18n_catalogs_keys():
    """التحقق من اكتمال مفاتيح الترجمة الخاصة بشريط المسار في كتالوجي shell.ts (ar و en)."""
    catalog_content = CATALOG_SHELL_TS.read_text(encoding="utf-8")

    en_match = re.search(r'export const en:\s*Catalog\s*=\s*\{([\s\S]+?)\n\};', catalog_content)
    assert en_match, "كتالوج en غير موجود في shell.ts"
    en_keys = set(re.findall(r'["\'](@legalos\.shell\.[a-zA-Z0-9_.]+)["\']', en_match.group(1)))

    ar_match = re.search(r'export const ar:\s*Catalog\s*=\s*\{([\s\S]+?)\n\};', catalog_content)
    assert ar_match, "كتالوج ar غير موجود في shell.ts"
    ar_keys = set(re.findall(r'["\'](@legalos\.shell\.[a-zA-Z0-9_.]+)["\']', ar_match.group(1)))

    expected_keys = [
        "@legalos.shell.breadcrumb.ariaLabel",
        "@legalos.shell.breadcrumb.home",
        "@legalos.shell.breadcrumb.loading",
        "@legalos.shell.nav.dashboard",
        "@legalos.shell.nav.matters",
        "@legalos.shell.nav.clients",
        "@legalos.shell.nav.documents",
        "@legalos.shell.nav.lawLibrary",
        "@legalos.shell.nav.plans",
        "@legalos.shell.nav.subscribe",
    ]

    for key in expected_keys:
        assert key in en_keys, f"المفتاح {key} مفقود من كتالوج en"
        assert key in ar_keys, f"المفتاح {key} مفقود من كتالوج ar"


def test_breadcrumb_structure_and_behavior():
    """التحقق من الخصائص السلوكية للمكون (aria-current، استثناء BARE_ROUTES، ودعم هيكل التحميل)."""
    content = BREADCRUMB_TSX.read_text(encoding="utf-8")

    # التحقق من aria-current="page"
    assert 'aria-current' in content, "يجب استخدام خاصية aria-current في شريط المسار"
    assert 'page' in content, "يجب تحديد قيمة page لخاصية aria-current للجزء الأخير"

    # التحقق من استثناء مسارات BARE_ROUTES
    for route in ["/sign-in", "/sign-up", "/invite"]:
        assert route in content, f"المسار المستثنى {route} مفقود من BARE_ROUTES في Breadcrumb.tsx"

    # التحقق من استخدام هيكل التحميل Skeleton لشاشات التفاصيل
    assert "Skeleton" in content, "يجب استيراد واستخدام Skeleton لشاشات التفاصيل أثناء جلب البيانات"

    # التحقق من أن كل عنصر عدا الأخير هو رابط عبر PrefetchedNavLink أو Link
    assert "PrefetchedNavLink" in content or "Link" in content, "يجب استخدام روابط للأجزاء السابقة"


def test_breadcrumb_catalog_driven_detail_derivation():
    """التحقق من أن اشتقاق شاشات التفاصيل مقلوب ومستند للكتالوج بنسبة 100% دون استثناءات يدوية."""
    content = BREADCRUMB_TSX.read_text(encoding="utf-8")

    # خلو الكود من أي استثناء يدوي هش
    assert 'pathname === "/settings/profile"' not in content, (
        "ممنوع استخدام استثناء يدوي لمسار settings/profile؛ يجب الاعتماد على الكتالوج"
    )

    # التحقق من تصدير دوال الكتالوج واشتقاق شاشات التفاصيل
    assert "getRouteCatalogKey" in content, "يجب تصدير دالة getRouteCatalogKey"
    assert "isRecordDetailRoute" in content, "يجب تصدير دالة isRecordDetailRoute"
    assert "STATIC_ROUTE_CATALOG" in content, "يجب تعريف STATIC_ROUTE_CATALOG للمسارات الثابتة الإضافية"

    # التحقق من تسجيل المسارات الفرعية في الكتالوج
    for path in ["/settings/profile", "/settings/appearance", "/settings/users", "/plans", "/subscribe"]:
        assert f'"{path}"' in content or f"'{path}'" in content, f"المسار {path} يجب أن يكون مسجلاً في كتالوج المسارات"


def test_breadcrumb_override_and_knowledge_base_four_levels():
    """التحقق من دعم التجاوز المخصص ومحافظة شاشة knowledge-base/[id] على مستوياتها الأربعة."""
    breadcrumb_content = BREADCRUMB_TSX.read_text(encoding="utf-8")
    ui_index_content = UI_INDEX_TS.read_text(encoding="utf-8")
    kb_detail_tsx = WEB_APP_DIR / "knowledge-base" / "[id]" / "page.tsx"
    assert kb_detail_tsx.exists(), "ملف knowledge-base/[id]/page.tsx غير موجود"
    kb_content = kb_detail_tsx.read_text(encoding="utf-8")

    # تصدير BreadcrumbOverride
    assert "BreadcrumbOverride" in breadcrumb_content, "يجب تصدير BreadcrumbOverride في Breadcrumb.tsx"
    assert "BreadcrumbOverride" in ui_index_content or 'export * from "./Breadcrumb";' in ui_index_content, (
        "يجب إعادة تصدير BreadcrumbOverride من ui/index.ts"
    )

    # استخدام BreadcrumbOverride في شاشة تفاصيل النماذج للحفاظ على الفئة والعنوان
    assert "BreadcrumbOverride" in kb_content, "يجب استخدام BreadcrumbOverride في knowledge-base/[id]/page.tsx"
    assert "CATEGORY_KEY" in kb_content, "يجب تمرير فئة النموذج CATEGORY_KEY في مسار knowledge-base/[id]"

    # التأكد من وجود سمة data-breadcrumb-title لتسهيل الالتقاط الفوري
    assert "data-breadcrumb-title" in kb_content, (
        "يجب وضع السمة data-breadcrumb-title على عنوان السجل في knowledge-base/[id]/page.tsx"
    )


def test_breadcrumb_mutation_observer_performance_and_disconnection():
    """التحقق من أولوية data-breadcrumb-title وفصل MutationObserver فور استخلاص العنوان."""
    content = BREADCRUMB_TSX.read_text(encoding="utf-8")

    # أولوية data-breadcrumb-title
    data_attr_pos = content.find("data-breadcrumb-title")
    h1_pos = content.find('"h1, h2"')
    if h1_pos == -1:
        h1_pos = content.find("'h1, h2'")
    assert data_attr_pos != -1, "يجب فحص سمة data-breadcrumb-title"
    assert h1_pos != -1, "يجب فحص عناوين h1, h2 كخيار احتياطي"
    assert data_attr_pos < h1_pos, "يجب أن تكون الأولوية لـ data-breadcrumb-title قبل البحث عن h1, h2"

    # فصل المراقب فور استخلاص العنوان
    assert "observer.disconnect()" in content, "يجب استدعاء observer.disconnect() فور العثور على العنوان"

