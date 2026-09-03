"""T-042: discount codes are recorded and validated honestly.

Only `extra_trial_days` has a real effect today -- it extends
trial_ends_at immediately, because that is the one kind of discount that
means something before a payment gateway exists. `percent` and `fixed`
are saved on the firm and read back with their kind/value so a screen can
say "will apply once billing is enabled"; nothing computes a discounted
price here, because there is no real price to discount yet.

The public validate route never says WHY a code failed -- a nonexistent
code, an expired one and an exhausted one all read back `valid: false`,
because a route that tells them apart is a code-guessing oracle. That
same route is also the one under a much lower rate ceiling.
"""
from __future__ import annotations

import threading
from datetime import UTC, datetime, timedelta

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.ratelimit import get_paid_limit

OWNER = "user_owner"
LAWYER = "user_lawyer"


@pytest.fixture
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    with connection.cursor() as cur:
        cur.execute("SELECT coalesce(max(id), 0) FROM organizations")
        org_mark = cur.fetchone()[0]
        cur.execute("SELECT coalesce(max(id), 0) FROM discount_codes")
        code_mark = cur.fetchone()[0]
    yield connection
    # Organizations first: a code referenced by an org this test created
    # cannot be deleted while that reference exists.
    drop_organizations_after(connection, org_mark)
    with connection.cursor() as cur:
        cur.execute("DELETE FROM discount_codes WHERE id > %s", (code_mark,))
    connection.commit()
    connection.close()


@pytest.fixture
def client(conn):
    app.dependency_overrides[get_current_user_id] = lambda: OWNER
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user_id, None)


def make_code(
    conn,
    code: str,
    kind: str = "percent",
    value: float = 10,
    *,
    max_uses: int | None = None,
    ends_at: datetime | None = None,
    is_active: bool = True,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO discount_codes (code, kind, value, max_uses, ends_at, is_active) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (code, kind, value, max_uses, ends_at, is_active),
        )
        code_id = cur.fetchone()[0]
    conn.commit()
    return code_id


def create_firm(client, name="Discount Firm") -> dict:
    response = client.post("/api/orgs", json={"name": name})
    assert response.status_code == 200, response.text
    return response.json()


class TestValidate:
    """Public, session-less: no auth override needed."""

    def test_a_real_code_validates(self, conn):
        make_code(conn, "WELCOME7", kind="extra_trial_days", value=7)
        response = TestClient(app).post(
            "/api/discount-codes/validate", json={"code": "welcome7"}
        )
        assert response.status_code == 200, response.text
        assert response.json()["valid"] is True

    def test_case_insensitive(self, conn):
        make_code(conn, "LAUNCH30", kind="percent", value=30)
        for attempt in ("LAUNCH30", "launch30", "Launch30"):
            body = TestClient(app).post(
                "/api/discount-codes/validate", json={"code": attempt}
            ).json()
            assert body["valid"] is True

    def test_missing_expired_and_exhausted_are_identical(self, conn):
        make_code(
            conn, "OLD", kind="percent", value=10,
            ends_at=datetime.now(UTC) - timedelta(days=1),
        )
        make_code(conn, "USEDUP", kind="percent", value=10, max_uses=1)
        with conn.cursor() as cur:
            cur.execute("UPDATE discount_codes SET uses_count = 1 WHERE code = 'USEDUP'")
        conn.commit()

        c = TestClient(app)
        bodies = [
            c.post("/api/discount-codes/validate", json={"code": "NOTACODE"}).json(),
            c.post("/api/discount-codes/validate", json={"code": "OLD"}).json(),
            c.post("/api/discount-codes/validate", json={"code": "USEDUP"}).json(),
        ]
        assert bodies == [{"valid": False}] * 3

    def test_checking_a_code_does_not_spend_a_use(self, conn):
        make_code(conn, "PEEK", kind="percent", value=10, max_uses=1)
        c = TestClient(app)
        for _ in range(3):
            assert c.post("/api/discount-codes/validate", json={"code": "PEEK"}).json()["valid"] is True

    def test_an_inactive_code_is_invalid(self, conn):
        make_code(conn, "PAUSED", kind="percent", value=10, is_active=False)
        body = TestClient(app).post(
            "/api/discount-codes/validate", json={"code": "PAUSED"}
        ).json()
        assert body["valid"] is False


class TestValidateIsRateLimited:
    def test_enough_requests_trip_429(self, conn):
        c = TestClient(app)
        limit = get_paid_limit()
        statuses = [
            c.post("/api/discount-codes/validate", json={"code": f"x{i}"}).status_code
            for i in range(limit + 5)
        ]
        assert 429 in statuses


class TestApplyExtraTrialDays:
    def test_extends_the_trial_immediately(self, client, conn):
        make_code(conn, "WELCOME7", kind="extra_trial_days", value=7)
        firm = create_firm(client)
        before = datetime.fromisoformat(firm["trial_ends_at"])

        response = client.post(
            f"/api/orgs/{firm['id']}/discount-code", json={"code": "welcome7"}
        )
        assert response.status_code == 200, response.text
        body = response.json()
        after = datetime.fromisoformat(body["trial_ends_at"])
        assert (after - before) >= timedelta(days=6, hours=23)
        assert body["discount_kind"] == "extra_trial_days"
        assert body["discount_value"] == 7

        with conn.cursor() as cur:
            cur.execute("SELECT trial_ends_at FROM organizations WHERE id = %s", (firm["id"],))
            (db_value,) = cur.fetchone()
        assert db_value == datetime.fromisoformat(body["trial_ends_at"])


class TestApplyPercentOrFixed:
    def test_recorded_but_not_computed(self, client, conn):
        make_code(conn, "LAUNCH30", kind="percent", value=30)
        firm = create_firm(client)
        trial_before = firm["trial_ends_at"]

        response = client.post(
            f"/api/orgs/{firm['id']}/discount-code", json={"code": "LAUNCH30"}
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["discount_kind"] == "percent"
        assert body["discount_value"] == 30
        # Not the trial-extension kind: nothing about the trial moved.
        assert body["trial_ends_at"] == trial_before

        settings = client.get(f"/api/orgs/{firm['id']}").json()
        assert settings["discount_kind"] == "percent"
        assert settings["discount_value"] == 30


class TestApplyRejections:
    def test_same_message_for_missing_expired_and_exhausted(self, client, conn):
        make_code(
            conn, "OLD2", kind="percent", value=10,
            ends_at=datetime.now(UTC) - timedelta(days=1),
        )
        make_code(conn, "USEDUP2", kind="percent", value=10, max_uses=1)
        with conn.cursor() as cur:
            cur.execute("UPDATE discount_codes SET uses_count = 1 WHERE code = 'USEDUP2'")
        conn.commit()

        messages = []
        for code in ("NOTACODE2", "OLD2", "USEDUP2"):
            firm = create_firm(client, f"Firm {code}")
            response = client.post(f"/api/orgs/{firm['id']}/discount-code", json={"code": code})
            assert response.status_code == 422, response.text
            messages.append(response.json()["detail"])
        assert len(set(messages)) == 1

    def test_a_firm_cannot_apply_a_second_code(self, client, conn):
        make_code(conn, "FIRST", kind="percent", value=10)
        make_code(conn, "SECOND", kind="percent", value=20)
        firm = create_firm(client)
        assert client.post(
            f"/api/orgs/{firm['id']}/discount-code", json={"code": "FIRST"}
        ).status_code == 200
        second = client.post(f"/api/orgs/{firm['id']}/discount-code", json={"code": "SECOND"})
        assert second.status_code == 409
        assert client.get(f"/api/orgs/{firm['id']}").json()["discount_kind"] == "percent"

    def test_a_lawyer_cannot_apply_a_code(self, client, conn):
        from legalrag import orgs

        make_code(conn, "OWNERONLY", kind="percent", value=10)
        firm = create_firm(client)
        orgs.add_membership(conn, firm["id"], LAWYER, "lawyer")
        app.dependency_overrides[get_current_user_id] = lambda: LAWYER
        response = client.post(
            f"/api/orgs/{firm['id']}/discount-code", json={"code": "OWNERONLY"}
        )
        assert response.status_code == 403


class TestMaxUsesUnderConcurrency:
    def test_only_one_of_two_simultaneous_applies_succeeds(self, client, conn):
        """The ticket's race test: max_uses=1, two firms applying at once."""
        make_code(conn, "ONLYONE", kind="percent", value=10, max_uses=1)
        firm_a = create_firm(client, "Racer A")
        firm_b = create_firm(client, "Racer B")

        results: dict[str, int] = {}

        def apply(name: str, org_id: int):
            local_client = TestClient(app)
            response = local_client.post(
                f"/api/orgs/{org_id}/discount-code", json={"code": "ONLYONE"}
            )
            results[name] = response.status_code

        t1 = threading.Thread(target=apply, args=("a", firm_a["id"]))
        t2 = threading.Thread(target=apply, args=("b", firm_b["id"]))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        assert sorted(results.values()) == [200, 422]
        with conn.cursor() as cur:
            cur.execute("SELECT uses_count FROM discount_codes WHERE code = 'ONLYONE'")
            assert cur.fetchone()[0] == 1
