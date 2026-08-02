"""Seeds a sample firm into the practice tables.

This is the content that used to live in web/lib/legalos-data.ts as a
hard-coded TypeScript module. It is sample data, not real firm data -- the
same caveat that file carried applies here, it just lives in Postgres now so
the UI exercises real queries, real ids and real writes.

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

FIRM_NAME = "Al-Sayed & Partners"

TEAM = [
    ("seed_ahmed_al_sayed", "owner", "Ahmed Al-Sayed", "Managing Partner"),
    ("seed_mona_farouk", "lawyer", "Mona Farouk", "Senior Associate"),
    ("seed_youssef_adel", "lawyer", "Youssef Adel", "Associate"),
    ("seed_layla_hassan", "staff", "Layla Hassan", "Paralegal"),
]

AHMED, MONA, YOUSSEF, LAYLA = (member[0] for member in TEAM)

CLIENTS = [
    {
        "slug": "nile-trading",
        "name": "Nile Trading Co.",
        "client_type": "company",
        "industry": "Import & Export Trading",
        "status": "active",
        "client_since": date(2022, 3, 14),
        "registration_number": "CR-88213-Cairo",
        "tax_id": "300-215-664",
        "address": "12 Corniche El Nil, Maadi, Cairo",
        "phone": "+20 2 2519 4432",
        "email": "legal@niletradingco.com",
        "notes": "Long-standing client. Prefers all filings copied to General Counsel directly.",
        "contacts": [
            ("Karim Fahmy", "General Counsel", "k.fahmy@niletradingco.com", "+20 100 555 2010", True),
            ("Rania Samy", "CFO", "r.samy@niletradingco.com", "+20 100 555 2044", False),
        ],
    },
    {
        "slug": "delta-foods",
        "name": "Delta Foods",
        "client_type": "company",
        "industry": "Food Manufacturing & Distribution",
        "status": "active",
        "client_since": date(2023, 6, 2),
        "registration_number": "CR-51092-Giza",
        "tax_id": "301-884-119",
        "address": "Industrial Zone A, 6th of October City, Giza",
        "phone": "+20 2 3821 7765",
        "email": "contact@deltafoods.eg",
        "notes": "Two concurrent matters: routine contract review and an active labour dispute.",
        "contacts": [
            ("Tamer Gaber", "HR Director", "t.gaber@deltafoods.eg", "+20 101 442 8830", True),
            ("Nourhan Ezzat", "Operations Manager", "n.ezzat@deltafoods.eg", "+20 101 442 8871", False),
        ],
    },
    {
        "slug": "khalil-holdings",
        "name": "Khalil Holdings",
        "client_type": "company",
        "industry": "Diversified Holding Group",
        "status": "active",
        "client_since": date(2021, 11, 20),
        "registration_number": "CR-40217-Cairo",
        "tax_id": "299-733-502",
        "address": "Nile City Towers, Ramlet Boulaq, Cairo",
        "phone": "+20 2 2461 9900",
        "email": "counsel@khalilholdings.com",
        "notes": None,
        "contacts": [
            ("Hossam Khalil", "Chairman", "h.khalil@khalilholdings.com", "+20 100 111 7620", True),
        ],
    },
    {
        "slug": "al-amal-trading",
        "name": "Al Amal Trading",
        "client_type": "company",
        "industry": "Retail & Wholesale Trading",
        "status": "active",
        "client_since": date(2024, 1, 9),
        "registration_number": "CR-77410-Cairo",
        "tax_id": "302-556-284",
        "address": "18 El Merghany St, Heliopolis, Cairo",
        "phone": "+20 2 2418 3350",
        "email": "info@alamaltrading.eg",
        "notes": None,
        "contacts": [
            ("Sherif Nabil", "Owner", "sherif@alamaltrading.eg", "+20 122 340 5511", True),
        ],
    },
    {
        "slug": "el-sayed-estate",
        "name": "El-Sayed Estate",
        "client_type": "individual",
        "industry": "Private Estate",
        "status": "active",
        "client_since": date(2025, 9, 1),
        "registration_number": None,
        "tax_id": None,
        "address": "9 Gameat El Dowal El Arabeya St, Mohandessin, Giza",
        "phone": "+20 100 222 8890",
        "email": "farida.elsayed@gmail.com",
        "notes": "Sensitive family matter — coordinate all outreach through Farida El-Sayed only.",
        "contacts": [
            ("Farida El-Sayed", "Executor", "farida.elsayed@gmail.com", "+20 100 222 8890", True),
        ],
    },
    {
        "slug": "zahran-construction",
        "name": "Zahran Construction Group",
        "client_type": "company",
        "industry": "Construction & Real Estate Development",
        "status": "active",
        "client_since": date(2023, 2, 27),
        "registration_number": "CR-63305-Cairo",
        "tax_id": "300-990-441",
        "address": "New Cairo Business Park, Building 4, Cairo",
        "phone": "+20 2 2758 6120",
        "email": "legal@zahrancg.com",
        "notes": None,
        "contacts": [
            ("Omar Zahran", "Managing Director", "o.zahran@zahrancg.com", "+20 122 987 1145", True),
        ],
    },
    {
        "slug": "samir-nassar",
        "name": "Samir Nassar",
        "client_type": "individual",
        "industry": "Independent Consultant",
        "status": "inactive",
        "client_since": date(2024, 5, 18),
        "registration_number": None,
        "tax_id": None,
        "address": "22 Syria St, Mohandessin, Giza",
        "phone": "+20 122 604 7731",
        "email": "samir.nassar@outlook.com",
        "notes": None,
        "contacts": [
            ("Samir Nassar", "Self", "samir.nassar@outlook.com", "+20 122 604 7731", True),
        ],
    },
]

MATTERS = [
    {
        "slug": "nabil-v-nile-trading",
        "name": "Nabil v. Nile Trading Co.",
        "client": "nile-trading",
        "matter_type": "litigation",
        "status": "active",
        "responsible_user": MONA,
        "staff": [LAYLA],
        "opened_date": date(2025, 11, 3),
        "closed_date": None,
        "description": (
            "Commercial dispute over an alleged breach of a distribution agreement. "
            "Nile Trading Co. is the defendant; the claimant, Ahmed Nabil, seeks EGP 2.4M "
            "in damages plus contract termination. Currently in the evidence phase before "
            "the Cairo Economic Court."
        ),
        "billing_type": "hourly",
        "budget_amount": Decimal("180000"),
        "budget_is_estimate": True,
        "tags": ["Commercial", "Breach of Contract", "Economic Court"],
    },
    {
        "slug": "delta-foods-nda-review",
        "name": "NDA Review — Delta Foods",
        "client": "delta-foods",
        "matter_type": "contract_review",
        "status": "closed",
        "responsible_user": YOUSSEF,
        "staff": [],
        "opened_date": date(2026, 6, 10),
        "closed_date": date(2026, 6, 24),
        "description": (
            "Review of a mutual non-disclosure agreement with a prospective co-packing "
            "partner. AI-assisted clause review flagged two deviations from the firm's "
            "standard NDA template (liability cap, jurisdiction clause); both were "
            "resolved with the counterparty before signature."
        ),
        "billing_type": "fixed_fee",
        "budget_amount": Decimal("12000"),
        "budget_is_estimate": False,
        "tags": ["NDA", "Commercial Contracts"],
    },
    {
        "slug": "delta-foods-labour-dispute",
        "name": "Delta Foods Labour Dispute",
        "client": "delta-foods",
        "matter_type": "litigation",
        "status": "active",
        "responsible_user": YOUSSEF,
        "staff": [LAYLA],
        "opened_date": date(2026, 4, 18),
        "closed_date": None,
        "description": (
            "Collective claim brought by seven former production-line employees alleging "
            "wrongful termination during a facility downsizing. Delta Foods maintains the "
            "terminations followed Labour Law No. 14 of 2025 severance procedures. Pending "
            "ruling before the Cairo Labour Court."
        ),
        "billing_type": "hourly",
        "budget_amount": Decimal("95000"),
        "budget_is_estimate": True,
        "tags": ["Labour", "Wrongful Termination", "Labour Court"],
    },
    {
        "slug": "khalil-tax-objection",
        "name": "Tax Objection — Khalil Holdings",
        "client": "khalil-holdings",
        "matter_type": "tax",
        "status": "active",
        "responsible_user": AHMED,
        "staff": [],
        "opened_date": date(2026, 5, 22),
        "closed_date": None,
        "description": (
            "Formal objection to a 2025 tax-year reassessment issued by the Egyptian Tax "
            "Authority against Khalil Holdings' consolidated group return, disputing a "
            "EGP 3.1M adjustment to intercompany transfer pricing."
        ),
        "billing_type": "hourly",
        "budget_amount": Decimal("60000"),
        "budget_is_estimate": True,
        "tags": ["Tax", "Transfer Pricing"],
    },
    {
        "slug": "al-amal-commercial-registration",
        "name": "Commercial Registration — Al Amal Trading",
        "client": "al-amal-trading",
        "matter_type": "corporate",
        "status": "active",
        "responsible_user": AHMED,
        "staff": [LAYLA],
        "opened_date": date(2026, 6, 30),
        "closed_date": None,
        "description": (
            "Renewal of Al Amal Trading's commercial registration and update of its trade "
            "license activities to include e-commerce distribution, ahead of a new online "
            "storefront launch."
        ),
        "billing_type": "fixed_fee",
        "budget_amount": Decimal("8500"),
        "budget_is_estimate": False,
        "tags": ["Corporate", "Licensing"],
    },
    {
        "slug": "el-sayed-estate-partition",
        "name": "El-Sayed Estate Partition",
        "client": "el-sayed-estate",
        "matter_type": "family_probate",
        "status": "active",
        "responsible_user": AHMED,
        "staff": [],
        "opened_date": date(2025, 9, 15),
        "closed_date": None,
        "description": (
            "Partition of the late Mahmoud El-Sayed's estate among four heirs, including a "
            "residential property in Mohandessin and a minority stake in a family trading "
            "business. Currently in court-supervised mediation before the Giza Family Court."
        ),
        "billing_type": "retainer",
        "budget_amount": Decimal("45000"),
        "budget_is_estimate": False,
        "tags": ["Family", "Probate", "Estate Partition"],
    },
    {
        "slug": "zahran-contract-dispute",
        "name": "Contract Dispute — Zahran Construction",
        "client": "zahran-construction",
        "matter_type": "litigation",
        "status": "on_hold",
        "responsible_user": MONA,
        "staff": [],
        "opened_date": date(2025, 8, 11),
        "closed_date": None,
        "description": (
            "Dispute with a cement supplier over delayed deliveries on a New Cairo "
            "residential project. Proceedings paused pending direct settlement negotiations "
            "between the parties."
        ),
        "billing_type": "hourly",
        "budget_amount": Decimal("70000"),
        "budget_is_estimate": True,
        "tags": ["Commercial", "Construction", "Supplier Dispute"],
    },
    {
        "slug": "samir-nassar-consulting-agreement",
        "name": "Consulting Agreement Review — Samir Nassar",
        "client": "samir-nassar",
        "matter_type": "contract_review",
        "status": "closed",
        "responsible_user": YOUSSEF,
        "staff": [],
        "opened_date": date(2025, 5, 2),
        "closed_date": date(2025, 5, 14),
        "description": (
            "Review of an independent consulting agreement with a multinational client, "
            "focused on IP assignment and non-compete scope."
        ),
        "billing_type": "fixed_fee",
        "budget_amount": Decimal("6000"),
        "budget_is_estimate": False,
        "tags": ["Contract Review", "Consulting"],
    },
]

CASES = [
    {
        "matter": "nabil-v-nile-trading",
        "court": "Cairo Economic Court",
        "judge": "Counselor Hesham Fathy",
        "case_number": "CEC-2026-1345",
        "status": "Active — Evidence Phase",
        "opposing_party": "Ahmed Nabil (individual, plaintiff)",
        "opposing_counsel": "Adv. Samia Reda, Reda & Co.",
        "filed_date": date(2025, 11, 3),
        "ai_summary": (
            "The court-appointed expert's report (filed 2026-07-14) is the strongest "
            "development in our favor: it found the claimant's damages calculation "
            "overstated by roughly 40%, largely due to double-counted freight costs. "
            "Recommend anchoring the appeal brief on the expert findings and the delivery "
            "logs already in evidence, rather than reopening the breach question."
        ),
        "timeline": [
            (date(2025, 11, 3), "Claim filed", "Plaintiff filed breach-of-contract claim seeking EGP 2.4M."),
            (date(2025, 12, 1), "First hearing", "Court set the evidence-exchange schedule."),
            (date(2026, 2, 18), "Defense memorandum submitted", "Filed response denying breach and disputing damages calculation."),
            (date(2026, 5, 6), "Expert appointed", "Court appointed an accounting expert to assess claimed damages."),
            (date(2026, 7, 14), "Expert report received", "Expert report found claimed damages overstated by roughly 40%."),
        ],
        "deadlines": [
            ("File appeal brief", date(2026, 8, 2)),
            ("Submit rebuttal to expert report", date(2026, 8, 8)),
        ],
        "evidence": [
            ("Distribution Agreement (original, signed)", "Contract", "us", date(2025, 11, 20)),
            ("Delivery logs — Q3 2025", "Business Records", "us", date(2025, 12, 15)),
            ("Email correspondence re: delivery delays", "Correspondence", "opposing_party", date(2026, 1, 10)),
            ("Court-appointed expert accounting report", "Expert Report", "court", date(2026, 7, 14)),
        ],
        "court_documents": [
            ("Statement of Claim", "Filing", date(2025, 11, 3)),
            ("Defense Memorandum", "Filing", date(2026, 2, 18)),
            ("Expert Report", "Court Order", date(2026, 7, 14)),
        ],
    },
    {
        "matter": "delta-foods-labour-dispute",
        "court": "Cairo Labour Court",
        "judge": "Counselor Mervat Shawky",
        "case_number": "CLC-2026-0892",
        "status": "Active — Pending Ruling",
        "opposing_party": "7 former employees (collective claim)",
        "opposing_counsel": "Adv. Tarek Younis",
        "filed_date": date(2026, 4, 18),
        "ai_summary": (
            "Severance calculations filed on 2026-07-20 match Labour Law No. 14 of 2025 "
            "minimums for all seven claimants, which is a strong procedural defense. The "
            "open risk is documentation of individualized termination cause for two of the "
            "seven employees — recommend confirming those personnel files before final "
            "arguments on 2026-08-12."
        ),
        "timeline": [
            (date(2026, 4, 18), "Claim filed", "Seven claimants allege wrongful termination during downsizing."),
            (date(2026, 5, 5), "Mediation attempt", "Labour office mediation failed to reach settlement."),
            (date(2026, 6, 2), "First hearing", "Court requested full severance documentation from Delta Foods."),
            (date(2026, 7, 20), "Documents submitted", "Severance calculations and termination notices filed with the court."),
        ],
        "deadlines": [("Respond to discovery request", date(2026, 8, 4))],
        "evidence": [
            ("Termination notices (7)", "HR Records", "us", date(2026, 7, 20)),
            ("Severance calculation worksheets", "Financial Records", "us", date(2026, 7, 20)),
            ("Claimants' joint statement", "Pleading", "opposing_party", date(2026, 4, 18)),
        ],
        "court_documents": [
            ("Statement of Claim", "Filing", date(2026, 4, 18)),
            ("Defense Response", "Filing", date(2026, 6, 2)),
        ],
    },
    {
        "matter": "el-sayed-estate-partition",
        "court": "Giza Family Court",
        "judge": "Counselor Amal Zaki",
        "case_number": "GFC-2026-0456",
        "status": "Active — Mediation",
        "opposing_party": "Co-heirs (3, represented separately)",
        "opposing_counsel": None,
        "filed_date": date(2025, 9, 15),
        "ai_summary": (
            "All three co-heirs' counsel have signaled openness to a cash buyout of the "
            "minority business stake rather than an in-kind split, which would materially "
            "simplify the property partition. Recommend proposing a buyout structured "
            "against the EGP 1.6M court valuation at the 2026-08-05 mediation session."
        ),
        "timeline": [
            (date(2025, 9, 15), "Partition petition filed", "Filed on behalf of executor Farida El-Sayed."),
            (date(2025, 10, 20), "Asset valuation ordered", "Court ordered independent valuation of the Mohandessin property."),
            (date(2026, 3, 11), "Valuation report received", "Property valued at EGP 9.2M; business stake valued at EGP 1.6M."),
            (date(2026, 6, 1), "Mediation opened", "Court referred the parties to mediation over the property's disposition."),
        ],
        "deadlines": [("Mediation session", date(2026, 8, 5))],
        "evidence": [
            ("Property valuation report", "Valuation", "court", date(2026, 3, 11)),
            ("Business stake valuation", "Valuation", "court", date(2026, 3, 11)),
            ("Heirship certificate", "Official Record", "us", date(2025, 9, 15)),
        ],
        "court_documents": [
            ("Partition Petition", "Filing", date(2025, 9, 15)),
            ("Valuation Report", "Court Order", date(2026, 3, 11)),
        ],
    },
    {
        "matter": "zahran-contract-dispute",
        "court": "Cairo Economic Court",
        "judge": "Counselor Nabila Roshdy",
        "case_number": "CEC-2025-2210",
        "status": "On Hold — Awaiting Settlement Talks",
        "opposing_party": "Al-Fouad Cement Suppliers",
        "opposing_counsel": "Adv. Bassem Farag",
        "filed_date": date(2025, 8, 11),
        "ai_summary": (
            "No court activity since proceedings were suspended in January. Recommend a "
            "status check with the client before the case can be reactivated or formally "
            "withdrawn if settlement concludes."
        ),
        "timeline": [
            (date(2025, 8, 11), "Claim filed", "Zahran Construction claims delivery delays caused a 6-week project overrun."),
            (date(2025, 10, 2), "First hearing", "Court adjourned at both parties' request to pursue settlement."),
            (date(2026, 1, 15), "Proceedings suspended", "Case placed on hold pending direct settlement negotiations."),
        ],
        "deadlines": [],
        "evidence": [
            ("Supply contract (original)", "Contract", "us", date(2025, 8, 11)),
            ("Delivery delay log", "Business Records", "us", date(2025, 8, 11)),
        ],
        "court_documents": [("Statement of Claim", "Filing", date(2025, 8, 11))],
    },
]

# (matter, name, doc_type, uploaded_by, uploaded_at, size_bytes, status)
DOCUMENTS = [
    ("nabil-v-nile-trading", "Distribution Agreement (original, signed)", "PDF", MONA, date(2025, 11, 5), 1_258_291, "final"),
    ("nabil-v-nile-trading", "Defense Memorandum — draft v3", "DOCX", MONA, date(2026, 2, 15), 348_160, "filed"),
    ("nabil-v-nile-trading", "Delivery logs — Q3 2025", "XLSX", LAYLA, date(2025, 12, 12), 90_112, "final"),
    ("nabil-v-nile-trading", "Expert accounting report — annotated", "PDF", MONA, date(2026, 7, 16), 2_516_582, "under_review"),
    ("nabil-v-nile-trading", "Appeal brief — draft", "DOCX", MONA, date(2026, 7, 28), 215_040, "draft"),
    ("nabil-v-nile-trading", "Client authorization letter", "PDF", AHMED, date(2025, 11, 4), 153_600, "signed"),
    ("delta-foods-nda-review", "Mutual NDA — final signed", "PDF", YOUSSEF, date(2026, 6, 24), 419_840, "signed"),
    ("delta-foods-nda-review", "Redline vs. standard template", "DOCX", YOUSSEF, date(2026, 6, 18), 97_280, "final"),
    ("delta-foods-labour-dispute", "Termination notices (7, combined)", "PDF", LAYLA, date(2026, 7, 20), 696_320, "filed"),
    ("delta-foods-labour-dispute", "Severance calculation worksheets", "XLSX", YOUSSEF, date(2026, 7, 20), 122_880, "filed"),
    ("delta-foods-labour-dispute", "Personnel files — under review", "ZIP", LAYLA, date(2026, 7, 29), 5_347_737, "under_review"),
    ("khalil-tax-objection", "Tax Authority reassessment notice", "PDF", AHMED, date(2026, 5, 22), 307_200, "final"),
    ("khalil-tax-objection", "Transfer pricing study", "PDF", AHMED, date(2026, 6, 10), 1_887_437, "under_review"),
    ("al-amal-commercial-registration", "Trade license renewal application", "PDF", LAYLA, date(2026, 7, 1), 225_280, "draft"),
    ("el-sayed-estate-partition", "Property valuation report", "PDF", AHMED, date(2026, 3, 11), 1_153_434, "final"),
    ("el-sayed-estate-partition", "Heirship certificate", "PDF", AHMED, date(2025, 9, 16), 97_280, "final"),
    ("zahran-contract-dispute", "Supply contract (original)", "PDF", MONA, date(2025, 8, 11), 552_960, "final"),
    ("samir-nassar-consulting-agreement", "Consulting Agreement — final", "PDF", YOUSSEF, date(2025, 5, 14), 184_320, "signed"),
]

# (matter, date, time, court, purpose, outcome)
HEARINGS = [
    ("nabil-v-nile-trading", date(2025, 12, 1), "10:00 AM", "Cairo Economic Court", "First hearing — evidence schedule set", "Schedule set; no ruling"),
    ("nabil-v-nile-trading", date(2026, 2, 18), "10:30 AM", "Cairo Economic Court", "Defense memorandum review", "Accepted for filing"),
    ("nabil-v-nile-trading", date(2026, 5, 6), "9:30 AM", "Cairo Economic Court", "Expert appointment hearing", "Accounting expert appointed"),
    ("nabil-v-nile-trading", date(2026, 8, 10), "10:00 AM", "Cairo Economic Court", "Evidence submission review", None),
    ("delta-foods-labour-dispute", date(2026, 6, 2), "1:00 PM", "Cairo Labour Court", "First hearing — documents requested", None),
    ("delta-foods-labour-dispute", date(2026, 8, 12), "1:30 PM", "Cairo Labour Court", "Final arguments", None),
    ("el-sayed-estate-partition", date(2026, 6, 1), "11:00 AM", "Giza Family Court", "Mediation referral", None),
    ("el-sayed-estate-partition", date(2026, 8, 5), "11:00 AM", "Giza Family Court", "Mediation session", None),
    ("zahran-contract-dispute", date(2025, 10, 2), "10:00 AM", "Cairo Economic Court", "First hearing — adjourned for settlement talks", None),
]

# (matter, title, assignee, due_date, status, priority)
TASKS = [
    ("nabil-v-nile-trading", "Draft appeal brief responding to expert report", MONA, date(2026, 8, 2), "in_progress", "high"),
    ("nabil-v-nile-trading", "Prepare rebuttal exhibits to expert accounting report", LAYLA, date(2026, 8, 6), "todo", "high"),
    ("nabil-v-nile-trading", "Brief client on expert report findings", MONA, date(2026, 7, 30), "done", "medium"),
    ("nabil-v-nile-trading", "Confirm hearing logistics with court clerk", LAYLA, date(2026, 8, 8), "todo", "low"),
    ("delta-foods-labour-dispute", "Respond to discovery request", YOUSSEF, date(2026, 8, 4), "in_progress", "high"),
    ("delta-foods-labour-dispute", "Verify termination cause documentation for 2 claimants", LAYLA, date(2026, 8, 6), "todo", "high"),
    ("khalil-tax-objection", "Submit tax objection filing", AHMED, date(2026, 8, 14), "todo", "high"),
    ("al-amal-commercial-registration", "Renew commercial registration", LAYLA, date(2026, 8, 9), "in_progress", "medium"),
    ("el-sayed-estate-partition", "Prepare buyout proposal for mediation session", AHMED, date(2026, 8, 5), "in_progress", "high"),
]

# (matter, user, date, hours, description, billable, rate)
TIME_ENTRIES = [
    ("nabil-v-nile-trading", MONA, date(2026, 7, 28), Decimal("3.5"), "Drafted appeal brief responding to expert report", True, Decimal("1800")),
    ("nabil-v-nile-trading", MONA, date(2026, 7, 17), Decimal("2.0"), "Reviewed and annotated expert accounting report", True, Decimal("1800")),
    ("nabil-v-nile-trading", LAYLA, date(2026, 7, 18), Decimal("1.5"), "Compiled rebuttal exhibits from delivery logs", True, Decimal("650")),
    ("nabil-v-nile-trading", MONA, date(2026, 5, 6), Decimal("1.0"), "Attended expert appointment hearing", True, Decimal("1800")),
    ("nabil-v-nile-trading", MONA, date(2026, 2, 14), Decimal("4.0"), "Drafted defense memorandum", True, Decimal("1800")),
    ("delta-foods-labour-dispute", YOUSSEF, date(2026, 7, 29), Decimal("2.5"), "Prepared response to discovery request", True, Decimal("1400")),
    ("delta-foods-labour-dispute", LAYLA, date(2026, 7, 25), Decimal("3.0"), "Cross-referenced personnel files against severance worksheets", True, Decimal("650")),
    ("khalil-tax-objection", AHMED, date(2026, 6, 10), Decimal("5.0"), "Reviewed transfer pricing study against reassessment notice", True, Decimal("2200")),
    ("el-sayed-estate-partition", AHMED, date(2026, 7, 22), Decimal("1.5"), "Prepared buyout proposal for mediation", True, Decimal("2200")),
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
    ("nabil-v-nile-trading", MONA, date(2026, 7, 16), "Expert report is favorable — damages overstated ~40% due to double-counted freight costs. Client briefed and agrees with appeal strategy."),
    ("nabil-v-nile-trading", AHMED, date(2026, 7, 20), "Confirmed budget headroom with Karim Fahmy for appeal-stage work. No change to fee arrangement."),
    ("delta-foods-labour-dispute", YOUSSEF, date(2026, 7, 26), "Two personnel files (claimants #4 and #6) are missing documented termination cause — following up with Tamer Gaber before final arguments."),
    ("el-sayed-estate-partition", AHMED, date(2026, 6, 5), "Farida El-Sayed open to a cash buyout of the business stake if priced at or near the court valuation."),
]

# (matter, client, actor, action, timestamp)
ACTIVITY = [
    ("nabil-v-nile-trading", "nile-trading", MONA, "uploaded the annotated expert accounting report", "2026-07-16 14:20"),
    ("nabil-v-nile-trading", "nile-trading", MONA, "started drafting the appeal brief", "2026-07-28 09:05"),
    ("nabil-v-nile-trading", "nile-trading", LAYLA, "logged 1.5h compiling rebuttal exhibits", "2026-07-18 16:40"),
    ("nabil-v-nile-trading", "nile-trading", "system:ai", "flagged the expert report's freight double-count in the matter summary", "2026-07-16 15:02"),
    ("nabil-v-nile-trading", "nile-trading", AHMED, "confirmed appeal-stage budget with the client", "2026-07-20 11:15"),
    ("delta-foods-labour-dispute", "delta-foods", YOUSSEF, "filed severance calculation worksheets with the court", "2026-07-20 10:30"),
    ("delta-foods-nda-review", "delta-foods", "system:ai", "finished reviewing the NDA — 2 clauses flagged against the standard template", "2026-06-18 12:00"),
    ("el-sayed-estate-partition", "el-sayed-estate", AHMED, "drafted a buyout proposal for the upcoming mediation session", "2026-07-22 13:10"),
    ("al-amal-commercial-registration", "al-amal-trading", LAYLA, "submitted the trade license renewal application draft for review", "2026-07-01 09:45"),
    (None, "nile-trading", AHMED, "invited Mona Farouk to the Nabil v. Nile Trading Co. matter", "2025-11-03 08:30"),
]

# (matter, date, label, detail, kind)
MATTER_TIMELINE = [
    ("nabil-v-nile-trading", date(2025, 11, 3), "Matter opened", "Engagement letter signed by Karim Fahmy.", "milestone"),
    ("nabil-v-nile-trading", date(2025, 11, 5), "Distribution agreement collected from client", None, "communication"),
    ("nabil-v-nile-trading", date(2025, 12, 1), "First hearing held", "Evidence-exchange schedule set by the court.", "filing"),
    ("nabil-v-nile-trading", date(2026, 2, 18), "Defense memorandum filed", None, "filing"),
    ("nabil-v-nile-trading", date(2026, 6, 1), "Invoice INV-2026-0142 sent and paid", None, "billing"),
    ("nabil-v-nile-trading", date(2026, 7, 14), "Expert report received — favorable finding", None, "milestone"),
    ("nabil-v-nile-trading", date(2026, 7, 20), "Client briefed on appeal strategy", None, "communication"),
    ("nabil-v-nile-trading", date(2026, 7, 25), "Invoice INV-2026-0178 sent", None, "billing"),
    ("delta-foods-labour-dispute", date(2026, 4, 18), "Matter opened", None, "milestone"),
    ("delta-foods-labour-dispute", date(2026, 5, 5), "Mediation attempt failed", None, "filing"),
    ("delta-foods-labour-dispute", date(2026, 7, 20), "Severance documentation filed", None, "filing"),
    ("el-sayed-estate-partition", date(2025, 9, 15), "Matter opened", "Retainer agreement signed by Farida El-Sayed.", "milestone"),
    ("el-sayed-estate-partition", date(2026, 3, 11), "Valuation report received", None, "filing"),
    ("el-sayed-estate-partition", date(2026, 6, 1), "Referred to mediation", None, "milestone"),
]


# --- matter workspace (0007) ------------------------------------------------

# (matter, contact name, relationship, email, phone, is_bill_recipient)
# Parties who exist only on the matter — opposing counsel, experts, court
# staff — carry their own details; contacts on file at a client are attached
# separately below, by name.
MATTER_PARTIES = [
    ("nabil-v-nile-trading", "Hisham Nabil", "Opposing party", "", "", False),
    ("nabil-v-nile-trading", "Sherif Zaki", "Opposing counsel", "s.zaki@zakilaw.example", "+20 2 2735 1180", False),
    ("nabil-v-nile-trading", "Dr. Amira Sobhy", "Court-appointed expert", "", "", False),
    ("delta-foods-labour-dispute", "Mahmoud Rashad", "Opposing counsel", "m.rashad@rashad.example", "", False),
    ("khalil-tax-objection", "Egyptian Tax Authority — Cairo Investment Office", "Authority", "", "", False),
    ("el-sayed-estate-partition", "Farida El-Sayed", "Co-heir", "", "", False),
]

# Contacts already on file at a client, attached to a matter by contact name.
# (matter, client, contact name, relationship, is_bill_recipient)
MATTER_CLIENT_CONTACTS = [
    ("nabil-v-nile-trading", "nile-trading", "Karim Fahmy", "Client", True),
    ("delta-foods-labour-dispute", "delta-foods", "Tamer Gaber", "Client", True),
    ("khalil-tax-objection", "khalil-holdings", "Nadia Khalil", "Client", True),
]

# (matter, user, date, description, category, quantity, unit_amount, billable)
EXPENSES = [
    ("nabil-v-nile-trading", LAYLA, date(2026, 7, 15), "Appeal filing fee", "court_fees", Decimal("1"), Decimal("2400"), True),
    ("nabil-v-nile-trading", LAYLA, date(2026, 7, 16), "Certified copies of the expert report", "filing", Decimal("6"), Decimal("85"), True),
    ("nabil-v-nile-trading", MONA, date(2026, 5, 6), "Courier to Cairo Economic Court", "courier", Decimal("2"), Decimal("120"), True),
    ("delta-foods-labour-dispute", YOUSSEF, date(2026, 7, 22), "Labour office filing fee", "court_fees", Decimal("1"), Decimal("900"), True),
    ("khalil-tax-objection", AHMED, date(2026, 6, 12), "Sworn translation of transfer pricing study", "translation", Decimal("34"), Decimal("110"), True),
    ("el-sayed-estate-partition", AHMED, date(2026, 3, 11), "Independent valuation of the business stake", "expert", Decimal("1"), Decimal("12000"), True),
    ("nabil-v-nile-trading", MONA, date(2026, 7, 28), "Team lunch during trial prep", "other", Decimal("1"), Decimal("450"), False),
]

# (matter, channel, direction, subject, body, counterparty, who, when, minutes)
COMMUNICATIONS = [
    ("nabil-v-nile-trading", "phone", "outgoing", "Appeal strategy", "Walked Karim through the expert's freight double-count and the appeal timetable. He approved proceeding.", "Karim Fahmy", MONA, "2026-07-20 11:15", 24),
    ("nabil-v-nile-trading", "email", "incoming", "Re: Expert report", "Client confirms the delivery logs we used for the rebuttal are the complete set.", "Karim Fahmy", MONA, "2026-07-17 09:42", None),
    ("nabil-v-nile-trading", "email", "outgoing", "Appeal brief for review", "Sent the draft appeal brief for client comment ahead of the 12 August filing.", "Karim Fahmy", MONA, "2026-07-29 17:05", None),
    ("nabil-v-nile-trading", "meeting", "outgoing", "Pre-hearing conference", "Met opposing counsel at the court to narrow the disputed heads of damage. No agreement reached.", "Sherif Zaki", AHMED, "2026-07-24 10:00", 45),
    ("delta-foods-labour-dispute", "phone", "incoming", "Missing personnel files", "Tamer confirmed HR is retrieving the two missing termination-cause records.", "Tamer Gaber", YOUSSEF, "2026-07-26 13:30", 12),
    ("delta-foods-labour-dispute", "letter", "incoming", "Labour office notice", "Notice setting the final arguments date.", "Cairo Labour Office", LAYLA, "2026-07-18 00:00", None),
    ("khalil-tax-objection", "email", "outgoing", "Objection filing draft", "Circulated the draft objection and supporting schedules.", "Nadia Khalil", AHMED, "2026-07-30 15:20", None),
    ("el-sayed-estate-partition", "phone", "outgoing", "Buyout proposal", "Farida is open to a cash buyout at or near the court valuation.", "Farida El-Sayed", AHMED, "2026-06-05 12:00", 31),
]

# (matter, client, contact name, status, documents, bills, messages)
PORTALS = [
    ("nabil-v-nile-trading", "nile-trading", "Karim Fahmy", "active", True, True, True),
    ("delta-foods-labour-dispute", "delta-foods", "Tamer Gaber", "invited", True, False, True),
]

# (matter, portal contact or None, subject, [(author kind, author, body)])
THREADS = [
    (
        "nabil-v-nile-trading",
        "Karim Fahmy",
        "Appeal brief — your comments",
        [
            ("firm", MONA, "Karim, the draft appeal brief is attached in Documents. The key argument is the freight double-count. Could you confirm the delivery log dates by Thursday?"),
            ("client", None, "Reviewed — the dates are right. One correction: the Alexandria consignment shipped on the 14th, not the 12th."),
            ("firm", MONA, "Noted, corrected in the brief. Filing on 12 August."),
        ],
    ),
]

# (matter, kind, amount, date, description, reference, who)
TRUST_TRANSACTIONS = [
    ("nabil-v-nile-trading", "deposit", Decimal("100000"), date(2025, 11, 5), "Retainer on account", "TRF-99182", AHMED),
    ("nabil-v-nile-trading", "invoice_payment", Decimal("45500"), date(2026, 6, 2), "Settled INV-2026-0142 from funds on account", "", LAYLA),
    ("nabil-v-nile-trading", "withdrawal", Decimal("2400"), date(2026, 7, 15), "Appeal filing fee paid to the court", "CHQ-4471", LAYLA),
    ("el-sayed-estate-partition", "deposit", Decimal("60000"), date(2025, 9, 15), "Retainer on account", "TRF-88301", AHMED),
    ("el-sayed-estate-partition", "invoice_payment", Decimal("15000"), date(2026, 5, 2), "Settled INV-2026-0110 from funds on account", "", AHMED),
]

# (field_key, label, type, options, required, order, matter_type)
CUSTOM_FIELDS = [
    ("referral_source", "Referral source", "text", [], False, 1, None),
    ("risk_band", "Risk band", "select", ["Low", "Medium", "High"], False, 2, None),
    ("court_circuit", "Court circuit", "text", [], False, 3, "litigation"),
    ("engagement_letter_signed", "Engagement letter signed", "checkbox", [], False, 4, None),
    ("tax_year_under_review", "Tax year under review", "number", [], False, 5, "tax"),
]

# (matter, field_key, value)
CUSTOM_VALUES = [
    ("nabil-v-nile-trading", "referral_source", "Existing client"),
    ("nabil-v-nile-trading", "risk_band", "Medium"),
    ("nabil-v-nile-trading", "court_circuit", "Cairo Economic Court — Circuit 7"),
    ("nabil-v-nile-trading", "engagement_letter_signed", "true"),
    ("delta-foods-labour-dispute", "risk_band", "High"),
    ("delta-foods-labour-dispute", "engagement_letter_signed", "true"),
    ("khalil-tax-objection", "tax_year_under_review", "2023"),
    ("khalil-tax-objection", "risk_band", "High"),
]

# (matter, terms, result, hit summary, notes, who, cleared)
CONFLICT_CHECKS = [
    ("nabil-v-nile-trading", ["Hisham Nabil", "Nabil Import"], "clear", "no matching records", "No prior engagement with either party.", AHMED, True),
    ("delta-foods-labour-dispute", ["Delta Foods"], "clear", "Delta Foods Manufacturing (client)", "Match is our own client, not an adverse party.", AHMED, True),
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
        team[0] = (owner_clerk_id, "owner", TEAM[0][2], TEAM[0][3])
    owner_id = team[0][0]

    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO organizations (name, created_by) VALUES (%s, %s) RETURNING id",
            (FIRM_NAME, owner_id),
        )
        org = cur.fetchone()[0]
        for clerk_user_id, role, display_name, title in team:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role, "
                "display_name, title) VALUES (%s, %s, %s, %s, %s)",
                (org, clerk_user_id, role, display_name, title),
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
                (org, "Client account", "Banque Misr", "****4471"),
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
            cur.execute("SELECT id FROM organizations WHERE name = %s", (FIRM_NAME,))
            existing = cur.fetchone()

        if existing and not args.reset:
            print(
                f"{FIRM_NAME!r} already exists as organization {existing[0]}. "
                "Re-run with --reset to replace its practice data."
            )
            return
        if existing:
            print(f"Resetting organization {existing[0]}...")
            reset(conn, existing[0])
            with conn.cursor() as cur:
                cur.execute("DELETE FROM memberships WHERE organization_id = %s", (existing[0],))
                cur.execute("DELETE FROM invitations WHERE organization_id = %s", (existing[0],))
                cur.execute("DELETE FROM organizations WHERE id = %s", (existing[0],))
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
