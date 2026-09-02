"""A restricted member sees only the cases they are on. T-019.

The tests that matter here are the leak tests. Filtering a list is the easy
half and proves almost nothing: the failure this feature exists to prevent is
a lawyer who cannot see case 7 in their list opening /documents/412 and
reading what is filed on it. So every entity that hangs off a matter is asked
for BY ITS OWN ID as the restricted user, and must come back 404.
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"
INSIDER = "user_insider"   # on the case
OUTSIDER = "user_outsider"  # a lawyer at the same firm, not on the case


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


def act_as(user):
    app.dependency_overrides[get_current_user_id] = lambda: user


@pytest.fixture
def firm(client, conn):
    """A firm with two lawyers, one case, and only one of them on it."""
    org = client.post("/api/orgs", json={"name": "Test Firm"}).json()["id"]
    with conn.cursor() as cur:
        for user, scope in ((INSIDER, "assigned"), (OUTSIDER, "assigned")):
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role, "
                "matter_scope) VALUES (%s, %s, 'lawyer', %s)",
                (org, user, scope),
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
            "matter_type": "civil",
            "billing_type": "hourly",
            "responsible_user": OWNER,
            "opened_date": "2026-01-05",
            "staff": [INSIDER],
        },
    ).json()
    return {"org": org, "client_id": client_id, "matter": matter["id"]}


class TestTheListIsFiltered:
    def test_an_outsider_sees_no_cases(self, client, firm):
        act_as(OUTSIDER)
        assert client.get(f"/api/orgs/{firm['org']}/matters").json() == []

    def test_someone_on_the_case_sees_it(self, client, firm):
        act_as(INSIDER)
        rows = client.get(f"/api/orgs/{firm['org']}/matters").json()
        assert [r["id"] for r in rows] == [firm["matter"]]

    def test_an_owner_sees_everything(self, client, firm):
        rows = client.get(f"/api/orgs/{firm['org']}/matters").json()
        assert len(rows) == 1

    def test_an_unrestricted_lawyer_sees_everything(self, client, conn, firm):
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE memberships SET matter_scope = 'all' "
                "WHERE organization_id = %s AND clerk_user_id = %s",
                (firm["org"], OUTSIDER),
            )
        conn.commit()
        act_as(OUTSIDER)
        assert len(client.get(f"/api/orgs/{firm['org']}/matters").json()) == 1


class TestTheIdIsNotAWayIn:
    """The half that actually matters. Each of these was reachable before."""

    def test_the_case_itself(self, client, firm):
        act_as(OUTSIDER)
        assert (
            client.get(f"/api/orgs/{firm['org']}/matters/{firm['matter']}").status_code
            == 404
        )

    def test_a_document_filed_on_it(self, client, firm):
        doc = client.post(
            f"/api/orgs/{firm['org']}/documents",
            files={"file": ("مذكرة.pdf", b"%PDF-1.4 stub", "application/pdf")},
            params={"matter_id": firm["matter"]},
        )
        assert doc.status_code == 201, doc.text
        document_id = doc.json()["id"]

        act_as(OUTSIDER)
        assert (
            client.get(
                f"/api/orgs/{firm['org']}/documents/{document_id}"
            ).status_code
            == 404
        )

    def test_the_bytes_of_that_document(self, client, firm):
        """404 on the metadata is no use if the file itself still streams."""
        document_id = client.post(
            f"/api/orgs/{firm['org']}/documents",
            files={"file": ("عقد.pdf", b"%PDF-1.4 stub", "application/pdf")},
            params={"matter_id": firm["matter"]},
        ).json()["id"]

        act_as(OUTSIDER)
        assert (
            client.get(
                f"/api/orgs/{firm['org']}/documents/{document_id}/content"
            ).status_code
            == 404
        )

    def test_a_hearing_on_it(self, client, firm):
        hearing_id = client.post(
            f"/api/orgs/{firm['org']}/hearings",
            json={
                "matter_id": firm["matter"],
                "hearing_date": "2026-03-10",
                "court": "محكمة شمال القاهرة الابتدائية",
            },
        ).json()["id"]

        act_as(OUTSIDER)
        assert (
            client.get(f"/api/orgs/{firm['org']}/hearings/{hearing_id}").status_code
            == 404
        )


class TestListsOfDerivedRows:
    def test_documents_are_filtered(self, client, firm):
        client.post(
            f"/api/orgs/{firm['org']}/documents",
            files={"file": ("مذكرة.pdf", b"%PDF-1.4 stub", "application/pdf")},
            params={"matter_id": firm["matter"]},
        )
        act_as(OUTSIDER)
        assert client.get(f"/api/orgs/{firm['org']}/documents").json() == []

    def test_hearings_are_filtered(self, client, firm):
        client.post(
            f"/api/orgs/{firm['org']}/hearings",
            json={"matter_id": firm["matter"], "hearing_date": "2026-03-10"},
        )
        act_as(OUTSIDER)
        assert client.get(f"/api/orgs/{firm['org']}/hearings").json() == []

    def test_search_cannot_reach_past_the_scope(self, client, firm):
        """A filter is not a search-proof boundary unless search honours it."""
        client.post(
            f"/api/orgs/{firm['org']}/hearings",
            json={
                "matter_id": firm["matter"],
                "hearing_date": "2026-03-10",
                "court": "محكمة شمال القاهرة الابتدائية",
            },
        )
        act_as(OUTSIDER)
        rows = client.get(
            f"/api/orgs/{firm['org']}/hearings", params={"q": "القاهرة"}
        ).json()
        assert rows == []


class TestFirmWideRowsStayVisible:
    def test_a_document_on_no_case_is_still_the_firms(self, client, firm):
        """The restriction is on cases, not on everything the firm holds."""
        client.post(
            f"/api/orgs/{firm['org']}/documents",
            files={"file": ("قالب.pdf", b"%PDF-1.4 stub", "application/pdf")},
        )
        act_as(OUTSIDER)
        rows = client.get(f"/api/orgs/{firm['org']}/documents").json()
        assert len(rows) == 1
        assert rows[0]["matter_id"] is None


class TestSettingTheScope:
    def test_an_owner_cannot_be_restricted(self, client, conn, firm):
        """Whoever can change everyone's access can lift their own."""
        from legalrag.orgs import set_matter_scope

        with pytest.raises(ValueError):
            set_matter_scope(conn, firm["org"], OWNER, "assigned")

    def test_an_unknown_scope_is_refused(self, client, conn, firm):
        from legalrag.orgs import set_matter_scope

        with pytest.raises(ValueError):
            set_matter_scope(conn, firm["org"], INSIDER, "sometimes")

    def test_opening_someone_up_takes_effect(self, client, conn, firm):
        from legalrag.orgs import set_matter_scope

        set_matter_scope(conn, firm["org"], OUTSIDER, "all")
        act_as(OUTSIDER)
        assert len(client.get(f"/api/orgs/{firm['org']}/matters").json()) == 1

    def test_existing_members_were_not_locked_out_by_the_migration(self, client, conn):
        """0011 defaults new rows closed but sets every existing one open.

        A security change that silently removes access people already had is
        an outage wearing a better name.
        """
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM memberships WHERE matter_scope IS NULL")
            assert cur.fetchone()[0] == 0
