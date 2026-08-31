"""Creating an invitation must not depend on email working.

The invitation is the durable half of this operation: the token is committed
before any mail is attempted and works whether or not a message goes out. A
firm with no Resend key is a supported state -- most self-hosted installs
start that way -- and before this, inviting a colleague there returned a 500
with `RESEND_API_KEY not set in .env` while a perfectly usable invitation sat
in the table. The owner saw a failure and had no way to reach the row.

So the rule under test is: the request succeeds, and it tells the truth about
whether the mail was sent. Both halves matter. An invitation that reports
success while nothing was delivered is the worse bug of the two, because the
owner then waits on a colleague who was never told.
"""
from __future__ import annotations

import httpx
import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.email import EmailError
from legalrag.ratelimit import reset_limits


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
    app.dependency_overrides[get_current_user_id] = lambda: "user_owner"
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user_id, None)


@pytest.fixture
def org(client):
    return client.post("/api/orgs", json={"name": "Firm"}).json()["id"]


def invite(client, org, email="new@example.com"):
    return client.post(
        f"/api/orgs/{org}/invites", json={"email": email, "role": "lawyer"}
    )


class TestAnUnconfiguredMailer:
    def test_the_invitation_is_still_created(self, client, org, monkeypatch):
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        response = invite(client, org)
        assert response.status_code == 200, response.text

    def test_and_it_says_no_mail_was_sent(self, client, org, monkeypatch):
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        assert invite(client, org).json()["email_sent"] is False

    def test_and_the_token_actually_works(self, client, org, monkeypatch):
        """The point of not failing: the invitation is usable by hand."""
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        token = invite(client, org).json()["token"]
        preview = client.get(f"/api/invites/{token}")
        assert preview.status_code == 200
        assert preview.json()["status"] == "pending"

    def test_no_send_is_even_attempted(self, client, org, monkeypatch):
        """Asked in advance rather than caught: an unconfigured mailer is a
        known state, not an error to be discovered."""
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        called = []
        monkeypatch.setattr(
            "legalrag.api.send_invite_email",
            lambda **kwargs: called.append(kwargs),
        )
        invite(client, org)
        assert called == []


class TestASendThatFails:
    def test_a_rejected_send_does_not_lose_the_invitation(
        self, client, org, monkeypatch
    ):
        monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

        def reject(**kwargs):
            raise EmailError("Resend returned 422: invalid recipient")

        monkeypatch.setattr("legalrag.api.send_invite_email", reject)
        response = invite(client, org)
        assert response.status_code == 200, response.text
        assert response.json()["email_sent"] is False
        assert client.get(
            f"/api/invites/{response.json()['token']}"
        ).status_code == 200

    def test_an_unreachable_provider_is_survived_too(self, client, org, monkeypatch):
        """A timeout is httpx's, not EmailError's -- both have to be caught or
        a Resend outage takes the whole invite flow down with it."""
        monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

        def timeout(**kwargs):
            raise httpx.ConnectTimeout("timed out")

        monkeypatch.setattr("legalrag.api.send_invite_email", timeout)
        response = invite(client, org)
        assert response.status_code == 200, response.text
        assert response.json()["email_sent"] is False

    def test_an_unexpected_error_is_not_swallowed(self, client, org, monkeypatch):
        """Deliberately narrow. A bug in the send path should still surface as
        a 500 rather than being reported as "email not configured"."""
        monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

        def bug(**kwargs):
            raise TypeError("a real bug, not a delivery failure")

        monkeypatch.setattr("legalrag.api.send_invite_email", bug)
        with pytest.raises(TypeError):
            invite(client, org)


class TestASendThatWorks:
    def test_it_reports_the_mail_as_sent(self, client, org, monkeypatch):
        monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
        monkeypatch.setattr("legalrag.api.send_invite_email", lambda **kwargs: None)
        assert invite(client, org).json()["email_sent"] is True

    def test_the_link_in_the_mail_is_the_returned_one(
        self, client, org, monkeypatch
    ):
        """One URL, not two built separately -- a mailed link that differs
        from the one shown on screen is a bug nobody would find quickly."""
        monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
        sent = {}
        monkeypatch.setattr("legalrag.api.send_invite_email", lambda **k: sent.update(k))
        body = invite(client, org).json()
        assert sent["accept_url"] == body["accept_url"]


class TestWhereTheLinkPoints:
    def test_it_uses_the_configured_app_origin(self, client, org, monkeypatch):
        """It used to be hardcoded to https://app.legalrag.example -- a domain
        that does not exist, so every invitation ever mailed led nowhere."""
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        monkeypatch.setenv("APP_BASE_URL", "https://firm.example.com")
        body = invite(client, org).json()
        assert body["accept_url"] == f"https://firm.example.com/invite/{body['token']}"

    def test_a_trailing_slash_does_not_double_up(self, client, org, monkeypatch):
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        monkeypatch.setenv("APP_BASE_URL", "https://firm.example.com/")
        assert "//invite/" not in invite(client, org).json()["accept_url"]

    def test_it_falls_back_to_the_local_origin(self, client, org, monkeypatch):
        """Unset is the normal state on a developer's machine, and it must not
        raise -- localhost is obviously wrong to whoever reads it, which is
        the point, whereas a 500 breaks the flow entirely."""
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        monkeypatch.delenv("APP_BASE_URL", raising=False)
        assert invite(client, org).json()["accept_url"].startswith(
            "http://localhost:3000/invite/"
        )


class TestPreviewingAnExpiredInvitation:
    """The status column only advances when somebody tries to ACCEPT, so a
    pending row whose window has closed still reads 'pending' in the table.
    The preview used to repeat that verbatim -- offering an Accept button on a
    dead link, with the truth arriving only after the recipient pressed it.
    """

    def _expire(self, conn, token):
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE invitations SET expires_at = now() - interval '1 day' "
                "WHERE token = %s",
                (token,),
            )
        conn.commit()

    def test_it_reads_as_expired(self, client, conn, org, monkeypatch):
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        token = invite(client, org).json()["token"]
        self._expire(conn, token)
        assert client.get(f"/api/invites/{token}").json()["status"] == "expired"

    def test_the_row_is_not_written_to_by_a_read(self, client, conn, org, monkeypatch):
        """A public unauthenticated GET must not mutate the table -- otherwise
        anyone holding an old token can write to it."""
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        token = invite(client, org).json()["token"]
        self._expire(conn, token)
        client.get(f"/api/invites/{token}")
        with conn.cursor() as cur:
            cur.execute("SELECT status FROM invitations WHERE token = %s", (token,))
            assert cur.fetchone()[0] == "pending"

    def test_a_live_invitation_is_untouched(self, client, org, monkeypatch):
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        token = invite(client, org).json()["token"]
        assert client.get(f"/api/invites/{token}").json()["status"] == "pending"

    def test_a_terminal_state_is_not_reclassified(self, client, conn, org, monkeypatch):
        """'revoked' stays revoked however long ago the window closed --
        matching accept_invitation, which checks status before expiry."""
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        token = invite(client, org).json()["token"]
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE invitations SET status = 'revoked', "
                "expires_at = now() - interval '30 days' WHERE token = %s",
                (token,),
            )
        conn.commit()
        assert client.get(f"/api/invites/{token}").json()["status"] == "revoked"
