"""T-027: the settings columns (0025), their validation, and who may write them.

Validation is tested without a database; the routes and the numbering
pattern against Postgres, in the style of tests/test_orgs_api.py.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag import orgs
from legalrag.api import app
from legalrag.clerk import get_current_user_id

OWNER = "user_owner"
LAWYER = "user_lawyer"


# --- validation, no database --------------------------------------------------


class TestValidation:
    def test_locale_is_ar_or_en(self):
        assert orgs.validate_settings({"locale": "en"}) == {"locale": "en"}
        with pytest.raises(ValueError):
            orgs.validate_settings({"locale": "fr"})

    def test_tax_rate_is_a_fraction(self):
        assert orgs.validate_settings({"default_tax_rate": "0.14"})["default_tax_rate"] == Decimal("0.14")
        with pytest.raises(ValueError):
            orgs.validate_settings({"default_tax_rate": 1.5})
        with pytest.raises(ValueError):
            orgs.validate_settings({"default_tax_rate": -0.1})

    def test_payment_terms_cannot_be_negative(self):
        assert orgs.validate_settings({"default_payment_terms_days": 0}) == {"default_payment_terms_days": 0}
        with pytest.raises(ValueError):
            orgs.validate_settings({"default_payment_terms_days": -1})

    def test_brand_color_is_a_palette_name_not_a_hex(self):
        orgs.validate_settings({"brand_color": "teal"})
        with pytest.raises(ValueError):
            orgs.validate_settings({"brand_color": "#00aa88"})

    def test_timezone_must_exist(self):
        orgs.validate_settings({"timezone": "Africa/Cairo"})
        orgs.validate_settings({"timezone": "Europe/London"})
        with pytest.raises(ValueError):
            orgs.validate_settings({"timezone": "Mars/Olympus"})

    def test_currency_is_a_three_letter_code(self):
        orgs.validate_settings({"default_currency": "USD"})
        for bad in ("usd", "EG", "EGPP", "E1P"):
            with pytest.raises(ValueError):
                orgs.validate_settings({"default_currency": bad})

    def test_closed_lists(self):
        for key, good, bad in (
            ("date_format", "YYYY-MM-DD", "MM/DD/YYYY"),
            ("firm_size", "solo", "huge"),
            ("client_kind", "mixed", "governments"),
        ):
            orgs.validate_settings({key: good})
            with pytest.raises(ValueError):
                orgs.validate_settings({key: bad})

    def test_required_fields_have_a_closed_shape(self):
        assert orgs.validate_required_fields({"matter": ["budget_amount", "budget_amount"], "client": []}) == {
            "matter": ["budget_amount"], "client": [],
        }
        for bad in (
            {"nonsense": []},
            {"matter": ["name"]},  # already required; not a choice
            {"matter": "budget_amount"},
            [],
        ):
            with pytest.raises(ValueError):
                orgs.validate_required_fields(bad)

    def test_invoice_pattern_must_end_with_seq(self):
        orgs.validate_invoice_number_pattern("INV-{year}-{seq}")
        orgs.validate_invoice_number_pattern("ف/{seq}")
        for bad in ("INV-{seq}-{year}", "INV-{year}", "{seq}{seq}", "{client}-{seq}"):
            with pytest.raises(ValueError):
                orgs.validate_invoice_number_pattern(bad)


# --- the routes ---------------------------------------------------------------


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
    return client.post("/api/orgs", json={"name": "Settings Firm"}).json()["id"]


def patch(client, org, **body):
    return client.patch(f"/api/orgs/{org}", json=body)


class TestSettingsRoutes:
    def test_a_new_firm_reads_back_with_defaults(self, client, org):
        body = client.get(f"/api/orgs/{org}").json()
        assert body["locale"] == "ar"
        assert body["timezone"] == "Africa/Cairo"
        assert body["default_currency"] == "EGP"
        assert body["date_format"] == "DD/MM/YYYY"
        assert Decimal(str(body["default_tax_rate"])) == 0
        assert body["default_payment_terms_days"] == 30
        assert body["required_fields"] == {}
        assert body["governorate"] is None and body["brand_color"] is None

    def test_every_column_saves_and_comes_back(self, client, org):
        sent = {
            "governorate": "القاهرة", "main_court": "محكمة شمال القاهرة الابتدائية",
            "firm_size": "small", "client_kind": "mixed",
            "legal_name": "مكتب السيد وشركاه للمحاماة", "tax_id": "123-456-789",
            "bar_number": "12345", "website": "https://example.eg", "brand_color": "teal",
            "locale": "en", "timezone": "Europe/London", "date_format": "YYYY-MM-DD",
            "default_currency": "USD", "invoice_number_pattern": "ف-{year}/{seq}",
            "default_tax_rate": "0.14", "default_payment_terms_days": 45,
            "required_fields": {"matter": ["budget_amount"], "client": ["tax_id", "email"]},
        }
        response = patch(client, org, **sent)
        assert response.status_code == 200, response.text
        fetched = client.get(f"/api/orgs/{org}").json()
        for key, value in sent.items():
            got = fetched[key]
            assert (Decimal(str(got)) if key == "default_tax_rate" else got) == (
                Decimal(value) if key == "default_tax_rate" else value
            ), key

    def test_a_partial_patch_leaves_everything_else_alone(self, client, org):
        patch(client, org, name="Firm", registration_number="س.ت 1", phone="0100", address="Cairo")
        response = patch(client, org, governorate="الجيزة", bar_number="777")
        assert response.status_code == 200
        body = client.get(f"/api/orgs/{org}").json()
        assert (body["name"], body["registration_number"], body["phone"], body["address"]) == (
            "Firm", "س.ت 1", "0100", "Cairo",
        )
        assert body["governorate"] == "الجيزة" and body["bar_number"] == "777"

    def test_an_empty_string_clears_a_text_field(self, client, org):
        patch(client, org, governorate="الجيزة")
        patch(client, org, governorate="")
        assert client.get(f"/api/orgs/{org}").json()["governorate"] is None

    @pytest.mark.parametrize(
        "body",
        [
            {"locale": "fr"},
            {"default_tax_rate": "1.5"},
            {"default_payment_terms_days": -1},
            {"required_fields": {"nonsense": []}},
            {"brand_color": "#ff0000"},
            {"timezone": "Mars/Olympus"},
            {"default_currency": "egp"},
            {"invoice_number_pattern": "INV-{year}"},
            {"firm_size": "huge"},
        ],
    )
    def test_bad_values_are_422_with_a_sentence(self, client, org, body):
        response = patch(client, org, **body)
        assert response.status_code == 422, response.text
        assert response.json()["detail"]

    def test_a_lawyer_may_read_but_not_write(self, client, conn, org):
        orgs.add_membership(conn, org, LAWYER, "lawyer")
        app.dependency_overrides[get_current_user_id] = lambda: LAWYER
        assert client.get(f"/api/orgs/{org}").status_code == 200
        assert patch(client, org, governorate="x").status_code == 403

    def test_the_default_tax_rate_never_touches_an_existing_invoice(self, client, org):
        client_id = client.post(f"/api/orgs/{org}/clients", json={"name": "c", "client_type": "company"}).json()["id"]
        invoice = client.post(f"/api/orgs/{org}/invoices", json={
            "client_id": client_id, "issued_date": "2026-01-01", "due_date": "2026-01-31",
            "tax_rate": "0.05", "lines": [{"description": "a", "unit_amount": 100}],
        }).json()
        assert patch(client, org, default_tax_rate="0.14").status_code == 200
        again = client.get(f"/api/orgs/{org}/invoices/{invoice['id']}").json()
        assert Decimal(str(again["tax_rate"])) == Decimal("0.05")
        assert Decimal(str(again["total_amount"])) == Decimal("105")

    def test_the_numbering_pattern_is_read_not_just_stored(self, client, org):
        client_id = client.post(f"/api/orgs/{org}/clients", json={"name": "c", "client_type": "company"}).json()["id"]
        body = {"client_id": client_id, "issued_date": "2026-01-01", "due_date": "2026-01-31"}
        before = client.post(f"/api/orgs/{org}/invoices", json=body).json()["number"]
        assert before == f"INV-{date.today().year}-0001"
        assert patch(client, org, invoice_number_pattern="ف/{year}/{seq}").status_code == 200
        first = client.post(f"/api/orgs/{org}/invoices", json=body).json()["number"]
        second = client.post(f"/api/orgs/{org}/invoices", json=body).json()["number"]
        assert first == f"ف/{date.today().year}/0001"
        assert second == f"ف/{date.today().year}/0002"
