#!/usr/bin/env bash
# استيراد تذاكر مسار الدخول والتسجيل (T-037 .. T-042). مرة واحدة فقط.
set -euo pipefail
REPO="adhamesam82-hue/Legal-Rag-System"
gh auth status >/dev/null 2>&1 || { echo "شغّل أولًا: gh auth login"; exit 1; }
cd "$(dirname "$0")/.."
for l in "حرج:D93F0B" "frontend:0E8A16" "backend:1D76DB" "i18n:FBCA04" "ميزة:0E8A16" "تبنّي:FEF2C0"; do
  gh label create "${l%%:*}" --color "${l##*:}" --repo "$REPO" --force >/dev/null 2>&1 || true
done
M="مسار الدخول والتسجيل — أولوية"
gh api "repos/$REPO/milestones" -f title="$M" -f description="مراجعة مسار الدخول ٢ سبتمبر ٢٠٢٦ — تسبق الدفعة ٥" >/dev/null 2>&1 || true
mk() { echo "  $1"; gh issue create --repo "$REPO" --title "$1 · $2" --body-file "tickets/$1.md" --label "$3" --milestone "$M" >/dev/null; }
mk T-037 "باب إنشاء الحساب: من صفحة الهبوط ومن شاشة الدخول"              "frontend,حرج,تبنّي"
mk T-038 "استعادة كلمة المرور"                                            "frontend,حرج"
mk T-039 "شاشات الدخول والتسجيل والدعوة إلى كتالوج الترجمة"               "frontend,i18n"
mk T-040 "شاشة إنشاء المكتب: إزالة أمر المطوّر وجمع ما يعرّف المكتب"      "frontend,تبنّي"
mk T-041 "الباقات والتجربة المجانية وبوابة الدفع — هيكل صادق قبل القرار"  "backend,frontend,ميزة"
mk T-042 "أكواد الخصم وقسم العروض في صفحة الهبوط"                         "backend,frontend,ميزة"
echo "تم."
