"""
اختبارات آلية شاملة لبطاقة «خطة المكتب» أسفل الشريط الجانبي (T-058 / E-5).
يتحقق هذا الاختبار من:
1. اختبار شبكة الأمان (Safety net test): يفشل إن ظهر seat_limit كخاصية في web/lib/practice.ts والمؤقّت ما زال قائماً.
2. تصدير PLACEHOLDER_SEAT_LIMIT = 25 من web/lib/practice.ts بالتوثيق المطلوب.
3. عدم وجود الرقم 25 كقيمة صلبة في JSX داخل Shell.tsx.
4. قراءة البطاقة من useOrg() القائم وصفر نداء شبكة جديد.
5. عدد المستخدمين من memberships.length.
6. اسم الخطة من plan عبر الكتالوج.
7. تاريخ الانتهاء من trial_ends_at بمنسّق useFormat وعدم استخدام --text3 له.
8. شريط التقدم محدّد بـ 100% ولا يتجاوز حاويته ولا لون خطر عند الامتلاء.
9. حالة trial_expired تأخذ --danger ونصاً صريحاً لا لوناً وحده.
10. انكماش البطاقة عند الطيّ وظهور أيقونة workspace_premium وحدها مع التلميح الكامل.
11. اكتمال مفاتيح التدويل في الكتالوجين العربي والإنجليزي.
"""

import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHELL_TSX = REPO_ROOT / "web" / "components" / "Shell.tsx"
CATALOG_SHELL_TS = REPO_ROOT / "web" / "lib" / "i18n" / "catalogs" / "shell.ts"
PRACTICE_TS = REPO_ROOT / "web" / "lib" / "practice.ts"


# -----------------------------------------------------------------------------
# 1. اختبار شبكة الأمان وتصدير الثابت المؤقت (Safety net test)
# -----------------------------------------------------------------------------

def test_safety_net_placeholder_seat_limit_and_practice_interface():
    """
    اختبار شبكة الأمان (Safety net test):
    - يتحقق من تصدير PLACEHOLDER_SEAT_LIMIT = 25 مصحوباً بالتوثيق المطلوب.
    - يفشل إذا ظهر seat_limit كحقل/خاصية في واجهات web/lib/practice.ts بينما الثابت المؤقت ما زال موجوداً.
    """
    practice_content = PRACTICE_TS.read_text(encoding="utf-8")

    # 1. التحقق من وجود الثابت وتصديره
    assert "export const PLACEHOLDER_SEAT_LIMIT = 25;" in practice_content, (
        "يجب تصدير PLACEHOLDER_SEAT_LIMIT = 25 من web/lib/practice.ts"
    )

    # 2. التحقق من وجود التعليق التوثيقي المحدد في التذكرة
    assert "مؤقّت حتى يصل seat_limit من الخلفية" in practice_content, (
        "التعليق التوثيقي المحدد مطلوب فوق PLACEHOLDER_SEAT_LIMIT"
    )
    assert "احذف هذا الثابت واقرأ practice.seat_limit" in practice_content, (
        "التوثيق يجب أن يوضح كيفية الاستبدال عند وصول الحقل من الخلفية"
    )

    # 3. اختبار شبكة الأمان: إذا ظهر seat_limit كخاصية في الواجهات في practice.ts مع وجود الثابت
    has_seat_limit_property = bool(
        re.search(r"\bseat_limit\s*\??\s*:\s*(?:number|string)", practice_content)
    )
    has_placeholder = "PLACEHOLDER_SEAT_LIMIT" in practice_content

    if has_seat_limit_property and has_placeholder:
        pytest.fail(
            "شبكة الأمان: وصل الحقل seat_limit إلى web/lib/practice.ts! "
            "احذف PLACEHOLDER_SEAT_LIMIT واقرأ practice.seat_limit كما تنص التذكرة T-058."
        )


# -----------------------------------------------------------------------------
# 2. اختبار عدم وجود الرقم 25 كقيمة ثابتة في JSX داخل Shell.tsx
# -----------------------------------------------------------------------------

def test_no_hardcoded_25_in_shell_jsx_and_single_exported_constant():
    """التحقق من استيراد واستخدام PLACEHOLDER_SEAT_LIMIT وعدم وجود 25 في JSX بـ Shell.tsx."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")

    # التحقق من استيراد الثابت
    assert "PLACEHOLDER_SEAT_LIMIT" in shell_content, (
        "يجب استيراد PLACEHOLDER_SEAT_LIMIT في Shell.tsx"
    )
    assert re.search(r'import\s*\{[^}]*PLACEHOLDER_SEAT_LIMIT[^}]*\}\s*from\s*["\']@/lib/practice["\']', shell_content), (
        "يجب استيراد PLACEHOLDER_SEAT_LIMIT من @/lib/practice"
    )

    # التحقق من عدم وجود الرقم 25 في JSX
    # نبحث عن أي وسم JSX يحتوي على 25 كنص أو كخاصية رقمية
    jsx_25_match = re.search(r'>[^<]*\b25\b[^<]*<|\b(?:value|limit|total|count)=\{?25\}?', shell_content)
    assert not jsx_25_match, (
        f"ممنوع وجود الرقم 25 صلبة في JSX داخل Shell.tsx: وُجد {jsx_25_match.group(0) if jsx_25_match else ''}"
    )


# -----------------------------------------------------------------------------
# 3. اختبار قراءة البيانات من useOrg() وصفر نداء شبكة جديد
# -----------------------------------------------------------------------------

def test_zero_new_network_calls_and_reads_from_use_org():
    """التحقق من أن البطاقة تقرأ من useOrg() حصراً دون أي نداءات شبكة جديدة في القشرة."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")

    # استخراج دالة بطاقة خطة المكتب
    card_match = re.search(r'function\s+FirmPlanCard[\s\S]+?\n\}', shell_content)
    assert card_match, "لم يتم العثور على دالة FirmPlanCard في Shell.tsx"
    card_code = card_match.group(0)

    # التحقق من قراءة useOrg
    assert "useOrg()" in card_code, "يجب أن تقرأ FirmPlanCard من useOrg()"
    assert "memberships" in card_code, "يجب قراءة memberships من useOrg()"
    assert "memberships.length" in card_code, "يجب قراءة عدد المستخدمين من memberships.length"

    # التحقق من عدم وجود أي نداء شبكة
    forbidden_calls = ["fetch(", "axios", "api.", "practiceApi", "useResource("]
    for call in forbidden_calls:
        assert call not in card_code, f"ممنوع إجراء نداءات شبكة داخل بطاقة خطة المكتب: وُجد {call}"


# -----------------------------------------------------------------------------
# 4. اختبار شريط التقدم والتحديد بـ 100% وعدم إطلاق لون الخطر عند الامتلاء
# -----------------------------------------------------------------------------

def test_progress_bar_capped_at_100_percent_no_danger_on_full():
    """التحقق من أن شريط التقدم محدد بـ 100% ولا يتجاوز حاويته، ولا يأخذ لون الخطر عند الامتلاء."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")
    card_match = re.search(r'function\s+FirmPlanCard[\s\S]+?\n\}', shell_content)
    assert card_match, "لم يتم العثور على دالة FirmPlanCard في Shell.tsx"
    card_code = card_match.group(0)

    # التحقق من معادلة التحديد بـ 100%
    assert "Math.min(100" in card_code, (
        "يجب تحديد شريط التقدم بـ Math.min(100, ...) لضمان عدم تجاوز الحاوية"
    )

    # التحقق من أن الخطر محجوز لـ trial_expired وحده
    assert "trial_expired" in card_code, "حالة الخطر يجب أن ترتبط بـ trial_expired"
    # التأكد من عدم استخدام شرط امتلاء المقاعد كسبب للخطر
    assert not re.search(r'(?:progressPercent|userCount|count)\s*>=?\s*(?:seatLimit|limit|100)\s*\?[^:]*var\(--danger\)', card_code), (
        "ممنوع استخدام لون الخطر عند امتلاء المقاعد؛ الخطر محجوز لـ trial_expired وحده"
    )


# -----------------------------------------------------------------------------
# 5. اختبار حالة trial_expired ونص الخطر الصريح وتاريخ الانتهاء
# -----------------------------------------------------------------------------

def test_trial_expired_explicit_danger_text_and_no_text3_date():
    """التحقق من أن trial_expired تقدم نصاً صريحاً بالخطر وألا يُكتب تاريخ الانتهاء بـ --text3."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")
    card_match = re.search(r'function\s+FirmPlanCard[\s\S]+?\n\}', shell_content)
    assert card_match, "لم يتم العثور على دالة FirmPlanCard في Shell.tsx"
    card_code = card_match.group(0)

    # التحقق من وجود مفتاح انتهاء التجربة
    assert "@legalos.shell.planCard.trialExpired" in card_code, (
        "يجب استخدام نص صريح لانتهاء التجربة من الكتالوج"
    )

    # التحقق من عدم استخدام --text3 لتاريخ الانتهاء
    # نستخرج قسم عرض التاريخ
    assert "trial_ends_at" in card_code, "يجب استخدام trial_ends_at لتاريخ الانتهاء"
    assert "formatDate(" in card_code, "يجب تنسيق التاريخ باستخدام formatDate من useFormat"

    # التحقق من أن تاريخ الانتهاء يأخذ var(--text2) أو var(--text) وليس var(--text3)
    date_section_match = re.search(r'(?:expiryText|expiryFormatted|expiresOn)[\s\S]+?</div>', card_code)
    if date_section_match:
        assert "var(--text3)" not in date_section_match.group(0), (
            "تاريخ الانتهاء موعد ويمنع استخدام var(--text3) له طبقاً لمعايير التباين T-048"
        )


# -----------------------------------------------------------------------------
# 6. اختبار انكماش البطاقة عند الطيّ
# -----------------------------------------------------------------------------

def test_firm_plan_card_collapsible_with_tooltip():
    """التحقق من انكماش البطاقة عند طي الشريط وظهور الأيقونة وحدها مع التلميح الكامل."""
    shell_content = SHELL_TSX.read_text(encoding="utf-8")
    card_match = re.search(r'function\s+FirmPlanCard[\s\S]+?\n\}', shell_content)
    assert card_match, "لم يتم العثور على دالة FirmPlanCard في Shell.tsx"
    card_code = card_match.group(0)

    assert "collapsed" in card_code, "يجب أن تستقبل FirmPlanCard خاصية collapsed"
    assert "workspace_premium" in card_code, "يجب استخدام أيقونة workspace_premium"
    assert "title=" in card_code, "يجب توفير title يحمل التلميح الكامل عند الطيّ"
    assert "aria-label=" in card_code, "يجب توفير aria-label لدعم إمكانية الوصول"


# -----------------------------------------------------------------------------
# 7. اختبار تكامل الترجمة باللغتين العربية والإنجليزية
# -----------------------------------------------------------------------------

def test_firm_plan_card_i18n_keys_in_ar_and_en():
    """التحقق من وجود جميع مفاتيح الترجمة الخاصة ببطاقة الخطة في كتالوجي ar و en."""
    catalog_content = CATALOG_SHELL_TS.read_text(encoding="utf-8")

    expected_keys = [
        "@legalos.shell.plan.trial",
        "@legalos.shell.plan.basic",
        "@legalos.shell.plan.pro",
        "@legalos.shell.plan.enterprise",
        "@legalos.shell.planCard.title",
        "@legalos.shell.planCard.titleWithPlan",
        "@legalos.shell.planCard.usersCount",
        "@legalos.shell.planCard.expiresOn",
        "@legalos.shell.planCard.trialExpired",
        "@legalos.shell.planCard.collapsedTooltip",
    ]

    en_match = re.search(r'export const en:\s*Catalog\s*=\s*\{([\s\S]+?)\n\};', catalog_content)
    assert en_match, "كتالوج en مفقود في shell.ts"
    en_section = en_match.group(1)

    ar_match = re.search(r'export const ar:\s*Catalog\s*=\s*\{([\s\S]+?)\n\};', catalog_content)
    assert ar_match, "كتالوج ar مفقود في shell.ts"
    ar_section = ar_match.group(1)

    for key in expected_keys:
        assert key in en_section, f"المفتاح {key} مفقود من كتالوج en في shell.ts"
        assert key in ar_section, f"المفتاح {key} مفقود من كتالوج ar في shell.ts"
