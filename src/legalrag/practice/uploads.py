"""Upload policy: how big a document may be, what it may be, and how it is served back.

Three separate decisions live here rather than inline in the route, because each
one is a security boundary and each is worth testing on its own.

  * size -- read in chunks and stop at the ceiling from
    config.get_max_upload_bytes(). `await file.read()` with no
    limit loads the whole upload into memory, so a single large POST is enough
    to kill the process on a small box.
  * type -- the browser-supplied content type is attacker-controlled, so it is
    never trusted. The extension decides, and anything unrecognised is stored
    and served as an opaque download rather than rejected outright: a firm's
    own file formats are not something this module should be opinionated about.
  * serving -- the stored type is only echoed back when it is on a list known
    to be inert in a browser. Everything else is served as a download.

The serving rule is what closes the stored-XSS hole: before it, an uploaded
`.html` came back `inline` with `text/html`, so it ran as a page on the API's
own origin.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote

# Extension -> stored content type. The list is deliberately about what a law
# firm actually files: documents, spreadsheets, scans, photographs of evidence.
_TYPE_BY_SUFFIX = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".rtf": "application/rtf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".zip": "application/zip",
}

OPAQUE_TYPE = "application/octet-stream"

# Types the browser may render in place. Everything outside this set is sent as
# a download regardless of what is stored, so an uploaded document can never
# execute on this origin. Note what is absent and must stay absent: text/html,
# image/svg+xml (scriptable), and anything text/* other than plain.
_INLINE_SAFE = frozenset(
    {
        "application/pdf",
        "text/plain",
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
    }
)


class UploadTooLarge(Exception):
    """Raised when an upload exceeds the configured ceiling."""

    def __init__(self, limit: int) -> None:
        super().__init__(f"upload exceeds the {limit} byte limit")
        self.limit = limit


def content_type_for(filename: str) -> str:
    """The type to STORE for this file, from its extension only.

    The client's own `content_type` is not consulted: it is set by whoever is
    uploading, and trusting it is what turned an .html upload into a page that
    ran on this origin.
    """
    return _TYPE_BY_SUFFIX.get(Path(filename or "").suffix.lower(), OPAQUE_TYPE)


def is_inline_safe(content_type: str) -> bool:
    return content_type in _INLINE_SAFE


def doc_type_for(filename: str) -> str:
    """The short label shown in the documents list, e.g. "PDF"."""
    suffix = Path(filename or "").suffix.lstrip(".")
    return suffix.upper() if suffix else "FILE"


@dataclass(frozen=True)
class ServeHeaders:
    media_type: str
    headers: dict[str, str]


def serve_headers(filename: str, content_type: str) -> ServeHeaders:
    """Headers that let a document be shown or saved, but never executed.

    `nosniff` matters as much as the type itself: without it a browser is free
    to ignore `application/octet-stream` and sniff the bytes back to text/html.
    """
    disposition = "inline" if is_inline_safe(content_type) else "attachment"
    media_type = content_type if is_inline_safe(content_type) else OPAQUE_TYPE
    return ServeHeaders(
        media_type=media_type,
        headers={
            "Content-Disposition": _disposition(disposition, filename),
            "X-Content-Type-Options": "nosniff",
        },
    )


def _disposition(kind: str, filename: str) -> str:
    """A Content-Disposition value that survives an Arabic filename.

    Two forms, per RFC 6266: a sanitised ASCII `filename` that any client can
    read, and a percent-encoded `filename*` that carries the real name. A bare
    `filename="مذكرة.pdf"` is not valid in a header and clients mangle it.
    """
    stem = Path(filename or "").stem
    suffix = Path(filename or "").suffix
    ascii_stem = "".join(c for c in stem if 32 <= ord(c) < 127)
    ascii_stem = ascii_stem.replace('"', "").replace("\\", "").strip()
    # An all-Arabic name leaves nothing behind, and a fallback of ".pdf" is
    # worse than useless on a client that cannot read filename*.
    ascii_name = f"{ascii_stem or 'document'}{suffix if suffix.isascii() else ''}"
    encoded = quote(filename or "document", safe="")
    return f"{kind}; filename=\"{ascii_name}\"; filename*=UTF-8''{encoded}"


async def read_capped(file, limit: int) -> bytes:
    """Read an UploadFile, raising UploadTooLarge instead of exceeding `limit`.

    Chunked so that an oversized upload costs one chunk of memory rather than
    its full size -- the point is to refuse it without first holding it.
    """
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise UploadTooLarge(limit)
        chunks.append(chunk)
    return b"".join(chunks)


# --- logos --------------------------------------------------------------------
#
# A logo is narrower than a document: only an image, only small, and the type
# is decided by the bytes rather than the name. content_type_for() trusts the
# extension because a document's format is the firm's business and an
# unrecognised one is served as an opaque download anyway. A logo is served
# inline as an image on this origin, so a file called logo.png whose bytes are
# HTML must never get that far -- that is the stored-XSS class T-003 closed.
#
# SVG is refused, not sanitised. It can carry <script> and the safe-serving
# headers for a document (download, nosniff) are exactly the ones a logo
# cannot have, since the point of a logo is to render in place.

LOGO_MAX_BYTES = 2 * 1024 * 1024

# Magic bytes -> (content type, extension). WebP is RIFF....WEBP.
_IMAGE_SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
)


class LogoRejected(Exception):
    """The upload is not an image this system will serve as a logo."""


def sniff_image(content: bytes) -> tuple[str, str]:
    """(content type, extension) from the file's own bytes, or LogoRejected.

    Deliberately blind to the filename and to any client-supplied type.
    """
    for magic, content_type, suffix in _IMAGE_SIGNATURES:
        if content.startswith(magic):
            return content_type, suffix
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp", ".webp"
    raise LogoRejected("not a PNG, JPEG or WebP image")
