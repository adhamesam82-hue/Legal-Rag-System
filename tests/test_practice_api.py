"""Practice-pillar route tests against a real Postgres.

Only get_current_user_id is faked, matching tests/test_orgs_api.py:
get_current_membership still runs for real, so the tenant gate on every route
is genuinely exercised rather than stubbed out.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id

OWNER = "user_owner"


@pytest.fixture
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    with connection.cursor() as cur:
        cur.execute("SELECT coalesce(max(id), 0) FROM organizations")
        mark = cur.fetchone()[0]
    yield connection
    drop_organizations_after(connection, mark)
    connection.close()


@pytest.fixture
def client(conn):
    app.dependency_overrides[get_current_user_id] = lambda: OWNER
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user_id, None)


@pytest.fixture
def org(client):
    return client.post("/api/orgs", json={"name": "Test Firm"}).json()["id"]


def make_client(client, org, **overrides):
    body = {"name": "Nile Trading Co.", "client_type": "company"} | overrides
    response = client.post(f"/api/orgs/{org}/clients", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def make_matter(client, org, client_id, **overrides):
    body = {
        "client_id": client_id,
        "name": "Nabil v. Nile Trading",
        "matter_type": "civil",
        "billing_type": "hourly",
        "responsible_user": OWNER,
        "opened_date": "2026-01-05",
    } | overrides
    response = client.post(f"/api/orgs/{org}/matters", json=body)
    assert response.status_code == 201, response.text
    return response.json()


class TestClients:
    def test_create_then_list_and_fetch(self, client, org):
        created = make_client(client, org, industry="Trading")

        listed = client.get(f"/api/orgs/{org}/clients").json()
        assert [c["name"] for c in listed] == ["Nile Trading Co."]

        fetched = client.get(f"/api/orgs/{org}/clients/{created['id']}").json()
        assert fetched["industry"] == "Trading"

    def test_search_and_status_filters(self, client, org):
        make_client(client, org, name="Delta Foods")
        make_client(client, org, name="Zahran Construction", status="inactive")

        assert len(client.get(f"/api/orgs/{org}/clients?q=delta").json()) == 1
        assert len(client.get(f"/api/orgs/{org}/clients?status=inactive").json()) == 1

    def test_patch_updates_only_supplied_fields(self, client, org):
        created = make_client(client, org, industry="Trading")
        response = client.patch(
            f"/api/orgs/{org}/clients/{created['id']}", json={"status": "inactive"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "inactive"
        assert response.json()["industry"] == "Trading"

    def test_primary_contact_is_unique_per_client(self, client, org):
        created = make_client(client, org)
        path = f"/api/orgs/{org}/clients/{created['id']}/contacts"
        client.post(path, json={"name": "Karim Fahmy", "is_primary": True})
        client.post(path, json={"name": "Rania Samy", "is_primary": True})

        contacts = client.get(f"/api/orgs/{org}/clients/{created['id']}").json()[
            "contacts"
        ]
        primaries = [c["name"] for c in contacts if c["is_primary"]]
        assert primaries == ["Rania Samy"]

    def test_deleting_a_client_with_matters_is_rejected(self, client, org):
        created = make_client(client, org)
        make_matter(client, org, created["id"])

        response = client.delete(f"/api/orgs/{org}/clients/{created['id']}")
        assert response.status_code == 409
        assert "matters" in response.json()["detail"]


class TestMatters:
    def test_create_returns_client_name_and_defaults(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        assert matter["client_name"] == "Nile Trading Co."
        assert matter["status"] == "active"
        assert matter["case_id"] is None

    def test_matter_cannot_reference_another_orgs_client(self, client, org):
        other_org = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        foreign_client = make_client(client, other_org)

        response = client.post(
            f"/api/orgs/{org}/matters",
            json={
                "client_id": foreign_client["id"],
                "name": "Cross-tenant matter",
                "matter_type": "corporate",
                "billing_type": "hourly",
                "responsible_user": OWNER,
                "opened_date": "2026-01-05",
            },
        )
        assert response.status_code == 404

    def test_closing_a_matter_sets_closed_date(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)

        response = client.patch(
            f"/api/orgs/{org}/matters/{matter['id']}", json={"status": "closed"}
        )
        assert response.status_code == 200
        assert response.json()["closed_date"] is not None

    def test_reopening_a_matter_clears_closed_date(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        client.patch(f"/api/orgs/{org}/matters/{matter['id']}", json={"status": "closed"})

        response = client.patch(
            f"/api/orgs/{org}/matters/{matter['id']}", json={"status": "active"}
        )
        assert response.status_code == 200
        assert response.json()["closed_date"] is None

    def test_next_deadline_is_derived_from_open_tasks(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        client.post(
            f"/api/orgs/{org}/tasks",
            json={
                "title": "File appeal brief",
                "assignee": OWNER,
                "matter_id": matter["id"],
                "due_date": "2030-03-01",
            },
        )

        fetched = client.get(f"/api/orgs/{org}/matters/{matter['id']}").json()
        assert fetched["next_deadline"]["label"] == "File appeal brief"

    def test_completed_tasks_do_not_count_as_the_next_deadline(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        client.post(
            f"/api/orgs/{org}/tasks",
            json={
                "title": "Done already",
                "assignee": OWNER,
                "matter_id": matter["id"],
                "due_date": "2030-03-01",
                "status": "done",
            },
        )

        fetched = client.get(f"/api/orgs/{org}/matters/{matter['id']}").json()
        assert fetched["next_deadline"] is None


class TestCases:
    def test_one_case_per_matter(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        body = {
            "matter_id": matter["id"],
            "court": "Cairo Economic Court",
            "case_number": "CEC-2026-1345",
            "filed_date": "2026-01-05",
        }
        assert client.post(f"/api/orgs/{org}/cases", json=body).status_code == 201

        duplicate = client.post(f"/api/orgs/{org}/cases", json=body)
        assert duplicate.status_code == 409

    def test_case_children_come_back_on_the_detail_route(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        case = client.post(
            f"/api/orgs/{org}/cases",
            json={
                "matter_id": matter["id"],
                "court": "Cairo Economic Court",
                "case_number": "CEC-2026-1345",
                "filed_date": "2026-01-05",
            },
        ).json()
        case_id = case["id"]

        client.post(
            f"/api/orgs/{org}/cases/{case_id}/deadlines",
            json={"label": "File appeal brief", "due_date": "2030-02-02"},
        )
        client.post(
            f"/api/orgs/{org}/cases/{case_id}/evidence",
            json={
                "name": "Distribution Agreement",
                "submitted_by": "us",
                "submitted_date": "2026-01-20",
            },
        )

        fetched = client.get(f"/api/orgs/{org}/cases/{case_id}").json()
        assert len(fetched["deadlines"]) == 1
        assert len(fetched["evidence"]) == 1
        assert fetched["matter_name"] == "Nabil v. Nile Trading"

    def test_case_deadline_feeds_the_matters_next_deadline(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        case_id = client.post(
            f"/api/orgs/{org}/cases",
            json={
                "matter_id": matter["id"],
                "court": "Cairo Economic Court",
                "case_number": "CEC-2026-1345",
                "filed_date": "2026-01-05",
            },
        ).json()["id"]
        client.post(
            f"/api/orgs/{org}/cases/{case_id}/deadlines",
            json={"label": "Submit rebuttal", "due_date": "2030-01-01"},
        )

        fetched = client.get(f"/api/orgs/{org}/matters/{matter['id']}").json()
        assert fetched["next_deadline"]["label"] == "Submit rebuttal"


class TestTimeAndBilling:
    def test_generate_invoice_bills_unbilled_time_once(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        for hours in ("2.0", "3.5"):
            client.post(
                f"/api/orgs/{org}/time-entries",
                json={
                    "matter_id": matter["id"],
                    "entry_date": "2026-02-01",
                    "hours": hours,
                    "rate": "1000",
                },
            )

        invoice = client.post(
            f"/api/orgs/{org}/invoices/generate", json={"matter_id": matter["id"]}
        )
        assert invoice.status_code == 201, invoice.text
        assert float(invoice.json()["amount"]) == 5500.0
        assert len(invoice.json()["lines"]) == 2

        # Second run has nothing left to bill.
        again = client.post(
            f"/api/orgs/{org}/invoices/generate", json={"matter_id": matter["id"]}
        )
        assert again.status_code == 409

    def test_billed_time_cannot_be_edited_or_deleted(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        entry = client.post(
            f"/api/orgs/{org}/time-entries",
            json={
                "matter_id": matter["id"],
                "entry_date": "2026-02-01",
                "hours": "2.0",
                "rate": "1000",
            },
        ).json()
        client.post(
            f"/api/orgs/{org}/invoices/generate", json={"matter_id": matter["id"]}
        )

        assert (
            client.patch(
                f"/api/orgs/{org}/time-entries/{entry['id']}", json={"hours": "9.0"}
            ).status_code
            == 404
        )
        assert (
            client.delete(f"/api/orgs/{org}/time-entries/{entry['id']}").status_code
            == 404
        )

    def test_invoice_numbers_increment_per_firm(self, client, org):
        client_id = make_client(client, org)["id"]
        first = client.post(
            f"/api/orgs/{org}/invoices",
            json={
                "client_id": client_id,
                "issued_date": "2026-02-01",
                "due_date": "2026-03-01",
            },
        ).json()
        second = client.post(
            f"/api/orgs/{org}/invoices",
            json={
                "client_id": client_id,
                "issued_date": "2026-02-02",
                "due_date": "2026-03-02",
            },
        ).json()
        assert second["number"] != first["number"]
        assert second["number"] > first["number"]

    def test_time_summary_separates_billable_from_unbilled(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        client.post(
            f"/api/orgs/{org}/time-entries",
            json={
                "matter_id": matter["id"],
                "entry_date": "2026-02-01",
                "hours": "2.0",
                "rate": "1000",
                "billable": False,
            },
        )
        summary = client.get(f"/api/orgs/{org}/time-entries/summary").json()
        assert float(summary["total_hours"]) == 2.0
        assert float(summary["billable_hours"]) == 0.0


class TestTasks:
    def test_marking_done_stamps_completed_at_and_reopening_clears_it(self, client, org):
        created = client.post(
            f"/api/orgs/{org}/tasks", json={"title": "Draft brief", "assignee": OWNER}
        ).json()

        done = client.patch(
            f"/api/orgs/{org}/tasks/{created['id']}", json={"status": "done"}
        ).json()
        assert done["completed_at"] is not None

        reopened = client.patch(
            f"/api/orgs/{org}/tasks/{created['id']}", json={"status": "todo"}
        ).json()
        assert reopened["completed_at"] is None


class TestDashboard:
    def test_rolls_up_matters_tasks_and_billing(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        client.post(
            f"/api/orgs/{org}/tasks",
            json={"title": "Open task", "assignee": OWNER, "matter_id": matter["id"]},
        )
        client.post(
            f"/api/orgs/{org}/time-entries",
            json={
                "matter_id": matter["id"],
                "entry_date": "2026-02-01",
                "hours": "2.0",
                "rate": "1000",
            },
        )

        board = client.get(f"/api/orgs/{org}/dashboard").json()
        assert board["active_matters"] == 1
        assert board["open_tasks"] == 1
        assert board["active_clients"] == 1
        assert float(board["unbilled_amount"]) == 2000.0
        assert board["tasks_due_this_week"] == 0

    def test_tasks_due_this_week_boundaries(self, client, org):
        """إثبات حدود tasks_due_this_week:
        - مهمة بعد 7 أيام تُعدّ.
        - مهمة بعد 8 أيام لا تُعدّ ضمن الأسبوع.
        - مهمة متأخرة بالأمس تُعدّ في overdue_tasks ولا تظهر في tasks_due_this_week (لا تظهر في العدّين معاً).
        """
        today = date.today()
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)

        # 1. مهمة مستحقة بعد 7 أيام (يجب أن تُعدّ)
        client.post(
            f"/api/orgs/{org}/tasks",
            json={
                "title": "Due in 7 days",
                "assignee": OWNER,
                "matter_id": matter["id"],
                "due_date": (today + timedelta(days=7)).isoformat(),
            },
        )

        # 2. مهمة مستحقة بعد 8 أيام (لا تُعدّ)
        client.post(
            f"/api/orgs/{org}/tasks",
            json={
                "title": "Due in 8 days",
                "assignee": OWNER,
                "matter_id": matter["id"],
                "due_date": (today + timedelta(days=8)).isoformat(),
            },
        )

        # 3. مهمة متأخرة (تُعدّ في overdue_tasks ولا تظهر في tasks_due_this_week)
        client.post(
            f"/api/orgs/{org}/tasks",
            json={
                "title": "Overdue task",
                "assignee": OWNER,
                "matter_id": matter["id"],
                "due_date": (today - timedelta(days=1)).isoformat(),
            },
        )

        # 4. مهمة منتهية مستحقة بعد يومين (لا تُعدّ في أي عداد مهام مفتوحة)
        done_task = client.post(
            f"/api/orgs/{org}/tasks",
            json={
                "title": "Done task in week",
                "assignee": OWNER,
                "matter_id": matter["id"],
                "due_date": (today + timedelta(days=2)).isoformat(),
            },
        ).json()
        client.patch(
            f"/api/orgs/{org}/tasks/{done_task['id']}",
            json={"status": "done"},
        )

        board = client.get(f"/api/orgs/{org}/dashboard").json()

        # التحقق الدقيق من الحدود:
        # tasks_due_this_week تحسب فقط المهمة المستحقة بعد 7 أيام (المستحقة بعد 8 أيام والمهمة المتأخرة لا تحسبان فيها)
        assert board["tasks_due_this_week"] == 1
        # overdue_tasks تحسب فقط المهمة المتأخرة
        assert board["overdue_tasks"] == 1
        # المهام المفتوحة الإجمالية: 3 مهام مفتوحة (7 أيام + 8 أيام + المتأخرة)
        assert board["open_tasks"] == 3


class TestTenantIsolation:
    """A caller with a valid session must not reach another firm's records."""

    def test_non_member_cannot_read_any_pillar(self, client, org):
        make_client(client, org)
        app.dependency_overrides[get_current_user_id] = lambda: "user_outsider"

        for path in ("clients", "matters", "cases", "tasks", "invoices", "dashboard"):
            response = client.get(f"/api/orgs/{org}/{path}")
            assert response.status_code == 403, path

    def test_records_are_not_visible_across_organizations(self, client, org):
        make_client(client, org, name="Firm One Client")
        other_org = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]

        # Same caller owns both firms, so this is not an auth failure -- it
        # proves the SQL itself filters by organization_id.
        names = [c["name"] for c in client.get(f"/api/orgs/{other_org}/clients").json()]
        assert names == []

    def test_fetching_another_orgs_record_by_id_is_a_404(self, client, org):
        created = make_client(client, org)
        other_org = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]

        response = client.get(f"/api/orgs/{other_org}/clients/{created['id']}")
        assert response.status_code == 404


class TestDashboardInsights:
    """T-059 dashboard insights endpoint tests."""

    def test_empty_organization_returns_clean_zeroes(self, client, org):
        response = client.get(f"/api/orgs/{org}/dashboard/insights")
        assert response.status_code == 200
        data = response.json()

        # All eight fields must be present
        for field in (
            "matters_movement",
            "matters_by_type",
            "kpi_series",
            "kpi_deltas",
            "collections",
            "top_collection_rate",
            "recent_matters",
            "my_tasks_today",
        ):
            assert field in data, f"missing {field}"

        # 1. 8 months movement
        assert len(data["matters_movement"]) == 8
        for m in data["matters_movement"]:
            assert m["opened"] == 0
            assert m["closed"] == 0
            assert "label" in m

        # 2. Matters by type
        assert data["matters_by_type"]["total_active"] == 0
        assert data["matters_by_type"]["items"] == []

        # 3. KPI series: exactly 9 points for each of the 4 metrics
        for k in ("active_matters", "open_tasks", "unbilled_hours", "outstanding_amount"):
            assert len(data["kpi_series"][k]) == 9

        # 4. KPI deltas: flat direction
        for k in ("active_matters", "open_tasks", "unbilled_hours", "outstanding_amount"):
            assert data["kpi_deltas"][k]["direction"] == "flat"

        # 5. Collections
        assert data["collections"]["collected"] == 0.0
        assert data["collections"]["outstanding"] == 0.0

        # 6. Top collection rate
        assert data["top_collection_rate"]["matter_type"] is None
        assert data["top_collection_rate"]["rate"] == 0.0

        # 7. Recent matters
        assert data["recent_matters"]["total"] == 0
        assert data["recent_matters"]["items"] == []

        # 8. My tasks today
        assert data["my_tasks_today"]["total"] == 0
        assert data["my_tasks_today"]["done"] == 0
        assert data["my_tasks_today"]["items"] == []

    def test_tenant_isolation_firm_b_cannot_see_firm_a_insights(self, client, org):
        c = make_client(client, org, name="Org A Client")
        m = make_matter(client, org, c["id"], name="Org A Matter", matter_type="commercial")
        client.post(
            f"/api/orgs/{org}/tasks",
            json={"title": "Org A Task", "matter_id": m["id"], "assignee": OWNER},
        )

        other_org = client.post("/api/orgs", json={"name": "Org B"}).json()["id"]

        # Org B should see 0
        res_b = client.get(f"/api/orgs/{other_org}/dashboard/insights")
        assert res_b.status_code == 200
        b_data = res_b.json()
        assert b_data["recent_matters"]["total"] == 0
        assert b_data["matters_by_type"]["total_active"] == 0
        assert b_data["my_tasks_today"]["total"] == 0

        # Org A should see 1
        res_a = client.get(f"/api/orgs/{org}/dashboard/insights")
        assert res_a.status_code == 200
        a_data = res_a.json()
        assert a_data["recent_matters"]["total"] == 1
        assert a_data["matters_by_type"]["total_active"] == 1
        assert a_data["my_tasks_today"]["total"] == 1

    def test_patch_task_records_activity_for_dashboard_feed(self, client, org):
        c = make_client(client, org)
        m = make_matter(client, org, c["id"])
        task = client.post(
            f"/api/orgs/{org}/tasks",
            json={"title": "Draft appeal brief", "matter_id": m["id"], "assignee": OWNER},
        ).json()

        # Complete task via PATCH
        res = client.patch(
            f"/api/orgs/{org}/tasks/{task['id']}",
            json={"status": "done"},
        )
        assert res.status_code == 200

        # Check activity feed via /activity or /dashboard
        act_res = client.get(f"/api/orgs/{org}/activity")
        assert act_res.status_code == 200
        actions = [a["action"] for a in act_res.json()]
        assert any("أكمل مهمة: Draft appeal brief" in a for a in actions)

    def test_dashboard_export_recent_matters_csv(self, client, org):
        """التحقق من مواصفات تصدير CSV (T-059):
        - ترميز UTF-8 مع علامة BOM لبرنامج Excel.
        - فواصل الأسطر \\r\\n.
        - ترويسة Content-Disposition.
        - تحصين الخلايا ضد هجمات حقن الصيغ (Formula Injection).
        - عزل المستأجرين (Tenant Isolation).
        """
        c = make_client(client, org, name="شركة النور")
        # قضية عادية وقضية تبدأ بصيغة لاختبار الحماية
        make_matter(client, org, c["id"], name="قضية تجارية عادية", matter_type="commercial")
        make_matter(client, org, c["id"], name="=CMD('calc')|'A'", matter_type="civil")

        other_org = client.post("/api/orgs", json={"name": "Org B"}).json()["id"]

        # طلب تصدير Org A
        res_a = client.get(f"/api/orgs/{org}/dashboard/export/recent-matters")
        assert res_a.status_code == 200
        assert "text/csv" in res_a.headers["content-type"]
        assert "attachment; filename=" in res_a.headers.get("content-disposition", "")
        
        content = res_a.content
        # 1. فحص وجود BOM
        assert content.startswith(b"\xef\xbb\xbf"), "ملف CSV يجب أن يبدأ بـ UTF-8 BOM"

        # 2. فحص فواصل الأسطر CRLF
        text = content.decode("utf-8-sig")
        assert "\r\n" in text, "فواصل الأسطر يجب أن تكون \\r\\n"

        # 3. فحص الحماية من حقن الصيغ
        assert "'=CMD('calc')|'A'" in text, "الصيغة التنفيذية يجب أن تسبق بفاصلة عليا للحماية"
        assert "قضية تجارية عادية" in text

        # 4. فحص عزل المستأجرين
        res_b = client.get(f"/api/orgs/{other_org}/dashboard/export/recent-matters")
        assert res_b.status_code == 200
        text_b = res_b.content.decode("utf-8-sig")
        assert "قضية تجارية عادية" not in text_b
        assert "'=CMD('calc')|'A'" not in text_b


