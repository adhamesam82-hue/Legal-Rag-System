from __future__ import annotations

from scripts.disk_alert import should_alert, format_alert


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
