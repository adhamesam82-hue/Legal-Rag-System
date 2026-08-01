"""Shared database fixtures.

Cleanup here is scoped to the organizations a test actually created, rather
than truncating the org tables. Practice tables (migration 0006) reference
organizations ON DELETE CASCADE, so a blanket `DELETE FROM organizations` in a
teardown would take every seeded client, matter, case and invoice with it --
running the test suite would silently empty a working database.
"""
from __future__ import annotations

import pytest


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
