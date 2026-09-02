"""Bringing an existing book of business in. T-022.

The interesting tests are the messy-file ones. A clean CSV importing correctly
proves very little: real firms arrive with Windows-1256 exports, semicolon
delimiters, ambiguous dates and duplicate rows, and the failure that matters
is the quiet one -- a client dropped without anybody being told.
"""
from __future__ import annotations

import json

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.practice import csv_import
from legalrag.ratelimit import reset_limits

OWNER = "user_owner"

CLIENT_MAP = json.dumps(
    {"name": "الاسم", "client_type": "النوع", "email": "البريد", "phone": "الهاتف"}
)
MATTER_MAP = json.dumps(
    {
        "name": "القضية",
        "client_name": "الموكل",
        "matter_type": "النوع",
        "opened_date": "تاريخ الفتح",
    }
)


class TestEncoding:
    def test_reads_utf8(self):
        assert "شركة" in csv_import.decode("شركة دلتا".encode("utf-8"))

    def test_strips_the_excel_bom(self):
        """A BOM left in place becomes part of the first column's name."""
        columns, _ = csv_import.read_rows("الاسم,النوع\nدلتا,company\n".encode("utf-8-sig"))
        assert columns[0] == "الاسم"

    def test_reads_windows_1256(self):
        """Arabic Excel on Windows still exports this routinely."""
        raw = "شركة دلتا".encode("cp1256")
        assert csv_import.decode(raw) == "شركة دلتا"

    def test_utf8_wins_over_1256(self):
        """cp1256 decodes almost any bytes, so order decides correctness."""
        assert csv_import.decode("شركة".encode("utf-8")) == "شركة"

    def test_the_fallback_chain_is_permissive_by_design(self):
        """cp1256 maps almost every byte, so decode() essentially never fails.

        That is the deliberate trade: a firm's export must open rather than
        be refused on a technicality, and a genuinely wrong encoding shows
        up as unreadable names in the PREVIEW -- which is what the preview
        is for. Asserted so nobody later reads the permissiveness as a bug.
        """
        assert csv_import.decode(bytes([0xFF, 0xFE, 0x00, 0xD8]))


class TestDelimiters:
    def test_commas(self):
        columns, rows = csv_import.read_rows(b"name,type\nDelta,company\n")
        assert columns == ["name", "type"] and len(rows) == 1

    def test_semicolons(self):
        """An Arabic-locale export separates with semicolons; the comma is
        the decimal separator there."""
        columns, rows = csv_import.read_rows(
            "الاسم;النوع\nدلتا;company\n".encode("utf-8")
        )
        assert columns == ["الاسم", "النوع"]
        assert rows[0]["الاسم"] == "دلتا"

    def test_a_file_with_no_header_is_refused(self):
        with pytest.raises(csv_import.ImportError_):
            csv_import.read_rows(b"")


class TestDates:
    @pytest.mark.parametrize(
        "value,expected",
        [("2026-03-10", (2026, 3, 10)), ("10/03/2026", (2026, 3, 10)),
         ("10-03-2026", (2026, 3, 10)), ("2026/03/10", (2026, 3, 10))],
    )
    def test_formats_a_spreadsheet_writes(self, value, expected):
        parsed = csv_import._parse_date(value)
        assert (parsed.year, parsed.month, parsed.day) == expected

    def test_nonsense_is_not_guessed(self):
        """Better a named row problem than a case opened in the wrong year."""
        assert csv_import._parse_date("last March") is None


class TestClientPreview:
    def test_counts_what_would_be_created(self):
        raw = "الاسم,النوع\nدلتا,company\nالنيل,individual\n".encode("utf-8")
        preview = csv_import.preview_clients(raw, json.loads(CLIENT_MAP))
        assert len(preview.ready) == 2
        assert preview.problems == []

    def test_a_nameless_row_is_reported_not_dropped(self):
        raw = "الاسم,النوع\n,company\nالنيل,individual\n".encode("utf-8")
        preview = csv_import.preview_clients(raw, json.loads(CLIENT_MAP))
        assert len(preview.ready) == 1
        assert preview.problems[0].reason == "no client name"

    def test_the_row_number_matches_the_spreadsheet(self):
        """Off by one here and the firm looks at the wrong line."""
        raw = "الاسم,النوع\nدلتا,company\n,company\n".encode("utf-8")
        preview = csv_import.preview_clients(raw, json.loads(CLIENT_MAP))
        assert preview.problems[0].row == 3

    def test_a_repeat_inside_the_file_is_caught(self):
        raw = "الاسم,النوع\nدلتا,company\nدلتا,company\n".encode("utf-8")
        preview = csv_import.preview_clients(raw, json.loads(CLIENT_MAP))
        assert len(preview.ready) == 1
        assert "repeated" in preview.problems[0].reason

    def test_an_unknown_type_is_reported(self):
        raw = "الاسم,النوع\nدلتا,شركة\n".encode("utf-8")
        preview = csv_import.preview_clients(raw, json.loads(CLIENT_MAP))
        assert preview.ready == []
        assert "unknown client type" in preview.problems[0].reason

    def test_type_defaults_when_the_column_is_blank(self):
        raw = "الاسم,النوع\nدلتا,\n".encode("utf-8")
        preview = csv_import.preview_clients(raw, json.loads(CLIENT_MAP))
        assert preview.ready[0]["client_type"] == "company"


# --- the routes ------------------------------------------------------------


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
def org(client):
    return client.post("/api/orgs", json={"name": "Test Firm"}).json()["id"]


def upload(client, org, path, body: bytes, mapping: str):
    return client.post(
        f"/api/orgs/{org}/{path}",
        files={"file": ("clients.csv", body, "text/csv")},
        data={"mapping": mapping},
    )


class TestClientImportRoute:
    def test_preview_writes_nothing(self, client, org):
        body = "الاسم,النوع\nدلتا,company\n".encode("utf-8")
        response = upload(client, org, "imports/clients/preview", body, CLIENT_MAP)
        assert response.status_code == 200, response.text
        assert response.json()["ready_count"] == 1
        assert client.get(f"/api/orgs/{org}/clients").json() == []

    def test_import_creates_the_rows(self, client, org):
        body = "الاسم,النوع\nدلتا,company\nالنيل,individual\n".encode("utf-8")
        response = upload(client, org, "imports/clients", body, CLIENT_MAP)
        assert response.status_code == 201, response.text
        assert response.json()["created"] == 2
        assert len(client.get(f"/api/orgs/{org}/clients").json()) == 2

    def test_good_rows_survive_a_bad_one(self, client, org):
        body = "الاسم,النوع\nدلتا,company\n,company\nالنيل,individual\n".encode("utf-8")
        response = upload(client, org, "imports/clients", body, CLIENT_MAP)
        body_json = response.json()
        assert body_json["created"] == 2
        assert body_json["skipped"] == 1
        assert body_json["problems"][0]["row"] == 3

    def test_a_windows_1256_export_imports_intact(self, client, org):
        """The failure this prevents looks like a typing mistake, not a bug."""
        body = "الاسم,النوع\nشركة دلتا للأغذية,company\n".encode("cp1256")
        assert upload(client, org, "imports/clients", body, CLIENT_MAP).json()[
            "created"
        ] == 1
        names = [c["name"] for c in client.get(f"/api/orgs/{org}/clients").json()]
        assert names == ["شركة دلتا للأغذية"]

    def test_a_broken_mapping_is_a_422(self, client, org):
        response = upload(
            client, org, "imports/clients", b"a,b\n1,2\n", "not json"
        )
        assert response.status_code == 422


class TestMatterImportRoute:
    @pytest.fixture
    def with_clients(self, client, org):
        upload(
            client, org, "imports/clients",
            "الاسم,النوع\nشركة دلتا,company\n".encode("utf-8"), CLIENT_MAP,
        )
        return org

    def test_imports_against_an_existing_client(self, client, with_clients):
        body = (
            "القضية,الموكل,النوع,تاريخ الفتح\n"
            "نزاع توريد,شركة دلتا,civil,2026-01-05\n"
        ).encode("utf-8")
        response = upload(client, with_clients, "imports/matters", body, MATTER_MAP)
        assert response.status_code == 201, response.text
        assert response.json()["created"] == 1

    def test_an_unknown_client_is_named_not_invented(self, client, with_clients):
        """Creating the client from a spreadsheet name would duplicate one
        the firm already has under a slightly different spelling."""
        body = (
            "القضية,الموكل,النوع,تاريخ الفتح\n"
            "نزاع,شركة مجهولة,civil,2026-01-05\n"
        ).encode("utf-8")
        response = upload(client, with_clients, "imports/matters", body, MATTER_MAP)
        assert response.json()["created"] == 0
        assert "no client named" in response.json()["problems"][0]["reason"]

    def test_an_unreadable_date_stops_that_row_only(self, client, with_clients):
        body = (
            "القضية,الموكل,النوع,تاريخ الفتح\n"
            "أولى,شركة دلتا,civil,2026-01-05\n"
            "ثانية,شركة دلتا,civil,last March\n"
        ).encode("utf-8")
        response = upload(client, with_clients, "imports/matters", body, MATTER_MAP)
        assert response.json()["created"] == 1
        assert "date not understood" in response.json()["problems"][0]["reason"]

    def test_the_new_egyptian_types_are_accepted(self, client, with_clients):
        body = (
            "القضية,الموكل,النوع,تاريخ الفتح\n"
            "جناية,شركة دلتا,criminal,2026-01-05\n"
            "تنفيذ,شركة دلتا,execution,2026-01-05\n"
        ).encode("utf-8")
        assert upload(
            client, with_clients, "imports/matters", body, MATTER_MAP
        ).json()["created"] == 2

    def test_another_firms_clients_are_not_matchable(self, client, with_clients):
        other = client.post("/api/orgs", json={"name": "Other Firm"}).json()["id"]
        body = (
            "القضية,الموكل,النوع,تاريخ الفتح\n"
            "نزاع,شركة دلتا,civil,2026-01-05\n"
        ).encode("utf-8")
        response = upload(client, other, "imports/matters", body, MATTER_MAP)
        assert response.json()["created"] == 0
