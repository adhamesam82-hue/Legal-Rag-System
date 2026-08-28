"""Hearings: a real outcome, per-column filters, and one search box. T-014, T-017.

Against a real Postgres. The filtering tests are the reason T-014 had to land
first: none of this can be built on a free-text outcome column.
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"


@pytest.fixture(autouse=True)
def _fresh_limits():
    reset_limits()
    yield
    reset_limits()


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


@pytest.fixture
def matter(client, org):
    client_id = client.post(
        f"/api/orgs/{org}/clients", json={"name": "شركة النيل"}
    ).json()["id"]
    return client.post(
        f"/api/orgs/{org}/matters",
        json={
            "name": "نزاع إيجار",
            "client_id": client_id,
            "matter_type": "litigation",
            "billing_type": "hourly",
            "responsible_user": OWNER,
            "opened_date": "2026-01-05",
        },
    ).json()["id"]


def add_hearing(client, org, matter, **overrides):
    body = {
        "matter_id": matter,
        "hearing_date": "2026-03-10",
        "hearing_time": "10:00",
        "court": "محكمة شمال القاهرة الابتدائية",
        "purpose": "نظر الدعوى",
    }
    body.update(overrides)
    return client.post(f"/api/orgs/{org}/hearings", json=body)


class TestOutcome:
    def test_a_new_hearing_has_no_outcome_yet(self, client, org, matter):
        body = add_hearing(client, org, matter).json()
        assert body["outcome"] is None

    @pytest.mark.parametrize(
        "outcome", ["adjourned", "reserved", "judgment", "struck_out", "joined", "other"]
    )
    def test_accepts_every_real_outcome(self, client, org, matter, outcome):
        response = add_hearing(client, org, matter, outcome=outcome)
        assert response.status_code == 201, response.text
        assert response.json()["outcome"] == outcome

    def test_refuses_an_invented_outcome(self, client, org, matter):
        assert add_hearing(client, org, matter, outcome="حاجة").status_code == 422

    def test_the_clerks_words_are_kept_beside_the_code(self, client, org, matter):
        """The code says adjourned; only the note says what to prepare."""
        body = add_hearing(
            client, org, matter,
            outcome="adjourned",
            outcome_note="للاطلاع ولتقديم مذكرات",
        ).json()
        assert body["outcome"] == "adjourned"
        assert body["outcome_note"] == "للاطلاع ولتقديم مذكرات"

    def test_an_adjournment_can_name_its_next_date(self, client, org, matter):
        body = add_hearing(
            client, org, matter, outcome="adjourned", next_hearing_date="2026-04-14"
        ).json()
        assert body["next_hearing_date"] == "2026-04-14"

    def test_refuses_an_adjournment_pointing_backwards(self, client, org, matter):
        response = add_hearing(
            client, org, matter,
            hearing_date="2026-03-10",
            outcome="adjourned",
            next_hearing_date="2026-02-01",
        )
        assert response.status_code == 422


class TestRecordingAfterTheSitting:
    def test_records_what_happened(self, client, org, matter):
        hearing_id = add_hearing(client, org, matter).json()["id"]
        response = client.patch(
            f"/api/orgs/{org}/hearings/{hearing_id}",
            json={
                "outcome": "adjourned",
                "outcome_note": "لإعلان الخصم",
                "next_hearing_date": "2026-04-14",
            },
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["outcome"] == "adjourned"
        assert body["next_hearing_date"] == "2026-04-14"

    def test_refuses_an_invented_outcome_on_update(self, client, org, matter):
        hearing_id = add_hearing(client, org, matter).json()["id"]
        response = client.patch(
            f"/api/orgs/{org}/hearings/{hearing_id}", json={"outcome": "nonsense"}
        )
        assert response.status_code == 422

    def test_another_firms_hearing_is_a_404(self, client, org, matter):
        hearing_id = add_hearing(client, org, matter).json()["id"]
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        assert (
            client.patch(
                f"/api/orgs/{other}/hearings/{hearing_id}", json={"outcome": "reserved"}
            ).status_code
            == 404
        )


class TestFilters:
    @pytest.fixture
    def populated(self, client, org, matter):
        add_hearing(
            client, org, matter,
            hearing_date="2026-03-10", court="محكمة شمال القاهرة الابتدائية",
            outcome="adjourned", outcome_note="للاطلاع",
        )
        add_hearing(
            client, org, matter,
            hearing_date="2026-05-20", court="محكمة استئناف القاهرة",
            outcome="reserved",
        )
        add_hearing(
            client, org, matter,
            hearing_date="2026-07-01", court="محكمة شمال القاهرة الابتدائية",
        )
        return org

    def test_filters_by_outcome(self, client, populated):
        rows = client.get(
            f"/api/orgs/{populated}/hearings", params={"outcome": "adjourned"}
        ).json()
        assert len(rows) == 1
        assert rows[0]["outcome"] == "adjourned"

    def test_undecided_is_not_an_outcome_value(self, client, populated):
        """The commonest question is which sittings have not been ruled on."""
        rows = client.get(
            f"/api/orgs/{populated}/hearings", params={"undecided": True}
        ).json()
        assert len(rows) == 1
        assert rows[0]["outcome"] is None

    def test_filters_by_court(self, client, populated):
        rows = client.get(
            f"/api/orgs/{populated}/hearings", params={"court": "استئناف"}
        ).json()
        assert len(rows) == 1

    def test_filters_by_date_range(self, client, populated):
        rows = client.get(
            f"/api/orgs/{populated}/hearings",
            params={"since": "2026-04-01", "until": "2026-06-01"},
        ).json()
        assert len(rows) == 1

    def test_filters_combine(self, client, populated):
        rows = client.get(
            f"/api/orgs/{populated}/hearings",
            params={"court": "شمال القاهرة", "undecided": True},
        ).json()
        assert len(rows) == 1
        assert rows[0]["hearing_date"] == "2026-07-01"

    def test_no_filters_returns_everything(self, client, populated):
        rows = client.get(f"/api/orgs/{populated}/hearings").json()
        assert len(rows) == 3


class TestSearch:
    @pytest.fixture
    def populated(self, client, org, matter):
        add_hearing(
            client, org, matter,
            court="محكمة شمال القاهرة الابتدائية", purpose="نظر الدعوى",
            outcome="adjourned", outcome_note="لإعلان الخصم",
        )
        add_hearing(
            client, org, matter,
            hearing_date="2026-06-02", court="محكمة الجيزة", purpose="سماع الشهود",
        )
        return org

    def test_finds_by_court(self, client, populated):
        rows = client.get(
            f"/api/orgs/{populated}/hearings", params={"q": "الجيزة"}
        ).json()
        assert len(rows) == 1

    def test_finds_by_purpose(self, client, populated):
        rows = client.get(
            f"/api/orgs/{populated}/hearings", params={"q": "الشهود"}
        ).json()
        assert len(rows) == 1

    def test_finds_by_the_clerks_note(self, client, populated):
        rows = client.get(
            f"/api/orgs/{populated}/hearings", params={"q": "الخصم"}
        ).json()
        assert len(rows) == 1

    def test_finds_by_case_name(self, client, populated):
        """One box, every column -- a lawyer does not pick a field first."""
        rows = client.get(
            f"/api/orgs/{populated}/hearings", params={"q": "إيجار"}
        ).json()
        assert len(rows) == 2

    def test_a_miss_returns_nothing_rather_than_everything(self, client, populated):
        rows = client.get(
            f"/api/orgs/{populated}/hearings", params={"q": "لا يوجد هذا"}
        ).json()
        assert rows == []


class TestTenantIsolation:
    def test_another_firm_sees_none_of_it(self, client, org, matter):
        add_hearing(client, org, matter)
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        assert client.get(f"/api/orgs/{other}/hearings").json() == []

    def test_search_cannot_reach_across_firms(self, client, org, matter):
        add_hearing(client, org, matter, court="محكمة شمال القاهرة الابتدائية")
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        rows = client.get(
            f"/api/orgs/{other}/hearings", params={"q": "القاهرة"}
        ).json()
        assert rows == []


class TestCaseRecordShape:
    """T-013: the three facts a citation carries, each in its own column."""

    def make_case(self, client, org, matter, **overrides):
        body = {
            "matter_id": matter,
            "court": "محكمة شمال القاهرة الابتدائية",
            "case_number": "1345",
            "judicial_year": 2026,
            "case_category": "مدني كلي",
            "filed_date": "2026-01-20",
        }
        body.update(overrides)
        return client.post(f"/api/orgs/{org}/cases", json=body)

    def test_records_number_year_and_category_separately(self, client, org, matter):
        response = self.make_case(client, org, matter)
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["case_number"] == "1345"
        assert body["judicial_year"] == 2026
        assert body["case_category"] == "مدني كلي"

    def test_defaults_to_first_instance(self, client, org, matter):
        assert self.make_case(client, org, matter).json()["litigation_degree"] == (
            "first_instance"
        )

    @pytest.mark.parametrize("degree", ["first_instance", "appeal", "cassation"])
    def test_accepts_every_degree(self, client, org, matter, degree):
        body = self.make_case(client, org, matter, litigation_degree=degree).json()
        assert body["litigation_degree"] == degree

    def test_refuses_an_invented_degree(self, client, org, matter):
        response = self.make_case(client, org, matter, litigation_degree="نقض ثانٍ")
        assert response.status_code == 422

    def test_refuses_an_implausible_year(self, client, org, matter):
        assert self.make_case(client, org, matter, judicial_year=12).status_code == 422

    def test_the_year_may_be_unknown(self, client, org, matter):
        """A case whose year nobody recorded is better blank than guessed."""
        body = self.make_case(client, org, matter, judicial_year=None).json()
        assert body["judicial_year"] is None

    def test_the_degree_can_be_changed_on_appeal(self, client, org, matter):
        case_id = self.make_case(client, org, matter).json()["id"]
        response = client.patch(
            f"/api/orgs/{org}/cases/{case_id}", json={"litigation_degree": "appeal"}
        )
        assert response.json()["litigation_degree"] == "appeal"
