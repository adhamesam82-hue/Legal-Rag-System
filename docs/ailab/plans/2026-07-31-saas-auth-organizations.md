# Auth & Organizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ailab:subagent-driven-development (recommended) or ailab:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any Egyptian lawyer or firm sign up, create a firm account, invite their team, and log in — the foundation every later sub-project (Clients & Matters, documents, billing, AI-research-per-matter) depends on.

**Architecture:** Clerk (hosted) owns identity — signup, login, sessions, password reset, email verification — via custom RTL-native screens built on `@clerk/nextjs`'s Core 3 hooks (`useSignIn`/`useSignUp`), not Clerk's prebuilt widgets. Our own Postgres owns organizations, memberships, and roles, keyed by Clerk's `user_id` (not a foreign key). FastAPI verifies every request's JWT against Clerk's JWKS, then looks up the caller's org + role from our own tables. Invitations are our own token-based flow, emailed via Resend.

**Tech Stack:** FastAPI, psycopg (raw SQL, no ORM), `fastapi-clerk-auth` (JWKS verification), `@clerk/nextjs` (Core 3 hooks, not Clerk Elements — that API is deprecated as of Clerk Core 3), Next.js App Router, Astryx, `httpx` for the Resend and Clerk Backend API calls (matching this codebase's existing pattern of calling provider REST APIs directly rather than adding an SDK per provider — see `src/legalrag/embed.py`).

## Global Constraints

- Clerk owns identity only. Organizations, memberships, and roles live entirely in our Postgres — never use Clerk's native "Organizations" feature (see spec's "Decisions made").
- Three roles: `owner`, `lawyer`, `staff`. Only `owner` can invite or remove members. `owner` is not itself invitable in v1.
- An organization must always have at least one Owner — enforced in the service layer (`orgs.py`), not just the UI.
- All auth UI is custom-built (Astryx components + Clerk's headless hooks), never Clerk's prebuilt `<SignIn/>`/`<SignUp/>` widgets, to guarantee correct RTL layout.
- Every new env var goes through `src/legalrag/config.py`, matching its existing "single source of truth for env var access" convention — no direct `os.environ` reads elsewhere in the backend.
- Every new backend function that touches Postgres takes a `psycopg.Connection` as its first argument (matching every existing function in `retrieve.py`, `library.py`, etc.) — no connection pooling or ORM session magic.

---

## Task 1: Migration — organizations, memberships, invitations

**Files:**
- Create: `migrations/0005_organizations.sql`

**Interfaces:**
- Produces: three tables (`organizations`, `memberships`, `invitations`) that every later task reads/writes via raw SQL. No ORM models — see the Data model in the spec for the canonical schema.

- [ ] **Step 1: Write the migration file**

```sql
-- 0005_organizations.sql
-- Foundation for the SaaS phase. See design doc
-- docs/ailab/specs/2026-07-31-saas-auth-organizations-design.md
--
-- Clerk owns user identity (passwords, sessions, email verification).
-- These tables own who belongs to which firm and in what role, keyed by
-- Clerk's user_id -- deliberately NOT a foreign key, since Clerk is the
-- source of truth for that identity, not this database.

CREATE TABLE organizations (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id                BIGSERIAL PRIMARY KEY,
  organization_id   BIGINT NOT NULL REFERENCES organizations(id),
  clerk_user_id     TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('owner', 'lawyer', 'staff')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, clerk_user_id)
);

CREATE INDEX ON memberships (clerk_user_id);

CREATE TABLE invitations (
  id                BIGSERIAL PRIMARY KEY,
  organization_id   BIGINT NOT NULL REFERENCES organizations(id),
  email             TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('lawyer', 'staff')),
  token             TEXT NOT NULL UNIQUE,
  invited_by        TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
                    DEFAULT 'pending',
  expires_at        TIMESTAMPTZ NOT NULL,
  accepted_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON invitations (token);
```

- [ ] **Step 2: Apply the migration**

Run: `uv run python scripts/migrate.py`
Expected output: `Applying 0005_organizations.sql...` then `  applied.`

- [ ] **Step 3: Verify the tables exist**

Run:
```bash
uv run python -c "
from legalrag.db import get_connection
with get_connection() as c, c.cursor() as cur:
    cur.execute(\"select table_name from information_schema.tables where table_name in ('organizations','memberships','invitations')\")
    print(sorted(r[0] for r in cur.fetchall()))
"
```
Expected: `['invitations', 'memberships', 'organizations']`

- [ ] **Step 4: Commit**

```bash
git add migrations/0005_organizations.sql
git commit -m "Add organizations, memberships, invitations tables"
```

---

## Task 2: Config — Clerk and Resend environment variables

**Files:**
- Modify: `src/legalrag/config.py`
- Modify: `.env.example`

**Interfaces:**
- Produces: `get_clerk_jwks_url() -> str`, `get_clerk_secret_key() -> str`, `get_resend_api_key() -> str` — each raises `RuntimeError` with a clear message if unset, matching the existing `get_database_url()` pattern exactly.

- [ ] **Step 1: Add the three getters to config.py**

Add to `src/legalrag/config.py`, directly after the existing `get_database_url()` function:

```python
def get_clerk_jwks_url() -> str:
    url = os.environ.get("CLERK_JWKS_URL")
    if not url:
        raise RuntimeError("CLERK_JWKS_URL not set in .env")
    return url


def get_clerk_secret_key() -> str:
    key = os.environ.get("CLERK_SECRET_KEY")
    if not key:
        raise RuntimeError("CLERK_SECRET_KEY not set in .env")
    return key


def get_resend_api_key() -> str:
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        raise RuntimeError("RESEND_API_KEY not set in .env")
    return key
```

- [ ] **Step 2: Document the new env vars in .env.example**

Append to `.env.example`:

```
CLERK_JWKS_URL=
CLERK_SECRET_KEY=
RESEND_API_KEY=
```

- [ ] **Step 3: Verify the module still imports cleanly**

Run: `uv run python -c "import legalrag.config; print('ok')"`
Expected: `ok` (no error — these getters are lazy, only raising when called, matching `get_database_url`'s behavior)

- [ ] **Step 4: Commit**

```bash
git add src/legalrag/config.py .env.example
git commit -m "Add Clerk and Resend config getters"
```

---

## Task 3: `orgs.py` — organizations and memberships

**Files:**
- Create: `src/legalrag/orgs.py`
- Test: `tests/test_orgs_db.py`

**Interfaces:**
- Consumes: nothing from other new tasks — this is a foundation module.
- Produces (used by Task 4, Task 6, Task 7):
  - `Organization(id: int, name: str, created_by: str)` — frozen dataclass
  - `Membership(id: int, organization_id: int, clerk_user_id: str, role: str)` — frozen dataclass
  - `ROLES: tuple[str, ...]` = `("owner", "lawyer", "staff")`
  - `LastOwnerError(Exception)`
  - `create_organization(conn, name: str, creator_clerk_user_id: str) -> Organization`
  - `list_memberships_for_user(conn, clerk_user_id: str) -> list[Membership]`
  - `get_membership(conn, organization_id: int, clerk_user_id: str) -> Membership | None`
  - `list_org_members(conn, organization_id: int) -> list[Membership]`
  - `add_membership(conn, organization_id: int, clerk_user_id: str, role: str) -> Membership`
  - `remove_membership(conn, organization_id: int, clerk_user_id: str) -> None`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_orgs_db.py`:

```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_orgs_db.py -v`
Expected: every test FAILS with `ModuleNotFoundError: No module named 'legalrag.orgs'` (the module doesn't exist yet)

- [ ] **Step 3: Write `src/legalrag/orgs.py`**

```python
"""Organizations and memberships.

Clerk owns identity (see clerk.py). This module owns who belongs to which
firm and in what role -- the one piece of tenant state everything else in
the SaaS phase (matters, clients, documents, billing) will hang off later.
"""
from __future__ import annotations

from dataclasses import dataclass

import psycopg

ROLES = ("owner", "lawyer", "staff")


class LastOwnerError(Exception):
    """Raised when an operation would leave an organization with no Owner."""


@dataclass(frozen=True)
class Organization:
    id: int
    name: str
    created_by: str


@dataclass(frozen=True)
class Membership:
    id: int
    organization_id: int
    clerk_user_id: str
    role: str


def create_organization(
    conn: psycopg.Connection, name: str, creator_clerk_user_id: str
) -> Organization:
    """Creates an organization and makes its creator the Owner, atomically."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO organizations (name, created_by) VALUES (%s, %s) RETURNING id",
            (name, creator_clerk_user_id),
        )
        org_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO memberships (organization_id, clerk_user_id, role) "
            "VALUES (%s, %s, 'owner')",
            (org_id, creator_clerk_user_id),
        )
    conn.commit()
    return Organization(id=org_id, name=name, created_by=creator_clerk_user_id)


def list_memberships_for_user(
    conn: psycopg.Connection, clerk_user_id: str
) -> list[Membership]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role "
            "FROM memberships WHERE clerk_user_id = %s",
            (clerk_user_id,),
        )
        return [Membership(*row) for row in cur.fetchall()]


def get_membership(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str
) -> Membership | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
        row = cur.fetchone()
        return Membership(*row) if row else None


def list_org_members(
    conn: psycopg.Connection, organization_id: int
) -> list[Membership]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, clerk_user_id, role FROM memberships "
            "WHERE organization_id = %s ORDER BY created_at",
            (organization_id,),
        )
        return [Membership(*row) for row in cur.fetchall()]


def add_membership(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str, role: str
) -> Membership:
    if role not in ROLES:
        raise ValueError(f"invalid role {role!r}; expected one of {ROLES}")
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO memberships (organization_id, clerk_user_id, role) "
            "VALUES (%s, %s, %s) RETURNING id",
            (organization_id, clerk_user_id, role),
        )
        membership_id = cur.fetchone()[0]
    conn.commit()
    return Membership(
        id=membership_id,
        organization_id=organization_id,
        clerk_user_id=clerk_user_id,
        role=role,
    )


def remove_membership(
    conn: psycopg.Connection, organization_id: int, clerk_user_id: str
) -> None:
    """Removes a member. A no-op if they weren't a member.

    Raises LastOwnerError, and leaves the row in place, rather than ever
    letting an organization end up with zero Owners.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT role FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
        row = cur.fetchone()
        if row is None:
            return
        role = row[0]

        if role == "owner":
            cur.execute(
                "SELECT count(*) FROM memberships "
                "WHERE organization_id = %s AND role = 'owner'",
                (organization_id,),
            )
            if cur.fetchone()[0] <= 1:
                raise LastOwnerError(
                    "cannot remove the only Owner of an organization"
                )

        cur.execute(
            "DELETE FROM memberships "
            "WHERE organization_id = %s AND clerk_user_id = %s",
            (organization_id, clerk_user_id),
        )
    conn.commit()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_orgs_db.py -v`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/legalrag/orgs.py tests/test_orgs_db.py
git commit -m "Add organizations and memberships module"
```

---

## Task 4: `invites.py` — invitation tokens

**Files:**
- Create: `src/legalrag/invites.py`
- Test: `tests/test_invites.py` (pure, no DB)
- Test: `tests/test_invites_db.py` (Postgres integration)

**Interfaces:**
- Consumes: `add_membership` from `orgs.py` (Task 3).
- Produces (used by Task 7):
  - `Invitation(id, organization_id, email, role, token, status, expires_at)` — frozen dataclass
  - `InvitationError(Exception)`
  - `INVITE_TTL: timedelta` (7 days)
  - `create_invitation(conn, organization_id: int, email: str, role: str, invited_by: str) -> Invitation`
  - `get_invitation_by_token(conn, token: str) -> Invitation | None`
  - `accept_invitation(conn, token: str, accepting_clerk_user_id: str, accepting_email: str) -> Invitation`

- [ ] **Step 1: Write the pure unit tests**

Create `tests/test_invites.py`:

```python
"""Invitation logic that needs no database -- token shape only.

The expiry/status/email-match rules themselves are tested against a real
Postgres in tests/test_invites_db.py, since they read and write invitation
rows.
"""
from __future__ import annotations

from legalrag.invites import INVITE_TTL
from datetime import timedelta


def test_invite_ttl_is_seven_days():
    assert INVITE_TTL == timedelta(days=7)
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/test_invites.py -v`
Expected: FAILS with `ModuleNotFoundError: No module named 'legalrag.invites'`

- [ ] **Step 3: Write the Postgres integration tests**

Create `tests/test_invites_db.py`:

```python
"""Invitation accept/expiry rules against a real Postgres."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from legalrag.invites import InvitationError, accept_invitation, create_invitation
from legalrag.orgs import create_organization, get_membership


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
    yield
    conn.rollback()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM invitations")
        cur.execute("DELETE FROM memberships")
        cur.execute("DELETE FROM organizations")
    conn.commit()


class TestCreateInvitation:
    def test_rejects_owner_role(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        with pytest.raises(ValueError):
            create_invitation(conn, org.id, "new@example.com", "owner", "user_owner")

    def test_creates_a_pending_invitation_with_a_unique_token(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "new@example.com", "lawyer", "user_owner"
        )
        assert invite.status == "pending"
        assert len(invite.token) > 20


class TestAcceptInvitation:
    def test_accepting_creates_the_membership(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "new@example.com", "lawyer", "user_owner"
        )

        accept_invitation(conn, invite.token, "user_new", "new@example.com")

        membership = get_membership(conn, org.id, "user_new")
        assert membership is not None
        assert membership.role == "lawyer"

    def test_email_mismatch_is_rejected(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "invited@example.com", "staff", "user_owner"
        )

        with pytest.raises(InvitationError, match="different email"):
            accept_invitation(conn, invite.token, "user_new", "someone-else@example.com")

    def test_email_match_is_case_insensitive(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "New@Example.com", "staff", "user_owner"
        )
        accept_invitation(conn, invite.token, "user_new", "new@example.com")
        assert get_membership(conn, org.id, "user_new") is not None

    def test_unknown_token_is_rejected(self, conn):
        with pytest.raises(InvitationError, match="not found"):
            accept_invitation(conn, "not-a-real-token", "user_new", "x@example.com")

    def test_already_accepted_token_cannot_be_reused(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "new@example.com", "lawyer", "user_owner"
        )
        accept_invitation(conn, invite.token, "user_new", "new@example.com")

        with pytest.raises(InvitationError, match="not pending"):
            accept_invitation(conn, invite.token, "user_other", "new@example.com")

    def test_expired_token_is_rejected(self, conn):
        org = create_organization(conn, "Firm", "user_owner")
        invite = create_invitation(
            conn, org.id, "new@example.com", "lawyer", "user_owner"
        )
        # Force it into the past -- create_invitation always sets a 7-day
        # expiry, so backdate it directly to exercise the expiry path.
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE invitations SET expires_at = %s WHERE id = %s",
                (datetime.now(timezone.utc) - timedelta(days=1), invite.id),
            )
        conn.commit()

        with pytest.raises(InvitationError, match="expired"):
            accept_invitation(conn, invite.token, "user_new", "new@example.com")
```

- [ ] **Step 4: Run to verify it fails**

Run: `uv run pytest tests/test_invites_db.py -v`
Expected: FAILS with `ModuleNotFoundError: No module named 'legalrag.invites'`

- [ ] **Step 5: Write `src/legalrag/invites.py`**

```python
"""Invitation tokens: an Owner invites someone by email, they accept via a link.

Not Clerk's native Organizations invite flow -- see orgs.py's docstring for
why organization state lives entirely in our own Postgres.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import psycopg

from legalrag.orgs import add_membership

INVITE_TTL = timedelta(days=7)


class InvitationError(Exception):
    """Raised when an invitation token cannot be accepted as given."""


@dataclass(frozen=True)
class Invitation:
    id: int
    organization_id: int
    email: str
    role: str
    token: str
    status: str
    expires_at: datetime


def create_invitation(
    conn: psycopg.Connection,
    organization_id: int,
    email: str,
    role: str,
    invited_by: str,
) -> Invitation:
    if role not in ("lawyer", "staff"):
        raise ValueError(f"invalid invite role {role!r}; owner is not invitable")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + INVITE_TTL
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO invitations
                (organization_id, email, role, token, invited_by, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, status
            """,
            (organization_id, email, role, token, invited_by, expires_at),
        )
        invitation_id, status = cur.fetchone()
    conn.commit()
    return Invitation(
        id=invitation_id,
        organization_id=organization_id,
        email=email,
        role=role,
        token=token,
        status=status,
        expires_at=expires_at,
    )


def get_invitation_by_token(
    conn: psycopg.Connection, token: str
) -> Invitation | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, organization_id, email, role, token, status, expires_at "
            "FROM invitations WHERE token = %s",
            (token,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return Invitation(
            id=row[0],
            organization_id=row[1],
            email=row[2],
            role=row[3],
            token=row[4],
            status=row[5],
            expires_at=row[6],
        )


def accept_invitation(
    conn: psycopg.Connection,
    token: str,
    accepting_clerk_user_id: str,
    accepting_email: str,
) -> Invitation:
    """Validates the token and creates the membership.

    Raises InvitationError if the token is unknown, already used/revoked,
    expired, or the authenticated account's email doesn't match who it was
    sent to.
    """
    invitation = get_invitation_by_token(conn, token)
    if invitation is None:
        raise InvitationError("invitation not found")
    if invitation.status != "pending":
        raise InvitationError(f"invitation is {invitation.status}, not pending")
    if invitation.expires_at < datetime.now(timezone.utc):
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE invitations SET status = 'expired' WHERE id = %s",
                (invitation.id,),
            )
        conn.commit()
        raise InvitationError("invitation has expired")
    if invitation.email.lower() != accepting_email.lower():
        raise InvitationError(
            "this invitation was sent to a different email address"
        )

    add_membership(
        conn, invitation.organization_id, accepting_clerk_user_id, invitation.role
    )
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE invitations SET status = 'accepted', accepted_at = now() "
            "WHERE id = %s",
            (invitation.id,),
        )
    conn.commit()
    return invitation
```

- [ ] **Step 6: Run both test files to verify they pass**

Run: `uv run pytest tests/test_invites.py tests/test_invites_db.py -v`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/legalrag/invites.py tests/test_invites.py tests/test_invites_db.py
git commit -m "Add invitation token module"
```

---

## Task 5: `email.py` — invite emails via Resend

**Files:**
- Create: `src/legalrag/email.py`
- Test: `tests/test_email.py`

**Interfaces:**
- Consumes: `get_resend_api_key()` from `config.py` (Task 2).
- Produces (used by Task 7): `send_invite_email(to_email: str, organization_name: str, accept_url: str) -> None`, `EmailError(RuntimeError)`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_email.py`:

```python
"""Resend API call, tested against a fake httpx transport -- no real network."""
from __future__ import annotations

import httpx
import pytest

from legalrag.email import EmailError, send_invite_email


def test_sends_with_the_expected_payload(monkeypatch):
    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return httpx.Response(200, json={"id": "email-123"})

    monkeypatch.setattr("legalrag.email.httpx.post", fake_post)
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

    send_invite_email("new@example.com", "Test Firm", "https://app.example/invite/abc")

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer re_test_key"
    assert captured["json"]["to"] == ["new@example.com"]
    assert "Test Firm" in captured["json"]["subject"]
    assert "https://app.example/invite/abc" in captured["json"]["html"]


def test_raises_email_error_on_a_failed_send(monkeypatch):
    def fake_post(url, headers=None, json=None, timeout=None):
        return httpx.Response(422, text="invalid recipient")

    monkeypatch.setattr("legalrag.email.httpx.post", fake_post)
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

    with pytest.raises(EmailError, match="422"):
        send_invite_email("bad", "Test Firm", "https://app.example/invite/abc")


def test_raises_when_the_api_key_is_unset(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="RESEND_API_KEY"):
        send_invite_email("new@example.com", "Test Firm", "https://app.example/invite/abc")
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/test_email.py -v`
Expected: FAILS with `ModuleNotFoundError: No module named 'legalrag.email'`

- [ ] **Step 3: Write `src/legalrag/email.py`**

```python
"""Transactional email via Resend's REST API directly.

Called directly with httpx rather than adding Resend's SDK, matching this
codebase's existing pattern for single-purpose provider calls (see
embed.py's direct calls to NVIDIA's API).
"""
from __future__ import annotations

import httpx

from legalrag.config import get_resend_api_key

RESEND_API_URL = "https://api.resend.com/emails"
FROM_ADDRESS = "LegalRAG <onboarding@resend.dev>"


class EmailError(RuntimeError):
    pass


def send_invite_email(to_email: str, organization_name: str, accept_url: str) -> None:
    response = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {get_resend_api_key()}"},
        json={
            "from": FROM_ADDRESS,
            "to": [to_email],
            "subject": f"You've been invited to join {organization_name}",
            "html": (
                f"<p>You've been invited to join <strong>{organization_name}</strong>.</p>"
                f'<p><a href="{accept_url}">Accept the invitation</a></p>'
                f"<p>This link expires in 7 days.</p>"
            ),
        },
        timeout=15.0,
    )
    if response.status_code >= 400:
        raise EmailError(
            f"Resend returned {response.status_code}: {response.text[:300]}"
        )
```

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/test_email.py -v`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/legalrag/email.py tests/test_email.py
git commit -m "Add invite email sending via Resend"
```

---

## Task 6: `clerk.py` — JWT verification and role-checking dependencies

**Files:**
- Create: `src/legalrag/clerk.py`
- Modify: `pyproject.toml` (add `fastapi-clerk-auth`)
- Test: `tests/test_clerk_auth.py`

**Interfaces:**
- Consumes: `get_clerk_jwks_url()`, `get_clerk_secret_key()` from `config.py` (Task 2); `get_membership` from `orgs.py` (Task 3).
- Produces (used by Task 7):
  - `get_current_user_id(credentials=Depends(...)) -> str` — a FastAPI dependency
  - `get_current_membership(organization_id: int = Path(...), clerk_user_id: str = Depends(get_current_user_id)) -> Membership` — a FastAPI dependency, raises `HTTPException(403)` if the caller isn't a member of that organization
  - `require_owner(membership: Membership = Depends(get_current_membership)) -> Membership` — raises `HTTPException(403)` unless `membership.role == "owner"`
  - `get_user_primary_email(clerk_user_id: str) -> str` — calls Clerk's Backend API directly

- [ ] **Step 1: Add the dependency to pyproject.toml**

Edit `pyproject.toml`, adding `"fastapi-clerk-auth>=0.0.9"` to the `dependencies` list (alongside the existing `"fastapi>=0.141.1"` line).

- [ ] **Step 2: Install it**

Run: `uv sync`
Expected: `fastapi-clerk-auth` appears in the resolved lock output.

- [ ] **Step 3: Write the failing tests**

Create `tests/test_clerk_auth.py`:

```python
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
    def test_raises_403_when_not_a_member(self):
        with patch("legalrag.clerk.get_connection") as mock_get_conn, patch(
            "legalrag.clerk.get_membership", return_value=None
        ):
            mock_get_conn.return_value.__enter__.return_value = "fake-conn"
            with pytest.raises(HTTPException) as exc_info:
                get_current_membership(organization_id=1, clerk_user_id="user_x")
            assert exc_info.value.status_code == 403

    def test_returns_the_membership_when_found(self):
        membership = Membership(
            id=1, organization_id=1, clerk_user_id="user_x", role="lawyer"
        )
        with patch("legalrag.clerk.get_connection") as mock_get_conn, patch(
            "legalrag.clerk.get_membership", return_value=membership
        ):
            mock_get_conn.return_value.__enter__.return_value = "fake-conn"
            result = get_current_membership(organization_id=1, clerk_user_id="user_x")
            assert result == membership


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
```

- [ ] **Step 4: Run to verify it fails**

Run: `uv run pytest tests/test_clerk_auth.py -v`
Expected: FAILS with `ModuleNotFoundError: No module named 'legalrag.clerk'`

- [ ] **Step 5: Write `src/legalrag/clerk.py`**

```python
"""Clerk owns identity; this module answers two questions for FastAPI routes:
"who is calling" (get_current_user_id) and "what can they do" (combined with
orgs.py's memberships, get_current_membership / require_owner).
"""
from __future__ import annotations

from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, Path, Request
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials

from legalrag.config import get_clerk_jwks_url, get_clerk_secret_key
from legalrag.db import get_connection
from legalrag.orgs import Membership, get_membership


@lru_cache(maxsize=1)
def _clerk_guard() -> ClerkHTTPBearer:
    # Lazy and cached: constructing this calls get_clerk_jwks_url(), which
    # raises if unset. Building it at import time would crash the whole app
    # on startup even for routes that need no auth at all -- every other
    # config getter in this codebase (get_database_url, get_model_spec) is
    # read lazily for the same reason.
    return ClerkHTTPBearer(config=ClerkConfig(jwks_url=get_clerk_jwks_url()))


async def _verify_clerk_session(request: Request) -> HTTPAuthorizationCredentials:
    guard = _clerk_guard()
    return await guard(request)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_verify_clerk_session),
) -> str:
    """The authenticated Clerk user's id -- the JWT's `sub` claim."""
    return credentials.decoded["sub"]


def get_current_membership(
    organization_id: int = Path(...),
    clerk_user_id: str = Depends(get_current_user_id),
) -> Membership:
    """The caller's membership in the organization named by the path.

    403s if they authenticated successfully but aren't a member of *this*
    organization -- a valid session is not the same as access to this org.
    """
    with get_connection() as conn:
        membership = get_membership(conn, organization_id, clerk_user_id)
    if membership is None:
        raise HTTPException(
            status_code=403, detail="Not a member of this organization"
        )
    return membership


def require_owner(
    membership: Membership = Depends(get_current_membership),
) -> Membership:
    if membership.role != "owner":
        raise HTTPException(status_code=403, detail="Only an Owner can do this")
    return membership


def get_user_primary_email(clerk_user_id: str) -> str:
    """Fetches the user's verified primary email from Clerk's Backend API.

    Not read from the session JWT: Clerk only includes an email claim if a
    custom JWT template is configured in the dashboard, and this must not
    depend on that being set up correctly -- accept_invitation's email match
    is a real security check, not a UX nicety.
    """
    response = httpx.get(
        f"https://api.clerk.com/v1/users/{clerk_user_id}",
        headers={"Authorization": f"Bearer {get_clerk_secret_key()}"},
        timeout=10.0,
    )
    response.raise_for_status()
    user = response.json()
    primary_id = user["primary_email_address_id"]
    for entry in user["email_addresses"]:
        if entry["id"] == primary_id:
            return entry["email_address"]
    raise RuntimeError(f"no primary email found for Clerk user {clerk_user_id}")
```

- [ ] **Step 6: Run to verify it passes**

Run: `uv run pytest tests/test_clerk_auth.py -v`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/legalrag/clerk.py tests/test_clerk_auth.py pyproject.toml uv.lock
git commit -m "Add Clerk JWT verification and role-checking dependencies"
```

---

## Task 7: API routes — organizations, invites, team management

**Files:**
- Modify: `src/legalrag/api.py`
- Test: `tests/test_orgs_api.py`

**Interfaces:**
- Consumes: everything from Tasks 3–6 (`orgs.py`, `invites.py`, `email.py`, `clerk.py`).
- Produces (used by the frontend tasks): five new routes —
  - `POST /api/orgs` → `OrganizationOut`
  - `GET /api/orgs/me` → `list[MembershipOut]`
  - `POST /api/orgs/{organization_id}/invites` → `InvitationOut` (Owner only)
  - `GET /api/invites/{token}` → `InvitationPreview` (no auth required)
  - `POST /api/invites/{token}/accept` → `MembershipOut`
  - `DELETE /api/orgs/{organization_id}/members/{clerk_user_id}` → 204 (Owner only)

- [ ] **Step 1: Write the failing tests**

Create `tests/test_orgs_api.py`:

```python
"""API route tests. The Clerk auth dependency is overridden throughout, so
this suite never makes a real Clerk network call -- only get_current_user_id
is faked; get_current_membership and require_owner still run for real against
a real database, so the role-check logic itself is exercised.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from legalrag.api import app
from legalrag.clerk import get_current_user_id


@pytest.fixture
def conn():
    try:
        from legalrag.db import get_connection

        connection = get_connection()
    except Exception as exc:  # noqa: BLE001 - any connection failure means skip
        pytest.skip(f"database unavailable: {exc}")
    yield connection
    with connection.cursor() as cur:
        cur.execute("DELETE FROM invitations")
        cur.execute("DELETE FROM memberships")
        cur.execute("DELETE FROM organizations")
    connection.commit()
    connection.close()


@pytest.fixture
def client(conn):
    def fake_user():
        return "user_owner"

    app.dependency_overrides[get_current_user_id] = fake_user
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_user_id, None)


class TestCreateOrganization:
    def test_creates_and_returns_the_org(self, client):
        response = client.post("/api/orgs", json={"name": "Test Firm"})
        assert response.status_code == 200
        assert response.json()["name"] == "Test Firm"


class TestListMyOrganizations:
    def test_lists_organizations_the_caller_belongs_to(self, client):
        client.post("/api/orgs", json={"name": "Firm A"})
        response = client.get("/api/orgs/me")
        assert response.status_code == 200
        names = [m["organization_name"] for m in response.json()]
        assert names == ["Firm A"]


class TestInvites:
    def test_owner_can_invite_and_the_invite_previews_publicly(self, client, conn, monkeypatch):
        monkeypatch.setattr("legalrag.api.send_invite_email", lambda **kwargs: None)
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]

        invite_response = client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        )
        assert invite_response.status_code == 200
        token = invite_response.json()["token"]

        preview_response = client.get(f"/api/invites/{token}")
        assert preview_response.status_code == 200
        assert preview_response.json()["organization_name"] == "Firm"
        assert preview_response.json()["role"] == "lawyer"

    def test_non_owner_cannot_invite(self, client, conn, monkeypatch):
        from legalrag.orgs import add_membership

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        add_membership(conn, org_id, "user_staff", "staff")

        app.dependency_overrides[get_current_user_id] = lambda: "user_staff"
        response = client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        )
        assert response.status_code == 403

    def test_accepting_an_invite_creates_membership(self, client, conn, monkeypatch):
        monkeypatch.setattr("legalrag.api.send_invite_email", lambda **kwargs: None)
        monkeypatch.setattr(
            "legalrag.api.get_user_primary_email", lambda clerk_user_id: "new@example.com"
        )
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        token = client.post(
            f"/api/orgs/{org_id}/invites",
            json={"email": "new@example.com", "role": "lawyer"},
        ).json()["token"]

        app.dependency_overrides[get_current_user_id] = lambda: "user_new"
        response = client.post(f"/api/invites/{token}/accept")
        assert response.status_code == 200
        assert response.json()["role"] == "lawyer"


class TestRemoveMember:
    def test_owner_can_remove_a_member(self, client, conn):
        from legalrag.orgs import add_membership

        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        add_membership(conn, org_id, "user_lawyer", "lawyer")

        response = client.delete(f"/api/orgs/{org_id}/members/user_lawyer")
        assert response.status_code == 204

    def test_cannot_remove_the_last_owner(self, client):
        org_id = client.post("/api/orgs", json={"name": "Firm"}).json()["id"]
        response = client.delete(f"/api/orgs/{org_id}/members/user_owner")
        assert response.status_code == 409
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/test_orgs_api.py -v`
Expected: FAILS — routes don't exist yet (404s / import errors for `send_invite_email`, `get_user_primary_email` not yet imported into `api.py`)

- [ ] **Step 3: Add the new routes to `src/legalrag/api.py`**

Add these imports near the top of `src/legalrag/api.py`, alongside the existing `from legalrag...` imports:

```python
from legalrag.clerk import get_current_membership, get_current_user_id, get_user_primary_email, require_owner
from legalrag.email import send_invite_email
from legalrag.invites import InvitationError, accept_invitation, create_invitation, get_invitation_by_token
from legalrag.orgs import (
    LastOwnerError,
    Membership,
    add_membership,
    create_organization,
    get_membership,
    list_memberships_for_user,
    list_org_members,
    remove_membership,
)
```

Add these Pydantic models alongside the existing response models in `src/legalrag/api.py`:

```python
class OrganizationOut(BaseModel):
    id: int
    name: str


class CreateOrganizationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class MembershipOut(BaseModel):
    organization_id: int
    organization_name: str
    role: str


class CreateInviteRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: Literal["lawyer", "staff"]


class InvitationOut(BaseModel):
    token: str
    email: str
    role: str
    organization_name: str


class InvitationPreview(BaseModel):
    organization_name: str
    role: str
    status: str
```

Add these routes at the end of `src/legalrag/api.py`:

```python
@app.post("/api/orgs", response_model=OrganizationOut)
def post_create_organization(
    request: CreateOrganizationRequest,
    clerk_user_id: str = Depends(get_current_user_id),
):
    with db() as conn:
        org = create_organization(conn, request.name, clerk_user_id)
    return OrganizationOut(id=org.id, name=org.name)


@app.get("/api/orgs/me", response_model=list[MembershipOut])
def get_my_organizations(clerk_user_id: str = Depends(get_current_user_id)):
    with db() as conn:
        memberships = list_memberships_for_user(conn, clerk_user_id)
        result = []
        for m in memberships:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT name FROM organizations WHERE id = %s", (m.organization_id,)
                )
                org_name = cur.fetchone()[0]
            result.append(
                MembershipOut(
                    organization_id=m.organization_id,
                    organization_name=org_name,
                    role=m.role,
                )
            )
    return result


@app.post("/api/orgs/{organization_id}/invites", response_model=InvitationOut)
def post_create_invite(
    organization_id: int,
    request: CreateInviteRequest,
    owner: Membership = Depends(require_owner),
):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name FROM organizations WHERE id = %s", (organization_id,)
            )
            org_name = cur.fetchone()[0]
        invite = create_invitation(
            conn, organization_id, request.email, request.role, owner.clerk_user_id
        )
    accept_url = f"https://app.legalrag.example/invite/{invite.token}"
    send_invite_email(invite.email, org_name, accept_url)
    return InvitationOut(
        token=invite.token,
        email=invite.email,
        role=invite.role,
        organization_name=org_name,
    )


@app.get("/api/invites/{token}", response_model=InvitationPreview)
def get_invite_preview(token: str):
    with db() as conn:
        invitation = get_invitation_by_token(conn, token)
        if invitation is None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name FROM organizations WHERE id = %s",
                (invitation.organization_id,),
            )
            org_name = cur.fetchone()[0]
    return InvitationPreview(
        organization_name=org_name, role=invitation.role, status=invitation.status
    )


@app.post("/api/invites/{token}/accept", response_model=MembershipOut)
def post_accept_invite(token: str, clerk_user_id: str = Depends(get_current_user_id)):
    email = get_user_primary_email(clerk_user_id)
    with db() as conn:
        try:
            invitation = accept_invitation(conn, token, clerk_user_id, email)
        except InvitationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name FROM organizations WHERE id = %s",
                (invitation.organization_id,),
            )
            org_name = cur.fetchone()[0]
    return MembershipOut(
        organization_id=invitation.organization_id,
        organization_name=org_name,
        role=invitation.role,
    )


@app.delete("/api/orgs/{organization_id}/members/{clerk_user_id}", status_code=204)
def delete_member(
    organization_id: int,
    clerk_user_id: str,
    owner: Membership = Depends(require_owner),
):
    with db() as conn:
        try:
            remove_membership(conn, organization_id, clerk_user_id)
        except LastOwnerError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
```

Add `Literal` to the existing `from typing import Literal` import at the top of the file if not already imported (it already is, per the existing `Jurisdiction = Literal["EG", "SA"]` line).

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/test_orgs_api.py -v`
Expected: all tests PASS

- [ ] **Step 5: Run the full backend suite to check nothing broke**

Run: `uv run pytest tests/ -v`
Expected: all tests PASS (existing legal-research tests plus all new auth/org tests)

- [ ] **Step 6: Commit**

```bash
git add src/legalrag/api.py tests/test_orgs_api.py
git commit -m "Add organization, invite, and team-management API routes"
```

---

## Task 8: Frontend — install Clerk, wire ClerkProvider and middleware

**Files:**
- Modify: `web/package.json`
- Create: `web/middleware.ts`
- Modify: `web/app/providers.tsx`
- Create: `web/.env.local` (not committed — gitignored)
- Modify: `web/.env.example` if one doesn't exist, create it

**Interfaces:**
- Produces: `<ClerkProvider>` wrapping the whole app (used by every page task below); Clerk's `useAuth()`/`useSignIn()`/`useSignUp()` hooks become available anywhere under it.

- [ ] **Step 1: Install `@clerk/nextjs`**

Run (from `web/`): `npm install @clerk/nextjs@^7.6.4`

- [ ] **Step 2: Create the Clerk application and get keys**

In the Clerk dashboard: create a new application. Note the **Publishable key**, **Secret key**, and the **JWKS URL** (under API Keys → Show JWKS URL, or construct as `<Frontend API URL>/.well-known/jwks.json`).

- [ ] **Step 3: Add frontend env vars**

Create `web/.env.local` (already gitignored via `web/.gitignore`'s existing rules — verify `.env*.local` is covered, and if not add it):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Add to `.env.example` (root, backend) the two backend Clerk vars from Task 2 if not already present, plus note in a comment that the frontend needs its own `web/.env.local` with the publishable key.

- [ ] **Step 4: Create `web/middleware.ts`**

`createRouteMatcher` + `auth.protect()` for page gatekeeping is Clerk's older pattern and is now deprecated — current guidance is that middleware should not be where routes get protected at all; protection belongs at the point data is actually accessed. Real protection here already exists server-side (every data-touching FastAPI route in Task 7 requires `get_current_user_id`); `OrgGate` (Task 12) is what redirects signed-out users away from pages client-side. Middleware only needs to attach Clerk's auth context to every request:

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
```

- [ ] **Step 5: Wrap the app in `<ClerkProvider>`**

Edit `web/app/providers.tsx`:

```typescript
"use client";

import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <Theme theme={neutralTheme}>
        {/* Routes every Astryx Link through the Next router. */}
        <LinkProvider component={Link}>{children}</LinkProvider>
      </Theme>
    </ClerkProvider>
  );
}
```

- [ ] **Step 6: Verify the app still builds**

Run (from `web/`): `npx next build`
Expected: builds successfully (existing pages still render; no Clerk-related build errors)

- [ ] **Step 7: Commit**

```bash
git add web/package.json web/package-lock.json web/middleware.ts web/app/providers.tsx .env.example
git commit -m "Install Clerk and wire ClerkProvider + middleware"
```

(`web/.env.local` is not committed — it's gitignored.)

---

## Task 9: Frontend API client — attach auth token, add org/invite calls

**Files:**
- Modify: `web/lib/api.ts`

**Interfaces:**
- Consumes: Clerk's `useAuth()` hook (Task 8) for `getToken()`.
- Produces (used by every page task below): `api.createOrganization`, `api.myOrganizations`, `api.createInvite`, `api.previewInvite`, `api.acceptInvite`, `api.removeMember`, plus every existing call in `api.ts` now sends the caller's bearer token automatically.

- [ ] **Step 1: Read the current file to confirm the exact `request()` helper signature**

Run: `sed -n '1,40p' web/lib/api.ts`

(This file already exists from Phase 2 — the change below adapts its existing `request<T>()` helper rather than replacing it. Confirm the helper's exact current shape before editing, since the diff below assumes the version from the Phase 2 commit.)

- [ ] **Step 2: Make `request()` accept a token getter and attach it**

In `web/lib/api.ts`, change the `request` helper to accept an optional bearer token, and thread it through the exported `api` object's methods. Add near the top of the file:

```typescript
type TokenGetter = () => Promise<string | null>;

let getAuthToken: TokenGetter = async () => null;

/** Called once from a client component after ClerkProvider mounts, so every
 *  api.* call can attach the current session's bearer token without every
 *  call site having to thread it through by hand. */
export function configureAuthToken(getter: TokenGetter) {
  getAuthToken = getter;
}
```

Modify the existing `request<T>` function so the `fetch` call's headers include the token:

```typescript
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the API. Is it running on " + API_BASE + "?",
    );
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* non-JSON error body; keep the generic message */
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
```

- [ ] **Step 3: Add the org/invite types and API methods**

Add these types near the other interfaces in `web/lib/api.ts`:

```typescript
export interface Organization {
  id: number;
  name: string;
}

export interface Membership {
  organization_id: number;
  organization_name: string;
  role: "owner" | "lawyer" | "staff";
}

export interface Invitation {
  token: string;
  email: string;
  role: "lawyer" | "staff";
  organization_name: string;
}

export interface InvitationPreview {
  organization_name: string;
  role: "lawyer" | "staff";
  status: "pending" | "accepted" | "expired" | "revoked";
}
```

Add these methods to the exported `api` object in `web/lib/api.ts`:

```typescript
  createOrganization: (name: string) =>
    request<Organization>("/api/orgs", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  myOrganizations: () => request<Membership[]>("/api/orgs/me"),

  createInvite: (organizationId: number, email: string, role: "lawyer" | "staff") =>
    request<Invitation>(`/api/orgs/${organizationId}/invites`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  previewInvite: (token: string) =>
    request<InvitationPreview>(`/api/invites/${token}`),

  acceptInvite: (token: string) =>
    request<Membership>(`/api/invites/${token}/accept`, { method: "POST" }),

  removeMember: (organizationId: number, clerkUserId: string) =>
    request<void>(`/api/orgs/${organizationId}/members/${clerkUserId}`, {
      method: "DELETE",
    }),
```

- [ ] **Step 4: Wire `configureAuthToken` from the root layout**

Add a small client component, `web/components/AuthTokenBridge.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { configureAuthToken } from "@/lib/api";

/** Bridges Clerk's getToken() into the plain api.ts client, so every api.*
 *  call attaches the current session's bearer token with no per-call-site
 *  wiring. Renders nothing. */
export function AuthTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    configureAuthToken(getToken);
  }, [getToken]);

  return null;
}
```

Render it once, inside `<ClerkProvider>`, in `web/app/providers.tsx`:

```typescript
"use client";

import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { AuthTokenBridge } from "@/components/AuthTokenBridge";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <Theme theme={neutralTheme}>
        <LinkProvider component={Link}>
          <AuthTokenBridge />
          {children}
        </LinkProvider>
      </Theme>
    </ClerkProvider>
  );
}
```

- [ ] **Step 5: Verify the app builds**

Run (from `web/`): `npx next build`
Expected: builds successfully, no type errors

- [ ] **Step 6: Commit**

```bash
git add web/lib/api.ts web/components/AuthTokenBridge.tsx web/app/providers.tsx
git commit -m "Attach Clerk session token to API calls; add org/invite client methods"
```

---

## Task 10: Frontend — custom sign-in screen

**Files:**
- Create: `web/app/sign-in/[[...sign-in]]/page.tsx`

**Interfaces:**
- Consumes: `useSignIn()` from `@clerk/nextjs` (Core 3 hooks API — not Clerk Elements, which is deprecated).

- [ ] **Step 1: Write the page**

```typescript
"use client";

import { Suspense, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";

// useSearchParams() in a Client Component requires a Suspense boundary --
// without one, `next build` fails outright (it has no way to prerender a
// static shell around request-time query data). The default export below
// is the boundary; this inner component is what actually reads the param.
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn.password({ emailAddress: email, password });

    if (signIn.status === "complete") {
      // OrgGate and the invite-accept page both send visitors here with a
      // redirect_url when they need to sign in first -- honor it so they
      // land back where they were going, not always at "/".
      const destination = searchParams.get("redirect_url") || "/";
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl(destination);
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 420,
        margin: "64px auto",
        padding: "0 20px",
      }}
    >
      <Heading level={1}>تسجيل الدخول</Heading>
      <div style={{ marginBlockStart: 20 }}>
        <Card padding={4}>
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 14 }}
          >
            <TextInput
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={setEmail}
            />
            {errors?.fields?.identifier && (
              <Banner
                status="error"
                title="البريد الإلكتروني"
                description={errors.fields.identifier.message}
              />
            )}
            <TextInput
              label="كلمة المرور"
              type="password"
              value={password}
              onChange={setPassword}
            />
            {errors?.fields?.password && (
              <Banner
                status="error"
                title="كلمة المرور"
                description={errors.fields.password.message}
              />
            )}
            <Button
              type="submit"
              label="تسجيل الدخول"
              variant="primary"
              isLoading={fetchStatus === "fetching"}
            />
          </form>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run (from `web/`): `npx next dev -p 3000` (in background), then visit `http://localhost:3000/sign-in`
Expected: the sign-in form renders right-to-left with Astryx's logical-property CSS (this is the entire reason for building on Clerk's headless hooks instead of its prebuilt widgets — see the spec's "Custom RTL-native auth screens" decision). Error messages from Clerk itself (`errors.fields.*.message`) still arrive in English from Clerk's API; full error-message localization is a follow-up pass, out of scope here.

- [ ] **Step 3: Commit**

```bash
git add "web/app/sign-in/[[...sign-in]]/page.tsx"
git commit -m "Add custom sign-in screen on Clerk's Core 3 hooks"
```

---

## Task 11: Frontend — custom sign-up screen with email verification

**Files:**
- Create: `web/app/sign-up/[[...sign-up]]/page.tsx`

**Interfaces:**
- Consumes: `useSignUp()` from `@clerk/nextjs`.

- [ ] **Step 1: Write the page**

```typescript
"use client";

import { Suspense, useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";

// Same reason as the sign-in page: useSearchParams() needs a Suspense
// boundary or `next build` fails.
export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    await signUp.password({ emailAddress: email, password });
    await signUp.verifications.sendEmailCode();
    setAwaitingCode(true);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    await signUp.verifications.verifyEmailCode({ code });

    if (signUp.status === "complete") {
      // A redirect_url means they arrived from an invite link and are
      // joining an existing firm -- send them there, not to onboarding's
      // "create a firm" step, which is only for a brand-new account with
      // nowhere else to go.
      const destination = searchParams.get("redirect_url") || "/onboarding";
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl(destination);
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
  }

  return (
    <div dir="rtl" style={{ maxWidth: 420, margin: "64px auto", padding: "0 20px" }}>
      <Heading level={1}>إنشاء حساب</Heading>
      <div style={{ marginBlockStart: 20 }}>
        <Card padding={4}>
          {!awaitingCode ? (
            <form
              onSubmit={handleCreateAccount}
              style={{ display: "grid", gap: 14 }}
            >
              <TextInput
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={setEmail}
              />
              {errors?.fields?.emailAddress && (
                <Banner
                  status="error"
                  title="البريد الإلكتروني"
                  description={errors.fields.emailAddress.message}
                />
              )}
              <TextInput
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={setPassword}
              />
              {errors?.fields?.password && (
                <Banner
                  status="error"
                  title="كلمة المرور"
                  description={errors.fields.password.message}
                />
              )}
              <Button
                type="submit"
                label="متابعة"
                variant="primary"
                isLoading={fetchStatus === "fetching"}
              />
            </form>
          ) : (
            <form onSubmit={handleVerify} style={{ display: "grid", gap: 14 }}>
              <Text type="supporting">
                {`أرسلنا رمزًا إلى ${email}. أدخله أدناه لإكمال إنشاء حسابك.`}
              </Text>
              <TextInput
                label="رمز التحقق"
                value={code}
                onChange={setCode}
              />
              {errors?.fields?.code && (
                <Banner
                  status="error"
                  title="رمز التحقق"
                  description={errors.fields.code.message}
                />
              )}
              <Button
                type="submit"
                label="تحقق"
                variant="primary"
                isLoading={fetchStatus === "fetching"}
              />
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

With the dev server running, visit `http://localhost:3000/sign-up`
Expected: the create-account form renders right-to-left; submitting a valid email/password shows the RTL verification-code form.

- [ ] **Step 3: Commit**

```bash
git add "web/app/sign-up/[[...sign-up]]/page.tsx"
git commit -m "Add custom sign-up screen with email verification"
```

---

## Task 12: Frontend — onboarding (create your firm) and org resolution

**Files:**
- Create: `web/app/onboarding/page.tsx`
- Create: `web/app/choose-organization/page.tsx`
- Create: `web/components/OrgGate.tsx`
- Modify: `web/app/providers.tsx`

**Interfaces:**
- Consumes: `api.myOrganizations()`, `api.createOrganization()` (Task 9).

- [ ] **Step 1: Write the onboarding page**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { api, ApiError } from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    try {
      await api.createOrganization(name.trim());
      router.push("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div dir="rtl" style={{ maxWidth: 480, margin: "64px auto", padding: "0 20px" }}>
      <Heading level={1}>إنشاء مكتبك</Heading>
      <div style={{ marginBlockStart: 12, marginBlockEnd: 20 }}>
        <Text type="supporting">
          هذا هو الحساب الذي سينضم إليه فريقك. يمكنك دعوة المحامين والموظفين
          بعد إنشائه.
        </Text>
      </div>
      <Card padding={4}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <TextInput
            label="اسم المكتب"
            value={name}
            onChange={setName}
            placeholder="مثال: مكتب مصطفى وشركاه للمحاماة"
          />
          {error && (
            <Banner status="error" title="تعذّر إنشاء المكتب" description={error} />
          )}
          <Button
            type="submit"
            label="إنشاء المكتب"
            variant="primary"
            isLoading={pending}
          />
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Write the choose-organization page (the multi-org edge case)**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Spinner } from "@astryxdesign/core/Spinner";
import { api, Membership } from "@/lib/api";

const ACTIVE_ORG_KEY = "legalrag_active_org_id";

export default function ChooseOrganizationPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);

  useEffect(() => {
    api.myOrganizations().then(setMemberships);
  }, []);

  function choose(organizationId: number) {
    window.localStorage.setItem(ACTIVE_ORG_KEY, String(organizationId));
    router.push("/");
  }

  if (!memberships) {
    return (
      <div dir="rtl" style={{ maxWidth: 480, margin: "64px auto", padding: "0 20px" }}>
        <Spinner label="جارٍ تحميل مكاتبك…" />
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ maxWidth: 480, margin: "64px auto", padding: "0 20px" }}>
      <Heading level={1}>أي مكتب؟</Heading>
      <div style={{ marginBlockStart: 12, marginBlockEnd: 20 }}>
        <Text type="supporting">أنت عضو في أكثر من مكتب.</Text>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {memberships.map((m) => (
          <Card key={m.organization_id} padding={3} elevation="low">
            <button
              onClick={() => choose(m.organization_id)}
              style={{ width: "100%", textAlign: "start" }}
            >
              <Text type="label">{m.organization_name}</Text>
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add org resolution to the root layout**

Create `web/components/OrgGate.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@astryxdesign/core/Spinner";
import { api } from "@/lib/api";

const ACTIVE_ORG_KEY = "legalrag_active_org_id";
// Pages that manage their own auth state and must render regardless of
// whether the visitor is signed in (invite-accept shows a sign-in/sign-up
// prompt itself; the others are the auth flow's own screens).
const EXEMPT_PATHS = ["/sign-in", "/sign-up", "/onboarding", "/choose-organization", "/invite"];

/** The one place that decides both "must this visitor sign in first" and
 *  "which organization are they acting in" -- middleware does neither
 *  (createRouteMatcher + auth.protect() for page gating is Clerk's
 *  deprecated pattern; current guidance keeps middleware out of route
 *  protection entirely). 0 orgs -> onboarding; 1 -> straight through; 2+ ->
 *  the minimal picker (no full switcher is built in v1 -- see the design
 *  spec's "Multi-org edge case"). */
export function OrgGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    const exempt = EXEMPT_PATHS.some((p) => pathname.startsWith(p));

    if (!isSignedIn) {
      if (exempt) {
        setReady(true);
      } else {
        router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      }
      return;
    }
    if (exempt) {
      setReady(true);
      return;
    }

    api.myOrganizations().then((memberships) => {
      if (memberships.length === 0) {
        router.push("/onboarding");
      } else if (memberships.length === 1) {
        window.localStorage.setItem(
          ACTIVE_ORG_KEY,
          String(memberships[0].organization_id),
        );
        setReady(true);
      } else if (!window.localStorage.getItem(ACTIVE_ORG_KEY)) {
        router.push("/choose-organization");
      } else {
        setReady(true);
      }
    });
  }, [isLoaded, isSignedIn, pathname, router]);

  if (!ready) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <Spinner label="Loading…" />
      </div>
    );
  }

  return <>{children}</>;
}
```

Render it inside `Providers`, wrapping `children`, in `web/app/providers.tsx`:

```typescript
"use client";

import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { AuthTokenBridge } from "@/components/AuthTokenBridge";
import { OrgGate } from "@/components/OrgGate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <Theme theme={neutralTheme}>
        <LinkProvider component={Link}>
          <AuthTokenBridge />
          <OrgGate>{children}</OrgGate>
        </LinkProvider>
      </Theme>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Verify the app builds**

Run (from `web/`): `npx next build`
Expected: builds successfully

- [ ] **Step 5: Commit**

```bash
git add web/app/onboarding/page.tsx web/app/choose-organization/page.tsx web/components/OrgGate.tsx web/app/providers.tsx
git commit -m "Add onboarding, multi-org picker, and org-resolution gate"
```

---

## Task 13: Frontend — invite accept screen

**Files:**
- Create: `web/app/invite/[token]/page.tsx`

**Interfaces:**
- Consumes: `api.previewInvite()`, `api.acceptInvite()` (Task 9); `useAuth()` from `@clerk/nextjs`.

- [ ] **Step 1: Write the page**

```typescript
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { api, ApiError, InvitationPreview } from "@/lib/api";

const ROLE_LABELS: Record<"lawyer" | "staff", string> = {
  lawyer: "محامٍ",
  staff: "موظف",
};

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    api
      .previewInvite(token)
      .then(setPreview)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, [token]);

  async function accept() {
    setAccepting(true);
    setError(null);
    try {
      await api.acceptInvite(token);
      router.push("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setAccepting(false);
    }
  }

  if (error) {
    return (
      <div dir="rtl" style={{ maxWidth: 480, margin: "64px auto", padding: "0 20px" }}>
        <Banner status="error" title="هذه الدعوة غير صالحة" description={error} />
      </div>
    );
  }
  if (!preview || !isLoaded) {
    return (
      <div dir="rtl" style={{ maxWidth: 480, margin: "64px auto", padding: "0 20px" }}>
        <Spinner label="جارٍ تحميل الدعوة…" />
      </div>
    );
  }
  if (preview.status !== "pending") {
    return (
      <div dir="rtl" style={{ maxWidth: 480, margin: "64px auto", padding: "0 20px" }}>
        <Banner
          status="warning"
          title="هذه الدعوة لم تعد صالحة"
          description="اطلب من المكتب إرسال دعوة جديدة."
        />
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ maxWidth: 480, margin: "64px auto", padding: "0 20px" }}>
      <Heading level={1}>{`الانضمام إلى ${preview.organization_name}`}</Heading>
      <div style={{ marginBlockStart: 12, marginBlockEnd: 20 }}>
        <Text type="supporting">
          {`أنت مدعو للانضمام بصفة ${ROLE_LABELS[preview.role]}.`}
        </Text>
      </div>
      <Card padding={4}>
        {isSignedIn ? (
          <Button
            label="قبول الدعوة"
            variant="primary"
            isLoading={accepting}
            onClick={accept}
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <Text type="supporting">
              سجّل الدخول أو أنشئ حسابًا لقبول هذه الدعوة.
            </Text>
            <Button
              label="تسجيل الدخول"
              variant="primary"
              onClick={() => router.push(`/sign-in?redirect_url=/invite/${token}`)}
            />
            <Button
              label="إنشاء حساب"
              variant="secondary"
              onClick={() => router.push(`/sign-up?redirect_url=/invite/${token}`)}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

With the dev server running, create an invite via the API (or the team page from Task 14) and visit `http://localhost:3000/invite/<token>`
Expected: shows the org name and role, right-to-left, before sign-in; shows a "قبول الدعوة" (Accept invitation) button once signed in.

- [ ] **Step 3: Commit**

```bash
git add "web/app/invite/[token]/page.tsx"
git commit -m "Add invite accept screen"
```

---

## Task 14: Frontend — team management screen

**Files:**
- Create: `web/app/team/page.tsx`

**Interfaces:**
- Consumes: `api.myOrganizations()`, `api.createInvite()`, `api.removeMember()` (Task 9).

- [ ] **Step 1: Write the page**

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { api, ApiError, Membership } from "@/lib/api";

const ACTIVE_ORG_KEY = "legalrag_active_org_id";

export default function TeamPage() {
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lawyer" | "staff">("lawyer");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api.myOrganizations().then(setMemberships);
    const stored = window.localStorage.getItem(ACTIVE_ORG_KEY);
    if (stored) setActiveOrgId(Number(stored));
  }, []);

  const activeMembership = memberships?.find(
    (m) => m.organization_id === activeOrgId,
  );

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId || !email.trim()) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await api.createInvite(activeOrgId, email.trim(), role);
      setNotice(`Invited ${email.trim()} as ${role}.`);
      setEmail("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  if (!memberships) {
    return (
      <div style={{ maxWidth: 640, margin: "48px auto", padding: "0 20px" }}>
        <Spinner label="Loading…" />
      </div>
    );
  }
  if (!activeMembership) {
    return (
      <div style={{ maxWidth: 640, margin: "48px auto", padding: "0 20px" }}>
        <Banner status="info" title="No active firm selected" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "48px auto", padding: "0 20px" }}>
      <Heading level={1}>Team</Heading>
      <div style={{ marginBlockStart: 8, marginBlockEnd: 20 }}>
        <Text type="supporting">{activeMembership.organization_name}</Text>
      </div>

      {activeMembership.role === "owner" ? (
        <Card padding={4}>
          <form onSubmit={sendInvite} style={{ display: "grid", gap: 14 }}>
            <TextInput label="Email" type="email" value={email} onChange={setEmail} />
            <ToggleButtonGroup
              label="Role"
              type="single"
              value={role}
              onChange={(v) => setRole(v === "staff" ? "staff" : "lawyer")}
            >
              <ToggleButton value="lawyer" label="Lawyer" />
              <ToggleButton value="staff" label="Staff" />
            </ToggleButtonGroup>
            {error && (
              <Banner status="error" title="Could not send invite" description={error} />
            )}
            {notice && <Banner status="success" title={notice} />}
            <Button
              type="submit"
              label="Send invite"
              variant="primary"
              isLoading={pending}
            />
          </form>
        </Card>
      ) : (
        <Banner
          status="info"
          title="Only an Owner can invite team members"
          description={`You're signed in as a ${activeMembership.role}.`}
        />
      )}

      <div style={{ marginBlockStart: 20 }}>
        <Badge variant="neutral" label={`Your role: ${activeMembership.role}`} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders and sends invites**

With the dev server running and signed in as an Owner (after creating a firm via onboarding), visit `http://localhost:3000/team`, enter an email, submit.
Expected: shows a success banner; the invite is created server-side (confirm via `GET /api/invites/<token>` or the database directly).

- [ ] **Step 3: Commit**

```bash
git add web/app/team/page.tsx
git commit -m "Add team management screen for inviting members"
```

---

## Task 15: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `uv run pytest tests/ -v`
Expected: all tests pass, including every new test file from Tasks 3–7 and every pre-existing test from Phase 2.

- [ ] **Step 2: Run a full manual signup-to-invite-to-accept walkthrough**

With both servers running (`uv run uvicorn legalrag.api:app --reload --port 8000` and, from `web/`, `npx next dev -p 3000`):

1. Visit `/sign-up`, create an account, verify the email code.
2. Confirm redirect to `/onboarding`; create a firm.
3. Visit `/team`; send an invite to a second email address you control.
4. Open the invite link in a private/incognito window; sign up with that second email.
5. Confirm the invite preview shows the right firm name and role, accept it, and confirm landing in the app as that role.
6. Back in the first (Owner) session, confirm `/team` reflects two members.
7. Attempt to remove the Owner via `DELETE /api/orgs/{id}/members/{owner_clerk_user_id}` directly (e.g. via curl with a valid Owner bearer token) and confirm it returns 409, not 204.

Expected: every step succeeds as described; nothing 500s.

- [ ] **Step 3: Commit any fixes found during the walkthrough**

If anything above surfaced a bug, fix it, add a regression test if the bug wasn't already covered, and commit with a message describing the specific gap found — following this project's existing convention of a written root-cause note for any live-tested fix (see the retrieval/answering commits from Phase 2 for the expected level of detail).
