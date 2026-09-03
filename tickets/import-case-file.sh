#!/usr/bin/env bash
# استيراد تذاكر إصلاح ملف القضية (T-044 .. T-046). مرة واحدة فقط.
set -euo pipefail
REPO="adhamesam82-hue/Legal-Rag-System"
gh auth status >/dev/null 2>&1 || { echo "شغّل أولًا: gh auth login"; exit 1; }
cd "$(dirname "$0")/.."
for l in "حرج:D93F0B" "frontend:0E8A16" "backend:1D76DB" "i18n:FBCA04" "قرار:5319E7" "محجوب:BFDADC"; do
  gh label create "${l%%:*}" --color "${l##*:}" --repo "$REPO" --force >/dev/null 2>&1 || true
done
M="ملف القضية — إصلاح ما بعد الدفعة ٥"
gh api "repos/$REPO/milestones" -f title="$M" -f description="تجربة المالك ٣ سبتمبر ٢٠٢٦: الحقول الستة بلا باب لإنشاء سجلها" >/dev/null 2>&1 || true
mk() { echo "  $1"; gh issue create --repo "$REPO" --title "$1 · $2" --body-file "tickets/$1.md" --label "$3" --milestone "$M" >/dev/null; }
mk T-044 "إنشاء السجل القضائي من داخل الملف — لا باب له اليوم"                          "backend,frontend,حرج"
mk T-045 "مسار /cases اسمه «قضايا» ومحتواه «جلسات» — يُسمّى باسمه"                       "frontend,i18n"
mk T-046 "قرار مؤجَّل: أين تعيش الحقول الستة — على السجل القضائي أم على الملف؟"           "قرار,محجوب"
echo "تم."
