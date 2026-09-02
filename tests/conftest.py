"""Shared database fixtures.

Cleanup here is scoped to the organizations a test actually created, rather
than truncating the org tables. Practice tables (migration 0006) reference
organizations ON DELETE CASCADE, so a blanket `DELETE FROM organizations` in a
teardown would take every seeded client, matter, case and invoice with it --
running the test suite would silently empty a working database.
"""
from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    """Every test starts with an empty rate limiter.

    The limiter (legalrag.ratelimit) is in-process and allows 300 requests per
    caller per fixed 60-second window. Every route test shares one caller --
    the TestClient's host -- and on CI the whole suite finishes inside one
    window, so the counter is cumulative across files: once enough tests had
    been added, POST /api/orgs started answering 429 midway through
    test_orgs_api.py and every test after it failed on a missing "id". A
    limit that trips depending on how many tests run before yours is not a
    thing a test should be able to observe.
    """
    from legalrag.ratelimit import reset_limits

    reset_limits()
    yield
    reset_limits()


def connect_or_skip():
    try:
        from legalrag.db import get_connection

        return get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")


def drop_organizations_after(connection, high_water_mark: int) -> None:
    """Removes organizations created after the mark, and their dependants.

    memberships and invitations reference organizations without ON DELETE
    CASCADE, so they are cleared explicitly; everything in 0006 cascades.
    """
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM invitations WHERE organization_id > %s", (high_water_mark,)
        )
        cur.execute(
            "DELETE FROM memberships WHERE organization_id > %s", (high_water_mark,)
        )
        cur.execute("DELETE FROM organizations WHERE id > %s", (high_water_mark,))
    connection.commit()


@pytest.fixture
def org_scoped_conn():
    """A connection whose teardown removes only organizations the test created."""
    connection = connect_or_skip()
    with connection.cursor() as cur:
        cur.execute("SELECT coalesce(max(id), 0) FROM organizations")
        mark = cur.fetchone()[0]
    yield connection
    drop_organizations_after(connection, mark)
    connection.close()
