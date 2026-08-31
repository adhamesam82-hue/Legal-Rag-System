-- 0018_organization_profile.sql
-- The firm's own details, which the settings screen has been collecting into
-- nothing.
--
-- /settings offered a commercial registration number, a phone, an address and
-- a logo, and organizations held `id, name, created_by, created_at`. There was
-- nowhere for any of it to go and no endpoint to send it to, so "Save changes"
-- made no request at all and the old values came back on reload.
--
-- All nullable: an organization created by POST /api/orgs supplies a name and
-- nothing else, and a firm that never opens the settings screen is not in an
-- invalid state.
--
-- `logo_url` rather than a bytea: the logo is served to a browser, and the one
-- thing this column must not become is a second, worse document store. Until
-- an upload target exists the settings screen keeps the picker disabled and
-- says why, which is the honest version of a control that cannot work.

ALTER TABLE organizations ADD COLUMN registration_number TEXT;
ALTER TABLE organizations ADD COLUMN phone               TEXT;
ALTER TABLE organizations ADD COLUMN address             TEXT;
ALTER TABLE organizations ADD COLUMN logo_url            TEXT;

-- Renames and detail edits are worth a timestamp of their own: the invoice
-- PDF carries the firm name, so "when did this change" is a question the
-- billing history can be asked to explain.
ALTER TABLE organizations
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
