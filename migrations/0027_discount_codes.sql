-- 0027_discount_codes.sql
-- Discount codes (T-042), built the same way the plans page was built in
-- 0026: a real structure around a decision that is only half made. The
-- owner decided codes are wanted; the owner has not decided prices. So a
-- code is recorded, validated and stored on the firm -- and only the one
-- kind that has an effect BEFORE payment exists (extra trial days) is
-- actually applied here. A percent or fixed code is saved and shown as
-- "will apply once billing is enabled"; the arithmetic that turns it into
-- money happens in the payment-gateway ticket, in Decimal, against a real
-- price -- there is no real price to discount yet.

CREATE TABLE discount_codes (
    id SERIAL PRIMARY KEY,
    -- Stored as typed, case preserved for display; every lookup compares
    -- lower(code) (see the unique index below and orgs.apply_discount_code)
    -- so "WELCOME7" and "welcome7" are the same code, never two rows.
    code TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('percent', 'fixed', 'extra_trial_days')),
    -- percent: 0-100. fixed: an amount, in default_currency, once billing
    -- exists. extra_trial_days: whole days, applied immediately.
    value NUMERIC(10, 2) NOT NULL CHECK (value > 0),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    -- NULL = unlimited.
    max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
    uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Free text for whoever created the code by hand -- there is no admin
    -- UI in this ticket (see orgs.py); a script or psql is enough for a
    -- product owner minting a handful of launch codes.
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX discount_codes_code_ci_idx ON discount_codes (lower(code));

ALTER TABLE organizations ADD COLUMN discount_code_id INTEGER REFERENCES discount_codes(id);
ALTER TABLE organizations ADD COLUMN discount_applied_at TIMESTAMPTZ;
