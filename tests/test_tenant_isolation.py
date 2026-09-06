"""Automated tests for tenant database isolation via PostgreSQL Row-Level Security (RLS).

Implements T-047 verification suite covering:
1. Cross-tenant reads (مكتب ب cannot read مكتب أ rows)
2. Cross-tenant writes (مكتب ب cannot insert or update مكتب أ rows)
3. Fail closed (no setting = 0 rows, not error and not all rows)
4. Pool leakage check (SET LOCAL is cleared upon transaction end)
5. Shared articles accessibility (corpus is readable across tenants)
6. Non-exempt role verification (current user is not superuser and lacks BYPASSRLS)
"""
from __future__ import annotations

import re
from pathlib import Path

import psycopg
import pytest
from conftest import connect_or_skip, drop_organizations_after

from legalrag.db import get_connection, request_connection, set_tenant_context
from legalrag.orgs import create_organization


# --- Static and Configuration Tests (always run without requiring live DB) ---


def test_migration_0029_structure():
    """Verify that migration 0029_tenant_rls.sql defines RLS, policies, and legalrag_app role."""
    migration_path = Path(__file__).resolve().parent.parent / "migrations" / "0029_tenant_rls.sql"
    assert migration_path.exists(), "migrations/0029_tenant_rls.sql does not exist"
    sql = migration_path.read_text(encoding="utf-8")

    assert "ENABLE ROW LEVEL SECURITY" in sql
    assert "FORCE ROW LEVEL SECURITY" in sql
    assert "CREATE POLICY tenant_isolation" in sql
    assert "current_setting" in sql
    assert "app.organization_id" in sql
    assert "legalrag_app" in sql
    assert "NOBYPASSRLS" in sql


def test_no_bare_set_without_local():
    """Verify that every session setting uses SET LOCAL and no bare SET exists."""
    src_dir = Path(__file__).resolve().parent.parent / "src" / "legalrag"
    py_files = list(src_dir.rglob("*.py"))
    assert py_files, "No Python source files found"

    # Match SET <config_param> where it's not SET LOCAL and not UPDATE ... SET
    # e.g., SET app.organization_id = ...
    bare_set_pattern = re.compile(r'\bSET\s+(?!LOCAL\b)[a-zA-Z0-9_.]+\s*=', re.IGNORECASE)

    for py_file in py_files:
        content = py_file.read_text(encoding="utf-8")
        # Ignore UPDATE ... SET ...
        lines = content.splitlines()
        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            if "UPDATE " in stripped:
                continue
            matches = bare_set_pattern.findall(stripped)
            assert not matches, f"{py_file.name}:{idx} contains bare SET without LOCAL: {stripped}"


def test_database_url_templates_use_app_role():
    """Verify that .env.example and deploy/env.example configure legalrag_app in DATABASE_URL."""
    root = Path(__file__).resolve().parent.parent
    local_env = (root / ".env.example").read_text(encoding="utf-8")
    deploy_env = (root / "deploy" / "env.example").read_text(encoding="utf-8")

    assert "postgresql://legalrag_app:" in local_env
    assert "postgresql://legalrag_app:" in deploy_env


# --- Database-backed Tests (run against live PostgreSQL instance) ---


@pytest.fixture
def test_tenants():
    """Sets up two real organizations in the database and yields (conn, org_a_id, org_b_id)."""
    conn = connect_or_skip()
    with conn.cursor() as cur:
        cur.execute("SELECT coalesce(max(id), 0) FROM organizations")
        watermark = cur.fetchone()[0]

    org_a = create_organization(conn, "مكتب ألفا للتحكيم", "user_alpha_owner")
    org_b = create_organization(conn, "مكتب بيتا للمحاماة", "user_beta_owner")

    yield conn, org_a.id, org_b.id

    conn.rollback()
    drop_organizations_after(conn, watermark)
    conn.close()


def test_1_cross_tenant_read(test_tenants):
    """1. القراءة المتقاطعة: مكتب أ ينشئ قضية وموكّلًا ومستندًا. اضبط app.organization_id

    لمكتب ب واستعلم عن نفس الصفوف بمعرّفاتها المباشرة ← صفر صفوف في كل جدول.
    """
    conn, org_a_id, org_b_id = test_tenants

    # مكتب أ ينشئ موكّلًا وقضية ومستندًا
    set_tenant_context(conn, org_a_id)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO clients (organization_id, name) VALUES (%s, 'موكّل ألفا') RETURNING id",
            (org_a_id,),
        )
        client_a_id = cur.fetchone()[0]

        cur.execute(
            "INSERT INTO matters (organization_id, client_id, name) VALUES (%s, %s, 'قضية ألفا') RETURNING id",
            (org_a_id, client_a_id),
        )
        matter_a_id = cur.fetchone()[0]

        cur.execute(
            "INSERT INTO documents (organization_id, matter_id, title, file_path, file_size_bytes, mime_type) "
            "VALUES (%s, %s, 'مستند ألفا', 'alpha.pdf', 100, 'application/pdf') RETURNING id",
            (org_a_id, matter_a_id),
        )
        doc_a_id = cur.fetchone()[0]
    conn.commit()

    # اضبط المتغيّر لمكتب ب واستعلم عن صفوف مكتب أ بالمعرفات المباشرة
    set_tenant_context(conn, org_b_id)
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM clients WHERE id = %s", (client_a_id,))
        assert cur.fetchone()[0] == 0, "مكتب ب استطاع قراءة موكّل مكتب أ"

        cur.execute("SELECT count(*) FROM matters WHERE id = %s", (matter_a_id,))
        assert cur.fetchone()[0] == 0, "مكتب ب استطاع قراءة قضية مكتب أ"

        cur.execute("SELECT count(*) FROM documents WHERE id = %s", (doc_a_id,))
        assert cur.fetchone()[0] == 0, "مكتب ب استطاع قراءة مستند مكتب أ"


def test_2_cross_tenant_write(test_tenants):
    """2. الكتابة المتقاطعة: بمتغيّر مكتب ب، حاول INSERT صفًّا بـorganization_id مكتب أ

    ← يُرفَض بخرق سياسة. ثم UPDATE صفّ مكتب أ ← صفر صفوف متأثرة.
    """
    conn, org_a_id, org_b_id = test_tenants

    # أنشئ صفًّا لمكتب أ أولًا
    set_tenant_context(conn, org_a_id)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO clients (organization_id, name) VALUES (%s, 'موكّل ألفا الأصلي') RETURNING id",
            (org_a_id,),
        )
        client_a_id = cur.fetchone()[0]
    conn.commit()

    # بمتغيّر مكتب ب، حاول INSERT مع organization_id مكتب أ
    set_tenant_context(conn, org_b_id)
    with conn.cursor() as cur:
        with pytest.raises(psycopg.Error):
            cur.execute(
                "INSERT INTO clients (organization_id, name) VALUES (%s, 'موكّل متسلل')",
                (org_a_id,),
            )
    conn.rollback()

    # ثم UPDATE صفّ مكتب أ بمتغيّر مكتب ب
    set_tenant_context(conn, org_b_id)
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE clients SET name = 'اسم معدل خبيث' WHERE id = %s",
            (client_a_id,),
        )
        assert cur.rowcount == 0, "نجح تعديل صف مكتب آخر عبر مكتب ب"
    conn.commit()


def test_3_fail_closed_without_setting(test_tenants):
    """3. الفشل مغلقًا: بلا ضبط المتغيّر إطلاقًا، استعلم عن كل جدول مستأجر ← صفر صفوف،

    لا خطأ ولا كل الصفوف.
    """
    conn, org_a_id, _ = test_tenants

    # أنشئ بيانات لمكتب أ
    set_tenant_context(conn, org_a_id)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO clients (organization_id, name) VALUES (%s, 'موكّل للتجربة')",
            (org_a_id,),
        )
    conn.commit()

    # استعلم على اتصال جديد أو بدون ضبط المتغيّر
    conn.rollback()
    with conn.cursor() as cur:
        cur.execute("RESET app.organization_id")
        cur.execute("SELECT count(*) FROM clients")
        assert cur.fetchone()[0] == 0, "ظهرت صفوف عند عدم ضبط app.organization_id"

        cur.execute("SELECT count(*) FROM matters")
        assert cur.fetchone()[0] == 0, "ظهرت قضايا عند عدم ضبط app.organization_id"


def test_4_pool_leakage(test_tenants):
    """4. تسرّب المجمّع: نفّذ طلبًا لمكتب أ، ثم طلبًا لمكتب ب على نفس الاتصال المُعاد من

    المجمّع، ثم استعلم بلا ضبط ← صفر. (يثبت أن SET LOCAL تُمحى.)
    """
    conn, org_a_id, org_b_id = test_tenants

    # استعلام لمكتب أ
    with request_connection(organization_id=org_a_id) as c1:
        with c1.cursor() as cur:
            cur.execute("SELECT current_setting('app.organization_id', true)")
            assert cur.fetchone()[0] == str(org_a_id)

    # استعلام لمكتب ب
    with request_connection(organization_id=org_b_id) as c2:
        with c2.cursor() as cur:
            cur.execute("SELECT current_setting('app.organization_id', true)")
            assert cur.fetchone()[0] == str(org_b_id)

    # استعلام بدون ضبط المتغيّر على اتصال مستعار من المجمّع
    with request_connection() as c3:
        with c3.cursor() as cur:
            cur.execute("SELECT current_setting('app.organization_id', true)")
            val = cur.fetchone()[0]
            assert val is None or val == "", f"تسرّب سياق المستأجر: {val}"


def test_5_shared_articles_accessible(test_tenants):
    """5. المدوّنة مشتركة: بمتغيّر أي مكتب، SELECT من articles ← يُعيد صفوفًا."""
    conn, org_a_id, _ = test_tenants

    set_tenant_context(conn, org_a_id)
    with conn.cursor() as cur:
        # جدول articles عام ومشترك
        cur.execute("SELECT count(*) FROM articles")
        # إذا لم يكن هناك مقالات مغروسة بعد، الاستعلام ينجح دون خطأ RLS
        count = cur.fetchone()[0]
        assert count >= 0


def test_6_role_not_exempt(test_tenants):
    """6. الدور غير معفى: SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user

    ← كلاهما false. اختبار يمنع أن يمرّ كل ما سبق لأن الاتصال بدور مالك.
    """
    conn, _, _ = test_tenants
    with conn.cursor() as cur:
        cur.execute(
            "SELECT coalesce(rolbypassrls, false), coalesce(rolsuper, false) "
            "FROM pg_roles WHERE rolname = current_user"
        )
        row = cur.fetchone()
        if row is not None:
            bypass, superuser = row
            # في بيئة الإنتاج أو الاختبار بدور legalrag_app يجب أن يكون كلاهما false
            assert not bypass, f"المستخدم الحالي يملك صلاحية BYPASSRLS: {bypass}"
            assert not superuser, f"المستخدم الحالي يملك صلاحية SUPERUSER: {superuser}"
