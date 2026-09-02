"""One lawyer's day, and the devices to push it to. E-3's API prerequisites.

The lawyer app cannot be built here -- there is no Flutter toolchain on this
machine -- but the endpoints it needs can be, and they are the half a Flutter
client cannot build for itself.

Two things carry the weight:

Overdue must never fall off the list. A horizon that starts today drops the
deadline missed last week, which is the single item most worth shoving in
front of somebody.

Scoping must hold here too. A convenience endpoint is exactly where a
carefully closed hole gets quietly reopened.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"
MINE = "user_mine"      # a scoped lawyer, on the case
THEIRS = "user_theirs"  # a scoped lawyer, not on it


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


def act_as(user):
    app.dependency_overrides[get_current_user_id] = lambda: user


@pytest.fixture
def firm(client, conn):
    org = client.post("/api/orgs", json={"name": "Test Firm"}).json()["id"]
    with conn.cursor() as cur:
        for user in (MINE, THEIRS):
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role, "
                "matter_scope) VALUES (%s, %s, 'lawyer', 'assigned')",
                (org, user),
            )
    conn.commit()
    client_id = client.post(
        f"/api/orgs/{org}/clients", json={"name": "شركة النيل"}
    ).json()["id"]
    matter = client.post(
        f"/api/orgs/{org}/matters",
        json={
            "name": "نزاع توريد",
            "client_id": client_id,
            "matter_type": "civil",
            "billing_type": "hourly",
            "responsible_user": OWNER,
            "opened_date": "2026-01-05",
            "staff": [OWNER, MINE],
        },
    ).json()["id"]
    return {"org": org, "matter": matter, "client_id": client_id}


def add_hearing(client, firm, on: date):
    return client.post(
        f"/api/orgs/{firm['org']}/hearings",
        json={
            "matter_id": firm["matter"],
            "hearing_date": on.isoformat(),
            "court": "محكمة شمال القاهرة الابتدائية",
        },
    ).json()["id"]


def add_task(client, firm, on: date, assignee=OWNER, title="تحضير مذكرة"):
    return client.post(
        f"/api/orgs/{firm['org']}/tasks",
        json={
            "title": title,
            "assignee": assignee,
            "matter_id": firm["matter"],
            "due_date": on.isoformat(),
        },
    ).json()["id"]


def my_day(client, firm, **params):
    return client.get(f"/api/orgs/{firm['org']}/my-day", params=params).json()


class TestOverdueIsNeverLost:
    def test_a_missed_deadline_is_still_shown(self, client, firm):
        """A horizon starting today would drop it, and it is the one item most
        worth putting in somebody's face."""
        add_task(client, firm, date.today() - timedelta(days=9))
        body = my_day(client, firm)
        assert body["counts"]["overdue"] == 1

    def test_overdue_is_separate_from_today(self, client, firm):
        add_task(client, firm, date.today() - timedelta(days=2), title="متأخرة")
        add_task(client, firm, date.today(), title="اليوم")
        body = my_day(client, firm)
        assert body["counts"]["overdue"] == 1
        assert body["counts"]["today"] == 1

    def test_however_long_ago(self, client, firm):
        add_task(client, firm, date.today() - timedelta(days=400))
        assert my_day(client, firm)["counts"]["overdue"] == 1


class TestTheHorizon:
    def test_inside_it(self, client, firm):
        add_hearing(client, firm, date.today() + timedelta(days=3))
        assert my_day(client, firm)["counts"]["upcoming"] == 1

    def test_outside_it(self, client, firm):
        add_hearing(client, firm, date.today() + timedelta(days=40))
        assert my_day(client, firm)["counts"]["upcoming"] == 0

    def test_it_can_be_widened(self, client, firm):
        add_hearing(client, firm, date.today() + timedelta(days=40))
        assert my_day(client, firm, horizon_days=60)["counts"]["upcoming"] == 1


class TestWhoseDay:
    def test_a_hearing_reaches_everyone_on_the_case(self, client, firm):
        """Hearings have no assignee -- the case team is the audience."""
        add_hearing(client, firm, date.today())
        act_as(MINE)
        assert my_day(client, firm)["counts"]["today"] == 1

    def test_someone_off_the_case_sees_none_of_it(self, client, firm):
        add_hearing(client, firm, date.today())
        act_as(THEIRS)
        assert my_day(client, firm)["counts"]["today"] == 0

    def test_a_task_reaches_only_its_assignee(self, client, firm):
        add_task(client, firm, date.today(), assignee=OWNER)
        act_as(MINE)
        # On the case, so the hearing would reach them -- but not this task.
        assert my_day(client, firm)["counts"]["today"] == 0

    def test_a_task_with_no_matter_is_still_mine(self, client, firm):
        """The restriction is on cases, not on everything a person is given."""
        client.post(
            f"/api/orgs/{firm['org']}/tasks",
            json={
                "title": "مهمة إدارية",
                "assignee": MINE,
                "due_date": date.today().isoformat(),
            },
        )
        act_as(MINE)
        assert my_day(client, firm)["counts"]["today"] == 1

    def test_completed_work_is_not_shown(self, client, firm):
        task = add_task(client, firm, date.today())
        client.patch(
            f"/api/orgs/{firm['org']}/tasks/{task}", json={"status": "done"}
        )
        assert my_day(client, firm)["counts"]["today"] == 0


class TestShape:
    def test_items_carry_what_a_phone_screen_needs(self, client, firm):
        add_hearing(client, firm, date.today())
        item = my_day(client, firm)["today_items"][0]
        assert item["kind"] == "hearing"
        assert item["matter_name"] == "نزاع توريد"
        assert item["on_date"] == date.today().isoformat()

    def test_an_empty_day_is_a_shape_not_an_error(self, client, firm):
        body = my_day(client, firm)
        assert body["counts"] == {"overdue": 0, "today": 0, "upcoming": 0}
        assert body["today_items"] == []


class TestDeviceTokens:
    def test_registering_a_device(self, client, firm):
        response = client.put(
            f"/api/orgs/{firm['org']}/devices",
            json={"token": "fcm-token-abc123", "platform": "ios",
                  "device_label": "iPhone 15"},
        )
        assert response.status_code == 200, response.text
        assert response.json()["platform"] == "ios"

    def test_registering_twice_does_not_duplicate(self, client, firm):
        for _ in range(2):
            client.put(
                f"/api/orgs/{firm['org']}/devices",
                json={"token": "fcm-token-abc123", "platform": "ios"},
            )
        assert len(client.get(f"/api/orgs/{firm['org']}/devices").json()) == 1

    def test_a_handset_that_changes_hands_is_reassigned(self, client, firm):
        """Not duplicated. A stale owner puts one lawyer's hearing on
        another's lock screen."""
        client.put(
            f"/api/orgs/{firm['org']}/devices",
            json={"token": "shared-handset", "platform": "android"},
        )
        act_as(MINE)
        client.put(
            f"/api/orgs/{firm['org']}/devices",
            json={"token": "shared-handset", "platform": "android"},
        )
        assert len(client.get(f"/api/orgs/{firm['org']}/devices").json()) == 1
        act_as(OWNER)
        assert client.get(f"/api/orgs/{firm['org']}/devices").json() == []

    def test_the_push_credential_is_never_returned(self, client, firm):
        """A "your devices" list has no use for the token itself."""
        client.put(
            f"/api/orgs/{firm['org']}/devices",
            json={"token": "secret-fcm-token", "platform": "web"},
        )
        body = client.get(f"/api/orgs/{firm['org']}/devices").text
        assert "secret-fcm-token" not in body

    def test_only_my_own_devices_are_listed(self, client, firm):
        client.put(
            f"/api/orgs/{firm['org']}/devices",
            json={"token": "owners-phone", "platform": "ios"},
        )
        act_as(MINE)
        assert client.get(f"/api/orgs/{firm['org']}/devices").json() == []

    def test_signing_a_device_out(self, client, firm):
        device = client.put(
            f"/api/orgs/{firm['org']}/devices",
            json={"token": "fcm-token-signout", "platform": "web"},
        ).json()["id"]
        assert client.delete(
            f"/api/orgs/{firm['org']}/devices/{device}"
        ).status_code == 204
        assert client.get(f"/api/orgs/{firm['org']}/devices").json() == []

    def test_cannot_sign_out_somebody_elses_device(self, client, firm):
        device = client.put(
            f"/api/orgs/{firm['org']}/devices",
            json={"token": "owners-phone", "platform": "ios"},
        ).json()["id"]
        act_as(MINE)
        assert client.delete(
            f"/api/orgs/{firm['org']}/devices/{device}"
        ).status_code == 404

    def test_an_unknown_platform_is_refused(self, client, firm):
        response = client.put(
            f"/api/orgs/{firm['org']}/devices",
            json={"token": "fcm-token-longenough", "platform": "blackberry"},
        )
        assert response.status_code == 422
