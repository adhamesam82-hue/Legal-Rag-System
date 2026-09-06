#!/usr/bin/env python3
"""Seeds two complete firms on staging so tenant isolation can be checked by hand.

WHY TWO FIRMS AND NOT ONE
-------------------------
seed_demo_firm.py builds one firm to look at. This builds two to *compare*:
T-047's manual check needs a signed-in member of firm B typing firm A's record
ids into the address bar, so the ids have to exist, belong to different firms,
and be printed where the person doing the check can copy them. That is the whole
reason this script exists as a separate file rather than a flag on the other one.

EVERYTHING GOES THROUGH THE PRODUCTION FUNCTIONS
------------------------------------------------
create_organization, create_client, create_matter, create_case, create_hearing,
create_task, create_document, create_time_entry, create_invoice.

Not raw INSERTs. Seeding around those functions is what produced the drift
PR #87 had to repair, and what made T-047's own test fixture fail three times in
a row on a different NOT NULL column each time. A column added tomorrow reaches
this script for free.

RLS
---
This runs after migration 0029, so every write needs a tenant context. The
script sets it per firm with set_tenant_context() before touching that firm's
rows. If it ever seeds nothing while reporting success, that is the symptom of a
missing context -- not an empty database.

USAGE
    uv run python scripts/seed_staging_two_firms.py --reset \
        --alpha-email you@example.com --beta-email colleague@example.com

Each firm takes its own real account, by email or by Clerk id. Seat one you can
sign in as in *each* firm and the whole check is yours: sign in as BETA's owner,
try ALPHA's ids, then swap and confirm ALPHA still shows its own data. With a
real account in only one firm you can prove the refusal but not that the other
firm still works, which is the half people forget -- an isolation bug that
returns nothing to everyone also passes "I cannot see their data".

A firm left without an email or id gets a placeholder owner: seeded correctly,
inspectable with psql, but nobody can sign into it.
"""

from __future__ import annotations

import argparse
from datetime import date, timedelta
from decimal import Decimal

import httpx
import psycopg

from legalrag.config import get_clerk_secret_key
from legalrag.db import get_connection, set_tenant_context
from legalrag.orgs import create_organization
from legalrag.practice.billing import create_invoice
from legalrag.practice.cases import create_case, create_hearing
from legalrag.practice.clients import create_client
from legalrag.practice.documents import create_document
from legalrag.practice.matters import create_matter
from legalrag.practice.tasks import create_task
from legalrag.practice.time_entries import create_time_entry

TODAY = date.today()

# Named rather than inlined as 0: the one place to change if a seeded firm ever
# needs to show a taxed bill.
TAX_RATE = Decimal(0)

# Two firms whose names cannot be confused at a glance. The check is "am I
# looking at the wrong firm's data", and "مكتب ألفا" vs "مكتب بيتا" answers that
# faster than two plausible Egyptian firm names would.
FIRMS = {
    "alpha": {
        "name": "مكتب ألفا للمحاماة",
        "specialties": ["civil", "commercial", "corporate"],
        "team": [
            ("user_alpha_owner", "owner", "أ. ألفا المالك", "شريك مؤسس", "owner@alpha.test"),
            ("user_alpha_lawyer", "lawyer", "أ. ألفا المحامي", "محامٍ", "lawyer@alpha.test"),
        ],
        "prefix": "ألفا",
    },
    "beta": {
        "name": "مكتب بيتا للمحاماة",
        "specialties": ["labour", "family_personal_status"],
        "team": [
            ("user_beta_owner", "owner", "أ. بيتا المالك", "شريك مؤسس", "owner@beta.test"),
        ],
        "prefix": "بيتا",
    },
}


def reset_firm(conn: psycopg.Connection, name: str) -> None:
    """Removes a firm and everything under it, by name.

    Deletes the organization row and lets ON DELETE CASCADE take the rest.
    trust_transactions is the one table that blocks a matter delete by design
    (ON DELETE RESTRICT), so it goes first.

    memberships and invitations are the two tables whose organization_id has no
    ON DELETE clause at all (0005_organizations.sql, before the practice tables
    established the CASCADE habit), so they default to NO ACTION and block the
    delete. They are cleared here rather than by changing the constraint: a firm
    row is not meant to be deletable while people still belong to it, and this
    script is the one place where deleting a whole firm is the point.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM organizations WHERE name = %s", (name,))
        row = cur.fetchone()
        if row is None:
            return
        org_id = row[0]
        cur.execute("DELETE FROM trust_transactions WHERE organization_id = %s", (org_id,))
        cur.execute("DELETE FROM invitations WHERE organization_id = %s", (org_id,))
        cur.execute("DELETE FROM memberships WHERE organization_id = %s", (org_id,))
        cur.execute("DELETE FROM organizations WHERE id = %s", (org_id,))
    print(f"  حُذف المكتب السابق: {name}")


def seat_team(conn: psycopg.Connection, org_id: int, team: list[tuple]) -> None:
    """Fills the Owner's profile and seats the rest of the team.

    create_organization already seated the Owner but collects no profile, so
    the first row is an UPDATE. Inserting it again would hit the membership
    unique constraint.
    """
    owner = team[0]
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE memberships SET display_name = %s, title = %s, email = %s "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (owner[2], owner[3], owner[4], org_id, owner[0]),
        )
        for clerk_user_id, role, display_name, title, email in team[1:]:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role, "
                "display_name, title, email) VALUES (%s, %s, %s, %s, %s, %s)",
                (org_id, clerk_user_id, role, display_name, title, email),
            )


def seed_firm(conn: psycopg.Connection, key: str, owner_clerk_id: str | None) -> dict:
    """Builds one firm and returns the ids the manual check needs."""
    spec = FIRMS[key]
    team = list(spec["team"])
    if owner_clerk_id:
        team[0] = (owner_clerk_id, "owner", team[0][2], team[0][3], team[0][4])
    owner_id = team[0][0]
    lawyer_id = team[-1][0]
    prefix = spec["prefix"]

    org = create_organization(conn, spec["name"], owner_id, specialties=spec["specialties"])
    org_id = org.id

    # Every write below is a tenant write, so the context comes first. Without
    # it the policy matches nothing and this function silently seeds an empty
    # firm while reporting success.
    set_tenant_context(conn, org_id)
    seat_team(conn, org_id, team)

    company = create_client(
        conn, org_id, name=f"شركة {prefix} للتوريدات", client_type="company",
        industry="تجارة", client_since=TODAY - timedelta(days=400),
    )
    person = create_client(
        conn, org_id, name=f"{prefix} عبد الرحمن", client_type="individual",
        client_since=TODAY - timedelta(days=120),
    )

    matter_a = create_matter(
        conn, org_id, client_id=company.id, name=f"مطالبة توريدات — {prefix}",
        matter_type="commercial", billing_type="hourly",
        responsible_user=owner_id, opened_date=TODAY - timedelta(days=200),
    )
    matter_b = create_matter(
        conn, org_id, client_id=person.id, name=f"نزاع عقد إيجار — {prefix}",
        matter_type="civil", billing_type="fixed_fee",
        responsible_user=lawyer_id, opened_date=TODAY - timedelta(days=60),
    )

    case = create_case(
        conn, org_id, matter_id=matter_a.id,
        court=f"محكمة {prefix} الاقتصادية", case_number=f"{TODAY.year}/{1000 + org_id}",
        filed_date=TODAY - timedelta(days=190), judicial_year=TODAY.year,
    )

    # One hearing behind us with a recorded outcome, two ahead, so the agenda,
    # the dashboard's "upcoming" panel and the closed-outcome badge all have
    # something to show.
    create_hearing(
        conn, org_id, matter_id=matter_a.id, hearing_date=TODAY - timedelta(days=30),
        hearing_time="10:00 ص", court=f"محكمة {prefix} الاقتصادية",
        purpose="الجلسة الأولى", outcome="other", outcome_note="حُدد جدول الإثبات",
    )
    create_hearing(
        conn, org_id, matter_id=matter_a.id, hearing_date=TODAY + timedelta(days=5),
        hearing_time="11:00 ص", court=f"محكمة {prefix} الاقتصادية", purpose="نظر المذكرات",
    )
    create_hearing(
        conn, org_id, matter_id=matter_b.id, hearing_date=TODAY + timedelta(days=18),
        hearing_time="09:30 ص", court=f"محكمة {prefix} المدنية", purpose="المرافعة",
    )

    # Overdue, due today and due later: the dashboard counts these separately
    # (overdue_tasks vs tasks_due_this_week) and they must not overlap.
    create_task(conn, org_id, title=f"مراجعة عقد — {prefix}", assignee=owner_id,
                matter_id=matter_a.id, due_date=TODAY - timedelta(days=3))
    create_task(conn, org_id, title=f"إعداد مذكرة — {prefix}", assignee=owner_id,
                matter_id=matter_a.id, due_date=TODAY)
    create_task(conn, org_id, title=f"اجتماع موكّل — {prefix}", assignee=lawyer_id,
                matter_id=matter_b.id, due_date=TODAY + timedelta(days=4))
    create_task(conn, org_id, title=f"مهمة منجزة — {prefix}", assignee=owner_id,
                matter_id=matter_b.id, due_date=TODAY - timedelta(days=1), status="done")

    doc = create_document(
        conn, org_id, name=f"مذكرة دفاع — {prefix}.pdf", uploaded_by=owner_id,
        # brief, not memo: DOC_TYPES has no "memo" and the call raises on an
        # unknown type. «مذكرة» is a brief in this taxonomy.
        matter_id=matter_a.id, doc_type="brief", status="under_review",
        content=b"%PDF-1.4 seeded on staging\n",
    )

    create_time_entry(conn, org_id, matter_id=matter_a.id, clerk_user_id=owner_id,
                      entry_date=TODAY - timedelta(days=2), hours=Decimal("3.5"),
                      description="مراجعة مستندات", billable=True)
    create_time_entry(conn, org_id, matter_id=matter_a.id, clerk_user_id=lawyer_id,
                      entry_date=TODAY - timedelta(days=1), hours=Decimal("2.0"),
                      description="إعداد مذكرة", billable=True)

    # Egyptian legal fees carry no VAT for these demo matters, so tax_rate is
    # zero. create_invoice derives tax_amount and total_amount itself -- passing
    # them in is not possible and not wanted: one place computes an invoice.
    paid = create_invoice(
        conn, org_id, client_id=company.id, matter_id=matter_a.id,
        issued_date=TODAY - timedelta(days=45), due_date=TODAY - timedelta(days=15),
        amount=Decimal("18000.00"), tax_rate=TAX_RATE, status="paid",
    )
    outstanding = create_invoice(
        conn, org_id, client_id=person.id, matter_id=matter_b.id,
        issued_date=TODAY - timedelta(days=20), due_date=TODAY - timedelta(days=2),
        amount=Decimal("9500.00"), tax_rate=TAX_RATE, status="sent",
    )

    # create_invoice has no paid_date parameter -- status and payment date are
    # set by the payment flow, which this script is not. The dashboard's
    # collections figures read paid_date, so a paid invoice without one would
    # leave that card at zero and look like a bug during the check.
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE invoices SET paid_date = %s WHERE id = %s AND organization_id = %s",
            (TODAY - timedelta(days=10), paid.id, org_id),
        )

    return {
        "المكتب": spec["name"],
        "organization_id": org_id,
        "المالك (clerk id)": owner_id,
        "الموكّلون": [company.id, person.id],
        "القضايا": [matter_a.id, matter_b.id],
        "السجل القضائي": case.id,
        "المستند": doc.id,
        "الفواتير": [paid.id, outstanding.id],
    }


def clerk_user_id_for_email(email: str) -> str:
    """Looks up a Clerk user id by email, same as seed_demo_firm.py does.

    The email is the thing you know after signing up; the id is not. Needs
    CLERK_SECRET_KEY for the environment you are seeding -- a staging key
    cannot see a production user, and that failure is silent (an empty list),
    so it is turned into a clear error here.
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
            f"لا مستخدم بهذا البريد في Clerk: {email}\n"
            "تأكّد أنك سجّلت الدخول بهذا الحساب على staging مرة واحدة على الأقل، "
            "وأن CLERK_SECRET_KEY يخصّ بيئة staging نفسها."
        )
    return users[0]["id"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    for firm in ("alpha", "beta"):
        parser.add_argument(
            f"--{firm}-email",
            help=f"Email of the account to seat as {firm.upper()}'s Owner. "
            "Looked up in Clerk, which needs CLERK_SECRET_KEY for this "
            "environment. The email is the thing you know after signing up.",
        )
        parser.add_argument(
            f"--{firm}-clerk-id",
            help=f"Same seat as --{firm}-email, given directly when you already "
            "have the id.",
        )
    parser.add_argument(
        "--reset", action="store_true",
        help="Delete both firms first. Safe to re-run; only these two names are touched.",
    )
    args = parser.parse_args()

    # مقعد المالك لكل مكتب على حدة. الحلّ قبل أي كتابة: خطأ في بريد يوقف
    # السكربت قبل أن يزرع نصف بيانات ثم يسقط.
    owners: dict[str, str | None] = {}
    for firm in ("alpha", "beta"):
        email = getattr(args, f"{firm}_email")
        clerk_id = getattr(args, f"{firm}_clerk_id")
        if email and clerk_id:
            raise SystemExit(f"مرّر --{firm}-email أو --{firm}-clerk-id، لا كليهما.")
        if email:
            clerk_id = clerk_user_id_for_email(email)
            print(f"{FIRMS[firm]['name']} ← {email} ({clerk_id})")
        owners[firm] = clerk_id

    if owners["alpha"] and owners["alpha"] == owners["beta"]:
        raise SystemExit(
            "الحساب نفسه مالكًا للمكتبين يُبطل الفحص: العضوية في الاثنين تجعل "
            "الوصول مشروعًا، فلا يثبت المنع شيئًا. استعمل حسابين مختلفين."
        )

    for firm, seat in owners.items():
        if not seat:
            print(
                f"تنبيه: {FIRMS[firm]['name']} بلا حساب حقيقي — يُزرع بمعرّف وهمي، "
                "فيُفحص بـpsql ولا يُدخل إليه من الواجهة."
            )

    with get_connection() as conn:
        if args.reset:
            print("إعادة الضبط:")
            for spec in FIRMS.values():
                reset_firm(conn, spec["name"])

        results = []
        for key in ("alpha", "beta"):
            print(f"\nزرع {FIRMS[key]['name']} …")
            results.append(seed_firm(conn, key, owners[key]))
        conn.commit()

    print("\n" + "=" * 64)
    print("المعرّفات اللازمة للفحص البشري (T-047)")
    print("=" * 64)
    for r in results:
        print(f"\n{r['المكتب']}  (organization_id = {r['organization_id']})")
        print(f"  المالك:        {r['المالك (clerk id)']}")
        print(f"  الموكّلون:      {r['الموكّلون']}")
        print(f"  القضايا:       {r['القضايا']}")
        print(f"  السجل القضائي: {r['السجل القضائي']}")
        print(f"  المستند:       {r['المستند']}")
        print(f"  الفواتير:      {r['الفواتير']}")

    alpha, beta = results
    print("\n" + "-" * 64)
    print("سجّل الدخول بحساب بيتا، ثم جرّب معرّفات ألفا في شريط العنوان.")
    print("المطلوب في كل سطر: 404 أو «غير موجود». وأي ظهور لبيانات ألفا = فشل.")
    print("-" * 64)
    print(f"  /matters/{alpha['القضايا'][0]}")
    print(f"  /clients/{alpha['الموكّلون'][0]}")
    print(f"  /documents/{alpha['المستند']}          ← وجرّب رابط التنزيل المباشر أيضًا")
    print(f"  /billing/{alpha['الفواتير'][0]}")
    print(f"  /cases/{alpha['السجل القضائي']}")
    print("\nثم سجّل الدخول بحساب ألفا وتأكّد أن كل شاشة تعرض بياناتها.")
    print("قائمة فارغة ليست نجاحًا — هي العطل.\n")


if __name__ == "__main__":
    main()


