"""Role-checking dependency logic, exercised directly (no live Clerk calls --
get_current_user_id is a thin wrapper around fastapi-clerk-auth's own JWT
verification, which is out of scope to re-test here).
"""
from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi import HTTPException

from legalrag.clerk import get_current_membership, require_owner
from legalrag.orgs import Membership


class TestGetCurrentMembership:
    """The connection arrives as an argument -- FastAPI resolves it from the
    `db` dependency the guarded route shares -- so these pass one in rather
    than patching the module for a connection it no longer opens."""

    def test_raises_403_when_not_a_member(self):
        with patch("legalrag.clerk.get_membership", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                get_current_membership(
                    organization_id=1, clerk_user_id="user_x", conn="fake-conn"
                )
            assert exc_info.value.status_code == 403

    def test_returns_the_membership_when_found(self):
        membership = Membership(
            id=1, organization_id=1, clerk_user_id="user_x", role="lawyer"
        )
        with patch("legalrag.clerk.get_membership", return_value=membership):
            result = get_current_membership(
                organization_id=1, clerk_user_id="user_x", conn="fake-conn"
            )
            assert result == membership

    def test_uses_the_connection_it_was_given(self):
        """The point of taking `conn`: authorising a request must not cost a
        connection handshake of its own."""
        with patch("legalrag.clerk.get_membership") as mock_get_membership:
            mock_get_membership.return_value = Membership(
                id=1, organization_id=1, clerk_user_id="user_x", role="owner"
            )
            get_current_membership(
                organization_id=7, clerk_user_id="user_x", conn="the-request-conn"
            )
        mock_get_membership.assert_called_once_with(
            "the-request-conn", 7, "user_x"
        )


class TestRequireOwner:
    def test_raises_403_for_a_lawyer(self):
        membership = Membership(
            id=1, organization_id=1, clerk_user_id="user_x", role="lawyer"
        )
        with pytest.raises(HTTPException) as exc_info:
            require_owner(membership=membership)
        assert exc_info.value.status_code == 403

    def test_allows_an_owner(self):
        membership = Membership(
            id=1, organization_id=1, clerk_user_id="user_x", role="owner"
        )
        assert require_owner(membership=membership) == membership
