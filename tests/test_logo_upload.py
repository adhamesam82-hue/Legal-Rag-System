"""T-028: the firm logo -- an upload decided on bytes, served on a public path.

The policy is tested directly (no database), the routes against a real
Postgres in the style of tests/test_orgs_api.py.
"""
from __future__ import annotations

import io

import pytest
from conftest import drop_organizations_after
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id
from legalrag.config import get_document_root
from legalrag.practice import uploads

OWNER = "user_owner"
LAWYER = "user_lawyer"
STRANGER = "user_stranger"

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
WEBP = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 64
HTML_AS_PNG = b"<script>alert(1)</script>"


class TestPolicy:
    def test_recognises_the_three_formats_by_bytes(self):
        assert uploads.sniff_image(PNG) == ("image/png", ".png")
        assert uploads.sniff_image(JPEG) == ("image/jpeg", ".jpg")
        assert uploads.sniff_image(WEBP) == ("image/webp", ".webp")

    @pytest.mark.parametrize(
        "content",
        [HTML_AS_PNG, b"%PDF-1.7", b"<svg xmlns='http://www.w3.org/2000/svg'/>", b"", b"GIF89a"],
    )
    def test_everything_else_is_refused_whatever_it_is_called(self, content):
        with pytest.raises(uploads.LogoRejected):
            uploads.sniff_image(content)

    def test_the_ceiling_is_two_megabytes(self):
        assert uploads.LOGO_MAX_BYTES == 2 * 1024 * 1024


# --- routes -------------------------------------------------------------------


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
def client(conn, tmp_path, monkeypatch):
    # Logos land under the document root; keep the test's files out of the
    # real one.
    monkeypatch.setenv("LEGALOS_DOCUMENT_ROOT", str(tmp_path))
    app.dependency_overrides[get_current_user_id] = lambda: OWNER
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user_id, None)


@pytest.fixture
def org(client):
    return client.post("/api/orgs", json={"name": "Logo Firm"}).json()["id"]


def as_user(user_id: str):
    app.dependency_overrides[get_current_user_id] = lambda: user_id


def upload(client, org, content: bytes, name: str = "logo.png"):
    return client.post(
        f"/api/orgs/{org}/logo", files={"file": (name, io.BytesIO(content), "image/png")}
    )


def logo_files() -> list[str]:
    folder = get_document_root() / "logos"
    return sorted(p.name for p in folder.iterdir()) if folder.exists() else []


class TestUpload:
    def test_png_round_trips_to_a_public_url(self, client, org):
        response = upload(client, org, PNG)
        assert response.status_code == 200, response.text
        url = response.json()["logo_url"]
        assert url.startswith("/api/logos/") and url.endswith(".png")
        assert client.get(f"/api/orgs/{org}").json()["logo_url"] == url

        # Served without a token, as an image, with nosniff.
        app.dependency_overrides.pop(get_current_user_id, None)
        served = client.get(url)
        assert served.status_code == 200
        assert served.headers["content-type"] == "image/png"
        assert served.headers["x-content-type-options"] == "nosniff"
        assert served.content == PNG

    def test_the_extension_follows_the_bytes_not_the_name(self, client, org):
        response = upload(client, org, JPEG, name="whatever.png")
        assert response.json()["logo_url"].endswith(".jpg")

    def test_html_named_png_is_refused_on_content(self, client, org):
        response = upload(client, org, HTML_AS_PNG, name="logo.png")
        assert response.status_code == 415
        assert logo_files() == []
        assert client.get(f"/api/orgs/{org}").json()["logo_url"] is None

    def test_pdf_and_svg_are_415(self, client, org):
        assert upload(client, org, b"%PDF-1.7 ...", name="logo.pdf").status_code == 415
        assert upload(client, org, b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", name="logo.svg").status_code == 415

    def test_three_megabytes_is_413_and_names_the_limit(self, client, org):
        response = upload(client, org, PNG + b"\x00" * (3 * 1024 * 1024))
        assert response.status_code == 413
        assert "2MB" in response.json()["detail"]
        assert logo_files() == []

    def test_replacing_deletes_the_previous_file(self, client, org):
        first = upload(client, org, PNG).json()["logo_url"]
        assert len(logo_files()) == 1
        second = upload(client, org, WEBP).json()["logo_url"]
        assert second != first
        files = logo_files()
        assert len(files) == 1 and files[0] == second.removeprefix("/api/logos/")
        app.dependency_overrides.pop(get_current_user_id, None)
        assert client.get(first).status_code == 404
        assert client.get(second).status_code == 200


class TestAccess:
    def test_a_lawyer_gets_403(self, conn, client, org):
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO memberships (organization_id, clerk_user_id, role) VALUES (%s, %s, 'lawyer')",
                (org, LAWYER),
            )
        conn.commit()
        as_user(LAWYER)
        assert upload(client, org, PNG).status_code == 403

    def test_a_stranger_is_refused_before_the_file_is_read(self, client, org):
        # The membership gate answers 403 for a non-member across the whole
        # API (clerk.get_current_membership); this route follows it rather
        # than inventing a second convention. See the PR for the ticket's 404.
        as_user(STRANGER)
        assert upload(client, org, PNG).status_code == 403
        assert logo_files() == []

    @pytest.mark.parametrize("name", ["../../etc/passwd", "1-abc.png", "1-" + "0" * 32 + ".svg", "x.png"])
    def test_serving_admits_only_generated_names(self, client, name):
        app.dependency_overrides.pop(get_current_user_id, None)
        assert client.get(f"/api/logos/{name}").status_code == 404
