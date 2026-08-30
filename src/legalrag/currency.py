"""How old this text is, and whether a later law replaced it.

The single most dangerous thing the corpus did was present a superseded law
exactly like a current one. `is_repealed` is read in twelve places and written
in none; the corpus holds Labour Law 12/2003 next to the 14/2025 that replaced
it, unrelated and both live. A lawyer reading the older one sees nothing.

What makes that worse than a hallucination is that it is invisible. An invented
article gets looked up, not found, and the tool loses the reader's trust in the
right direction. A superseded one has the right number, the right year and the
right text -- and the citation-verification machinery in answer.py confirms it,
because it IS in the corpus. The safety mechanism raises confidence in the
wrong answer.

TWO TRUE THINGS THE SYSTEM CAN SAY
----------------------------------
It cannot say which articles survived an amendment -- that needs Gazette-level
tracking nobody has built. It can say:

  1. WHEN this law was fetched, so a reader can judge its age themselves.
     `instruments.fetched_at` has been recorded since 0001 and no screen ever
     showed it. It is per instrument rather than per article, because the
     corpus is ingested a law at a time.
  2. THAT a later instrument replaced this one, where somebody has recorded it
     (migration 0015).

Neither is a claim about a particular article, and both are checkable. That is
the difference between a caveat and a guess, and it is why this is a warning
rather than a repeal flag.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

import psycopg


@dataclass(frozen=True)
class Supersession:
    """A later instrument that replaced this one, wholly or in part."""

    superseding_reference: str
    superseding_title: str
    superseding_id: int | None
    scope: str  # 'full' | 'partial'
    effective_on: date | None
    note: str
    source: str

    @property
    def is_full(self) -> bool:
        return self.scope == "full"


@dataclass(frozen=True)
class Currency:
    """Everything the system honestly knows about how current a text is."""

    fetched_at: datetime | None
    supersessions: list[Supersession]

    @property
    def is_superseded(self) -> bool:
        return bool(self.supersessions)

    @property
    def severity(self) -> str:
        """How loudly a screen should say it.

        'replaced' -- a later law replaced this one entirely. The reader
                      should probably be reading that one instead.
        'amended'  -- partly replaced. The text still applies, in part.
        'dated'    -- nothing recorded against it, but it is a snapshot with a
                      date, and saying so costs nothing and is always true.
        """
        if any(s.is_full for s in self.supersessions):
            return "replaced"
        if self.supersessions:
            return "amended"
        return "dated"


def _rows_to_supersessions(rows) -> list[Supersession]:
    return [
        Supersession(
            superseding_reference=(
                f"{number}/{year}" if number and year else label
            ),
            superseding_title=title or label,
            superseding_id=superseding_id,
            scope=scope,
            effective_on=effective_on,
            note=note,
            source=source,
        )
        for (superseding_id, number, year, title, label, scope, effective_on,
             note, source) in rows
    ]


def for_instrument(conn: psycopg.Connection, instrument_id: int) -> Currency:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT fetched_at FROM instruments WHERE id = %s", (instrument_id,)
        )
        row = cur.fetchone()
        fetched_at = row[0] if row else None

        cur.execute(
            """
            SELECT s.superseding_id, i.number, i.year, i.title,
                   s.superseding_label, s.scope, s.effective_on, s.note, s.source
              FROM instrument_supersessions s
              LEFT JOIN instruments i ON i.id = s.superseding_id
             WHERE s.superseded_id = %s
             ORDER BY s.effective_on NULLS LAST, s.id
            """,
            (instrument_id,),
        )
        return Currency(fetched_at, _rows_to_supersessions(cur.fetchall()))


def for_article(conn: psycopg.Connection, article_id: int) -> Currency:
    """An article inherits its law's fetch date and its supersessions.

    The article is what gets cited, so it is what has to carry the warning --
    a caveat that only appears on the instrument page is one the reader who
    followed a citation never sees.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT instrument_id FROM articles WHERE id = %s", (article_id,))
        row = cur.fetchone()
    if row is None:
        return Currency(None, [])
    return for_instrument(conn, row[0])


def for_instruments(
    conn: psycopg.Connection, instrument_ids: list[int]
) -> dict[int, Currency]:
    """Bulk, for a list screen or a set of retrieved candidates.

    One query rather than one per row: an answer cites up to eight articles and
    a warning that costs eight extra round trips is a warning somebody will
    later remove for being slow.
    """
    if not instrument_ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT s.superseded_id, s.superseding_id, i.number, i.year, i.title,
                   s.superseding_label, s.scope, s.effective_on, s.note, s.source
              FROM instrument_supersessions s
              LEFT JOIN instruments i ON i.id = s.superseding_id
             WHERE s.superseded_id = ANY(%s)
             ORDER BY s.effective_on NULLS LAST, s.id
            """,
            (instrument_ids,),
        )
        grouped: dict[int, list] = {}
        for row in cur.fetchall():
            grouped.setdefault(row[0], []).append(row[1:])

        cur.execute(
            "SELECT id, fetched_at FROM instruments WHERE id = ANY(%s)",
            (instrument_ids,),
        )
        fetched = dict(cur.fetchall())

    return {
        instrument_id: Currency(
            fetched.get(instrument_id), _rows_to_supersessions(grouped.get(instrument_id, []))
        )
        for instrument_id in instrument_ids
    }


def as_dict(currency: Currency) -> dict:
    """Shape for an API response. Always present, even when nothing is wrong.

    A field that appears only when there is a problem is a field the frontend
    forgets to render, and this one has to be impossible to forget.
    """
    return {
        "fetched_at": currency.fetched_at,
        "severity": currency.severity,
        "is_superseded": currency.is_superseded,
        "supersessions": [
            {
                "reference": s.superseding_reference,
                "title": s.superseding_title,
                "instrument_id": s.superseding_id,
                "scope": s.scope,
                "effective_on": s.effective_on,
                "note": s.note,
                "source": s.source,
            }
            for s in currency.supersessions
        ],
    }
