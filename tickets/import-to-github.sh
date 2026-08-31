#!/usr/bin/env bash
# استيراد التذاكر إلى GitHub Issues.
# التشغيل:  gh auth login   ثم   bash tickets/import-to-github.sh
set -euo pipefail
REPO="adhamesam82-hue/Legal-Rag-System"
command -v gh >/dev/null || { echo "gh غير مثبّت: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "شغّل أولًا: gh auth login"; exit 1; }
cd "$(dirname "$0")/.."
echo "== التسميات =="
gh label create "أمان" --color B60205 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "حرج" --color D93F0B --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "backend" --color 1D76DB --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "frontend" --color 0E8A16 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "fullstack" --color 5319E7 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "i18n" --color FBCA04 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "نموذج-بيانات" --color 0052CC --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "إعادة-هيكلة" --color BFD4F2 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "ميزة" --color 0E8A16 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "تحسين" --color C2E0C6 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "ops" --color 666666 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "نطاق" --color D4C5F9 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "امتثال" --color B60205 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "تبنّي" --color FEF2C0 --repo "$REPO" --force >/dev/null 2>&1 || true
gh label create "محجوبة" --color 111111 --repo "$REPO" --force >/dev/null 2>&1 || true
echo "== الـ milestones =="
gh api "repos/$REPO/milestones" -f title="الدفعة صفر — أمان" >/dev/null 2>&1 || true
gh api "repos/$REPO/milestones" -f title="الدفعة ١ — تسمية وتوصيل" >/dev/null 2>&1 || true
gh api "repos/$REPO/milestones" -f title="الدفعة ٢ — نموذج البيانات" >/dev/null 2>&1 || true
gh api "repos/$REPO/milestones" -f title="الدفعة ٣ — الصلاحيات" >/dev/null 2>&1 || true
gh api "repos/$REPO/milestones" -f title="الدفعة ٤ — إغلاق دورة العمل" >/dev/null 2>&1 || true
gh api "repos/$REPO/milestones" -f title="محجوبة على قرار" >/dev/null 2>&1 || true
echo "== التذاكر =="
echo "  T-001"
gh issue create --repo "$REPO" --title "T-001 · إغلاق مسارات LLM الثلاثة المفتوحة" --body-file "tickets/T-001.md" --label "أمان,حرج,backend" --milestone "الدفعة صفر — أمان" >/dev/null
echo "  T-002"
gh issue create --repo "$REPO" --title "T-002 · حد حجم ونوع لرفع المستندات" --body-file "tickets/T-002.md" --label "أمان,حرج,backend" --milestone "الدفعة صفر — أمان" >/dev/null
echo "  T-003"
gh issue create --repo "$REPO" --title "T-003 · إغلاق ثغرة XSS في تقديم المستندات" --body-file "tickets/T-003.md" --label "أمان,حرج,backend" --milestone "الدفعة صفر — أمان" >/dev/null
echo "  T-004"
gh issue create --repo "$REPO" --title "T-004 · حد معدل الطلبات على البروكسي" --body-file "tickets/T-004.md" --label "أمان,ops" --milestone "الدفعة صفر — أمان" >/dev/null
echo "  T-005"
gh issue create --repo "$REPO" --title "T-005 · العملاء ← الموكّلين في كل الواجهة" --body-file "tickets/T-005.md" --label "i18n,frontend" --milestone "الدفعة ١ — تسمية وتوصيل" >/dev/null
echo "  T-006"
gh issue create --repo "$REPO" --title "T-006 · قاعدة المعرفة ← نماذج وقوالب" --body-file "tickets/T-006.md" --label "i18n,frontend" --milestone "الدفعة ١ — تسمية وتوصيل" >/dev/null
echo "  T-007"
gh issue create --repo "$REPO" --title "T-007 · وحدة الـ flags وإخفاء التبويبات وشاشات الذكاء الاصطناعي" --body-file "tickets/T-007.md" --label "frontend,نطاق" --milestone "الدفعة ١ — تسمية وتوصيل" >/dev/null
echo "  T-008"
gh issue create --repo "$REPO" --title "T-008 · إضافة مهمة من داخل القضية" --body-file "tickets/T-008.md" --label "frontend,تحسين" --milestone "الدفعة ١ — تسمية وتوصيل" >/dev/null
echo "  T-009"
gh issue create --repo "$REPO" --title "T-009 · اختيار المحامين بالبحث والتحديد المتعدد" --body-file "tickets/T-009.md" --label "frontend,تحسين" --milestone "الدفعة ١ — تسمية وتوصيل" >/dev/null
echo "  T-010"
gh issue create --repo "$REPO" --title "T-010 · توصيل شاشة المستخدمين بالـ API" --body-file "tickets/T-010.md" --label "frontend,حرج" --milestone "الدفعة ١ — تسمية وتوصيل" >/dev/null
echo "  T-011"
gh issue create --repo "$REPO" --title "T-011 · توصيل شاشة الملف الشخصي" --body-file "tickets/T-011.md" --label "frontend,حرج" --milestone "الدفعة ١ — تسمية وتوصيل" >/dev/null
echo "  T-012"
gh issue create --repo "$REPO" --title "T-012 · سجل التوكيلات" --body-file "tickets/T-012.md" --label "نموذج-بيانات,حرج,backend" --milestone "الدفعة ٢ — نموذج البيانات" >/dev/null
echo "  T-013"
gh issue create --repo "$REPO" --title "T-013 · رقم الدعوى بالسنة القضائية ودرجة التقاضي" --body-file "tickets/T-013.md" --label "نموذج-بيانات,backend" --milestone "الدفعة ٢ — نموذج البيانات" >/dev/null
echo "  T-014"
gh issue create --repo "$REPO" --title "T-014 · نتيجة الجلسة كقائمة محدّدة" --body-file "tickets/T-014.md" --label "نموذج-بيانات,backend" --milestone "الدفعة ٢ — نموذج البيانات" >/dev/null
echo "  T-015"
gh issue create --repo "$REPO" --title "T-015 · تصحيح المصطلحات المهنية" --body-file "tickets/T-015.md" --label "i18n,frontend" --milestone "الدفعة ٢ — نموذج البيانات" >/dev/null
echo "  T-016"
gh issue create --repo "$REPO" --title "T-016 · استكمال أنواع القضايا" --body-file "tickets/T-016.md" --label "نموذج-بيانات,backend" --milestone "الدفعة ٢ — نموذج البيانات" >/dev/null
echo "  T-017"
gh issue create --repo "$REPO" --title "T-017 · تبويب الجلسات: إنشاء وفلترة وبحث" --body-file "tickets/T-017.md" --label "frontend,backend,ميزة" --milestone "الدفعة ٢ — نموذج البيانات" >/dev/null
echo "  T-018"
gh issue create --repo "$REPO" --title "T-018 · تقسيم practice_api.py إلى راوترات" --body-file "tickets/T-018.md" --label "إعادة-هيكلة,backend" --milestone "الدفعة ٣ — الصلاحيات" >/dev/null
echo "  T-019"
gh issue create --repo "$REPO" --title "T-019 · الصلاحيات المرنة: حصر رؤية القضايا" --body-file "tickets/T-019.md" --label "أمان,ميزة,backend" --milestone "الدفعة ٣ — الصلاحيات" >/dev/null
echo "  T-020"
gh issue create --repo "$REPO" --title "T-020 · فاتورة PDF قابلة للطباعة" --body-file "tickets/T-020.md" --label "ميزة,backend,حرج" --milestone "الدفعة ٤ — إغلاق دورة العمل" >/dev/null
echo "  T-021"
gh issue create --repo "$REPO" --title "T-021 · سطر الضريبة على الفواتير" --body-file "tickets/T-021.md" --label "ميزة,امتثال,backend" --milestone "الدفعة ٤ — إغلاق دورة العمل" >/dev/null
echo "  T-022"
gh issue create --repo "$REPO" --title "T-022 · استيراد الموكّلين والقضايا من CSV" --body-file "tickets/T-022.md" --label "ميزة,تبنّي" --milestone "الدفعة ٤ — إغلاق دورة العمل" >/dev/null
echo "  E-1"
gh issue create --repo "$REPO" --title "E-1 · بوابة الموكّل" --body-file "tickets/E-1.md" --label "محجوبة" --milestone "محجوبة على قرار" >/dev/null
echo "  E-2"
gh issue create --repo "$REPO" --title "E-2 · الـ worker والتنبيهات" --body-file "tickets/E-2.md" --label "محجوبة" --milestone "محجوبة على قرار" >/dev/null
echo "  E-3"
gh issue create --repo "$REPO" --title "E-3 · تطبيق المحامي" --body-file "tickets/E-3.md" --label "محجوبة" --milestone "محجوبة على قرار" >/dev/null
echo "  E-4"
gh issue create --repo "$REPO" --title "E-4 · الأوف لاين" --body-file "tickets/E-4.md" --label "محجوبة" --milestone "محجوبة على قرار" >/dev/null
echo""
echo "تم. راجع:  gh issue list --repo $REPO --limit 40"
