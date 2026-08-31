"""Telling a lawyer about a date before it arrives. E-2.

Two things carry the weight here.

The offsets: a reminder that fires on the wrong day is worse than none,
because the lawyer stops trusting the ones that do fire.

Idempotence: the sweep runs daily, is not transactional with the send, and
will be re-run by hand after any bug. Sending a firm yesterday's reminders a
second time is how they turn the emails off, and then the product is back to
holding a hearing date silently.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag import reminders
from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.email import reminder_subject
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"
TODAY = date(2026, 5, 10)


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
def firm(client, conn):
    org = client.post("/api/orgs", json={"name": "Test Firm"}).json()["id"]
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE memberships SET email = %s "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            ("owner@firm.test", org, OWNER),
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
            "matter_type": "litigation",
            "billing_type": "hourly",
            "responsible_user": OWNER,
            "opened_date": "2026-01-05",
            "staff": [OWNER],
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


class TestOffsets:
    @pytest.mark.parametrize("offset", [3, 1, 0])
    def test_fires_at_each_offset(self, client, conn, firm, offset):
        add_hearing(client, firm, TODAY + timedelta(days=offset))
        due = reminders.collect(conn, TODAY)
        assert [r.offset_days for r in due] == [offset]

    @pytest.mark.parametrize("offset", [2, 4, 7, 30])
    def test_stays_quiet_on_every_other_day(self, client, conn, firm, offset):
        """A reminder on a day nobody expects trains people to ignore them."""
        add_hearing(client, firm, TODAY + timedelta(days=offset))
        assert reminders.collect(conn, TODAY) == []

    def test_a_past_hearing_is_not_reminded_about(self, client, conn, firm):
        add_hearing(client, firm, TODAY - timedelta(days=1))
        assert reminders.collect(conn, TODAY) == []


class TestWhoIsTold:
    def test_everyone_on_the_matter_hears_about_a_hearing(self, client, conn, firm):
        """Hearings carry no assignee, so the case team is the audience."""
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role, email) "
                "VALUES (%s, 'user_second', 'lawyer', 'second@firm.test')",
                (firm["org"],),
            )
            cur.execute(
                "INSERT INTO matter_staff (matter_id, clerk_user_id) VALUES (%s, %s)",
                (firm["matter"], "user_second"),
            )
        conn.commit()
        add_hearing(client, firm, TODAY + timedelta(days=1))
        assert {r.recipient for r in reminders.collect(conn, TODAY)} == {
            OWNER,
            "user_second",
        }

    def test_someone_off_the_case_is_not_told(self, client, conn, firm):
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role, email) "
                "VALUES (%s, 'user_other', 'lawyer', 'other@firm.test')",
                (firm["org"],),
            )
        conn.commit()
        add_hearing(client, firm, TODAY + timedelta(days=1))
        assert {r.recipient for r in reminders.collect(conn, TODAY)} == {OWNER}

    def test_a_task_goes_only_to_its_assignee(self, client, conn, firm):
        client.post(
            f"/api/orgs/{firm['org']}/tasks",
            json={
                "title": "تحضير مذكرة",
                "assignee": OWNER,
                "matter_id": firm["matter"],
                "due_date": (TODAY + timedelta(days=1)).isoformat(),
            },
        )
        due = [r for r in reminders.collect(conn, TODAY) if r.kind == "task"]
        assert [r.recipient for r in due] == [OWNER]

    def test_someone_who_opted_out_is_left_alone(self, client, conn, firm):
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE memberships SET wants_reminders = FALSE "
                "WHERE organization_id = %s AND clerk_user_id = %s",
                (firm["org"], OWNER),
            )
        conn.commit()
        add_hearing(client, firm, TODAY + timedelta(days=1))
        assert reminders.collect(conn, TODAY) == []

    def test_someone_with_no_address_is_reported_not_silently_dropped(
        self, client, conn, firm
    ):
        """A lawyer who never receives reminders must not be invisible."""
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role) "
                "VALUES (%s, 'user_noemail', 'lawyer')",
                (firm["org"],),
            )
        conn.commit()
        unreachable = reminders.members_without_email(conn)
        assert ("user_noemail" in [m for _, m in unreachable])


class TestCompletedWorkIsLeftAlone:
    def test_a_done_task_is_not_chased(self, client, conn, firm):
        task = client.post(
            f"/api/orgs/{firm['org']}/tasks",
            json={
                "title": "تحضير مذكرة",
                "assignee": OWNER,
                "matter_id": firm["matter"],
                "due_date": (TODAY + timedelta(days=1)).isoformat(),
            },
        ).json()["id"]
        client.patch(
            f"/api/orgs/{firm['org']}/tasks/{task}", json={"status": "done"}
        )
        assert [r for r in reminders.collect(conn, TODAY) if r.kind == "task"] == []


class TestIdempotence:
    """The sweep runs daily and gets re-run by hand. Twice must be once."""

    def test_a_recorded_reminder_is_not_resent(self, client, conn, firm):
        add_hearing(client, firm, TODAY + timedelta(days=1))
        [reminder] = reminders.collect(conn, TODAY)
        assert not reminders.already_sent(conn, reminder)

        reminders.record_sent(conn, reminder)
        assert reminders.already_sent(conn, reminder)

    def test_recording_twice_is_refused_by_the_database(self, client, conn, firm):
        """The unique index is the guarantee, not a check in Python."""
        add_hearing(client, firm, TODAY + timedelta(days=1))
        [reminder] = reminders.collect(conn, TODAY)
        assert reminders.record_sent(conn, reminder) is True
        assert reminders.record_sent(conn, reminder) is False

    def test_a_different_offset_is_a_different_reminder(self, client, conn, firm):
        """Three-days-out and morning-of are two reminders, not one."""
        hearing = add_hearing(client, firm, TODAY + timedelta(days=3))
        [three_days] = reminders.collect(conn, TODAY)
        reminders.record_sent(conn, three_days)

        on_the_day = reminders.collect(conn, TODAY + timedelta(days=3))
        assert len(on_the_day) == 1
        assert on_the_day[0].offset_days == 0
        assert not reminders.already_sent(conn, on_the_day[0])

    def test_an_adjournment_earns_a_fresh_reminder(self, client, conn, firm):
        """The key includes the date being reminded about, so a hearing moved
        to a new day is not mistaken for one already handled."""
        add_hearing(client, firm, TODAY + timedelta(days=1))
        [first] = reminders.collect(conn, TODAY)
        reminders.record_sent(conn, first)

        moved = reminders.Reminder(
            organization_id=first.organization_id,
            recipient=first.recipient,
            email=first.email,
            kind=first.kind,
            subject_id=first.subject_id,
            subject_date=first.subject_date + timedelta(days=30),
            offset_days=first.offset_days,
            title=first.title,
            matter_name=first.matter_name,
            detail=first.detail,
        )
        assert not reminders.already_sent(conn, moved)


class TestSubjectLine:
    @pytest.mark.parametrize(
        "offset,word", [(0, "اليوم"), (1, "غدًا"), (3, "بعد ثلاثة أيام")]
    )
    def test_the_when_comes_first(self, offset, word):
        """A phone truncates a subject; the timing has to survive that."""
        subject = reminder_subject("hearing", offset, "نزاع توريد")
        assert word in subject
        assert subject.index(word) < subject.index("نزاع")

    def test_the_kind_is_named_in_arabic(self):
        assert reminder_subject("hearing", 1, "x").startswith("جلسة")
        assert reminder_subject("deadline", 1, "x").startswith("ميعاد")
        assert reminder_subject("task", 1, "x").startswith("مهمة")


class TestTheTwoChannelsAreIndependent:
    """0013 left `channel` out of notification_sends' unique key. That was
    right with one channel and a silent bug with two: the morning email writes
    the row, and the push for the same hearing then looks like a duplicate --
    so the lawyer gets the mail, never gets the notification, and nothing
    reports a failure. Migration 0017 widened the key; these hold it there.
    """

    def _one(self, client, conn, firm):
        add_hearing(client, firm, TODAY)
        return reminders.collect(conn, TODAY)[0]

    def test_recording_the_email_does_not_mark_the_push(self, client, conn, firm):
        reminder = self._one(client, conn, firm)
        reminders.record_sent(conn, reminder, "email")
        assert reminders.already_sent(conn, reminder, "email") is True
        assert reminders.already_sent(conn, reminder, "push") is False

    def test_both_channels_can_be_recorded_for_one_reminder(
        self, client, conn, firm
    ):
        reminder = self._one(client, conn, firm)
        assert reminders.record_sent(conn, reminder, "email") is True
        assert reminders.record_sent(conn, reminder, "push") is True

    def test_a_channel_is_still_recorded_only_once(self, client, conn, firm):
        """The idempotence that made the sweep safe to rerun is unchanged."""
        reminder = self._one(client, conn, firm)
        assert reminders.record_sent(conn, reminder, "push") is True
        assert reminders.record_sent(conn, reminder, "push") is False

    def test_a_firm_that_adds_push_later_still_gets_notified(
        self, client, conn, firm
    ):
        """The point of recording separately: turning the channel on must not
        skip every date whose email already went out."""
        reminder = self._one(client, conn, firm)
        reminders.record_sent(conn, reminder, "email")
        assert reminders.already_sent(conn, reminder, "push") is False

    def test_an_unknown_channel_is_refused_by_the_database(
        self, client, conn, firm
    ):
        """A typo'd channel would not collide with the correctly-spelled row,
        so every sweep would re-send on it for ever."""
        import psycopg

        reminder = self._one(client, conn, firm)
        with pytest.raises(psycopg.errors.CheckViolation):
            reminders.record_sent(conn, reminder, "smoke-signal")
        conn.rollback()


class TestFindingSomeonesHandsets:
    def test_only_this_persons_devices_in_this_firm(self, client, conn, firm):
        for subject, token in ((OWNER, "owners-phone"), ("someone_else", "theirs")):
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO device_tokens (organization_id, subject, token, "
                    "platform) VALUES (%s, %s, %s, 'ios')",
                    (firm["org"], subject, token),
                )
        conn.commit()
        found = reminders.devices_for(conn, firm["org"], OWNER)
        assert [token for _, token in found] == ["owners-phone"]

    def test_a_dead_handset_is_forgotten(self, client, conn, firm):
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO device_tokens (organization_id, subject, token, "
                "platform) VALUES (%s, %s, 'wiped-phone', 'android') RETURNING id",
                (firm["org"], OWNER),
            )
            device_id = cur.fetchone()[0]
        conn.commit()
        reminders.forget_device(conn, device_id)
        assert reminders.devices_for(conn, firm["org"], OWNER) == []
