-- 0006_practice.sql
-- Practice-management tables: the firm-operations half of LegalOS, as opposed
-- to the statute corpus in 0001-0004.
--
-- Every table is tenant-scoped by organization_id against the organizations
-- table from 0005. People are referenced by Clerk user id (TEXT, no foreign
-- key) for the same reason memberships does it: Clerk owns identity, this
-- database does not.
--
-- Terminology, per PRODUCT.md: a "matter" is the core practice record; a
-- "case" is the litigation-specific record a matter may hold (court, judge,
-- case number, opposing party). One matter has at most one case.

-- Display identity for the roster. Clerk knows a user's name but not their
-- title at this firm, and rendering a member list must not require a Clerk
-- API round-trip per row.
ALTER TABLE memberships ADD COLUMN display_name TEXT;
ALTER TABLE memberships ADD COLUMN title TEXT;

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------

CREATE TABLE clients (
  id                   BIGSERIAL PRIMARY KEY,
  organization_id      BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  client_type          TEXT NOT NULL CHECK (client_type IN ('company', 'individual')),
  industry             TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  client_since         DATE,
  registration_number  TEXT,
  tax_id               TEXT,
  address              TEXT NOT NULL DEFAULT '',
  phone                TEXT NOT NULL DEFAULT '',
  email                TEXT NOT NULL DEFAULT '',
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON clients (organization_id, status);

CREATE TABLE client_contacts (
  id           BIGSERIAL PRIMARY KEY,
  client_id    BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON client_contacts (client_id);

-- At most one primary contact per client, enforced by the database rather
-- than by whichever code path happens to be writing.
CREATE UNIQUE INDEX client_contacts_one_primary
  ON client_contacts (client_id) WHERE is_primary;

-- ---------------------------------------------------------------------------
-- Matters
-- ---------------------------------------------------------------------------

CREATE TABLE matters (
  id                 BIGSERIAL PRIMARY KEY,
  organization_id    BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id          BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name               TEXT NOT NULL,
  matter_type        TEXT NOT NULL CHECK (matter_type IN
                       ('litigation', 'corporate', 'tax', 'labour',
                        'family_probate', 'contract_review')),
  status             TEXT NOT NULL CHECK (status IN ('active', 'on_hold', 'closed'))
                     DEFAULT 'active',
  responsible_user   TEXT NOT NULL,
  opened_date        DATE NOT NULL,
  closed_date        DATE,
  description        TEXT NOT NULL DEFAULT '',
  billing_type       TEXT NOT NULL CHECK (billing_type IN ('hourly', 'fixed_fee', 'retainer')),
  budget_amount      NUMERIC(14, 2),
  budget_is_estimate BOOLEAN NOT NULL DEFAULT FALSE,
  tags               TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A closed matter must record when it closed; an open one must not claim to.
  CONSTRAINT matters_closed_date_matches_status
    CHECK ((status = 'closed') = (closed_date IS NOT NULL))
);

CREATE INDEX ON matters (organization_id, status);
CREATE INDEX ON matters (client_id);

CREATE TABLE matter_staff (
  matter_id   BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  PRIMARY KEY (matter_id, clerk_user_id)
);

-- ---------------------------------------------------------------------------
-- Cases (litigation detail hanging off a matter)
-- ---------------------------------------------------------------------------

CREATE TABLE cases (
  id                BIGSERIAL PRIMARY KEY,
  organization_id   BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id         BIGINT NOT NULL UNIQUE REFERENCES matters(id) ON DELETE CASCADE,
  court             TEXT NOT NULL,
  judge             TEXT NOT NULL DEFAULT '',
  case_number       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT '',
  opposing_party    TEXT NOT NULL DEFAULT '',
  opposing_counsel  TEXT,
  filed_date        DATE NOT NULL,
  ai_summary        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON cases (organization_id);

CREATE TABLE case_timeline_events (
  id          BIGSERIAL PRIMARY KEY,
  case_id     BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_date  DATE NOT NULL,
  label       TEXT NOT NULL,
  detail      TEXT
);

CREATE INDEX ON case_timeline_events (case_id, event_date);

CREATE TABLE case_deadlines (
  id          BIGSERIAL PRIMARY KEY,
  case_id     BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  due_date    DATE NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ON case_deadlines (case_id, due_date);

CREATE TABLE case_evidence (
  id             BIGSERIAL PRIMARY KEY,
  case_id        BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  evidence_type  TEXT NOT NULL DEFAULT '',
  submitted_by   TEXT NOT NULL CHECK (submitted_by IN ('us', 'opposing_party', 'court')),
  submitted_date DATE NOT NULL
);

CREATE INDEX ON case_evidence (case_id);

CREATE TABLE court_documents (
  id          BIGSERIAL PRIMARY KEY,
  case_id     BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  doc_type    TEXT NOT NULL DEFAULT '',
  doc_date    DATE NOT NULL
);

CREATE INDEX ON court_documents (case_id);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

CREATE TABLE documents (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT REFERENCES matters(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  doc_type         TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL CHECK (status IN
                     ('draft', 'under_review', 'signed', 'filed', 'final'))
                   DEFAULT 'draft',
  size_bytes       BIGINT NOT NULL DEFAULT 0,
  content_type     TEXT NOT NULL DEFAULT 'application/octet-stream',
  -- Relative path under the configured document root. NULL means the row is
  -- metadata for a document whose bytes were never uploaded (seeded sample
  -- content, or a placeholder created ahead of the file).
  storage_key      TEXT,
  uploaded_by      TEXT NOT NULL,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON documents (organization_id, uploaded_at DESC);
CREATE INDEX ON documents (matter_id);

-- ---------------------------------------------------------------------------
-- Calendar: hearings
-- ---------------------------------------------------------------------------

CREATE TABLE hearings (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  hearing_date     DATE NOT NULL,
  hearing_time     TEXT NOT NULL DEFAULT '',
  court            TEXT NOT NULL DEFAULT '',
  purpose          TEXT NOT NULL DEFAULT '',
  outcome          TEXT
);

CREATE INDEX ON hearings (organization_id, hearing_date);
CREATE INDEX ON hearings (matter_id);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

CREATE TABLE tasks (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT REFERENCES matters(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  assignee         TEXT NOT NULL,
  due_date         DATE,
  status           TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done'))
                   DEFAULT 'todo',
  priority         TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high'))
                   DEFAULT 'medium',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX ON tasks (organization_id, status, due_date);
CREATE INDEX ON tasks (matter_id);
CREATE INDEX ON tasks (assignee);

-- ---------------------------------------------------------------------------
-- Time tracking
-- ---------------------------------------------------------------------------

CREATE TABLE time_entries (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  clerk_user_id    TEXT NOT NULL,
  entry_date       DATE NOT NULL,
  hours            NUMERIC(6, 2) NOT NULL CHECK (hours > 0),
  description      TEXT NOT NULL DEFAULT '',
  billable         BOOLEAN NOT NULL DEFAULT TRUE,
  rate             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'EGP',
  -- Set once the entry is pulled onto an invoice, so the same hour cannot be
  -- billed twice.
  invoice_id       BIGINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON time_entries (organization_id, entry_date DESC);
CREATE INDEX ON time_entries (matter_id);
CREATE INDEX ON time_entries (clerk_user_id);

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------

CREATE TABLE invoices (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT REFERENCES matters(id) ON DELETE SET NULL,
  client_id        BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  number           TEXT NOT NULL,
  amount           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'EGP',
  status           TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue'))
                   DEFAULT 'draft',
  issued_date      DATE NOT NULL,
  due_date         DATE NOT NULL,
  paid_date        DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Invoice numbers are quoted to clients and appear on filings; they must be
  -- unique within the firm, not merely unique-ish.
  UNIQUE (organization_id, number)
);

CREATE INDEX ON invoices (organization_id, status);
CREATE INDEX ON invoices (client_id);
CREATE INDEX ON invoices (matter_id);

ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_invoice_fk
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX ON time_entries (invoice_id);

CREATE TABLE invoice_lines (
  id            BIGSERIAL PRIMARY KEY,
  invoice_id    BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  quantity      NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total    NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE INDEX ON invoice_lines (invoice_id);

-- ---------------------------------------------------------------------------
-- Notes, activity, matter timeline
-- ---------------------------------------------------------------------------

CREATE TABLE matter_notes (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  author           TEXT NOT NULL,
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON matter_notes (matter_id, created_at DESC);

-- Append-only audit trail. `actor` is a Clerk user id, or the literal
-- 'system:ai' for AI-generated entries, which is why it is not constrained
-- to the memberships table.
CREATE TABLE activity (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT REFERENCES matters(id) ON DELETE CASCADE,
  client_id        BIGINT REFERENCES clients(id) ON DELETE CASCADE,
  actor            TEXT NOT NULL,
  action           TEXT NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON activity (organization_id, occurred_at DESC);
CREATE INDEX ON activity (matter_id, occurred_at DESC);
CREATE INDEX ON activity (client_id, occurred_at DESC);

CREATE TABLE matter_timeline_events (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  event_date       DATE NOT NULL,
  label            TEXT NOT NULL,
  detail           TEXT,
  kind             TEXT NOT NULL CHECK (kind IN
                     ('milestone', 'filing', 'communication', 'billing'))
);

CREATE INDEX ON matter_timeline_events (matter_id, event_date);
