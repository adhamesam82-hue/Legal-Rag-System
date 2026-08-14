"""Emails when the box's disk is filling up.

A full disk is the likeliest way this box falls over: Postgres cannot write,
and an uptime monitor only reports it once it is already an outage. This is the
check that arrives before that.

Run nightly by alsigil-diskalert.timer.
"""
from __future__ import annotations

import os
import shutil
import sys

DEFAULT_THRESHOLD_PERCENT = 80.0
BYTES_PER_GB = 1024**3


def should_alert(used_percent: float, threshold: float) -> bool:
    return used_percent >= threshold


def format_alert(used_percent: float, free_gb: float) -> str:
    return (
        f"alsigil box disk is {used_percent:.1f}% full "
        f"({free_gb:.1f} GB free).\n\n"
        "Usual causes, in order of likelihood:\n"
        "  - docker image and build cache buildup: docker system df\n"
        "  - container logs: check max-size is set on every service\n"
        "  - leftover /var/tmp/alsigil-* staging from a backup or restore check\n"
    )


def disk_usage(path: str = "/") -> tuple[float, float]:
    """(used percent, free GB) for the filesystem containing `path`."""
    usage = shutil.disk_usage(path)
    used_percent = usage.used / usage.total * 100
    return used_percent, usage.free / BYTES_PER_GB


def main() -> int:
    threshold = float(
        os.environ.get("DISK_ALERT_THRESHOLD", DEFAULT_THRESHOLD_PERCENT)
    )
    used_percent, free_gb = disk_usage("/")

    if not should_alert(used_percent, threshold):
        print(f"disk at {used_percent:.1f}%, below {threshold:.0f}% threshold")
        return 0

    message = format_alert(used_percent, free_gb)
    recipient = os.environ.get("ALERT_EMAIL_TO")
    if not recipient:
        print(message, file=sys.stderr)
        print("ALERT_EMAIL_TO not set; printed instead of sent", file=sys.stderr)
        return 1

    from legalrag.email import EmailError, send_plain_email

    try:
        send_plain_email(
            to_email=recipient,
            subject=f"[alsigil] disk {used_percent:.0f}% full",
            body=message,
        )
    except EmailError as exc:
        # Exit 2, not 1: the unit's SuccessExitStatus=0 1 covers "alerted",
        # so a delivery failure must land outside that set or systemd records
        # a silent failure to warn as a healthy run.
        print(
            f"disk at {used_percent:.1f}% but the alert could not be sent: {exc}",
            file=sys.stderr,
        )
        return 2

    print(f"alerted {recipient}: disk at {used_percent:.1f}%")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
