"""Organization/membership tests against a real Postgres.

Skipped when the database is unreachable, matching tests/test_retrieval_db.py.
"""
from __future__ import annotations

import pytest

from legalrag.orgs import (
    LastOwnerError,
    add_membership,
    create_organization,
    get_membership,
    list_memberships_for_user,
    list_org_members,
    remove_membership,
)


@pytest.fixture(scope="module")
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    yield connection
    connection.close()


@pytest.fixture(autouse=True)
def rollback_after_each(conn):
    """Every test starts from a clean slate: nothing committed here should
    leak into the next test, since organizations/memberships are shared
    tables with no per-test isolation otherwise."""
    yield
    conn.rollback()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM invitations")
        cur.execute("DELETE FROM memberships")
        cur.execute("DELETE FROM organizations")
    conn.commit()


class TestCreateOrganization:
    def test_creator_becomes_owner(self, conn):
        org = create_organization(conn, "Test Firm", "user_creator")
        assert org.name == "Test Firm"

        membership = get_membership(conn, org.id, "user_creator")
        assert membership is not None
        assert membership.role == "owner"


class TestMemberships:
    def test_list_memberships_for_user_spans_organizations(self, conn):
        org_a = create_organization(conn, "Firm A", "user_x")
        org_b = create_organization(conn, "Firm B", "user_x")

        memberships = list_memberships_for_user(conn, "user_x")
        org_ids = {m.organization_id for m in memberships}
        assert org_ids == {org_a.id, org_b.id}

    def test_add_membership_rejects_invalid_role(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        with pytest.raises(ValueError):
            add_membership(conn, org.id, "user_new", "partner")

    def test_membership_uniqueness_per_org(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        add_membership(conn, org.id, "user_lawyer", "lawyer")
        with pytest.raises(Exception):  # psycopg raises on the UNIQUE violation
            add_membership(conn, org.id, "user_lawyer", "staff")
        conn.rollback()

    def test_list_org_members(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        add_membership(conn, org.id, "user_lawyer", "lawyer")
        add_membership(conn, org.id, "user_staff", "staff")

        members = list_org_members(conn, org.id)
        roles = {m.clerk_user_id: m.role for m in members}
        assert roles == {
            "user_owner": "owner",
            "user_lawyer": "lawyer",
            "user_staff": "staff",
        }


class TestRemoveMembership:
    def test_removes_a_non_owner(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        add_membership(conn, org.id, "user_lawyer", "lawyer")

        remove_membership(conn, org.id, "user_lawyer")

        assert get_membership(conn, org.id, "user_lawyer") is None

    def test_removing_the_only_owner_is_blocked(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        with pytest.raises(LastOwnerError):
            remove_membership(conn, org.id, "user_owner")

        # Still there -- the operation must not have partially applied.
        assert get_membership(conn, org.id, "user_owner") is not None

    def test_removing_one_of_two_owners_is_allowed(self, conn):
        org = create_organization(conn, "Firm", "user_owner_1")
        add_membership(conn, org.id, "user_owner_2", "owner")

        remove_membership(conn, org.id, "user_owner_1")

        assert get_membership(conn, org.id, "user_owner_1") is None
        assert get_membership(conn, org.id, "user_owner_2") is not None

    def test_removing_a_nonmember_is_a_no_op(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        remove_membership(conn, org.id, "user_never_joined")  # must not raise
