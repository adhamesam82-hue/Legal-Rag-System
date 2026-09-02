-- 0025_organization_settings.sql
-- The settings screen described in the spec (§5) against a table that held
-- four profile fields (0018) and a specialties list (0021). Everything the
-- screen will show needs a column first: no field without a backend.
--
-- All of it is optional or defaulted. A firm that never opens /settings is
-- not in an invalid state, and every existing organization reads back with
-- NULLs and defaults, nothing else changed.
--
-- Closed lists are CHECKed here as well as validated in orgs.py, so a value
-- outside them cannot arrive by any path. Free text is bounded in the API.
--
-- default_tax_rate IS A PREFERENCE, NOT A SOURCE. Every invoice has stored
-- its own rate since 0012 because a 2024 bill reprinted must show 2024's
-- rate. This column pre-fills the form on creation and is never read when
-- printing. Same for default_payment_terms_days.
--
-- locale defaults to Arabic: the product is Egyptian and so is the visitor
-- it expects (§7). timezone defaults to Cairo for the same reason.
--
-- invoice_number_pattern: NULL means the built-in INV-{year}-{seq}. When
-- set, billing.next_invoice_number renders it -- the column is read, not
-- merely stored. The API requires the pattern to end in {seq} so the
-- sequence can be parsed back out of the last number issued.
--
-- required_fields: a closed-shape JSON object -- keys "matter" and
-- "client", values lists of known optional field names -- validated in
-- orgs.py so the settings row never becomes a dumping ground.
--
-- Deliberately absent (recorded here so nobody looks for them):
--   * notification preferences: memberships.wants_reminders (0013) and the
--     FCM channel (0016, 0017) already exist; the screen wires those.
--   * a calendar-feed column: read-only ICS needs no state.
--   * export / delete-account: an irreversible action that deserves its own
--     design (grace period, confirmation, export first), not a column here.

-- --- firm profile -----------------------------------------------------------

ALTER TABLE organizations ADD COLUMN governorate TEXT;
ALTER TABLE organizations ADD COLUMN main_court  TEXT;
ALTER TABLE organizations ADD COLUMN firm_size   TEXT
  CHECK (firm_size IS NULL OR firm_size IN ('solo', 'small', 'medium', 'large'));
ALTER TABLE organizations ADD COLUMN client_kind TEXT
  CHECK (client_kind IS NULL OR client_kind IN ('individuals', 'companies', 'mixed'));

-- --- identity ---------------------------------------------------------------

ALTER TABLE organizations ADD COLUMN legal_name  TEXT;
ALTER TABLE organizations ADD COLUMN tax_id      TEXT;
ALTER TABLE organizations ADD COLUMN bar_number  TEXT;
ALTER TABLE organizations ADD COLUMN website     TEXT;
-- A palette name, never a free hex: the design system's contrast rules (§6)
-- hold only for its own colours. Same nine names as document_tags.color.
ALTER TABLE organizations ADD COLUMN brand_color TEXT
  CHECK (brand_color IS NULL OR brand_color IN
    ('blue', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow'));

-- --- preferences ------------------------------------------------------------

ALTER TABLE organizations ADD COLUMN locale TEXT NOT NULL DEFAULT 'ar'
  CHECK (locale IN ('ar', 'en'));
ALTER TABLE organizations ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Africa/Cairo';
ALTER TABLE organizations ADD COLUMN date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY'
  CHECK (date_format IN ('DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'));
ALTER TABLE organizations ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'EGP'
  CHECK (default_currency ~ '^[A-Z]{3}$');

-- --- billing defaults -------------------------------------------------------

ALTER TABLE organizations ADD COLUMN invoice_number_pattern TEXT;
ALTER TABLE organizations ADD COLUMN default_tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0
  CHECK (default_tax_rate >= 0 AND default_tax_rate <= 1);
ALTER TABLE organizations ADD COLUMN default_payment_terms_days INTEGER NOT NULL DEFAULT 30
  CHECK (default_payment_terms_days >= 0);

-- --- required fields --------------------------------------------------------

ALTER TABLE organizations ADD COLUMN required_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
