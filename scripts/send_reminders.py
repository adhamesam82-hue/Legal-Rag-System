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
from legalrag.email import EmailError, send_reminder_email

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
        failures: list[str] = []

        for reminder in due:
            if reminders.already_sent(conn, reminder):
                skipped += 1
                continue

            if args.dry_run:
                print(
                    f"would send: {reminder.kind} {reminder.subject_id} "
                    f"-> {reminder.email} (in {reminder.offset_days}d)"
                )
                sent += 1
                continue

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
                # Left unrecorded on purpose, so tomorrow's sweep tries again.
                # A reminder written down as sent but never delivered is the
                # one failure mode with no way back.
                failures.append(f"{reminder.kind} {reminder.subject_id}: {exc}")
                continue

            reminders.record_sent(conn, reminder)
            sent += 1

        print(
            f"{today.isoformat()}: {sent} sent, {skipped} already sent, "
            f"{len(failures)} failed"
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
