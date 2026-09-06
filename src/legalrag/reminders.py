"""Telling a lawyer about a date before it arrives.

The most dangerous thing this product did was hold a hearing date and say
nothing about it. A missed sitting is a professional failure, and a diary that
does not remind is worse than a paper one, because the lawyer believes it is
watching.

WHAT THIS IS NOT
----------------
Not a deadline engine. It computes no procedural dates, applies no rules of
court, and infers nothing. Lawyers and clerks enter dates the way they already
do; this reminds them beforehand. Every date it reads was typed by a person,
which is the only kind this product is entitled to be confident about.

WHY DAYS AND NOT HOURS
----------------------
`hearings.hearing_time` is free text -- "10:00", "الجلسة الأولى", empty. There
is nothing to compute against, so reminders fire on day offsets from a fixed
morning sweep. "Two hours before" needs that column promoted to a real time
first, and that is a schema change to make when a firm asks, not a guess now.

WHY NO REDIS
------------
The roadmap reaches for arq + Redis, and that is right for a general worker.
This is one sweep a day over three tables. The box already runs systemd timers
(see deploy/alsigil-diskalert.*), so this rides the same rails: one script, one
timer, no new container and no new datastore to keep alive. When there are jobs
that genuinely need a queue, the queue can arrive then and this can move onto
it -- the sweep is a plain function and does not care who calls it.

IDEMPOTENCE IS THE HARD PART
----------------------------
The send and the record of it are not one transaction. A crash between Resend
accepting the mail and the row being written must not re-send tomorrow, and a
rerun after a fix must not deliver yesterday's reminders again. So a row goes
into notification_sends per (recipient, thing, offset, date being reminded
about) and the UNIQUE index -- not a check in this file -- is what makes the
sweep safe to run five times in a morning.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import psycopg

from legalrag.db import set_tenant_context

# Three days out to prepare, one day out to confirm, and the morning of.
# Deliberately few: a reminder people learn to ignore protects nobody.
OFFSETS = (3, 1, 0)


@dataclass(frozen=True)
class Reminder:
    organization_id: int
    recipient: str
    email: str
    kind: str  # 'hearing' | 'deadline' | 'task'
    subject_id: int
    subject_date: date
    offset_days: int
    title: str
    matter_name: str
    detail: str

    @property
    def is_today(self) -> bool:
        return self.offset_days == 0


def _target_dates(today: date) -> dict[date, int]:
    """The dates a sweep run on `today` is looking for, and their offsets."""
    return {today + timedelta(days=offset): offset for offset in OFFSETS}


def due_hearings(conn: psycopg.Connection, today: date) -> list[Reminder]:
    """Sittings coming up, to everyone on the matter.

    Routed through matter_staff because `hearings` carries no assignee of its
    own -- a hearing belongs to a case, and everyone working that case needs to
    know. Members with no email address are excluded here and reported by the
    caller: a lawyer who silently never receives reminders is the failure this
    module exists to prevent, wearing a different hat.
    """
    dates = _target_dates(today)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT h.organization_id, s.clerk_user_id, mem.email, h.id,
                   h.hearing_date, m.name, h.court, h.purpose
              FROM hearings h
              JOIN matters m ON m.id = h.matter_id
              JOIN matter_staff s ON s.matter_id = h.matter_id
              JOIN memberships mem
                ON mem.organization_id = h.organization_id
               AND mem.clerk_user_id = s.clerk_user_id
             WHERE h.hearing_date = ANY(%s)
               AND mem.email IS NOT NULL
               AND mem.wants_reminders
            """,
            (list(dates),),
        )
        return [
            Reminder(
                organization_id=row[0],
                recipient=row[1],
                email=row[2],
                kind="hearing",
                subject_id=row[3],
                subject_date=row[4],
                offset_days=dates[row[4]],
                title=row[5],
                matter_name=row[5],
                detail=" · ".join(part for part in (row[6], row[7]) if part),
            )
            for row in cur.fetchall()
        ]


def due_deadlines(conn: psycopg.Connection, today: date) -> list[Reminder]:
    """Procedural dates on a case, to everyone on the matter behind it.

    Completed ones are skipped: reminding someone about something they have
    already done is how a person learns to stop reading the reminders.
    """
    dates = _target_dates(today)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.organization_id, s.clerk_user_id, mem.email, d.id,
                   d.due_date, m.name, d.label
              FROM case_deadlines d
              JOIN cases c ON c.id = d.case_id
              JOIN matters m ON m.id = c.matter_id
              JOIN matter_staff s ON s.matter_id = c.matter_id
              JOIN memberships mem
                ON mem.organization_id = c.organization_id
               AND mem.clerk_user_id = s.clerk_user_id
             WHERE d.due_date = ANY(%s)
               AND NOT d.completed
               AND mem.email IS NOT NULL
               AND mem.wants_reminders
            """,
            (list(dates),),
        )
        return [
            Reminder(
                organization_id=row[0],
                recipient=row[1],
                email=row[2],
                kind="deadline",
                subject_id=row[3],
                subject_date=row[4],
                offset_days=dates[row[4]],
                title=row[6],
                matter_name=row[5],
                detail="",
            )
            for row in cur.fetchall()
        ]


def due_tasks(conn: psycopg.Connection, today: date) -> list[Reminder]:
    """Tasks, to their assignee only -- unlike the other two, they have one."""
    dates = _target_dates(today)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT t.organization_id, t.assignee, mem.email, t.id, t.due_date,
                   coalesce(m.name, ''), t.title
              FROM tasks t
              LEFT JOIN matters m ON m.id = t.matter_id
              JOIN memberships mem
                ON mem.organization_id = t.organization_id
               AND mem.clerk_user_id = t.assignee
             WHERE t.due_date = ANY(%s)
               AND t.status <> 'done'
               AND mem.email IS NOT NULL
               AND mem.wants_reminders
            """,
            (list(dates),),
        )
        return [
            Reminder(
                organization_id=row[0],
                recipient=row[1],
                email=row[2],
                kind="task",
                subject_id=row[3],
                subject_date=row[4],
                offset_days=dates[row[4]],
                title=row[6],
                matter_name=row[5],
                detail="",
            )
            for row in cur.fetchall()
        ]


def collect_for_org(
    conn: psycopg.Connection, organization_id: int, today: date
) -> list[Reminder]:
    """Collects due reminders for a single organization under its tenant context."""
    set_tenant_context(conn, organization_id)
    return (
        due_hearings(conn, today) + due_deadlines(conn, today) + due_tasks(conn, today)
    )


def collect(conn: psycopg.Connection, today: date) -> list[Reminder]:
    """Sweeps all organizations, setting the tenant context for each one."""
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM organizations ORDER BY id")
        org_ids = [row[0] for row in cur.fetchall()]

    all_reminders: list[Reminder] = []
    for org_id in org_ids:
        all_reminders.extend(collect_for_org(conn, org_id, today))
    return all_reminders


def already_sent(
    conn: psycopg.Connection, reminder: Reminder, channel: str = "email"
) -> bool:
    """Whether this reminder went out ON THIS CHANNEL.

    Per channel, not per reminder. 0013 left `channel` out of the unique key,
    which was right with one channel and a silent bug with two: the morning
    email would write the row and the push for the same hearing would look
    like a duplicate, so the lawyer got the mail, never got the notification,
    and nothing reported a failure. Migration 0017 widened the key.
    """
    set_tenant_context(conn, reminder.organization_id)
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM notification_sends "
            "WHERE organization_id = %s AND recipient = %s AND subject_kind = %s AND subject_id = %s "
            "  AND offset_days = %s AND subject_date = %s AND channel = %s",
            (
                reminder.organization_id,
                reminder.recipient,
                reminder.kind,
                reminder.subject_id,
                reminder.offset_days,
                reminder.subject_date,
                channel,
            ),
        )
        return cur.fetchone() is not None


def record_sent(
    conn: psycopg.Connection, reminder: Reminder, channel: str = "email"
) -> bool:
    """Marks it delivered on this channel. False when another run got there first.

    ON CONFLICT DO NOTHING rather than a prior check, so two sweeps racing --
    a manual run beside the timer -- cannot both decide it is unsent.
    """
    set_tenant_context(conn, reminder.organization_id)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO notification_sends (organization_id, recipient, "
            "subject_kind, subject_id, offset_days, subject_date, channel) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) "
            "ON CONFLICT DO NOTHING RETURNING id",
            (
                reminder.organization_id,
                reminder.recipient,
                reminder.kind,
                reminder.subject_id,
                reminder.offset_days,
                reminder.subject_date,
                channel,
            ),
        )
        written = cur.fetchone() is not None
    conn.commit()
    return written


def devices_for(
    conn: psycopg.Connection, organization_id: int, recipient: str
) -> list[tuple[int, str]]:
    """(id, token) for every handset this person has registered in this firm.

    Scoped by organization as well as subject: the same person in two firms
    registers separately, and a reminder about one firm's hearing has no
    business reaching a device signed in to the other.
    """
    set_tenant_context(conn, organization_id)
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, token FROM device_tokens "
            " WHERE organization_id = %s AND subject = %s "
            " ORDER BY last_seen_at DESC",
            (organization_id, recipient),
        )
        return [(row[0], row[1]) for row in cur.fetchall()]


def forget_device(conn: psycopg.Connection, device_id: int) -> None:
    """Drops a handset FCM says no longer exists.

    Not a delivery failure: an app removed or a phone wiped is the normal end
    of a token's life. Left in place it would be retried every morning for
    ever and would keep the sweep's exit code non-zero on a working unit.
    """
    with conn.cursor() as cur:
        cur.execute("DELETE FROM device_tokens WHERE id = %s", (device_id,))
    conn.commit()


def members_without_email(conn: psycopg.Connection) -> list[tuple[int, str]]:
    """Who would be reminded but cannot be.

    Surfaced rather than skipped. Someone quietly receiving nothing is the
    exact failure this module exists to prevent.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT organization_id, clerk_user_id FROM memberships "
            "WHERE email IS NULL AND wants_reminders"
        )
        return list(cur.fetchall())
