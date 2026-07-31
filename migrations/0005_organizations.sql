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
