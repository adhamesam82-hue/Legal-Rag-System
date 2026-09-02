#!/usr/bin/env bash
# استيراد تذاكر توسعة التصنيفات وتحسين الواجهة (T-023 .. T-036) إلى GitHub Issues.
#
# مستقلّ عن import-to-github.sh الذي يستورد الدفعات صفر-٤.
# آمن للتشغيل مرة واحدة فقط — إعادة تشغيله تنشئ نسخًا مكررة.
#
#   gh auth login
#   bash tickets/import-ui-upgrade.sh
set -euo pipefail
REPO="adhamesam82-hue/Legal-Rag-System"
command -v gh >/dev/null || { echo "gh غير مثبّت: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "شغّل أولًا: gh auth login"; exit 1; }
cd "$(dirname "$0")/.."

echo "== التسميات =="
label() { gh label create "$1" --color "$2" --repo "$REPO" --force >/dev/null 2>&1 || true; }
label "أمان"          B60205
label "backend"       1D76DB
label "frontend"      0E8A16
label "نموذج-بيانات"  0052CC
label "ميزة"          0E8A16
label "تحسين"         C2E0C6
label "امتثال"        B60205

echo "== الـ milestones =="
ms() { gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null 2>&1 || true; }
ms "الدفعة ٥ — التصنيف وملف القضية"          "docs/ui-upgrade-spec.ar.md §١ و §٢"
ms "الدفعة ٦ — المستندات والفوترة والإعدادات" "docs/ui-upgrade-spec.ar.md §٣ و §٤ و §٥"
ms "الدفعة ٧ — التمييز البصري والهبوط"        "docs/ui-upgrade-spec.ar.md §٦ و §٧"

echo "== التذاكر =="
mk() { # id · title · labels · milestone
  echo "  $1"
  gh issue create --repo "$REPO" \
    --title "$1 · $2" \
    --body-file "tickets/$1.md" \
    --label "$3" \
    --milestone "$4" >/dev/null
}

M5="الدفعة ٥ — التصنيف وملف القضية"
M6="الدفعة ٦ — المستندات والفوترة والإعدادات"
M7="الدفعة ٧ — التمييز البصري والهبوط"

mk T-023 "التصنيف الموحّد: أنواع القضايا الأربعة عشر وتخصصات المكتب" "نموذج-بيانات,backend" "$M5"
mk T-024 "ملف القضية الموضوعي — الخلفية والقضايا الفرعية"            "نموذج-بيانات,backend" "$M5"
mk T-029 "ملف القضية الموضوعي — الواجهة"                             "frontend,ميزة"        "$M5"
mk T-030 "القضايا الفرعية والمحاكم المتعددة — الواجهة"               "frontend,ميزة"        "$M5"

mk T-025 "وسوم المستندات وتصنيف أنواعها — الخلفية"                   "نموذج-بيانات,backend" "$M6"
mk T-026 "الفاتورة: ملاحظات وضريبة البند والترقيم التلقائي"          "نموذج-بيانات,امتثال,backend" "$M6"
mk T-027 "حقول الإعدادات الجديدة — الخلفية"                          "نموذج-بيانات,backend" "$M6"
mk T-028 "رفع شعار المكتب — يفكّ تعطيل المنتقي"                      "أمان,backend,ميزة"    "$M6"
mk T-031 "المستندات: الشجرة الجانبية متعددة المحاور"                 "frontend,ميزة"        "$M6"
mk T-032 "المستندات: إدارة الوسوم واختيار النوع وعرض البطاقات"       "frontend,ميزة"        "$M6"
mk T-033 "شاشة الفاتورة: البنود والضريبة والملاحظات والترقيم"        "frontend,ميزة"        "$M6"
mk T-034 "شاشة الإعدادات الموسَّعة"                                   "frontend,ميزة"        "$M6"

mk T-035 "نظام التمييز البصري: لون وأيقونة تحملان معلومة"            "frontend,تحسين"       "$M7"
mk T-036 "صفحة الهبوط عربية افتراضيًا"                               "frontend,تحسين"       "$M7"

echo ""
echo "تم. راجع:  gh issue list --repo $REPO --limit 40"
