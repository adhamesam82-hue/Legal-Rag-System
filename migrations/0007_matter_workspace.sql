-- 0007_matter_workspace.sql
-- Brings the matter record up to the shape a practice-management product is
-- expected to have. 0006 gave a matter documents, tasks, time, invoices and
-- notes; this adds the parts a firm actually runs a file on: a quotable matter
-- number, the people attached to the matter, disbursements, a communications
-- log, a client portal, a client-funds ledger, per-firm custom fields, and
-- conflict checks.
--
-- Same tenancy rules as 0006: everything hangs off organization_id, and people
-- are Clerk user ids (TEXT, no foreign key) because Clerk owns identity.

-- ---------------------------------------------------------------------------
-- Matter numbering
-- ---------------------------------------------------------------------------
-- A matter is quoted to clients, courts and on invoices by its number, so it
-- needs a stable display identity that is not the surrogate primary key.
--
-- Two columns rather than one: number_seq is the per-firm ordinal the next
-- number is derived from, matter_number is the display string a firm may
-- rewrite to its own convention. Deriving the next ordinal by parsing the
-- display string would break the moment someone renamed one.

ALTER TABLE matters ADD COLUMN number_seq    INTEGER;
ALTER TABLE matters ADD COLUMN matter_number TEXT;

-- Backfill: oldest matter in each firm becomes 00001, and so on.
WITH ordered AS (
  SELECT id,
         row_number() OVER (PARTITION BY organization_id ORDER BY created_at, id) AS seq
  FROM matters
)
UPDATE matters m
SET number_seq    = ordered.seq,
    matter_number = lpad(ordered.seq::text, 5, '0')
FROM ordered
WHERE ordered.id = m.id;

ALTER TABLE matters ALTER COLUMN number_seq    SET NOT NULL;
ALTER TABLE matters ALTER COLUMN matter_number SET NOT NULL;

ALTER TABLE matters ADD CONSTRAINT matters_number_seq_unique
  UNIQUE (organization_id, number_seq);
ALTER TABLE matters ADD CONSTRAINT matters_number_unique
  UNIQUE (organization_id, matter_number);

-- ---------------------------------------------------------------------------
-- Matter contacts
-- ---------------------------------------------------------------------------
-- Who is on this file. Two kinds of party exist and one table holds both:
-- a contact already on file at a client (contact_id set), or a party who only
-- exists on this matter -- opposing counsel, an expert, a court clerk -- and
-- so has no client_contacts row (contact_id NULL, name carried inline).

CREATE TABLE matter_contacts (
  id                BIGSERIAL PRIMARY KEY,
  matter_id         BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  contact_id        BIGINT REFERENCES client_contacts(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT '',
  relationship      TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  is_bill_recipient BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- An external party must carry its own name; a linked contact may inherit
  -- the name from client_contacts instead of duplicating it.
  CONSTRAINT matter_contacts_external_has_name
    CHECK (contact_id IS NOT NULL OR name <> '')
);

CREATE INDEX ON matter_contacts (matter_id);

-- Invoices go to exactly one party. Enforced here rather than in whichever
-- code path happens to be writing, same as client_contacts_one_primary.
CREATE UNIQUE INDEX matter_contacts_one_bill_recipient
  ON matter_contacts (matter_id) WHERE is_bill_recipient;

-- The same person must not be attached to a matter twice.
CREATE UNIQUE INDEX matter_contacts_unique_contact
  ON matter_contacts (matter_id, contact_id) WHERE contact_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Expenses (disbursements)
-- ---------------------------------------------------------------------------
-- The other half of a matter's billable activity. Court fees, filing fees,
-- expert retainers and travel are advanced by the firm and recovered on an
-- invoice exactly the way time is, which is why this mirrors time_entries
-- down to the invoice_id write-once column.

CREATE TABLE expenses (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  clerk_user_id    TEXT NOT NULL,
  entry_date       DATE NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL CHECK (category IN
                     ('court_fees', 'filing', 'expert', 'travel',
                      'translation', 'courier', 'other'))
                   DEFAULT 'other',
  quantity         NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_amount >= 0),
  -- Derived, not stored by the caller: a total that disagrees with its own
  -- quantity and rate is a billing dispute waiting to happen.
  amount           NUMERIC(14, 2) NOT NULL
                   GENERATED ALWAYS AS (quantity * unit_amount) STORED,
  billable         BOOLEAN NOT NULL DEFAULT TRUE,
  currency         TEXT NOT NULL DEFAULT 'EGP',
  -- Set once the expense is pulled onto an invoice, so it cannot be recovered
  -- from the client twice.
  invoice_id       BIGINT REFERENCES invoices(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON expenses (organization_id, entry_date DESC);
CREATE INDEX ON expenses (matter_id);
CREATE INDEX ON expenses (invoice_id);

-- ---------------------------------------------------------------------------
-- Communications log
-- ---------------------------------------------------------------------------
-- Every call and email on the file, so the record of what the client was told
-- and when survives the departure of whoever told them.

CREATE TABLE communications (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT REFERENCES matters(id) ON DELETE CASCADE,
  client_id        BIGINT REFERENCES clients(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL CHECK (channel IN ('phone', 'email', 'meeting', 'letter')),
  direction        TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  subject          TEXT NOT NULL DEFAULT '',
  body             TEXT NOT NULL DEFAULT '',
  -- Who was on the other end, as free text: often someone with no row in this
  -- database at all (a court registrar, opposing counsel's assistant).
  counterparty     TEXT NOT NULL DEFAULT '',
  logged_by        TEXT NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A duration only means something for a conversation; an email does not
  -- have one, and a row claiming otherwise is a data-entry error.
  CONSTRAINT communications_duration_needs_conversation
    CHECK (duration_minutes IS NULL OR channel IN ('phone', 'meeting'))
);

CREATE INDEX ON communications (organization_id, occurred_at DESC);
CREATE INDEX ON communications (matter_id, occurred_at DESC);
CREATE INDEX ON communications (client_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- Client portal
-- ---------------------------------------------------------------------------
-- A named contact's access to one matter. Access is granted per matter rather
-- than per client: a company's finance officer may see the billing file
-- without seeing the litigation one.

CREATE TABLE client_portals (
  id                 BIGSERIAL PRIMARY KEY,
  organization_id    BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id          BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  contact_id         BIGINT NOT NULL REFERENCES client_contacts(id) ON DELETE CASCADE,
  status             TEXT NOT NULL CHECK (status IN ('invited', 'active', 'revoked'))
                     DEFAULT 'invited',
  can_view_documents BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_bills     BOOLEAN NOT NULL DEFAULT FALSE,
  can_message        BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by         TEXT NOT NULL,
  invited_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at       TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ,
  last_active_at     TIMESTAMPTZ,
  -- One grant per person per matter; re-inviting updates the row rather than
  -- leaving two grants with different permissions to disagree.
  UNIQUE (matter_id, contact_id),
  CONSTRAINT client_portals_revoked_has_date
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE INDEX ON client_portals (organization_id, status);
CREATE INDEX ON client_portals (matter_id);

-- ---------------------------------------------------------------------------
-- Secure messages
-- ---------------------------------------------------------------------------
-- Threaded messages between the firm and a portal contact. Kept apart from
-- communications: that table is a log of things that happened elsewhere, this
-- one is a channel the product itself carries.

CREATE TABLE secure_message_threads (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  portal_id        BIGINT REFERENCES client_portals(id) ON DELETE SET NULL,
  subject          TEXT NOT NULL,
  created_by       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON secure_message_threads (matter_id, last_message_at DESC);

CREATE TABLE secure_messages (
  id                BIGSERIAL PRIMARY KEY,
  thread_id         BIGINT NOT NULL REFERENCES secure_message_threads(id) ON DELETE CASCADE,
  -- A message comes from a firm member (Clerk id) or from the client contact
  -- on the portal (client_contacts row). Exactly one of the two, never both.
  author_kind       TEXT NOT NULL CHECK (author_kind IN ('firm', 'client')),
  author_user       TEXT,
  author_contact_id BIGINT REFERENCES client_contacts(id) ON DELETE SET NULL,
  body              TEXT NOT NULL,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at           TIMESTAMPTZ,
  CONSTRAINT secure_messages_author_matches_kind CHECK (
    (author_kind = 'firm'   AND author_user IS NOT NULL AND author_contact_id IS NULL) OR
    (author_kind = 'client' AND author_user IS NULL     AND author_contact_id IS NOT NULL)
  )
);

CREATE INDEX ON secure_messages (thread_id, sent_at);

-- ---------------------------------------------------------------------------
-- Client funds (trust ledger)
-- ---------------------------------------------------------------------------
-- Money held on a client's behalf, which is not the firm's money. It is
-- tracked per matter because that is the unit a client asks about and the
-- unit a regulator reconciles.

CREATE TABLE trust_accounts (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  bank_name        TEXT NOT NULL DEFAULT '',
  account_number   TEXT NOT NULL DEFAULT '',
  currency         TEXT NOT NULL DEFAULT 'EGP',
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX trust_accounts_one_default
  ON trust_accounts (organization_id) WHERE is_default;

CREATE TABLE trust_transactions (
  id                BIGSERIAL PRIMARY KEY,
  organization_id   BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trust_account_id  BIGINT NOT NULL REFERENCES trust_accounts(id) ON DELETE RESTRICT,
  -- RESTRICT, not CASCADE: deleting a matter that still holds client money
  -- must fail loudly rather than erase the record of whose money it was.
  matter_id         BIGINT NOT NULL REFERENCES matters(id) ON DELETE RESTRICT,
  client_id         BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  kind              TEXT NOT NULL CHECK (kind IN
                      ('deposit', 'withdrawal', 'invoice_payment', 'refund')),
  -- Always positive; `kind` carries the sign. A signed amount plus a kind is
  -- two sources of truth for the same fact.
  amount            NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency          TEXT NOT NULL DEFAULT 'EGP',
  description       TEXT NOT NULL DEFAULT '',
  reference         TEXT NOT NULL DEFAULT '',
  invoice_id        BIGINT REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_date  DATE NOT NULL,
  recorded_by       TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Paying an invoice out of client funds must say which invoice.
  CONSTRAINT trust_transactions_payment_has_invoice
    CHECK (kind <> 'invoice_payment' OR invoice_id IS NOT NULL)
);

CREATE INDEX ON trust_transactions (organization_id, transaction_date DESC);
CREATE INDEX ON trust_transactions (matter_id, transaction_date DESC);
CREATE INDEX ON trust_transactions (client_id);

-- ---------------------------------------------------------------------------
-- Custom fields
-- ---------------------------------------------------------------------------
-- Firms track things this schema cannot anticipate -- a tax file number, a
-- referral source, a court circuit. Definitions are per firm; values hang off
-- a matter.

CREATE TABLE custom_field_definitions (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_key        TEXT NOT NULL,
  label            TEXT NOT NULL,
  field_type       TEXT NOT NULL CHECK (field_type IN
                     ('text', 'number', 'date', 'checkbox', 'select')),
  options          TEXT[] NOT NULL DEFAULT '{}',
  is_required      BOOLEAN NOT NULL DEFAULT FALSE,
  display_order    INTEGER NOT NULL DEFAULT 0,
  -- NULL applies the field to every matter; a value narrows it to one type,
  -- so a litigation-only field does not clutter a corporate matter.
  matter_type      TEXT CHECK (matter_type IS NULL OR matter_type IN
                     ('litigation', 'corporate', 'tax', 'labour',
                      'family_probate', 'contract_review')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, field_key),
  -- A choice list only means something for a select; anything else carrying
  -- options is a definition someone half-edited.
  CONSTRAINT custom_field_options_only_for_select
    CHECK (field_type = 'select' OR cardinality(options) = 0),
  CONSTRAINT custom_field_select_has_options
    CHECK (field_type <> 'select' OR cardinality(options) > 0)
);

CREATE INDEX ON custom_field_definitions (organization_id, display_order);

CREATE TABLE matter_custom_values (
  matter_id      BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  definition_id  BIGINT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  -- Every type serialised as text and parsed against the definition. One
  -- column per type would make "which column holds this field" a second
  -- source of truth alongside field_type.
  value          TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (matter_id, definition_id)
);

-- ---------------------------------------------------------------------------
-- Conflict checks
-- ---------------------------------------------------------------------------
-- Running the check is a professional obligation; recording that it was run,
-- against what, and by whom is what makes it defensible later.

CREATE TABLE conflict_checks (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  matter_id        BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  search_terms     TEXT[] NOT NULL DEFAULT '{}',
  result           TEXT NOT NULL CHECK (result IN
                     ('clear', 'potential_conflict', 'conflict')),
  -- What the search actually hit, kept as recorded rather than recomputed:
  -- the point of the record is what was known at the time.
  hit_summary      TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  run_by           TEXT NOT NULL,
  run_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  cleared_by       TEXT,
  cleared_at       TIMESTAMPTZ,
  -- A check is either signed off by someone, at a time, or by no one at all.
  CONSTRAINT conflict_checks_cleared_together
    CHECK ((cleared_by IS NULL) = (cleared_at IS NULL))
);

CREATE INDEX ON conflict_checks (matter_id, run_at DESC);
