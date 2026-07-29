"""Arabic text normalization — single source of truth for indexed text and queries.

Versioned via NORM_VERSION: bump it whenever a rule changes, so every
articles row can record which version produced its article_text_norm.
"""
from __future__ import annotations

import re

NORM_VERSION = "v1"

_DIACRITICS = re.compile(
    r"[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0670]"
)
_TATWEEL = "ـ"

_ALEF_VARIANTS = str.maketrans(
    {
        "أ": "ا",  # أ -> ا
        "إ": "ا",  # إ -> ا
        "آ": "ا",  # آ -> ا
        "ٱ": "ا",  # ٱ -> ا
    }
)

_ARABIC_INDIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
_EASTERN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")

_WHITESPACE = re.compile(r"\s+")


def normalize_digits(text: str) -> str:
    return text.translate(_ARABIC_INDIC_DIGITS).translate(_EASTERN_DIGITS)


def normalize(text: str) -> str:
    text = _DIACRITICS.sub("", text)
    text = text.replace(_TATWEEL, "")
    text = text.translate(_ALEF_VARIANTS)
    text = text.replace("ة", "ه")  # ة -> ه
    text = text.replace("ى", "ي")  # ى -> ي
    text = normalize_digits(text)
    text = _WHITESPACE.sub(" ", text)
    return text.strip()
