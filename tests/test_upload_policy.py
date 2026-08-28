"""Upload and download policy: size ceiling, stored type, and safe serving.

These are the three security boundaries from T-002 and T-003. They are tested
against the policy module directly rather than through a route, so a failure
points at the rule that broke rather than at HTTP plumbing.
"""
from __future__ import annotations

import asyncio

import pytest

from legalrag.practice import uploads


class FakeUpload:
    """Minimal stand-in for Starlette's UploadFile: async chunked read."""

    def __init__(self, data: bytes) -> None:
        self._data = data
        self._pos = 0

    async def read(self, size: int = -1) -> bytes:
        if size < 0:
            chunk, self._pos = self._data[self._pos:], len(self._data)
            return chunk
        chunk = self._data[self._pos : self._pos + size]
        self._pos += len(chunk)
        return chunk


def run(coro):
    return asyncio.run(coro)


class TestSizeCeiling:
    def test_reads_a_file_under_the_limit(self):
        data = b"x" * 2048
        assert run(uploads.read_capped(FakeUpload(data), 4096)) == data

    def test_reads_a_file_exactly_at_the_limit(self):
        data = b"x" * 4096
        assert run(uploads.read_capped(FakeUpload(data), 4096)) == data

    def test_refuses_a_file_over_the_limit(self):
        with pytest.raises(uploads.UploadTooLarge):
            run(uploads.read_capped(FakeUpload(b"x" * 4097), 4096))

    def test_refusal_names_the_limit(self):
        with pytest.raises(uploads.UploadTooLarge) as excinfo:
            run(uploads.read_capped(FakeUpload(b"x" * 100), 10))
        assert excinfo.value.limit == 10

    def test_stops_before_holding_the_whole_oversized_file(self):
        """The point of the cap is refusing without first buffering it all.

        A 64MB body against a 1MB ceiling must not accumulate 64MB: the reader
        aborts within one chunk of crossing the line.
        """
        huge = FakeUpload(b"x" * (64 * 1024 * 1024))
        with pytest.raises(uploads.UploadTooLarge):
            run(uploads.read_capped(huge, 1024 * 1024))
        # It consumed only enough to know it was over: one chunk past the cap.
        assert huge._pos <= 2 * 1024 * 1024


class TestStoredType:
    def test_extension_decides_not_the_client(self):
        assert uploads.content_type_for("brief.pdf") == "application/pdf"

    def test_unknown_extension_is_opaque(self):
        assert uploads.content_type_for("thing.xyz") == uploads.OPAQUE_TYPE

    def test_html_is_never_stored_as_html(self):
        # The whole point: an .html upload must not carry a type that a browser
        # would render.
        assert uploads.content_type_for("evil.html") == uploads.OPAQUE_TYPE
        assert uploads.content_type_for("evil.htm") == uploads.OPAQUE_TYPE

    def test_svg_is_never_stored_as_an_image(self):
        # SVG is scriptable, so it must not join the renderable image types.
        assert uploads.content_type_for("logo.svg") == uploads.OPAQUE_TYPE

    def test_case_insensitive_extension(self):
        assert uploads.content_type_for("SCAN.PDF") == "application/pdf"

    def test_arabic_filename_keeps_its_extension(self):
        assert uploads.content_type_for("مذكرة.pdf") == "application/pdf"


class TestServing:
    def test_pdf_may_be_shown_in_place(self):
        serve = uploads.serve_headers("brief.pdf", "application/pdf")
        assert serve.media_type == "application/pdf"
        assert serve.headers["Content-Disposition"].startswith("inline")

    def test_html_is_forced_to_download(self):
        # Even if a row somehow carries text/html -- an upload from before this
        # policy existed -- serving must not render it.
        serve = uploads.serve_headers("evil.html", "text/html")
        assert serve.media_type == uploads.OPAQUE_TYPE
        assert serve.headers["Content-Disposition"].startswith("attachment")

    def test_svg_is_forced_to_download(self):
        serve = uploads.serve_headers("x.svg", "image/svg+xml")
        assert serve.headers["Content-Disposition"].startswith("attachment")

    def test_every_response_forbids_sniffing(self):
        for name, ctype in [("a.pdf", "application/pdf"), ("b.html", "text/html")]:
            serve = uploads.serve_headers(name, ctype)
            assert serve.headers["X-Content-Type-Options"] == "nosniff"

    def test_docx_downloads_rather_than_renders(self):
        serve = uploads.serve_headers("عقد.docx", uploads.content_type_for("عقد.docx"))
        assert serve.headers["Content-Disposition"].startswith("attachment")


class TestFilenameHeader:
    def test_arabic_name_is_percent_encoded(self):
        value = uploads.serve_headers("مذكرة.pdf", "application/pdf").headers[
            "Content-Disposition"
        ]
        assert "filename*=UTF-8''" in value
        assert "%D9%85" in value  # first byte of م

    def test_ascii_fallback_is_never_bare_extension(self):
        value = uploads.serve_headers("مذكرة.pdf", "application/pdf").headers[
            "Content-Disposition"
        ]
        assert 'filename="document.pdf"' in value

    def test_header_is_pure_ascii(self):
        # A raw Arabic byte in a header value is not valid and clients mangle it.
        value = uploads.serve_headers("مذكرة.pdf", "application/pdf").headers[
            "Content-Disposition"
        ]
        value.encode("ascii")

    def test_quotes_cannot_break_out_of_the_header(self):
        value = uploads.serve_headers('a".pdf', "application/pdf").headers[
            "Content-Disposition"
        ]
        assert value.count('"') == 2

    def test_empty_name_still_produces_a_filename(self):
        value = uploads.serve_headers("", uploads.OPAQUE_TYPE).headers[
            "Content-Disposition"
        ]
        assert 'filename="document"' in value


class TestDocTypeLabel:
    def test_label_from_extension(self):
        assert uploads.doc_type_for("brief.pdf") == "PDF"

    def test_label_without_extension(self):
        assert uploads.doc_type_for("noext") == "FILE"
