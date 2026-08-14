from __future__ import annotations

from legalrag.email import EmailError
from scripts.disk_alert import format_alert, main, should_alert


def test_no_alert_below_the_threshold():
    assert should_alert(used_percent=61.0, threshold=80.0) is False


def test_alerts_at_the_threshold():
    """At exactly 80% the disk is already a problem worth an email."""
    assert should_alert(used_percent=80.0, threshold=80.0) is True


def test_alerts_above_the_threshold():
    assert should_alert(used_percent=94.2, threshold=80.0) is True


def test_alert_names_the_number_and_the_usual_cause():
    message = format_alert(used_percent=91.5, free_gb=3.4)

    assert "91.5" in message
    assert "3.4" in message
    assert "docker" in message.lower()


def test_delivery_failure_returns_2_not_1(monkeypatch):
    """A failed send must not exit inside SuccessExitStatus=0 1 -- see the
    service unit's comment. Exit 1 means "alerted"; a swallowed EmailError
    exiting 1 too would make systemd log a failed delivery as a healthy run.
    """
    monkeypatch.setattr("scripts.disk_alert.disk_usage", lambda path="/": (91.5, 3.4))

    def fake_send_plain_email(**kwargs):
        raise EmailError("Resend returned 401: invalid key")

    monkeypatch.setattr("legalrag.email.send_plain_email", fake_send_plain_email)
    monkeypatch.setenv("ALERT_EMAIL_TO", "ops@example.com")
    monkeypatch.delenv("DISK_ALERT_THRESHOLD", raising=False)

    assert main() == 2


def test_successful_send_still_returns_1(monkeypatch):
    monkeypatch.setattr("scripts.disk_alert.disk_usage", lambda path="/": (91.5, 3.4))

    sent = {}

    def fake_send_plain_email(*, to_email, subject, body):
        sent["to_email"] = to_email
        sent["subject"] = subject
        sent["body"] = body

    monkeypatch.setattr("legalrag.email.send_plain_email", fake_send_plain_email)
    monkeypatch.setenv("ALERT_EMAIL_TO", "ops@example.com")
    monkeypatch.delenv("DISK_ALERT_THRESHOLD", raising=False)

    assert main() == 1
    assert sent["to_email"] == "ops@example.com"
