"""Route tests for the matter-workspace pillars added in 0007.

Matter numbering, contacts on a matter, expenses, the communications log, the
client portal and its secure messages, the client-funds ledger, custom fields
and conflict checks.

Same shape as test_practice_api.py: a real Postgres, only get_current_user_id
faked, so the tenant gate on every route runs for real.
"""
from __future__ import annotations

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id

OWNER = "user_owner"


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
def org(client):
    return client.post("/api/orgs", json={"name": "Workspace Firm"}).json()["id"]


def make_client(client, org, **overrides):
    body = {"name": "Nile Trading Co.", "client_type": "company"} | overrides
    response = client.post(f"/api/orgs/{org}/clients", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def make_matter(client, org, client_id, **overrides):
    body = {
        "client_id": client_id,
        "name": "Nabil v. Nile Trading",
        "matter_type": "civil",
        "billing_type": "hourly",
        "responsible_user": OWNER,
        "opened_date": "2026-01-05",
    } | overrides
    response = client.post(f"/api/orgs/{org}/matters", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def make_contact(client, org, client_id, **overrides):
    body = {"name": "Hala Mansour", "title": "Finance Director"} | overrides
    response = client.post(f"/api/orgs/{org}/clients/{client_id}/contacts", json=body)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def matter(client, org):
    return make_matter(client, org, make_client(client, org)["id"])


class TestMatterNumbering:
    def test_numbers_run_in_sequence_per_firm(self, client, org):
        client_id = make_client(client, org)["id"]
        first = make_matter(client, org, client_id)
        second = make_matter(client, org, client_id, name="Second")

        assert first["matter_number"] == "00001"
        assert second["matter_number"] == "00002"
        assert second["number_seq"] == 2

    def test_display_number_can_be_rewritten_without_moving_the_series(
        self, client, org
    ):
        client_id = make_client(client, org)["id"]
        first = make_matter(client, org, client_id)

        renamed = client.patch(
            f"/api/orgs/{org}/matters/{first['id']}",
            json={"matter_number": "LIT-2026-A"},
        )
        assert renamed.status_code == 200
        assert renamed.json()["matter_number"] == "LIT-2026-A"

        # The next matter still takes 00002: the ordinal drives the series, not
        # whatever the display string was rewritten to.
        assert make_matter(client, org, client_id, name="Next")["matter_number"] == "00002"

    def test_duplicate_copies_the_shape_but_not_the_work(self, client, org, matter):
        client.post(
            f"/api/orgs/{org}/time-entries",
            json={"matter_id": matter["id"], "entry_date": "2026-02-01", "hours": 3},
        )
        copy = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/duplicate",
            json={"name": "Nabil v. Nile Trading (phase 2)"},
        )
        assert copy.status_code == 201, copy.text
        copied = copy.json()

        assert copied["matter_number"] == "00002"
        assert copied["client_id"] == matter["client_id"]
        assert copied["matter_type"] == matter["matter_type"]
        # The source's logged time stays on the source.
        entries = client.get(
            f"/api/orgs/{org}/time-entries?matter_id={copied['id']}"
        ).json()
        assert entries == []


class TestMatterContacts:
    def test_add_linked_contact_inherits_its_details(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        contact = make_contact(client, org, client_id, email="hala@nile.example")

        response = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/contacts",
            json={"contact_id": contact["id"], "relationship": "Client"},
        )
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["name"] == "Hala Mansour"
        assert body["email"] == "hala@nile.example"
        assert body["client_name"] == "Nile Trading Co."

    def test_external_party_needs_its_own_name(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/contacts",
            json={"relationship": "Opposing counsel"},
        )
        assert response.status_code == 422

    def test_bill_recipient_moves_rather_than_duplicating(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        first = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/contacts",
            json={"name": "Hala Mansour", "is_bill_recipient": True},
        ).json()
        second = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/contacts",
            json={"name": "Omar Fathy", "is_bill_recipient": True},
        )
        assert second.status_code == 201, second.text

        listed = client.get(f"/api/orgs/{org}/matters/{matter['id']}/contacts").json()
        recipients = [c["name"] for c in listed if c["is_bill_recipient"]]
        assert recipients == ["Omar Fathy"]
        assert first["id"] in [c["id"] for c in listed]

    def test_same_contact_cannot_be_attached_twice(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        contact = make_contact(client, org, client_id)
        path = f"/api/orgs/{org}/matters/{matter['id']}/contacts"

        assert client.post(path, json={"contact_id": contact["id"]}).status_code == 201
        assert client.post(path, json={"contact_id": contact["id"]}).status_code == 409


class TestExpenses:
    def test_amount_is_derived_from_quantity_and_rate(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/expenses",
            json={
                "matter_id": matter["id"],
                "entry_date": "2026-02-10",
                "category": "court_fees",
                "quantity": 3,
                "unit_amount": 250,
                "description": "Filing fees",
            },
        )
        assert response.status_code == 201, response.text
        assert float(response.json()["amount"]) == 750.0

    def test_summary_separates_billable_from_unbilled(self, client, org, matter):
        for payload in (
            {"unit_amount": 500, "billable": True},
            {"unit_amount": 200, "billable": False},
        ):
            client.post(
                f"/api/orgs/{org}/expenses",
                json={
                    "matter_id": matter["id"],
                    "entry_date": "2026-02-10",
                    **payload,
                },
            )
        summary = client.get(
            f"/api/orgs/{org}/expenses/summary?matter_id={matter['id']}"
        ).json()
        assert float(summary["total_amount"]) == 700.0
        assert float(summary["billable_amount"]) == 500.0
        assert float(summary["unbilled_amount"]) == 500.0

    def test_generated_invoice_bills_time_and_expenses_together(
        self, client, org, matter
    ):
        client.post(
            f"/api/orgs/{org}/time-entries",
            json={
                "matter_id": matter["id"],
                "entry_date": "2026-02-01",
                "hours": 2,
                "rate": 1000,
            },
        )
        client.post(
            f"/api/orgs/{org}/expenses",
            json={
                "matter_id": matter["id"],
                "entry_date": "2026-02-02",
                "unit_amount": 500,
                "category": "filing",
            },
        )
        invoice = client.post(
            f"/api/orgs/{org}/invoices/generate", json={"matter_id": matter["id"]}
        )
        assert invoice.status_code == 201, invoice.text
        body = invoice.json()
        assert float(body["amount"]) == 2500.0
        assert len(body["lines"]) == 2

    def test_a_billed_expense_is_frozen(self, client, org, matter):
        expense = client.post(
            f"/api/orgs/{org}/expenses",
            json={
                "matter_id": matter["id"],
                "entry_date": "2026-02-02",
                "unit_amount": 500,
            },
        ).json()
        client.post(
            f"/api/orgs/{org}/invoices/generate", json={"matter_id": matter["id"]}
        )
        response = client.patch(
            f"/api/orgs/{org}/expenses/{expense['id']}", json={"unit_amount": 900}
        )
        assert response.status_code == 404


class TestCommunications:
    def test_logging_on_a_matter_fills_in_the_client(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/communications",
            json={
                "channel": "phone",
                "direction": "outgoing",
                "occurred_at": "2026-02-11T10:30:00Z",
                "matter_id": matter["id"],
                "counterparty": "Hala Mansour",
                "duration_minutes": 12,
            },
        )
        assert response.status_code == 201, response.text
        assert response.json()["client_id"] == matter["client_id"]

    def test_an_email_cannot_carry_a_duration(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/communications",
            json={
                "channel": "email",
                "direction": "incoming",
                "occurred_at": "2026-02-11T10:30:00Z",
                "matter_id": matter["id"],
                "duration_minutes": 5,
            },
        )
        assert response.status_code == 422

    def test_filters_by_channel_and_search_text(self, client, org, matter):
        for channel, subject in (("phone", "Fee estimate"), ("email", "Draft claim")):
            client.post(
                f"/api/orgs/{org}/communications",
                json={
                    "channel": channel,
                    "direction": "outgoing",
                    "occurred_at": "2026-02-11T10:30:00Z",
                    "matter_id": matter["id"],
                    "subject": subject,
                },
            )
        base = f"/api/orgs/{org}/communications?matter_id={matter['id']}"
        assert len(client.get(f"{base}&channel=email").json()) == 1
        assert len(client.get(f"{base}&q=estimate").json()) == 1


class TestClientPortal:
    def test_invite_then_reinvite_updates_one_grant(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        contact = make_contact(client, org, client_id)
        path = f"/api/orgs/{org}/matters/{matter['id']}/portals"

        first = client.post(path, json={"contact_id": contact["id"]})
        assert first.status_code == 201, first.text
        second = client.post(
            path, json={"contact_id": contact["id"], "can_view_bills": True}
        )
        assert second.status_code == 201
        assert second.json()["id"] == first.json()["id"]
        assert second.json()["can_view_bills"] is True

        listed = client.get(f"/api/orgs/{org}/portals?matter_id={matter['id']}").json()
        assert len(listed) == 1

    def test_revoking_records_when(self, client, org):
        client_id = make_client(client, org)["id"]
        matter = make_matter(client, org, client_id)
        contact = make_contact(client, org, client_id)
        portal = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/portals",
            json={"contact_id": contact["id"]},
        ).json()

        revoked = client.patch(
            f"/api/orgs/{org}/portals/{portal['id']}", json={"status": "revoked"}
        )
        assert revoked.status_code == 200, revoked.text
        assert revoked.json()["revoked_at"] is not None

    def test_thread_starts_with_its_first_message(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/threads",
            json={"subject": "Hearing date", "body": "The hearing moved to 3 March."},
        )
        assert response.status_code == 201, response.text
        thread = response.json()
        assert thread["message_count"] == 1
        assert thread["messages"][0]["author_kind"] == "firm"

        client.post(
            f"/api/orgs/{org}/threads/{thread['id']}/messages",
            json={"body": "Noted, thank you."},
        )
        reloaded = client.get(f"/api/orgs/{org}/matters/{matter['id']}/threads").json()
        assert reloaded[0]["message_count"] == 2


class TestClientFunds:
    def _account(self, client, org):
        response = client.post(
            f"/api/orgs/{org}/trust-accounts", json={"name": "Client account"}
        )
        assert response.status_code == 201, response.text
        return response.json()

    def test_first_account_becomes_the_default(self, client, org):
        assert self._account(client, org)["is_default"] is True

    def test_deposit_then_withdrawal_moves_the_balance(self, client, org, matter):
        self._account(client, org)
        for kind, amount in (("deposit", 10000), ("withdrawal", 2500)):
            response = client.post(
                f"/api/orgs/{org}/trust-transactions",
                json={
                    "matter_id": matter["id"],
                    "kind": kind,
                    "amount": amount,
                    "transaction_date": "2026-02-12",
                },
            )
            assert response.status_code == 201, response.text

        balance = client.get(
            f"/api/orgs/{org}/matters/{matter['id']}/trust-balance"
        ).json()
        assert float(balance["balance"]) == 7500.0
        assert float(balance["deposits"]) == 10000.0

    def test_cannot_pay_out_more_than_is_held(self, client, org, matter):
        self._account(client, org)
        client.post(
            f"/api/orgs/{org}/trust-transactions",
            json={
                "matter_id": matter["id"],
                "kind": "deposit",
                "amount": 1000,
                "transaction_date": "2026-02-12",
            },
        )
        response = client.post(
            f"/api/orgs/{org}/trust-transactions",
            json={
                "matter_id": matter["id"],
                "kind": "withdrawal",
                "amount": 5000,
                "transaction_date": "2026-02-13",
            },
        )
        assert response.status_code == 409
        assert "will not cover" in response.json()["detail"]

    def test_an_invoice_payment_must_name_its_invoice(self, client, org, matter):
        self._account(client, org)
        client.post(
            f"/api/orgs/{org}/trust-transactions",
            json={
                "matter_id": matter["id"],
                "kind": "deposit",
                "amount": 1000,
                "transaction_date": "2026-02-12",
            },
        )
        response = client.post(
            f"/api/orgs/{org}/trust-transactions",
            json={
                "matter_id": matter["id"],
                "kind": "invoice_payment",
                "amount": 100,
                "transaction_date": "2026-02-13",
            },
        )
        assert response.status_code == 409


class TestCustomFields:
    def _define(self, client, org, **overrides):
        body = {
            "field_key": "referral_source",
            "label": "Referral source",
            "field_type": "text",
        } | overrides
        return client.post(f"/api/orgs/{org}/custom-fields", json=body)

    def test_a_select_field_needs_options(self, client, org):
        assert self._define(client, org, field_type="select").status_code == 422
        ok = self._define(
            client,
            org,
            field_key="risk",
            field_type="select",
            options=["low", "high"],
        )
        assert ok.status_code == 201, ok.text

    def test_definitions_appear_on_a_matter_before_they_are_filled_in(
        self, client, org, matter
    ):
        definition = self._define(client, org).json()
        values = client.get(
            f"/api/orgs/{org}/matters/{matter['id']}/custom-fields"
        ).json()
        assert [v["definition_id"] for v in values] == [definition["id"]]
        assert values[0]["value"] is None

    def test_value_is_validated_against_its_type(self, client, org, matter):
        definition = self._define(
            client, org, field_key="filed_on", label="Filed on", field_type="date"
        ).json()
        path = (
            f"/api/orgs/{org}/matters/{matter['id']}/custom-fields/{definition['id']}"
        )
        assert client.put(path, json={"value": "not a date"}).status_code == 422
        good = client.put(path, json={"value": "2026-03-01"})
        assert good.status_code == 200
        assert good.json()["value"] == "2026-03-01"

    def test_a_field_scoped_to_another_matter_type_does_not_appear(
        self, client, org, matter
    ):
        self._define(client, org, field_key="vat_no", matter_type="tax")
        values = client.get(
            f"/api/orgs/{org}/matters/{matter['id']}/custom-fields"
        ).json()
        assert values == []

    def test_clearing_a_value_removes_it(self, client, org, matter):
        definition = self._define(client, org).json()
        path = (
            f"/api/orgs/{org}/matters/{matter['id']}/custom-fields/{definition['id']}"
        )
        client.put(path, json={"value": "Referred by counsel"})
        cleared = client.put(path, json={"value": ""})
        assert cleared.json()["value"] is None


class TestConflictChecks:
    def test_a_clean_search_records_clear(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/conflict-checks",
            json={"terms": ["Nobody At All"]},
        )
        assert response.status_code == 201, response.text
        assert response.json()["check"]["result"] == "clear"
        assert response.json()["hits"] == []

    def test_an_existing_client_surfaces_as_a_hit(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/conflict-checks",
            json={"terms": ["Nile Trading"]},
        )
        body = response.json()
        assert body["check"]["result"] == "potential_conflict"
        assert body["hits"][0]["kind"] == "client"
        assert body["hits"][0]["matched_term"] == "Nile Trading"

    def test_an_opposing_party_on_another_matter_surfaces(self, client, org, matter):
        other = make_matter(
            client, org, matter["client_id"], name="Unrelated corporate work"
        )
        client.post(
            f"/api/orgs/{org}/cases",
            json={
                "matter_id": other["id"],
                "court": "Cairo Economic Court",
                "case_number": "1234/2026",
                "filed_date": "2026-01-20",
                "opposing_party": "Delta Foods LLC",
            },
        )
        body = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/conflict-checks",
            json={"terms": ["Delta Foods"]},
        ).json()
        assert [h["kind"] for h in body["hits"]] == ["opposing_party"]

    def test_a_lawyer_can_overrule_the_search(self, client, org, matter):
        check = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/conflict-checks",
            json={"terms": ["Nile Trading"]},
        ).json()["check"]

        resolved = client.post(
            f"/api/orgs/{org}/conflict-checks/{check['id']}/resolve",
            json={"result": "clear", "notes": "Same client, not an adverse party."},
        )
        assert resolved.status_code == 200, resolved.text
        assert resolved.json()["result"] == "clear"
        assert resolved.json()["cleared_by"] == OWNER
        # The search's own finding stays on the record.
        assert "Nile Trading" in resolved.json()["hit_summary"]

    def test_empty_terms_are_rejected(self, client, org, matter):
        response = client.post(
            f"/api/orgs/{org}/matters/{matter['id']}/conflict-checks",
            json={"terms": ["  "]},
        )
        assert response.status_code == 422
