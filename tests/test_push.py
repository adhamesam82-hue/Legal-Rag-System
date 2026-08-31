"""The push channel. No network: every FCM call is stubbed.

The property worth most here is the one about dead handsets. FCM answers
UNREGISTERED for a phone that was wiped or had the app removed, and that is
the normal end of a device token's life -- not a delivery failure. Getting it
wrong in either direction is bad in a specific way:

  treated as a failure  the sweep retries it every morning for ever and the
                        systemd unit reports failure on a working box.

  treated too broadly   a malformed payload also comes back 400, so a bug in
                        push.py would quietly delete every working token in
                        the table and notifications would stop for everyone.

So UNREGISTERED deletes and INVALID_ARGUMENT does not, and both are asserted.
"""
from __future__ import annotations

import json

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from legalrag import push
from legalrag.push import DeviceGone, PushError


@pytest.fixture(scope="module")
def private_key_pem():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()


@pytest.fixture
def service_account(private_key_pem):
    return {
        "project_id": "test-project",
        "client_email": "sweep@test-project.iam.gserviceaccount.com",
        "private_key": private_key_pem,
    }


@pytest.fixture(autouse=True)
def _clear_cache():
    push.reset_token_cache()
    yield
    push.reset_token_cache()


def fcm_response(status, body=None):
    return httpx.Response(
        status,
        json=body if body is not None else {},
        request=httpx.Request("POST", "https://fcm.googleapis.com/"),
    )


@pytest.fixture
def posts(monkeypatch):
    """Stubs httpx.post: first call mints a token, the rest are FCM sends."""
    calls = []
    outcomes = {"fcm": fcm_response(200, {"name": "projects/x/messages/1"})}

    def fake_post(url, **kwargs):
        calls.append({"url": url, **kwargs})
        if url == push.TOKEN_URL:
            return httpx.Response(
                200,
                json={"access_token": "ya29.test", "expires_in": 3600},
                request=httpx.Request("POST", url),
            )
        return outcomes["fcm"]

    monkeypatch.setattr("legalrag.push.httpx.post", fake_post)
    return {"calls": calls, "outcomes": outcomes}


class TestWhetherItIsConfiguredAtAll:
    def test_unset_is_not_configured(self, monkeypatch):
        monkeypatch.delenv("FIREBASE_SERVICE_ACCOUNT", raising=False)
        assert push.push_is_configured() is False

    def test_set_is_configured(self, monkeypatch):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", "{}")
        assert push.push_is_configured() is True

    def test_asking_never_raises(self, monkeypatch):
        """It is asked before every sweep, including on installs with no app."""
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", "not json at all")
        assert push.push_is_configured() is True


class TestReadingTheCredential:
    def test_inline_json(self, monkeypatch, service_account, posts):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        push.send_push("device-1", title="t", body="b")
        assert "test-project" in posts["calls"][-1]["url"]

    def test_a_path_to_the_key_file(self, monkeypatch, tmp_path, service_account, posts):
        path = tmp_path / "sa.json"
        path.write_text(json.dumps(service_account), encoding="utf-8")
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", str(path))
        push.send_push("device-1", title="t", body="b")
        assert "test-project" in posts["calls"][-1]["url"]

    def test_escaped_newlines_in_the_key_are_restored(
        self, monkeypatch, service_account, posts
    ):
        """A PEM passed through an env var arrives with literal backslash-n."""
        escaped = dict(service_account)
        escaped["private_key"] = service_account["private_key"].replace("\n", "\\n")
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(escaped))
        push.send_push("device-1", title="t", body="b")  # would fail to sign otherwise

    def test_a_missing_file_says_so(self, monkeypatch, tmp_path):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", str(tmp_path / "nope.json"))
        with pytest.raises(PushError, match="missing"):
            push.send_push("device-1", title="t", body="b")

    def test_malformed_json_says_so(self, monkeypatch):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", "{not json")
        with pytest.raises(PushError, match="not valid JSON"):
            push.send_push("device-1", title="t", body="b")

    def test_an_incomplete_account_names_what_is_missing(self, monkeypatch):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps({"project_id": "p"}))
        with pytest.raises(PushError, match="client_email"):
            push.send_push("device-1", title="t", body="b")


class TestADeadHandset:
    def test_a_404_is_not_a_failure(self, monkeypatch, service_account, posts):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        posts["outcomes"]["fcm"] = fcm_response(404)
        with pytest.raises(DeviceGone):
            push.send_push("dead-device", title="t", body="b")

    def test_unregistered_in_a_400_is_not_either(
        self, monkeypatch, service_account, posts
    ):
        """FCM reports it this way at least as often as it does with a 404."""
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        posts["outcomes"]["fcm"] = fcm_response(
            400, {"error": {"details": [{"errorCode": "UNREGISTERED"}]}}
        )
        with pytest.raises(DeviceGone):
            push.send_push("dead-device", title="t", body="b")

    def test_a_malformed_payload_is_NOT_a_dead_handset(
        self, monkeypatch, service_account, posts
    ):
        """The safety property. INVALID_ARGUMENT is what a bug in this file
        looks like; treating it as a dead device would delete every working
        token in the table one sweep at a time."""
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        posts["outcomes"]["fcm"] = fcm_response(
            400, {"error": {"details": [{"errorCode": "INVALID_ARGUMENT"}]}}
        )
        with pytest.raises(PushError):
            push.send_push("good-device", title="t", body="b")


class TestTheAccessToken:
    def test_it_is_minted_once_and_reused(self, monkeypatch, service_account, posts):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        for _ in range(3):
            push.send_push("device-1", title="t", body="b")
        token_calls = [c for c in posts["calls"] if c["url"] == push.TOKEN_URL]
        assert len(token_calls) == 1

    def test_a_rejected_token_is_dropped_not_reused(
        self, monkeypatch, service_account, posts
    ):
        """Otherwise a rotated key fails identically until the process restarts."""
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        posts["outcomes"]["fcm"] = fcm_response(401)
        with pytest.raises(PushError):
            push.send_push("device-1", title="t", body="b")
        assert push._cached_token is None

    def test_a_refused_token_endpoint_is_reported(
        self, monkeypatch, service_account
    ):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        monkeypatch.setattr(
            "legalrag.push.httpx.post",
            lambda url, **kw: httpx.Response(
                403, text="denied", request=httpx.Request("POST", url)
            ),
        )
        with pytest.raises(PushError, match="403"):
            push.send_push("device-1", title="t", body="b")


class TestTheMessage:
    def test_data_values_are_all_strings(self, monkeypatch, service_account, posts):
        """FCM rejects the whole message if any data value is not a string."""
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        push.send_push("d", title="t", body="b", data={"subject_id": 42})
        message = posts["calls"][-1]["json"]["message"]
        assert message["data"] == {"subject_id": "42"}

    def test_the_notification_carries_title_and_body(
        self, monkeypatch, service_account, posts
    ):
        monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT", json.dumps(service_account))
        push.send_push("d", title="جلسة غدًا", body="نزاع توريد")
        message = posts["calls"][-1]["json"]["message"]
        assert message["notification"]["title"] == "جلسة غدًا"
        assert message["token"] == "d"
