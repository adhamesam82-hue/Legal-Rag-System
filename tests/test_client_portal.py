"""What a client can see of their own case, and what they cannot. E-1.

The weight is on the boundaries. A portal is a hole cut in a system that holds
both sides' confidences, so the tests that matter are the ones asserting how
small the hole is: one matter, the permissions the firm granted, the documents
the firm marked, and nothing reachable by guessing an id.
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.practice import client_access
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"


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
def firm(client):
    """A firm, one matter, one client contact with a portal grant and a link."""
    org = client.post("/api/orgs", json={"name": "السيد وشركاه"}).json()["id"]
    client_id = client.post(
        f"/api/orgs/{org}/clients", json={"name": "شركة النيل"}
    ).json()["id"]
    contact = client.post(
        f"/api/orgs/{org}/clients/{client_id}/contacts",
        json={"name": "أ. سامي", "email": "sami@nile.test"},
    )
    assert contact.status_code == 201, contact.text
    contact_id = contact.json()["id"]
    matter = client.post(
        f"/api/orgs/{org}/matters",
        json={
            "name": "نزاع توريد",
            "client_id": client_id,
            "matter_type": "civil",
            "billing_type": "hourly",
            "responsible_user": OWNER,
            "opened_date": "2026-01-05",
        },
    ).json()["id"]
    portal = client.post(
        f"/api/orgs/{org}/matters/{matter}/portals",
        json={"contact_id": contact_id, "can_view_documents": True,
              "can_view_bills": False, "can_message": True},
    )
    assert portal.status_code == 201, portal.text
    portal_id = portal.json()["id"]
    token = client.post(
        f"/api/orgs/{org}/portals/{portal_id}/link"
    ).json()["token"]
    return {
        "org": org, "matter": matter, "client_id": client_id,
        "contact_id": contact_id, "portal_id": portal_id, "token": token,
    }


def as_client(client, firm, path, **kwargs):
    return client.get(
        f"/api/portal{path}",
        headers={"Authorization": f"Bearer {firm['token']}"},
        **kwargs,
    )


class TestTheLink:
    def test_the_secret_is_returned_once_and_stored_hashed(self, conn, firm):
        with conn.cursor() as cur:
            cur.execute(
                "SELECT access_token_hash FROM client_portals WHERE id = %s",
                (firm["portal_id"],),
            )
            stored = cur.fetchone()[0]
        assert stored != firm["token"]
        assert stored == client_access.hash_token(firm["token"])

    def test_it_opens_the_portal(self, client, firm):
        response = as_client(client, firm, "/me")
        assert response.status_code == 200, response.text
        assert response.json()["matter_name"] == "نزاع توريد"

    def test_a_query_parameter_works_for_the_first_click(self, client, firm):
        """An email link cannot carry an Authorization header."""
        response = client.get("/api/portal/me", params={"token": firm["token"]})
        assert response.status_code == 200

    def test_no_token_is_refused(self, client):
        assert client.get("/api/portal/me").status_code == 401

    def test_a_wrong_token_is_refused(self, client, firm):
        response = client.get(
            "/api/portal/me", headers={"Authorization": "Bearer nonsense"}
        )
        assert response.status_code == 401

    def test_revoking_closes_it(self, client, firm):
        """Through the firm's own control, not a raw UPDATE -- the schema
        requires status and revoked_at to agree, and going round it would test
        a state the product cannot produce."""
        assert client.delete(
            f"/api/orgs/{firm['org']}/portals/{firm['portal_id']}/link"
        ).status_code == 200
        assert as_client(client, firm, "/me").status_code == 401

    def test_expiry_closes_it(self, client, conn, firm):
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE client_portals SET token_expires_at = now() - interval '1 day' "
                "WHERE id = %s",
                (firm["portal_id"],),
            )
        conn.commit()
        assert as_client(client, firm, "/me").status_code == 401

    def test_reissuing_invalidates_the_old_link(self, client, firm):
        """How "the client forwarded the email" gets undone."""
        old = firm["token"]
        client.post(f"/api/orgs/{firm['org']}/portals/{firm['portal_id']}/link")
        response = client.get(
            "/api/portal/me", headers={"Authorization": f"Bearer {old}"}
        )
        assert response.status_code == 401

    def test_refusals_do_not_say_which_kind(self, client, firm):
        """Unknown, revoked and expired must be indistinguishable: telling a
        caller a token was revoked confirms it once existed."""
        unknown = client.get(
            "/api/portal/me", headers={"Authorization": "Bearer nope"}
        ).json()["detail"]
        client.delete(f"/api/orgs/{firm['org']}/portals/{firm['portal_id']}/link")
        revoked = as_client(client, firm, "/me").json()["detail"]
        assert unknown == revoked


class TestWhatTheyCanSee:
    def test_the_case_summary(self, client, firm):
        body = as_client(client, firm, "/case").json()
        assert body["matter_name"] == "نزاع توريد"
        assert body["status"] == "active"

    def test_the_hearing_timeline(self, client, firm):
        client.post(
            f"/api/orgs/{firm['org']}/hearings",
            json={
                "matter_id": firm["matter"],
                "hearing_date": "2026-03-10",
                "court": "محكمة شمال القاهرة الابتدائية",
                "outcome": "adjourned",
                "outcome_note": "للاطلاع",
                "next_hearing_date": "2026-04-14",
            },
        )
        rows = as_client(client, firm, "/hearings").json()
        assert len(rows) == 1
        # The clerk's note is included: it tells the client more than a status
        # word does.
        assert rows[0]["outcome_note"] == "للاطلاع"
        assert rows[0]["next_hearing_date"] == "2026-04-14"


class TestDocumentVisibility:
    def upload(self, client, firm, name="مذكرة.pdf"):
        return client.post(
            f"/api/orgs/{firm['org']}/documents",
            files={"file": (name, b"%PDF-1.4 stub", "application/pdf")},
            params={"matter_id": firm["matter"]},
        ).json()["id"]

    def test_a_document_is_hidden_until_the_firm_shares_it(self, client, firm):
        """The default is hidden, so nothing is published by inattention."""
        self.upload(client, firm)
        assert as_client(client, firm, "/documents").json() == []

    def test_sharing_one_makes_it_visible(self, client, firm):
        doc = self.upload(client, firm)
        client.put(
            f"/api/orgs/{firm['org']}/documents/{doc}/client-visibility",
            json={"visible_to_client": True},
        )
        rows = as_client(client, firm, "/documents").json()
        assert [r["id"] for r in rows] == [doc]

    def test_the_firm_can_see_what_it_has_shared(self, client, firm):
        """A write-only control is worse than none: a firm that cannot see
        which documents it published cannot notice that it published one."""
        doc = self.upload(client, firm)
        listed = client.get(
            f"/api/orgs/{firm['org']}/documents",
            params={"matter_id": firm["matter"]},
        ).json()
        assert [d["visible_to_client"] for d in listed] == [False]
        client.put(
            f"/api/orgs/{firm['org']}/documents/{doc}/client-visibility",
            json={"visible_to_client": True},
        )
        detail = client.get(f"/api/orgs/{firm['org']}/documents/{doc}").json()
        assert detail["visible_to_client"] is True

    def test_hiding_it_again_takes_it_back(self, client, firm):
        doc = self.upload(client, firm)
        for visible in (True, False):
            client.put(
                f"/api/orgs/{firm['org']}/documents/{doc}/client-visibility",
                json={"visible_to_client": visible},
            )
        assert as_client(client, firm, "/documents").json() == []

    def test_the_bytes_of_an_unshared_document_are_not_reachable(self, client, firm):
        """The listing is not the boundary -- a guessed id must be refused by
        the same rule that hid it."""
        doc = self.upload(client, firm)
        assert as_client(client, firm, f"/documents/{doc}").status_code == 404

    def test_the_bytes_of_a_shared_one_are(self, client, firm):
        doc = self.upload(client, firm)
        client.put(
            f"/api/orgs/{firm['org']}/documents/{doc}/client-visibility",
            json={"visible_to_client": True},
        )
        response = as_client(client, firm, f"/documents/{doc}")
        assert response.status_code == 200
        assert response.content.startswith(b"%PDF")

    def test_a_shared_document_is_never_cached_by_a_proxy(self, client, firm):
        """The link can arrive as ?token=, so a shared cache would hand the
        next person through it somebody else's document."""
        doc = self.upload(client, firm)
        client.put(
            f"/api/orgs/{firm['org']}/documents/{doc}/client-visibility",
            json={"visible_to_client": True},
        )
        response = as_client(client, firm, f"/documents/{doc}")
        assert "no-store" in response.headers["cache-control"]


class TestPermissionsAreHonoured:
    def test_bills_are_hidden_when_not_granted(self, client, firm):
        assert as_client(client, firm, "/invoices").json() == []

    def test_bills_appear_when_granted(self, client, firm):
        client.patch(
            f"/api/orgs/{firm['org']}/portals/{firm['portal_id']}",
            json={"can_view_bills": True},
        )
        client.post(
            f"/api/orgs/{firm['org']}/invoices",
            json={
                "client_id": firm["client_id"],
                "matter_id": firm["matter"],
                "issued_date": "2026-03-01",
                "due_date": "2026-03-31",
                "status": "sent",
                "lines": [{"description": "أتعاب", "quantity": 1, "unit_amount": 500}],
            },
        )
        assert len(as_client(client, firm, "/invoices").json()) == 1

    def test_a_draft_invoice_is_never_shown(self, client, firm):
        """A draft is the firm thinking aloud about what to charge."""
        client.patch(
            f"/api/orgs/{firm['org']}/portals/{firm['portal_id']}",
            json={"can_view_bills": True},
        )
        client.post(
            f"/api/orgs/{firm['org']}/invoices",
            json={
                "client_id": firm["client_id"],
                "matter_id": firm["matter"],
                "issued_date": "2026-03-01",
                "due_date": "2026-03-31",
                "status": "draft",
                "lines": [{"description": "أتعاب", "quantity": 1, "unit_amount": 500}],
            },
        )
        assert as_client(client, firm, "/invoices").json() == []

    def test_documents_are_hidden_when_the_grant_says_so(self, client, firm):
        doc = client.post(
            f"/api/orgs/{firm['org']}/documents",
            files={"file": ("x.pdf", b"%PDF-1.4", "application/pdf")},
            params={"matter_id": firm["matter"]},
        ).json()["id"]
        client.put(
            f"/api/orgs/{firm['org']}/documents/{doc}/client-visibility",
            json={"visible_to_client": True},
        )
        client.patch(
            f"/api/orgs/{firm['org']}/portals/{firm['portal_id']}",
            json={"can_view_documents": False},
        )
        # Marked visible, but the grant closes the whole category above it.
        assert as_client(client, firm, "/documents").json() == []
        assert as_client(client, firm, f"/documents/{doc}").status_code == 404


class TestTheHoleIsOneMatterWide:
    @pytest.fixture
    def second_matter(self, client, firm):
        return client.post(
            f"/api/orgs/{firm['org']}/matters",
            json={
                "name": "قضية أخرى",
                "client_id": firm["client_id"],
                "matter_type": "corporate",
                "billing_type": "hourly",
                "responsible_user": OWNER,
                "opened_date": "2026-02-01",
            },
        ).json()["id"]

    def test_another_matters_documents_are_unreachable(
        self, client, firm, second_matter
    ):
        """Same client, same firm, different case: still not this grant."""
        doc = client.post(
            f"/api/orgs/{firm['org']}/documents",
            files={"file": ("other.pdf", b"%PDF-1.4", "application/pdf")},
            params={"matter_id": second_matter},
        ).json()["id"]
        client.put(
            f"/api/orgs/{firm['org']}/documents/{doc}/client-visibility",
            json={"visible_to_client": True},
        )
        assert as_client(client, firm, f"/documents/{doc}").status_code == 404

    def test_the_portal_cannot_reach_the_firm_surface(self, firm):
        """A portal token is not a session: the firm routes have no code path
        that accepts one.

        Both cheats have to be removed for this to mean anything -- the
        dependency override that the other tests here rely on, and
        LEGALOS_DEV_AUTH from the developer's .env. Either one left in place
        would let the request through and the assertion would pass for the
        wrong reason.
        """
        import os

        from legalrag.api import app as real_app

        override = real_app.dependency_overrides.pop(get_current_user_id, None)
        previous = os.environ.pop("LEGALOS_DEV_AUTH", None)
        try:
            with TestClient(real_app, raise_server_exceptions=False) as bare:
                response = bare.get(
                    f"/api/orgs/{firm['org']}/matters",
                    headers={"Authorization": f"Bearer {firm['token']}"},
                )
            assert response.status_code != 200, (
                "a portal token opened the firm surface"
            )
        finally:
            if previous is not None:
                os.environ["LEGALOS_DEV_AUTH"] = previous
            if override is not None:
                real_app.dependency_overrides[get_current_user_id] = override
