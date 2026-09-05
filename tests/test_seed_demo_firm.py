"""The demo firm seed must survive schema changes.

Nothing ran this script, so it drifted from the schema twice without anyone
noticing, and both breaks were only found by trying to populate staging:

  * migration 0026 added `organizations.trial_ends_at` and made it NOT NULL
    after backfilling. The script INSERTed into `organizations` directly
    instead of going through orgs.create_organization, so it wrote no
    trial_ends_at and could not create a firm at all.
  * migration 0010 renamed `hearings.outcome` to `outcome_note` and added a
    new `outcome` constrained to five values. The script kept writing Arabic
    prose into `outcome`, which the CHECK rejected.

Both are the same failure: a seed that reimplements a write path instead of
calling it. The value of this test is that it runs the real thing end to end
against a real schema -- the assertions below are secondary to the fact that
`seed()` completed without a database error.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]


def load_seed_module():
    """Imports scripts/seed_demo_firm.py, which is a script and not a package."""
    path = REPO_ROOT / "scripts" / "seed_demo_firm.py"
    spec = importlib.util.spec_from_file_location("seed_demo_firm", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def seeded(org_scoped_conn):
    """The demo firm, seeded for real, torn down with the connection."""
    module = load_seed_module()
    org_id = module.seed(org_scoped_conn, owner_clerk_id="test_seed_owner")
    return module, org_scoped_conn, org_id


def test_the_firm_is_created_through_the_real_creation_path(seeded):
    """A seeded firm and a firm made on the create screen are the same shape.

    trial_ends_at is the specific column that broke, but asserting on the
    whole set is the point: whatever create_organization starts a firm with,
    the seed gets too, because it is the same function.
    """
    _, conn, org_id = seeded
    with conn.cursor() as cur:
        cur.execute(
            "SELECT trial_ends_at, plan, specialties FROM organizations WHERE id = %s",
            (org_id,),
        )
        trial_ends_at, plan, specialties = cur.fetchone()

    assert trial_ends_at is not None, "a firm with no trial end cannot be reasoned about"
    assert plan == "trial"
    assert specialties, "the settings screen reads this and would show an empty practice"


def test_default_document_tags_are_planted(seeded):
    """create_organization plants these; the old raw INSERT did not.

    A seeded firm with no tags made the documents screen look broken in a way
    a real firm never would.
    """
    _, conn, org_id = seeded
    with conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM document_tags WHERE organization_id = %s", (org_id,)
        )
        assert cur.fetchone()[0] > 0


def test_the_owner_is_seated_once_with_a_profile(seeded):
    """create_organization seats the Owner; the seed fills in the profile.

    Inserting the Owner a second time would violate the unique constraint on
    (organization_id, clerk_user_id), so the seed must update rather than add.
    """
    _, conn, org_id = seeded
    with conn.cursor() as cur:
        cur.execute(
            "SELECT role, display_name, title, email FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (org_id, "test_seed_owner"),
        )
        rows = cur.fetchall()

    assert len(rows) == 1, "the Owner was seated twice"
    role, display_name, title, email = rows[0]
    assert role == "owner"
    assert display_name and title, "the Owner kept create_organization's empty profile"
    assert email, "no address means the reminder sweep reports this firm every morning"


def test_every_team_member_has_an_address(seeded):
    """The reminder sweep exits 1 for anyone without one, burying a real report."""
    _, conn, org_id = seeded
    with conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM memberships "
            "WHERE organization_id = %s AND coalesce(email, '') = ''",
            (org_id,),
        )
        assert cur.fetchone()[0] == 0


def test_hearing_outcomes_are_the_enum_and_the_prose_is_kept(seeded):
    """Migration 0010 split one column into two, and both are populated.

    The constraint alone would catch a bad `outcome`, since the insert would
    fail. What it cannot catch is the prose being dropped on the floor to get
    past it -- which is the tempting fix and the wrong one.
    """
    _, conn, org_id = seeded
    with conn.cursor() as cur:
        cur.execute(
            "SELECT outcome, outcome_note FROM hearings WHERE organization_id = %s",
            (org_id,),
        )
        rows = cur.fetchall()

    assert rows, "the demo firm has no hearings"

    allowed = {"adjourned", "reserved", "judgment", "struck_out", "joined", "other"}
    for outcome, note in rows:
        assert outcome is None or outcome in allowed

    recorded = [(outcome, note) for outcome, note in rows if outcome is not None]
    assert recorded, "no hearing has an outcome, so this asserts nothing"
    for outcome, note in recorded:
        assert note, f"outcome {outcome!r} kept no note of what the court did"


def test_the_seeded_firm_is_worth_looking_at(seeded):
    """A firm with a trial end and no files teaches nobody anything.

    This is what the script exists for: screens with content behind them.
    """
    _, conn, org_id = seeded
    counts = {}
    for table in ("clients", "matters", "tasks", "invoices", "documents", "hearings"):
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT count(*) FROM {table} WHERE organization_id = %s", (org_id,)
            )
            counts[table] = cur.fetchone()[0]

    empty = [table for table, count in counts.items() if count == 0]
    assert not empty, f"seeded firm has nothing in {empty}"
