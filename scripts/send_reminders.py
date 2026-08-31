"""The daily sweep. Reminds people about dates before those dates arrive.

Run by systemd once a morning (deploy/alsigil-reminders.*), the same way the
disk alert runs. No queue and no worker container: this is one pass over three
tables, and a Redis to keep alive would be more moving parts than the job.

    uv run python scripts/send_reminders.py            send
    uv run python scripts/send_reminders.py --dry-run  print, send nothing

Exit codes, chosen so systemd can tell the three apart:

    0  swept, everything that needed sending was sent
    1  swept, but somebody who should be reminded has no email address --
       informational, and NOT a failure, because the sweep did its job
    2  a send failed, or the database was unreachable. A real unit failure:
       somebody is not being told about a hearing.

Safe to run repeatedly. Each reminder is recorded per recipient, subject and
offset, and the unique index on that -- not this script -- is what makes a
second run in the same morning a no-op.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date

from legalrag import reminders
from legalrag.db import get_connection
from legalrag.email import EmailError, reminder_subject, send_reminder_email
from legalrag.push import DeviceGone, PushError, push_is_configured, send_push

EXIT_OK = 0
EXIT_INCOMPLETE_RECIPIENTS = 1
EXIT_FAILED = 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print what would be sent and write nothing",
    )
    parser.add_argument(
        "--today",
        type=date.fromisoformat,
        default=None,
        help="pretend it is this date (ISO). For testing the offsets.",
    )
    args = parser.parse_args()
    today = args.today or date.today()

    try:
        conn = get_connection()
    except Exception as exc:  # noqa: BLE001 - any failure here means nobody is told
        print(f"database unreachable: {exc}", file=sys.stderr)
        return EXIT_FAILED

    try:
        due = reminders.collect(conn, today)
        unreachable = reminders.members_without_email(conn)

        sent = skipped = 0
        pushed = 0
        failures: list[str] = []
        # Asked once, not per reminder: an install with no mobile app has
        # nothing to push to, and that is a supported state rather than a
        # fault to report several hundred times.
        pushing = push_is_configured()

        for reminder in due:
            if not reminders.already_sent(conn, reminder, "email"):
                if args.dry_run:
                    print(
                        f"would send: {reminder.kind} {reminder.subject_id} "
                        f"-> {reminder.email} (in {reminder.offset_days}d)"
                    )
                    sent += 1
                else:
                    try:
                        send_reminder_email(
                            reminder.email,
                            kind=reminder.kind,
                            offset_days=reminder.offset_days,
                            title=reminder.title,
                            matter_name=reminder.matter_name,
                            on_date=reminder.subject_date.isoformat(),
                            detail=reminder.detail,
                        )
                    except EmailError as exc:
                        # Left unrecorded on purpose, so tomorrow's sweep tries
                        # again. A reminder written down as sent but never
                        # delivered is the one failure mode with no way back.
                        failures.append(
                            f"{reminder.kind} {reminder.subject_id} (email): {exc}"
                        )
                    else:
                        reminders.record_sent(conn, reminder, "email")
                        sent += 1
            else:
                skipped += 1

            # The second channel is recorded separately, so a firm that adds
            # push later still gets notifications for dates whose email went
            # out days ago -- and an email failure never suppresses the push.
            if not pushing or reminders.already_sent(conn, reminder, "push"):
                continue

            devices = reminders.devices_for(
                conn, reminder.organization_id, reminder.recipient
            )
            if not devices:
                continue

            if args.dry_run:
                print(
                    f"would push: {reminder.kind} {reminder.subject_id} "
                    f"-> {len(devices)} device(s)"
                )
                pushed += 1
                continue

            delivered = False
            for device_id, device_token in devices:
                try:
                    send_push(
                        device_token,
                        # The same Arabic wording as the email subject --
                        # WHEN first, because a lock screen truncates even
                        # harder than an inbox does.
                        title=reminder_subject(
                            reminder.kind, reminder.offset_days, reminder.title
                        ),
                        body=reminder.matter_name or reminder.title,
                        data={
                            "kind": reminder.kind,
                            "subject_id": reminder.subject_id,
                            "on_date": reminder.subject_date.isoformat(),
                        },
                    )
                except DeviceGone:
                    # Not a failure: the app was removed or the phone wiped.
                    reminders.forget_device(conn, device_id)
                except PushError as exc:
                    failures.append(
                        f"{reminder.kind} {reminder.subject_id} (push): {exc}"
                    )
                else:
                    delivered = True

            # Recorded once the reminder reached ANY of the person's handsets.
            # Recording per device would re-push to a working phone every
            # morning because a second, broken one never succeeds.
            if delivered:
                reminders.record_sent(conn, reminder, "push")
                pushed += 1

        print(
            f"{today.isoformat()}: {sent} sent, {pushed} pushed, "
            f"{skipped} already sent, {len(failures)} failed"
        )
        for problem in failures:
            print(f"  failed: {problem}", file=sys.stderr)
        for organization_id, member in unreachable:
            print(
                f"  no email on file: org {organization_id} member {member}",
                file=sys.stderr,
            )

        if failures:
            return EXIT_FAILED
        if unreachable:
            return EXIT_INCOMPLETE_RECIPIENTS
        return EXIT_OK
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
