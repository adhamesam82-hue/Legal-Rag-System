"""Seeds a sample firm into the practice tables.

This is the content that used to live in web/lib/legalos-data.ts as a
hard-coded TypeScript module. It is sample data, not real firm data -- the
same caveat that file carried applies here, it just lives in Postgres now so
the UI exercises real queries, real ids and real writes.

The content is Arabic, because the firm it portrays is Egyptian: a Cairo
practice's client names, matter titles, court papers and file notes are
written in Arabic whichever language its software happens to be set to. The
UI chrome around it still follows the locale toggle -- an English-language
session shows English labels over this same Arabic record. Only the parts a
real file would keep in Latin script stay that way: slugs (they are ids and
URL segments), enum values (the UI translates those from catalogs), e-mail
addresses, file formats and invoice references.

Run:
    uv run python scripts/seed_demo_firm.py
    uv run python scripts/seed_demo_firm.py --reset --owner-email you@example.com
    uv run python scripts/seed_demo_firm.py --reset --owner-clerk-id user_2abc...

Without an owner argument the team is seeded under placeholder ids
(seed_ahmed_al_sayed and friends), which no real Clerk account maps to: you can
browse the data with LEGALOS_DEV_AUTH set, but a signed-in user will not see
this firm. Passing --owner-email (or --owner-clerk-id) rebinds the Owner seat
to a real account, so signing in lands in a populated firm.
"""
from __future__ import annotations

import argparse
from datetime import date
from decimal import Decimal

import httpx
import psycopg

from legalrag.config import get_clerk_secret_key
from legalrag.db import get_connection

FIRM_NAME = "السيد وشركاه للمحاماة والاستشارات القانونية"

# Names this same demo firm has been seeded under before. --reset clears these
# too, so renaming the firm replaces it rather than seeding a second one.
FORMER_FIRM_NAMES = ["Al-Sayed & Partners"]

# (clerk id, role, display name, title, email)
#
# The address is what the daily reminder sweep delivers to. Seeded members had
# none, so a local run of the sweep reported the whole demo firm as
# undeliverable every morning -- which buries a real one when it appears.
# example.com is reserved by RFC 2606 and cannot receive mail, which is the
# point: these are demo people.
TEAM = [
    ("seed_ahmed_al_sayed", "owner", "أحمد السيد", "الشريك المدير", "ahmed@example.com"),
    ("seed_mona_farouk", "lawyer", "منى فاروق", "محامية أولى", "mona@example.com"),
    ("seed_youssef_adel", "lawyer", "يوسف عادل", "محامٍ", "youssef@example.com"),
    ("seed_layla_hassan", "staff", "ليلى حسن", "مساعدة قانونية", "layla@example.com"),
]

AHMED, MONA, YOUSSEF, LAYLA = (member[0] for member in TEAM)

CLIENTS = [
    {
        "slug": "nile-trading",
        "name": "شركة النيل للتجارة",
        "client_type": "company",
        "industry": "الاستيراد والتصدير",
        "status": "active",
        "client_since": date(2022, 3, 14),
        "registration_number": "س.ت 88213 — القاهرة",
        "tax_id": "300-215-664",
        "address": "12 كورنيش النيل، المعادي، القاهرة",
        "phone": "+20 2 2519 4432",
        "email": "legal@niletradingco.com",
        "notes": "عميل قديم للمكتب. يفضّل إرسال صورة من كل مذكرة تُقدَّم للمحكمة إلى المستشار القانوني للشركة مباشرةً.",
        "contacts": [
            ("كريم فهمي", "المستشار القانوني", "k.fahmy@niletradingco.com", "+20 100 555 2010", True),
            ("رانيا سامي", "المدير المالي", "r.samy@niletradingco.com", "+20 100 555 2044", False),
        ],
    },
    {
        "slug": "delta-foods",
        "name": "شركة دلتا للأغذية",
        "client_type": "company",
        "industry": "تصنيع وتوزيع الأغذية",
        "status": "active",
        "client_since": date(2023, 6, 2),
        "registration_number": "س.ت 51092 — الجيزة",
        "tax_id": "301-884-119",
        "address": "المنطقة الصناعية الأولى، مدينة 6 أكتوبر، الجيزة",
        "phone": "+20 2 3821 7765",
        "email": "contact@deltafoods.eg",
        "notes": "قضيتان جاريتان في وقت واحد: مراجعة عقود اعتيادية، ونزاع عمالي منظور أمام المحكمة.",
        "contacts": [
            ("تامر جابر", "مدير الموارد البشرية", "t.gaber@deltafoods.eg", "+20 101 442 8830", True),
            ("نورهان عزت", "مدير العمليات", "n.ezzat@deltafoods.eg", "+20 101 442 8871", False),
        ],
    },
    {
        "slug": "khalil-holdings",
        "name": "مجموعة خليل القابضة",
        "client_type": "company",
        "industry": "أنشطة قابضة متنوعة",
        "status": "active",
        "client_since": date(2021, 11, 20),
        "registration_number": "س.ت 40217 — القاهرة",
        "tax_id": "299-733-502",
        "address": "أبراج نايل سيتي، رملة بولاق، القاهرة",
        "phone": "+20 2 2461 9900",
        "email": "counsel@khalilholdings.com",
        "notes": None,
        "contacts": [
            ("حسام خليل", "رئيس مجلس الإدارة", "h.khalil@khalilholdings.com", "+20 100 111 7620", True),
            ("نادية خليل", "المدير المالي للمجموعة", "n.khalil@khalilholdings.com", "+20 100 111 7644", False),
        ],
    },
    {
        "slug": "al-amal-trading",
        "name": "شركة الأمل للتجارة",
        "client_type": "company",
        "industry": "تجارة الجملة والتجزئة",
        "status": "active",
        "client_since": date(2024, 1, 9),
        "registration_number": "س.ت 77410 — القاهرة",
        "tax_id": "302-556-284",
        "address": "18 شارع المرغني، مصر الجديدة، القاهرة",
        "phone": "+20 2 2418 3350",
        "email": "info@alamaltrading.eg",
        "notes": None,
        "contacts": [
            ("شريف نبيل", "المالك", "sherif@alamaltrading.eg", "+20 122 340 5511", True),
        ],
    },
    {
        "slug": "el-sayed-estate",
        "name": "تركة المرحوم محمود السيد",
        "client_type": "individual",
        "industry": "تركة خاصة",
        "status": "active",
        "client_since": date(2025, 9, 1),
        "registration_number": None,
        "tax_id": None,
        "address": "9 شارع جامعة الدول العربية، المهندسين، الجيزة",
        "phone": "+20 100 222 8890",
        "email": "farida.elsayed@gmail.com",
        "notes": "قضية أسرة حساسة — يقتصر التواصل على الأستاذة فريدة السيد وحدها.",
        "contacts": [
            ("فريدة السيد", "وكيلة الورثة", "farida.elsayed@gmail.com", "+20 100 222 8890", True),
        ],
    },
    {
        "slug": "zahran-construction",
        "name": "مجموعة زهران للمقاولات",
        "client_type": "company",
        "industry": "المقاولات والتطوير العقاري",
        "status": "active",
        "client_since": date(2023, 2, 27),
        "registration_number": "س.ت 63305 — القاهرة",
        "tax_id": "300-990-441",
        "address": "نيو كايرو بيزنس بارك، مبنى 4، القاهرة الجديدة",
        "phone": "+20 2 2758 6120",
        "email": "legal@zahrancg.com",
        "notes": None,
        "contacts": [
            ("عمر زهران", "العضو المنتدب", "o.zahran@zahrancg.com", "+20 122 987 1145", True),
        ],
    },
    {
        "slug": "samir-nassar",
        "name": "سمير نصار",
        "client_type": "individual",
        "industry": "مستشار مستقل",
        "status": "inactive",
        "client_since": date(2024, 5, 18),
        "registration_number": None,
        "tax_id": None,
        "address": "22 شارع سوريا، المهندسين، الجيزة",
        "phone": "+20 122 604 7731",
        "email": "samir.nassar@outlook.com",
        "notes": None,
        "contacts": [
            ("سمير نصار", "بصفته الشخصية", "samir.nassar@outlook.com", "+20 122 604 7731", True),
        ],
    },
]

MATTERS = [
    {
        "slug": "nabil-v-nile-trading",
        "name": "نبيل ضد شركة النيل للتجارة",
        "client": "nile-trading",
        "matter_type": "litigation",
        "status": "active",
        "responsible_user": MONA,
        "staff": [LAYLA],
        "opened_date": date(2025, 11, 3),
        "closed_date": None,
        "description": (
            "نزاع تجاري حول إخلال مزعوم بعقد توزيع. شركة النيل للتجارة هي المدعى عليها، "
            "والمدعي أحمد نبيل يطالب بتعويض قدره 2.4 مليون جنيه مع فسخ العقد. القضية "
            "الآن في مرحلة الإثبات أمام محكمة القاهرة الاقتصادية."
        ),
        "billing_type": "hourly",
        "budget_amount": Decimal("180000"),
        "budget_is_estimate": True,
        "tags": ["تجاري", "إخلال بالعقد", "محكمة اقتصادية"],
    },
    {
        "slug": "delta-foods-nda-review",
        "name": "مراجعة اتفاقية عدم إفشاء — دلتا للأغذية",
        "client": "delta-foods",
        "matter_type": "contract_review",
        "status": "closed",
        "responsible_user": YOUSSEF,
        "staff": [],
        "opened_date": date(2026, 6, 10),
        "closed_date": date(2026, 6, 24),
        "description": (
            "مراجعة اتفاقية عدم إفشاء متبادلة مع شريك تعبئة محتمل. أظهرت المراجعة "
            "المدعومة بالذكاء الاصطناعي خروجَين عن نموذج المكتب المعتمد (حد المسؤولية "
            "وشرط الاختصاص القضائي)، وجرت تسويتهما مع الطرف الآخر قبل التوقيع."
        ),
        "billing_type": "fixed_fee",
        "budget_amount": Decimal("12000"),
        "budget_is_estimate": False,
        "tags": ["عدم إفشاء", "عقود تجارية"],
    },
    {
        "slug": "delta-foods-labour-dispute",
        "name": "نزاع عمالي — دلتا للأغذية",
        "client": "delta-foods",
        "matter_type": "litigation",
        "status": "active",
        "responsible_user": YOUSSEF,
        "staff": [LAYLA],
        "opened_date": date(2026, 4, 18),
        "closed_date": None,
        "description": (
            "دعوى جماعية من سبعة عمال سابقين بخطوط الإنتاج يدّعون الفصل التعسفي أثناء "
            "تقليص حجم المصنع. وتتمسك دلتا للأغذية بأن إنهاء الخدمة تم وفق إجراءات "
            "مكافأة نهاية الخدمة المقررة في قانون العمل رقم 14 لسنة 2025. القضية محجوزة "
            "للحكم أمام محكمة العمل بالقاهرة."
        ),
        "billing_type": "hourly",
        "budget_amount": Decimal("95000"),
        "budget_is_estimate": True,
        "tags": ["عمالي", "فصل تعسفي", "محكمة العمل"],
    },
    {
        "slug": "khalil-tax-objection",
        "name": "تظلم ضريبي — مجموعة خليل القابضة",
        "client": "khalil-holdings",
        "matter_type": "tax",
        "status": "active",
        "responsible_user": AHMED,
        "staff": [],
        "opened_date": date(2026, 5, 22),
        "closed_date": None,
        "description": (
            "تظلم رسمي من إعادة تقدير الضريبة عن السنة الضريبية 2025 الصادرة من مصلحة "
            "الضرائب المصرية على الإقرار المجمّع لمجموعة خليل القابضة، طعنًا في تعديل "
            "قدره 3.1 مليون جنيه على أسعار التحويل بين الشركات الشقيقة."
        ),
        "billing_type": "hourly",
        "budget_amount": Decimal("60000"),
        "budget_is_estimate": True,
        "tags": ["ضرائب", "أسعار التحويل"],
    },
    {
        "slug": "al-amal-commercial-registration",
        "name": "تجديد السجل التجاري — شركة الأمل للتجارة",
        "client": "al-amal-trading",
        "matter_type": "corporate",
        "status": "active",
        "responsible_user": AHMED,
        "staff": [LAYLA],
        "opened_date": date(2026, 6, 30),
        "closed_date": None,
        "description": (
            "تجديد السجل التجاري لشركة الأمل للتجارة وتعديل أنشطة الرخصة لتشمل التوزيع "
            "عبر التجارة الإلكترونية، تمهيدًا لإطلاق متجر إلكتروني جديد."
        ),
        "billing_type": "fixed_fee",
        "budget_amount": Decimal("8500"),
        "budget_is_estimate": False,
        "tags": ["شركات", "تراخيص"],
    },
    {
        "slug": "el-sayed-estate-partition",
        "name": "قسمة تركة المرحوم محمود السيد",
        "client": "el-sayed-estate",
        "matter_type": "family_probate",
        "status": "active",
        "responsible_user": AHMED,
        "staff": [],
        "opened_date": date(2025, 9, 15),
        "closed_date": None,
        "description": (
            "قسمة تركة المرحوم محمود السيد بين أربعة ورثة، وتشمل عقارًا سكنيًا "
            "بالمهندسين وحصة أقلية في شركة تجارية عائلية. القضية الآن في وساطة تحت "
            "إشراف محكمة الأسرة بالجيزة."
        ),
        "billing_type": "retainer",
        "budget_amount": Decimal("45000"),
        "budget_is_estimate": False,
        "tags": ["أحوال شخصية", "تركات", "قسمة تركة"],
    },
    {
        "slug": "zahran-contract-dispute",
        "name": "نزاع تعاقدي — مجموعة زهران للمقاولات",
        "client": "zahran-construction",
        "matter_type": "litigation",
        "status": "on_hold",
        "responsible_user": MONA,
        "staff": [],
        "opened_date": date(2025, 8, 11),
        "closed_date": None,
        "description": (
            "نزاع مع مورّد أسمنت بسبب تأخر التوريدات في مشروع سكني بالقاهرة الجديدة. "
            "أوقِف السير في الدعوى لحين استكمال مفاوضات التسوية المباشرة بين الطرفين."
        ),
        "billing_type": "hourly",
        "budget_amount": Decimal("70000"),
        "budget_is_estimate": True,
        "tags": ["تجاري", "مقاولات", "نزاع مع مورّد"],
    },
    {
        "slug": "samir-nassar-consulting-agreement",
        "name": "مراجعة عقد استشارات — سمير نصار",
        "client": "samir-nassar",
        "matter_type": "contract_review",
        "status": "closed",
        "responsible_user": YOUSSEF,
        "staff": [],
        "opened_date": date(2025, 5, 2),
        "closed_date": date(2025, 5, 14),
        "description": (
            "مراجعة عقد استشارات مستقل مع عميل متعدد الجنسيات، بالتركيز على التنازل عن "
            "حقوق الملكية الفكرية ونطاق شرط عدم المنافسة."
        ),
        "billing_type": "fixed_fee",
        "budget_amount": Decimal("6000"),
        "budget_is_estimate": False,
        "tags": ["مراجعة عقود", "استشارات"],
    },
]

CASES = [
    {
        "matter": "nabil-v-nile-trading",
        "court": "محكمة القاهرة الاقتصادية",
        "judge": "المستشار هشام فتحي",
        "case_number": "1345 لسنة 2026 — اقتصادية القاهرة",
        "status": "جارية — مرحلة الإثبات",
        "opposing_party": "أحمد نبيل (شخص طبيعي، مدّعٍ)",
        "opposing_counsel": "الأستاذة سامية رضا — مكتب رضا وشركاه",
        "filed_date": date(2025, 11, 3),
        "ai_summary": (
            "تقرير الخبير المنتدب من المحكمة (المودع في 14 يوليو 2026) هو أقوى تطور في "
            "صالحنا: انتهى إلى أن حساب التعويض المطالب به مبالغ فيه بنحو 40% لسبب رئيسي "
            "هو احتساب مصروفات الشحن مرتين. يوصى ببناء مذكرة الاستئناف على ما انتهى إليه "
            "الخبير وعلى سجلات التسليم المقدمة بالفعل ضمن أوراق الإثبات، بدل إعادة فتح "
            "مسألة الإخلال من جديد."
        ),
        "timeline": [
            (date(2025, 11, 3), "رفع الدعوى", "أقام المدعي دعوى إخلال بالعقد بطلب تعويض قدره 2.4 مليون جنيه."),
            (date(2025, 12, 1), "الجلسة الأولى", "حددت المحكمة جدول تبادل المستندات."),
            (date(2026, 2, 18), "إيداع مذكرة الدفاع", "قُدمت مذكرة تنكر الإخلال وتطعن في حساب التعويض."),
            (date(2026, 5, 6), "ندب خبير", "ندبت المحكمة خبيرًا محاسبيًا لتقدير التعويض المطالب به."),
            (date(2026, 7, 14), "ورود تقرير الخبير", "انتهى تقرير الخبير إلى أن التعويض المطالب به مبالغ فيه بنحو 40%."),
        ],
        "deadlines": [
            ("إيداع مذكرة الاستئناف", date(2026, 8, 2)),
            ("تقديم الرد على تقرير الخبير", date(2026, 8, 8)),
        ],
        "evidence": [
            ("عقد التوزيع (الأصل الموقّع)", "عقد", "us", date(2025, 11, 20)),
            ("سجلات التسليم — الربع الثالث 2025", "سجلات تجارية", "us", date(2025, 12, 15)),
            ("مراسلات بريد إلكتروني بشأن تأخر التسليم", "مراسلات", "opposing_party", date(2026, 1, 10)),
            ("تقرير الخبير المحاسبي المنتدب", "تقرير خبرة", "court", date(2026, 7, 14)),
        ],
        "court_documents": [
            ("صحيفة الدعوى", "إيداع", date(2025, 11, 3)),
            ("مذكرة الدفاع", "إيداع", date(2026, 2, 18)),
            ("تقرير الخبير", "قرار محكمة", date(2026, 7, 14)),
        ],
    },
    {
        "matter": "delta-foods-labour-dispute",
        "court": "محكمة العمل بالقاهرة",
        "judge": "المستشارة ميرفت شوقي",
        "case_number": "892 لسنة 2026 — عمال القاهرة",
        "status": "جارية — محجوزة للحكم",
        "opposing_party": "سبعة عمال سابقين (دعوى جماعية)",
        "opposing_counsel": "الأستاذ طارق يونس",
        "filed_date": date(2026, 4, 18),
        "ai_summary": (
            "حسابات مكافأة نهاية الخدمة المودعة في 20 يوليو 2026 تطابق الحدود الدنيا "
            "المقررة في قانون العمل رقم 14 لسنة 2025 بالنسبة للعمال السبعة جميعًا، وهو "
            "دفع إجرائي قوي. والخطر القائم هو توثيق سبب إنهاء الخدمة بشكل فردي لاثنين من "
            "السبعة — يوصى بمراجعة هذين الملفين قبل جلسة المرافعة الختامية في 12 أغسطس 2026."
        ),
        "timeline": [
            (date(2026, 4, 18), "رفع الدعوى", "سبعة مدّعين يدّعون الفصل التعسفي أثناء تقليص العمالة."),
            (date(2026, 5, 5), "محاولة وساطة", "فشلت وساطة مكتب العمل في التوصل إلى تسوية."),
            (date(2026, 6, 2), "الجلسة الأولى", "طلبت المحكمة من دلتا للأغذية مستندات مكافأة نهاية الخدمة كاملة."),
            (date(2026, 7, 20), "إيداع المستندات", "أودعت حسابات مكافأة نهاية الخدمة وإخطارات إنهاء الخدمة بالمحكمة."),
        ],
        "deadlines": [("الرد على طلب المستندات", date(2026, 8, 4))],
        "evidence": [
            ("إخطارات إنهاء الخدمة (7)", "سجلات موارد بشرية", "us", date(2026, 7, 20)),
            ("كشوف حساب مكافأة نهاية الخدمة", "سجلات مالية", "us", date(2026, 7, 20)),
            ("المذكرة المشتركة للمدّعين", "مذكرة", "opposing_party", date(2026, 4, 18)),
        ],
        "court_documents": [
            ("صحيفة الدعوى", "إيداع", date(2026, 4, 18)),
            ("مذكرة الرد", "إيداع", date(2026, 6, 2)),
        ],
    },
    {
        "matter": "el-sayed-estate-partition",
        "court": "محكمة الأسرة بالجيزة",
        "judge": "المستشارة أمل زكي",
        "case_number": "456 لسنة 2026 — أسرة الجيزة",
        "status": "جارية — وساطة",
        "opposing_party": "الورثة الشركاء (ثلاثة، لكلٍّ وكيله)",
        "opposing_counsel": None,
        "filed_date": date(2025, 9, 15),
        "ai_summary": (
            "أبدى وكلاء الورثة الثلاثة جميعًا انفتاحًا على شراء حصة الأقلية في الشركة "
            "نقدًا بدلًا من القسمة العينية، وهو ما يبسّط قسمة العقار إلى حد كبير. يوصى "
            "بعرض صفقة شراء مبنية على تقدير المحكمة البالغ 1.6 مليون جنيه في جلسة "
            "الوساطة المحددة في 5 أغسطس 2026."
        ),
        "timeline": [
            (date(2025, 9, 15), "إيداع دعوى القسمة", "أقيمت الدعوى نيابة عن وكيلة الورثة فريدة السيد."),
            (date(2025, 10, 20), "الأمر بتقدير الأصول", "أمرت المحكمة بتقدير مستقل لعقار المهندسين."),
            (date(2026, 3, 11), "ورود تقرير التقدير", "قُدّر العقار بمبلغ 9.2 مليون جنيه وحصة الشركة بمبلغ 1.6 مليون جنيه."),
            (date(2026, 6, 1), "فتح باب الوساطة", "أحالت المحكمة الطرفين إلى الوساطة بشأن التصرف في العقار."),
        ],
        "deadlines": [("جلسة الوساطة", date(2026, 8, 5))],
        "evidence": [
            ("تقرير تقدير العقار", "تقدير", "court", date(2026, 3, 11)),
            ("تقدير حصة الشركة", "تقدير", "court", date(2026, 3, 11)),
            ("إعلام الوراثة", "محرر رسمي", "us", date(2025, 9, 15)),
        ],
        "court_documents": [
            ("صحيفة دعوى القسمة", "إيداع", date(2025, 9, 15)),
            ("تقرير التقدير", "قرار محكمة", date(2026, 3, 11)),
        ],
    },
    {
        "matter": "zahran-contract-dispute",
        "court": "محكمة القاهرة الاقتصادية",
        "judge": "المستشارة نبيلة رشدي",
        "case_number": "2210 لسنة 2025 — اقتصادية القاهرة",
        "status": "موقوفة — في انتظار مفاوضات التسوية",
        "opposing_party": "شركة الفؤاد لتوريد الأسمنت",
        "opposing_counsel": "الأستاذ باسم فرج",
        "filed_date": date(2025, 8, 11),
        "ai_summary": (
            "لا يوجد نشاط قضائي منذ وقف السير في الدعوى في يناير. يوصى بمراجعة الموقف مع "
            "العميل قبل إعادة تحريك الدعوى، أو تركها نهائيًا إذا اكتملت التسوية."
        ),
        "timeline": [
            (date(2025, 8, 11), "رفع الدعوى", "تدّعي زهران للمقاولات أن تأخر التوريد تسبب في تجاوز جدول المشروع بستة أسابيع."),
            (date(2025, 10, 2), "الجلسة الأولى", "أجّلت المحكمة الدعوى بناءً على طلب الطرفين للسعي في التسوية."),
            (date(2026, 1, 15), "وقف السير في الدعوى", "أُوقفت الدعوى لحين استكمال مفاوضات التسوية المباشرة."),
        ],
        "deadlines": [],
        "evidence": [
            ("عقد التوريد (الأصل)", "عقد", "us", date(2025, 8, 11)),
            ("سجل تأخر التوريدات", "سجلات تجارية", "us", date(2025, 8, 11)),
        ],
        "court_documents": [("صحيفة الدعوى", "إيداع", date(2025, 8, 11))],
    },
]

# (matter, name, doc_type, uploaded_by, uploaded_at, size_bytes, status)
DOCUMENTS = [
    ("nabil-v-nile-trading", "عقد التوزيع (الأصل الموقّع)", "PDF", MONA, date(2025, 11, 5), 1_258_291, "final"),
    ("nabil-v-nile-trading", "مذكرة الدفاع — المسودة الثالثة", "DOCX", MONA, date(2026, 2, 15), 348_160, "filed"),
    ("nabil-v-nile-trading", "سجلات التسليم — الربع الثالث 2025", "XLSX", LAYLA, date(2025, 12, 12), 90_112, "final"),
    ("nabil-v-nile-trading", "تقرير الخبير المحاسبي — نسخة معلّق عليها", "PDF", MONA, date(2026, 7, 16), 2_516_582, "under_review"),
    ("nabil-v-nile-trading", "مذكرة الاستئناف — مسودة", "DOCX", MONA, date(2026, 7, 28), 215_040, "draft"),
    ("nabil-v-nile-trading", "توكيل العميل", "PDF", AHMED, date(2025, 11, 4), 153_600, "signed"),
    ("delta-foods-nda-review", "اتفاقية عدم الإفشاء المتبادلة — النسخة الموقّعة", "PDF", YOUSSEF, date(2026, 6, 24), 419_840, "signed"),
    ("delta-foods-nda-review", "بيان الفروق مقارنةً بالنموذج المعتمد", "DOCX", YOUSSEF, date(2026, 6, 18), 97_280, "final"),
    ("delta-foods-labour-dispute", "إخطارات إنهاء الخدمة (7 مجمّعة)", "PDF", LAYLA, date(2026, 7, 20), 696_320, "filed"),
    ("delta-foods-labour-dispute", "كشوف حساب مكافأة نهاية الخدمة", "XLSX", YOUSSEF, date(2026, 7, 20), 122_880, "filed"),
    ("delta-foods-labour-dispute", "ملفات العاملين — تحت المراجعة", "ZIP", LAYLA, date(2026, 7, 29), 5_347_737, "under_review"),
    ("khalil-tax-objection", "إخطار إعادة التقدير من مصلحة الضرائب", "PDF", AHMED, date(2026, 5, 22), 307_200, "final"),
    ("khalil-tax-objection", "دراسة أسعار التحويل", "PDF", AHMED, date(2026, 6, 10), 1_887_437, "under_review"),
    ("al-amal-commercial-registration", "طلب تجديد الرخصة التجارية", "PDF", LAYLA, date(2026, 7, 1), 225_280, "draft"),
    ("el-sayed-estate-partition", "تقرير تقدير العقار", "PDF", AHMED, date(2026, 3, 11), 1_153_434, "final"),
    ("el-sayed-estate-partition", "إعلام الوراثة", "PDF", AHMED, date(2025, 9, 16), 97_280, "final"),
    ("zahran-contract-dispute", "عقد التوريد (الأصل)", "PDF", MONA, date(2025, 8, 11), 552_960, "final"),
    ("samir-nassar-consulting-agreement", "عقد الاستشارات — النسخة النهائية", "PDF", YOUSSEF, date(2025, 5, 14), 184_320, "signed"),
]

# (matter, date, time, court, purpose, outcome)
HEARINGS = [
    ("nabil-v-nile-trading", date(2025, 12, 1), "10:00 ص", "محكمة القاهرة الاقتصادية", "الجلسة الأولى — تحديد جدول الإثبات", "حُدد الجدول، دون حكم"),
    ("nabil-v-nile-trading", date(2026, 2, 18), "10:30 ص", "محكمة القاهرة الاقتصادية", "نظر مذكرة الدفاع", "قُبلت للإيداع"),
    ("nabil-v-nile-trading", date(2026, 5, 6), "9:30 ص", "محكمة القاهرة الاقتصادية", "جلسة ندب الخبير", "نُدب خبير محاسبي"),
    ("nabil-v-nile-trading", date(2026, 8, 10), "10:00 ص", "محكمة القاهرة الاقتصادية", "نظر مستندات الإثبات", None),
    ("delta-foods-labour-dispute", date(2026, 6, 2), "1:00 م", "محكمة العمل بالقاهرة", "الجلسة الأولى — طلب مستندات", None),
    ("delta-foods-labour-dispute", date(2026, 8, 12), "1:30 م", "محكمة العمل بالقاهرة", "المرافعة الختامية", None),
    ("el-sayed-estate-partition", date(2026, 6, 1), "11:00 ص", "محكمة الأسرة بالجيزة", "الإحالة إلى الوساطة", None),
    ("el-sayed-estate-partition", date(2026, 8, 5), "11:00 ص", "محكمة الأسرة بالجيزة", "جلسة الوساطة", None),
    ("zahran-contract-dispute", date(2025, 10, 2), "10:00 ص", "محكمة القاهرة الاقتصادية", "الجلسة الأولى — تأجيل للتسوية", None),
]

# (matter, title, assignee, due_date, status, priority)
TASKS = [
    ("nabil-v-nile-trading", "صياغة مذكرة الاستئناف ردًّا على تقرير الخبير", MONA, date(2026, 8, 2), "in_progress", "high"),
    ("nabil-v-nile-trading", "إعداد حافظة مستندات الرد على تقرير الخبير المحاسبي", LAYLA, date(2026, 8, 6), "todo", "high"),
    ("nabil-v-nile-trading", "إحاطة العميل بما انتهى إليه تقرير الخبير", MONA, date(2026, 7, 30), "done", "medium"),
    ("nabil-v-nile-trading", "تأكيد ترتيبات الجلسة مع قلم الكتّاب", LAYLA, date(2026, 8, 8), "todo", "low"),
    ("delta-foods-labour-dispute", "الرد على طلب المستندات", YOUSSEF, date(2026, 8, 4), "in_progress", "high"),
    ("delta-foods-labour-dispute", "التحقق من توثيق سبب إنهاء الخدمة لمدّعيَين", LAYLA, date(2026, 8, 6), "todo", "high"),
    ("khalil-tax-objection", "إيداع صحيفة التظلم الضريبي", AHMED, date(2026, 8, 14), "todo", "high"),
    ("al-amal-commercial-registration", "تجديد السجل التجاري", LAYLA, date(2026, 8, 9), "in_progress", "medium"),
    ("el-sayed-estate-partition", "إعداد عرض شراء الحصة لجلسة الوساطة", AHMED, date(2026, 8, 5), "in_progress", "high"),
]

# (matter, user, date, hours, description, billable, rate)
TIME_ENTRIES = [
    ("nabil-v-nile-trading", MONA, date(2026, 7, 28), Decimal("3.5"), "صياغة مذكرة الاستئناف ردًّا على تقرير الخبير", True, Decimal("1800")),
    ("nabil-v-nile-trading", MONA, date(2026, 7, 17), Decimal("2.0"), "مراجعة تقرير الخبير المحاسبي والتعليق عليه", True, Decimal("1800")),
    ("nabil-v-nile-trading", LAYLA, date(2026, 7, 18), Decimal("1.5"), "تجميع حافظة الرد من واقع سجلات التسليم", True, Decimal("650")),
    ("nabil-v-nile-trading", MONA, date(2026, 5, 6), Decimal("1.0"), "حضور جلسة ندب الخبير", True, Decimal("1800")),
    ("nabil-v-nile-trading", MONA, date(2026, 2, 14), Decimal("4.0"), "صياغة مذكرة الدفاع", True, Decimal("1800")),
    ("delta-foods-labour-dispute", YOUSSEF, date(2026, 7, 29), Decimal("2.5"), "إعداد الرد على طلب المستندات", True, Decimal("1400")),
    ("delta-foods-labour-dispute", LAYLA, date(2026, 7, 25), Decimal("3.0"), "مطابقة ملفات العاملين على كشوف مكافأة نهاية الخدمة", True, Decimal("650")),
    ("khalil-tax-objection", AHMED, date(2026, 6, 10), Decimal("5.0"), "مراجعة دراسة أسعار التحويل في مواجهة إخطار إعادة التقدير", True, Decimal("2200")),
    ("el-sayed-estate-partition", AHMED, date(2026, 7, 22), Decimal("1.5"), "إعداد عرض شراء الحصة تمهيدًا للوساطة", True, Decimal("2200")),
]

# (matter, client, number, amount, status, issued, due)
INVOICES = [
    ("nabil-v-nile-trading", "nile-trading", "INV-2026-0142", Decimal("45500"), "paid", date(2026, 6, 1), date(2026, 6, 30)),
    ("nabil-v-nile-trading", "nile-trading", "INV-2026-0178", Decimal("38200"), "sent", date(2026, 7, 25), date(2026, 8, 24)),
    ("delta-foods-nda-review", "delta-foods", "INV-2026-0098", Decimal("12000"), "paid", date(2026, 6, 25), date(2026, 7, 25)),
    ("delta-foods-labour-dispute", "delta-foods", "INV-2026-0165", Decimal("21400"), "sent", date(2026, 7, 15), date(2026, 8, 14)),
    ("khalil-tax-objection", "khalil-holdings", "INV-2026-0151", Decimal("18700"), "overdue", date(2026, 6, 15), date(2026, 7, 15)),
    ("al-amal-commercial-registration", "al-amal-trading", "INV-2026-0182", Decimal("8500"), "draft", date(2026, 7, 29), date(2026, 8, 28)),
    ("el-sayed-estate-partition", "el-sayed-estate", "INV-2026-0110", Decimal("15000"), "paid", date(2026, 5, 1), date(2026, 5, 31)),
]

# (matter, author, date, content)
NOTES = [
    ("nabil-v-nile-trading", MONA, date(2026, 7, 16), "تقرير الخبير في صالحنا — التعويض مبالغ فيه بنحو 40% بسبب احتساب مصروفات الشحن مرتين. أُحيط العميل علمًا ووافق على خطة الاستئناف."),
    ("nabil-v-nile-trading", AHMED, date(2026, 7, 20), "تأكدت من كريم فهمي وجود متسع في الميزانية لأعمال مرحلة الاستئناف. لا تغيير في اتفاق الأتعاب."),
    ("delta-foods-labour-dispute", YOUSSEF, date(2026, 7, 26), "ملفان من ملفات العاملين (المدّعيان رقم 4 و6) خاليان من توثيق سبب إنهاء الخدمة — أتابع مع تامر جابر قبل المرافعة الختامية."),
    ("el-sayed-estate-partition", AHMED, date(2026, 6, 5), "فريدة السيد منفتحة على شراء حصة الشركة نقدًا إذا كان السعر عند تقدير المحكمة أو قريبًا منه."),
]

# (matter, client, actor, action, timestamp)
ACTIVITY = [
    ("nabil-v-nile-trading", "nile-trading", MONA, "رفعت تقرير الخبير المحاسبي بعد التعليق عليه", "2026-07-16 14:20"),
    ("nabil-v-nile-trading", "nile-trading", MONA, "بدأت صياغة مذكرة الاستئناف", "2026-07-28 09:05"),
    ("nabil-v-nile-trading", "nile-trading", LAYLA, "سجّلت ساعة ونصف في تجميع حافظة الرد", "2026-07-18 16:40"),
    ("nabil-v-nile-trading", "nile-trading", "system:ai", "نبّه في ملخص القضية إلى احتساب مصروفات الشحن مرتين في تقرير الخبير", "2026-07-16 15:02"),
    ("nabil-v-nile-trading", "nile-trading", AHMED, "أكّد ميزانية مرحلة الاستئناف مع العميل", "2026-07-20 11:15"),
    ("delta-foods-labour-dispute", "delta-foods", YOUSSEF, "أودع كشوف حساب مكافأة نهاية الخدمة بالمحكمة", "2026-07-20 10:30"),
    ("delta-foods-nda-review", "delta-foods", "system:ai", "أنهى مراجعة اتفاقية عدم الإفشاء — تنبيه على بندين مخالفين للنموذج المعتمد", "2026-06-18 12:00"),
    ("el-sayed-estate-partition", "el-sayed-estate", AHMED, "أعدّ عرض شراء الحصة لجلسة الوساطة القادمة", "2026-07-22 13:10"),
    ("al-amal-commercial-registration", "al-amal-trading", LAYLA, "قدّمت مسودة طلب تجديد الرخصة التجارية للمراجعة", "2026-07-01 09:45"),
    (None, "nile-trading", AHMED, "ضمّ منى فاروق إلى قضية نبيل ضد شركة النيل للتجارة", "2025-11-03 08:30"),
]

# (matter, date, label, detail, kind)
MATTER_TIMELINE = [
    ("nabil-v-nile-trading", date(2025, 11, 3), "فتح ملف القضية", "وقّع كريم فهمي خطاب التكليف.", "milestone"),
    ("nabil-v-nile-trading", date(2025, 11, 5), "استلام عقد التوزيع من العميل", None, "communication"),
    ("nabil-v-nile-trading", date(2025, 12, 1), "انعقاد الجلسة الأولى", "حددت المحكمة جدول تبادل المستندات.", "filing"),
    ("nabil-v-nile-trading", date(2026, 2, 18), "إيداع مذكرة الدفاع", None, "filing"),
    ("nabil-v-nile-trading", date(2026, 6, 1), "إرسال الفاتورة INV-2026-0142 وسدادها", None, "billing"),
    ("nabil-v-nile-trading", date(2026, 7, 14), "ورود تقرير الخبير — نتيجة في صالحنا", None, "milestone"),
    ("nabil-v-nile-trading", date(2026, 7, 20), "إحاطة العميل بخطة الاستئناف", None, "communication"),
    ("nabil-v-nile-trading", date(2026, 7, 25), "إرسال الفاتورة INV-2026-0178", None, "billing"),
    ("delta-foods-labour-dispute", date(2026, 4, 18), "فتح ملف القضية", None, "milestone"),
    ("delta-foods-labour-dispute", date(2026, 5, 5), "فشل محاولة الوساطة", None, "filing"),
    ("delta-foods-labour-dispute", date(2026, 7, 20), "إيداع مستندات مكافأة نهاية الخدمة", None, "filing"),
    ("el-sayed-estate-partition", date(2025, 9, 15), "فتح ملف القضية", "وقّعت فريدة السيد عقد الأتعاب.", "milestone"),
    ("el-sayed-estate-partition", date(2026, 3, 11), "ورود تقرير التقدير", None, "filing"),
    ("el-sayed-estate-partition", date(2026, 6, 1), "الإحالة إلى الوساطة", None, "milestone"),
]


# --- matter workspace (0007) ------------------------------------------------

# (matter, contact name, relationship, email, phone, is_bill_recipient)
# Parties who exist only on the matter — opposing counsel, experts, court
# staff — carry their own details; contacts on file at a client are attached
# separately below, by name.
MATTER_PARTIES = [
    ("nabil-v-nile-trading", "هشام نبيل", "خصم", "", "", False),
    ("nabil-v-nile-trading", "شريف زكي", "محامي الخصم", "s.zaki@zakilaw.example", "+20 2 2735 1180", False),
    ("nabil-v-nile-trading", "د. أميرة صبحي", "خبيرة منتدبة من المحكمة", "", "", False),
    ("delta-foods-labour-dispute", "محمود رشاد", "محامي الخصم", "m.rashad@rashad.example", "", False),
    ("khalil-tax-objection", "مصلحة الضرائب المصرية — مأمورية استثمار القاهرة", "جهة إدارية", "", "", False),
    ("el-sayed-estate-partition", "فريدة السيد", "وريثة شريكة", "", "", False),
]

# Contacts already on file at a client, attached to a matter by contact name.
# (matter, client, contact name, relationship, is_bill_recipient)
#
# "الموكّل", not "العميل": a law firm's client is a موكّل throughout this
# product (see PRODUCT.md's glossary and the T-005/T-015 rename). These three
# rows were missed by that rename, so the matter workspace showed the one
# screen where the old word was still on display.
MATTER_CLIENT_CONTACTS = [
    ("nabil-v-nile-trading", "nile-trading", "كريم فهمي", "الموكّل", True),
    ("delta-foods-labour-dispute", "delta-foods", "تامر جابر", "الموكّل", True),
    ("khalil-tax-objection", "khalil-holdings", "نادية خليل", "الموكّل", True),
]

# (matter, user, date, description, category, quantity, unit_amount, billable)
EXPENSES = [
    ("nabil-v-nile-trading", LAYLA, date(2026, 7, 15), "رسم رفع الاستئناف", "court_fees", Decimal("1"), Decimal("2400"), True),
    ("nabil-v-nile-trading", LAYLA, date(2026, 7, 16), "صور رسمية من تقرير الخبير", "filing", Decimal("6"), Decimal("85"), True),
    ("nabil-v-nile-trading", MONA, date(2026, 5, 6), "خدمة توصيل إلى محكمة القاهرة الاقتصادية", "courier", Decimal("2"), Decimal("120"), True),
    ("delta-foods-labour-dispute", YOUSSEF, date(2026, 7, 22), "رسم إيداع لدى مكتب العمل", "court_fees", Decimal("1"), Decimal("900"), True),
    ("khalil-tax-objection", AHMED, date(2026, 6, 12), "ترجمة محلّفة لدراسة أسعار التحويل", "translation", Decimal("34"), Decimal("110"), True),
    ("el-sayed-estate-partition", AHMED, date(2026, 3, 11), "تقدير مستقل لحصة الشركة", "expert", Decimal("1"), Decimal("12000"), True),
    ("nabil-v-nile-trading", MONA, date(2026, 7, 28), "غداء فريق العمل أثناء الإعداد للجلسة", "other", Decimal("1"), Decimal("450"), False),
]

# (matter, channel, direction, subject, body, counterparty, who, when, minutes)
COMMUNICATIONS = [
    ("nabil-v-nile-trading", "phone", "outgoing", "خطة الاستئناف", "شرحت لكريم مسألة احتساب الشحن مرتين في تقرير الخبير والجدول الزمني للاستئناف، ووافق على المضي قدمًا.", "كريم فهمي", MONA, "2026-07-20 11:15", 24),
    ("nabil-v-nile-trading", "email", "incoming", "رد: تقرير الخبير", "العميل يؤكد أن سجلات التسليم التي استندنا إليها في الرد هي المجموعة الكاملة.", "كريم فهمي", MONA, "2026-07-17 09:42", None),
    ("nabil-v-nile-trading", "email", "outgoing", "مذكرة الاستئناف للمراجعة", "أُرسلت مسودة مذكرة الاستئناف لملاحظات العميل قبل الإيداع في 12 أغسطس.", "كريم فهمي", MONA, "2026-07-29 17:05", None),
    ("nabil-v-nile-trading", "meeting", "outgoing", "اجتماع تمهيدي قبل الجلسة", "قابلت محامي الخصم بالمحكمة لحصر عناصر التعويض محل النزاع. لم يتم التوصل إلى اتفاق.", "شريف زكي", AHMED, "2026-07-24 10:00", 45),
    ("delta-foods-labour-dispute", "phone", "incoming", "ملفات عاملين ناقصة", "أكّد تامر أن الموارد البشرية تستخرج المستندين الناقصين الخاصين بسبب إنهاء الخدمة.", "تامر جابر", YOUSSEF, "2026-07-26 13:30", 12),
    ("delta-foods-labour-dispute", "letter", "incoming", "إخطار من مكتب العمل", "إخطار بتحديد موعد المرافعة الختامية.", "مكتب عمل القاهرة", LAYLA, "2026-07-18 00:00", None),
    ("khalil-tax-objection", "email", "outgoing", "مسودة صحيفة التظلم", "تم تعميم مسودة التظلم والجداول المؤيدة له.", "نادية خليل", AHMED, "2026-07-30 15:20", None),
    ("el-sayed-estate-partition", "phone", "outgoing", "عرض شراء الحصة", "فريدة منفتحة على شراء نقدي عند تقدير المحكمة أو قريبًا منه.", "فريدة السيد", AHMED, "2026-06-05 12:00", 31),
]

# (matter, client, contact name, status, documents, bills, messages)
PORTALS = [
    ("nabil-v-nile-trading", "nile-trading", "كريم فهمي", "active", True, True, True),
    ("delta-foods-labour-dispute", "delta-foods", "تامر جابر", "invited", True, False, True),
]

# (matter, portal contact or None, subject, [(author kind, author, body)])
THREADS = [
    (
        "nabil-v-nile-trading",
        "كريم فهمي",
        "مذكرة الاستئناف — ملاحظاتكم",
        [
            ("firm", MONA, "أستاذ كريم، مسودة مذكرة الاستئناف مرفقة في قسم المستندات. الحجة الأساسية هي احتساب مصروفات الشحن مرتين. هل يمكنكم تأكيد تواريخ سجلات التسليم قبل يوم الخميس؟"),
            ("client", None, "راجعتها — التواريخ صحيحة. تصحيح واحد: شحنة الإسكندرية خرجت يوم 14 وليس 12."),
            ("firm", MONA, "تم التصحيح في المذكرة. الإيداع يوم 12 أغسطس."),
        ],
    ),
]

# (matter, kind, amount, date, description, reference, who)
TRUST_TRANSACTIONS = [
    ("nabil-v-nile-trading", "deposit", Decimal("100000"), date(2025, 11, 5), "دفعة أتعاب مقدمة تحت الحساب", "TRF-99182", AHMED),
    ("nabil-v-nile-trading", "invoice_payment", Decimal("45500"), date(2026, 6, 2), "سداد الفاتورة INV-2026-0142 من الرصيد تحت الحساب", "", LAYLA),
    ("nabil-v-nile-trading", "withdrawal", Decimal("2400"), date(2026, 7, 15), "سداد رسم رفع الاستئناف للمحكمة", "CHQ-4471", LAYLA),
    ("el-sayed-estate-partition", "deposit", Decimal("60000"), date(2025, 9, 15), "دفعة أتعاب مقدمة تحت الحساب", "TRF-88301", AHMED),
    ("el-sayed-estate-partition", "invoice_payment", Decimal("15000"), date(2026, 5, 2), "سداد الفاتورة INV-2026-0110 من الرصيد تحت الحساب", "", AHMED),
]

# (field_key, label, type, options, required, order, matter_type)
CUSTOM_FIELDS = [
    ("referral_source", "مصدر التوصية", "text", [], False, 1, None),
    ("risk_band", "درجة المخاطر", "select", ["منخفضة", "متوسطة", "مرتفعة"], False, 2, None),
    ("court_circuit", "الدائرة القضائية", "text", [], False, 3, "litigation"),
    ("engagement_letter_signed", "توقيع خطاب التكليف", "checkbox", [], False, 4, None),
    ("tax_year_under_review", "السنة الضريبية محل الفحص", "number", [], False, 5, "tax"),
]

# (matter, field_key, value)
CUSTOM_VALUES = [
    ("nabil-v-nile-trading", "referral_source", "عميل حالي"),
    ("nabil-v-nile-trading", "risk_band", "متوسطة"),
    ("nabil-v-nile-trading", "court_circuit", "محكمة القاهرة الاقتصادية — الدائرة السابعة"),
    ("nabil-v-nile-trading", "engagement_letter_signed", "true"),
    ("delta-foods-labour-dispute", "risk_band", "مرتفعة"),
    ("delta-foods-labour-dispute", "engagement_letter_signed", "true"),
    ("khalil-tax-objection", "tax_year_under_review", "2023"),
    ("khalil-tax-objection", "risk_band", "مرتفعة"),
]

# (matter, terms, result, hit summary, notes, who, cleared)
CONFLICT_CHECKS = [
    ("nabil-v-nile-trading", ["هشام نبيل", "نبيل للاستيراد"], "clear", "لا توجد سجلات مطابقة", "لا توجد أعمال سابقة مع أيٍّ من الطرفين.", AHMED, True),
    ("delta-foods-labour-dispute", ["دلتا للأغذية"], "clear", "شركة دلتا للأغذية (عميل)", "المطابقة على عميلنا نفسه وليست على خصم.", AHMED, True),
]


def reset(conn: psycopg.Connection, organization_id: int) -> None:
    """Deletes the firm's practice rows. Cascades handle the child tables."""
    with conn.cursor() as cur:
        # Trust transactions block matter deletion by design (ON DELETE
        # RESTRICT), so they go first; the rest cascade from their parents.
        cur.execute(
            "DELETE FROM trust_transactions WHERE organization_id = %s",
            (organization_id,),
        )
        for table in (
            "conflict_checks", "custom_field_definitions", "communications",
            "secure_message_threads", "client_portals", "trust_accounts",
            "activity", "matter_timeline_events", "matter_notes", "expenses",
            "time_entries", "invoices", "tasks", "hearings", "documents", "cases",
            "matters", "clients",
        ):
            cur.execute(f"DELETE FROM {table} WHERE organization_id = %s", (organization_id,))
    conn.commit()


def seed(conn: psycopg.Connection, owner_clerk_id: str | None) -> int:
    team = list(TEAM)
    if owner_clerk_id:
        team[0] = (owner_clerk_id, "owner", TEAM[0][2], TEAM[0][3], TEAM[0][4])
    owner_id = team[0][0]

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO organizations (name, created_by) VALUES (%s, %s) RETURNING id",
            (FIRM_NAME, owner_id),
        )
        org = cur.fetchone()[0]
        for clerk_user_id, role, display_name, title, email in team:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role, "
                "display_name, title, email) VALUES (%s, %s, %s, %s, %s, %s)",
                (org, clerk_user_id, role, display_name, title, email),
            )

        # The seeded team ids are placeholders unless --owner-clerk-id rebound
        # the Owner seat, so responsible/assignee references below use whatever
        # ids ended up in `team`.
        actor = {slug: slug for slug, *_ in team}
        actor[AHMED] = owner_id

        client_ids: dict[str, int] = {}
        for client in CLIENTS:
            cur.execute(
                "INSERT INTO clients (organization_id, name, client_type, industry, "
                "status, client_since, registration_number, tax_id, address, phone, "
                "email, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                "RETURNING id",
                (
                    org, client["name"], client["client_type"], client["industry"],
                    client["status"], client["client_since"],
                    client["registration_number"], client["tax_id"],
                    client["address"], client["phone"], client["email"],
                    client["notes"],
                ),
            )
            client_ids[client["slug"]] = cur.fetchone()[0]
            for name, title, email, phone, is_primary in client["contacts"]:
                cur.execute(
                    "INSERT INTO client_contacts (client_id, name, title, email, "
                    "phone, is_primary) VALUES (%s, %s, %s, %s, %s, %s)",
                    (client_ids[client["slug"]], name, title, email, phone, is_primary),
                )

        matter_ids: dict[str, int] = {}
        # Matter numbers run 00001, 00002, … in the order the seed lists them,
        # the same series create_matter() would have produced.
        for index, matter in enumerate(MATTERS, start=1):
            cur.execute(
                "INSERT INTO matters (organization_id, number_seq, matter_number, "
                "client_id, name, matter_type, "
                "status, responsible_user, opened_date, closed_date, description, "
                "billing_type, budget_amount, budget_is_estimate, tags) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                "RETURNING id",
                (
                    org, index, f"{index:05d}",
                    client_ids[matter["client"]], matter["name"],
                    matter["matter_type"], matter["status"],
                    actor.get(matter["responsible_user"], matter["responsible_user"]),
                    matter["opened_date"], matter["closed_date"],
                    matter["description"], matter["billing_type"],
                    matter["budget_amount"], matter["budget_is_estimate"],
                    matter["tags"],
                ),
            )
            matter_ids[matter["slug"]] = cur.fetchone()[0]
            for staff_id in matter["staff"]:
                cur.execute(
                    "INSERT INTO matter_staff (matter_id, clerk_user_id) VALUES (%s, %s)",
                    (matter_ids[matter["slug"]], actor.get(staff_id, staff_id)),
                )

        for case in CASES:
            cur.execute(
                "INSERT INTO cases (organization_id, matter_id, court, judge, "
                "case_number, status, opposing_party, opposing_counsel, filed_date, "
                "ai_summary) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (
                    org, matter_ids[case["matter"]], case["court"], case["judge"],
                    case["case_number"], case["status"], case["opposing_party"],
                    case["opposing_counsel"], case["filed_date"], case["ai_summary"],
                ),
            )
            case_id = cur.fetchone()[0]
            for event_date, label, detail in case["timeline"]:
                cur.execute(
                    "INSERT INTO case_timeline_events (case_id, event_date, label, "
                    "detail) VALUES (%s, %s, %s, %s)",
                    (case_id, event_date, label, detail),
                )
            for label, due_date in case["deadlines"]:
                cur.execute(
                    "INSERT INTO case_deadlines (case_id, label, due_date) "
                    "VALUES (%s, %s, %s)",
                    (case_id, label, due_date),
                )
            for name, evidence_type, submitted_by, submitted_date in case["evidence"]:
                cur.execute(
                    "INSERT INTO case_evidence (case_id, name, evidence_type, "
                    "submitted_by, submitted_date) VALUES (%s, %s, %s, %s, %s)",
                    (case_id, name, evidence_type, submitted_by, submitted_date),
                )
            for name, doc_type, doc_date in case["court_documents"]:
                cur.execute(
                    "INSERT INTO court_documents (case_id, name, doc_type, doc_date) "
                    "VALUES (%s, %s, %s, %s)",
                    (case_id, name, doc_type, doc_date),
                )

        for matter, name, doc_type, uploader, uploaded_at, size, status in DOCUMENTS:
            cur.execute(
                "INSERT INTO documents (organization_id, matter_id, name, doc_type, "
                "status, size_bytes, uploaded_by, uploaded_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    org, matter_ids[matter], name, doc_type, status, size,
                    actor.get(uploader, uploader), uploaded_at,
                ),
            )

        for matter, hearing_date, hearing_time, court, purpose, outcome in HEARINGS:
            cur.execute(
                "INSERT INTO hearings (organization_id, matter_id, hearing_date, "
                "hearing_time, court, purpose, outcome) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (org, matter_ids[matter], hearing_date, hearing_time, court, purpose, outcome),
            )

        for matter, title, assignee, due_date, status, priority in TASKS:
            cur.execute(
                "INSERT INTO tasks (organization_id, matter_id, title, assignee, "
                "due_date, status, priority, completed_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, "
                "CASE WHEN %s = 'done' THEN now() END)",
                (
                    org, matter_ids[matter], title, actor.get(assignee, assignee),
                    due_date, status, priority, status,
                ),
            )

        for matter, user, entry_date, hours, description, billable, rate in TIME_ENTRIES:
            cur.execute(
                "INSERT INTO time_entries (organization_id, matter_id, clerk_user_id, "
                "entry_date, hours, description, billable, rate) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    org, matter_ids[matter], actor.get(user, user), entry_date, hours,
                    description, billable, rate,
                ),
            )

        for matter, client, number, amount, status, issued, due in INVOICES:
            cur.execute(
                "INSERT INTO invoices (organization_id, matter_id, client_id, number, "
                "amount, status, issued_date, due_date, paid_date) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, "
                "CASE WHEN %s = 'paid' THEN %s END)",
                (
                    org, matter_ids[matter], client_ids[client], number, amount,
                    status, issued, due, status, due,
                ),
            )

        for matter, author, note_date, content in NOTES:
            cur.execute(
                "INSERT INTO matter_notes (organization_id, matter_id, author, "
                "content, created_at) VALUES (%s, %s, %s, %s, %s)",
                (org, matter_ids[matter], actor.get(author, author), content, note_date),
            )

        for matter, client, who, action, when in ACTIVITY:
            cur.execute(
                "INSERT INTO activity (organization_id, matter_id, client_id, actor, "
                "action, occurred_at) VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    org,
                    matter_ids[matter] if matter else None,
                    client_ids[client] if client else None,
                    actor.get(who, who),
                    action,
                    when,
                ),
            )

        for matter, event_date, label, detail, kind in MATTER_TIMELINE:
            cur.execute(
                "INSERT INTO matter_timeline_events (organization_id, matter_id, "
                "event_date, label, detail, kind) VALUES (%s, %s, %s, %s, %s, %s)",
                (org, matter_ids[matter], event_date, label, detail, kind),
            )

        # --- matter workspace (0007) ---------------------------------------

        for matter, name, relationship, email, phone, is_bill in MATTER_PARTIES:
            cur.execute(
                "INSERT INTO matter_contacts (matter_id, name, relationship, "
                "email, phone, is_bill_recipient) VALUES (%s, %s, %s, %s, %s, %s)",
                (matter_ids[matter], name, relationship, email, phone, is_bill),
            )

        for matter, client, name, relationship, is_bill in MATTER_CLIENT_CONTACTS:
            cur.execute(
                "SELECT id FROM client_contacts WHERE client_id = %s AND name = %s",
                (client_ids[client], name),
            )
            row = cur.fetchone()
            if row is None:
                continue  # the contact list changed; skip rather than crash
            cur.execute(
                "INSERT INTO matter_contacts (matter_id, contact_id, relationship, "
                "is_bill_recipient) VALUES (%s, %s, %s, %s)",
                (matter_ids[matter], row[0], relationship, is_bill),
            )

        for matter, who, day, description, category, qty, unit, billable in EXPENSES:
            cur.execute(
                "INSERT INTO expenses (organization_id, matter_id, clerk_user_id, "
                "entry_date, description, category, quantity, unit_amount, billable) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    org, matter_ids[matter], actor.get(who, who), day, description,
                    category, qty, unit, billable,
                ),
            )

        for (
            matter, channel, direction, subject, body, counterparty, who, when, minutes
        ) in COMMUNICATIONS:
            cur.execute(
                "INSERT INTO communications (organization_id, matter_id, client_id, "
                "channel, direction, subject, body, counterparty, logged_by, "
                "occurred_at, duration_minutes) "
                "VALUES (%s, %s, (SELECT client_id FROM matters WHERE id = %s), "
                "%s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    org, matter_ids[matter], matter_ids[matter], channel, direction,
                    subject, body, counterparty, actor.get(who, who), when, minutes,
                ),
            )

        portal_ids: dict[tuple[str, str], int] = {}
        for matter, client, name, status, docs, bills, msgs in PORTALS:
            cur.execute(
                "SELECT id FROM client_contacts WHERE client_id = %s AND name = %s",
                (client_ids[client], name),
            )
            row = cur.fetchone()
            if row is None:
                continue
            cur.execute(
                "INSERT INTO client_portals (organization_id, matter_id, contact_id, "
                "status, can_view_documents, can_view_bills, can_message, invited_by, "
                "activated_at, last_active_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, "
                "CASE WHEN %s = 'active' THEN now() END, "
                "CASE WHEN %s = 'active' THEN now() END) RETURNING id",
                (
                    org, matter_ids[matter], row[0], status, docs, bills, msgs,
                    actor.get(AHMED, AHMED), status, status,
                ),
            )
            portal_ids[(matter, name)] = cur.fetchone()[0]

        for matter, contact_name, subject, messages in THREADS:
            portal_id = portal_ids.get((matter, contact_name)) if contact_name else None
            opener = messages[0][1] or AHMED
            cur.execute(
                "INSERT INTO secure_message_threads (organization_id, matter_id, "
                "portal_id, subject, created_by) VALUES (%s, %s, %s, %s, %s) "
                "RETURNING id",
                (org, matter_ids[matter], portal_id, subject, actor.get(opener, opener)),
            )
            thread_id = cur.fetchone()[0]

            # The client side of a thread is the portal's contact. A thread with
            # no portal has no client author, so it carries firm messages only.
            contact_id = None
            if portal_id is not None:
                cur.execute(
                    "SELECT contact_id FROM client_portals WHERE id = %s", (portal_id,)
                )
                contact_id = cur.fetchone()[0]

            for kind, author, body in messages:
                cur.execute(
                    "INSERT INTO secure_messages (thread_id, author_kind, "
                    "author_user, author_contact_id, body) VALUES (%s, %s, %s, %s, %s)",
                    (
                        thread_id,
                        kind,
                        actor.get(author, author) if kind == "firm" else None,
                        contact_id if kind == "client" else None,
                        body,
                    ),
                )

        if TRUST_TRANSACTIONS:
            cur.execute(
                "INSERT INTO trust_accounts (organization_id, name, bank_name, "
                "account_number, is_default) VALUES (%s, %s, %s, %s, TRUE) RETURNING id",
                (org, "حساب أمانات العملاء", "بنك مصر", "****4471"),
            )
            trust_account = cur.fetchone()[0]
            for matter, kind, amount, day, description, reference, who in (
                TRUST_TRANSACTIONS
            ):
                # An invoice_payment must name its invoice; the seed's payments
                # settle the matter's earliest paid bill.
                invoice_id = None
                if kind == "invoice_payment":
                    cur.execute(
                        "SELECT id FROM invoices WHERE matter_id = %s "
                        "ORDER BY issued_date LIMIT 1",
                        (matter_ids[matter],),
                    )
                    found = cur.fetchone()
                    invoice_id = found[0] if found else None
                    if invoice_id is None:
                        continue
                cur.execute(
                    "INSERT INTO trust_transactions (organization_id, "
                    "trust_account_id, matter_id, client_id, kind, amount, "
                    "description, reference, invoice_id, transaction_date, "
                    "recorded_by) VALUES (%s, %s, %s, "
                    "(SELECT client_id FROM matters WHERE id = %s), "
                    "%s, %s, %s, %s, %s, %s, %s)",
                    (
                        org, trust_account, matter_ids[matter], matter_ids[matter],
                        kind, amount, description, reference, invoice_id, day,
                        actor.get(who, who),
                    ),
                )

        definition_ids: dict[str, int] = {}
        for key, label, field_type, options, required, order, matter_type in (
            CUSTOM_FIELDS
        ):
            cur.execute(
                "INSERT INTO custom_field_definitions (organization_id, field_key, "
                "label, field_type, options, is_required, display_order, matter_type) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (org, key, label, field_type, options, required, order, matter_type),
            )
            definition_ids[key] = cur.fetchone()[0]

        for matter, key, value in CUSTOM_VALUES:
            cur.execute(
                "INSERT INTO matter_custom_values (matter_id, definition_id, value) "
                "VALUES (%s, %s, %s)",
                (matter_ids[matter], definition_ids[key], value),
            )

        for matter, terms, result, summary, notes, who, cleared in CONFLICT_CHECKS:
            cur.execute(
                "INSERT INTO conflict_checks (organization_id, matter_id, "
                "search_terms, result, hit_summary, notes, run_by, cleared_by, "
                "cleared_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    org, matter_ids[matter], terms, result, summary, notes,
                    actor.get(who, who),
                    actor.get(who, who) if cleared else None,
                    "2026-07-30 09:00" if cleared else None,
                ),
            )

    conn.commit()
    return org


def clerk_user_id_for_email(email: str) -> str:
    """Looks up a Clerk user id by email via the Backend API.

    Saves having to dig the id out of the Clerk dashboard after signing up;
    the email is the thing the user actually knows.
    """
    response = httpx.get(
        "https://api.clerk.com/v1/users",
        params={"email_address": email},
        headers={"Authorization": f"Bearer {get_clerk_secret_key()}"},
        timeout=10.0,
    )
    response.raise_for_status()
    users = response.json()
    if not users:
        raise SystemExit(
            f"No Clerk user found for {email!r}. Sign up in the app first, "
            "then re-run this command."
        )
    return users[0]["id"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--owner-clerk-id",
        help="Real Clerk user id to install as the firm's Owner, so a signed-in "
        "account lands in this firm instead of a placeholder one.",
    )
    parser.add_argument(
        "--owner-email",
        help="Same as --owner-clerk-id, but resolves the id from a Clerk account's "
        "email address. Requires CLERK_SECRET_KEY.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help=f"Delete the existing {FIRM_NAME!r} firm's practice data first.",
    )
    args = parser.parse_args()

    owner_clerk_id = args.owner_clerk_id
    if args.owner_email:
        if owner_clerk_id:
            raise SystemExit("Pass --owner-clerk-id or --owner-email, not both.")
        owner_clerk_id = clerk_user_id_for_email(args.owner_email)
        print(f"Resolved {args.owner_email} to Clerk user {owner_clerk_id}.")

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Match the firm under any name it has been seeded with, not just
            # the current one. Renaming FIRM_NAME (as the Arabic pass did)
            # would otherwise leave the old firm orphaned in the database and
            # seed a second one beside it -- two entries in the firm switcher,
            # one of them stale.
            cur.execute(
                "SELECT id FROM organizations WHERE name = ANY(%s) ORDER BY id",
                ([FIRM_NAME, *FORMER_FIRM_NAMES],),
            )
            found = cur.fetchall()

        existing = found[0] if found else None

        if existing and not args.reset:
            print(
                f"{FIRM_NAME!r} already exists as organization {existing[0]}. "
                "Re-run with --reset to replace its practice data."
            )
            return
        for (org_id,) in found:
            print(f"Resetting organization {org_id}...")
            reset(conn, org_id)
            with conn.cursor() as cur:
                cur.execute("DELETE FROM memberships WHERE organization_id = %s", (org_id,))
                cur.execute("DELETE FROM invitations WHERE organization_id = %s", (org_id,))
                cur.execute("DELETE FROM organizations WHERE id = %s", (org_id,))
            conn.commit()

        org = seed(conn, owner_clerk_id)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT (SELECT count(*) FROM clients WHERE organization_id = %(o)s),"
                "       (SELECT count(*) FROM matters WHERE organization_id = %(o)s),"
                "       (SELECT count(*) FROM cases WHERE organization_id = %(o)s),"
                "       (SELECT count(*) FROM tasks WHERE organization_id = %(o)s),"
                "       (SELECT count(*) FROM invoices WHERE organization_id = %(o)s)",
                {"o": org},
            )
            counts = cur.fetchone()
        print(
            f"Seeded {FIRM_NAME!r} as organization {org}: "
            f"{counts[0]} clients, {counts[1]} matters, {counts[2]} cases, "
            f"{counts[3]} tasks, {counts[4]} invoices."
        )
        if not owner_clerk_id:
            print(
                "\nTeam seeded under placeholder ids (seed_ahmed_al_sayed, ...). "
                "Re-run with --owner-clerk-id <your Clerk user id> to sign in as the Owner."
            )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
