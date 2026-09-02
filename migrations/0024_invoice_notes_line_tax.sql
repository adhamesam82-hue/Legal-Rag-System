-- 0024_invoice_notes_line_tax.sql
-- Two things an Egyptian invoice carries that this one could not: a note
-- under the totals (payment terms, a bank account, a reference the client
-- asked for), and tax that differs from one line to the next -- fees at the
-- standard rate on the same bill as a disbursement that carries none.
--
-- WHAT IS ALREADY SENT DOES NOT CHANGE
-- ------------------------------------
-- 0012 stored tax_rate, tax_amount and total_amount on the invoice so the
-- printed figures would never drift. This migration keeps that promise
-- literally: it adds columns with defaults and touches no existing row.
--
--   * Every existing line gets tax_rate 0 and tax_amount 0.
--   * invoices.tax_rate, tax_amount and total_amount are not read, not
--     recomputed, not rewritten. Before/after snapshots of
--     (id, number, amount, tax_amount, total_amount) must diff empty.
--
-- THE RULE FROM HERE ON (billing.py implements it; this is the statement)
-- -----------------------------------------------------------------------
-- If any line on an invoice carries a non-zero tax_rate, the invoice's tax
-- is the SUM of the lines' tax_amount, each computed and rounded once on its
-- own line, and invoices.tax_rate becomes a derived figure for display
-- (tax_amount / amount), no longer an input. If no line carries a rate, the
-- invoice-level rate applies to the subtotal exactly as it did before 0024.
-- Every invoice created before this migration is in the second case.

ALTER TABLE invoices
  ADD COLUMN notes TEXT NOT NULL DEFAULT '';

ALTER TABLE invoice_lines
  ADD COLUMN tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0
    CHECK (tax_rate >= 0 AND tax_rate <= 1);

-- Held, not computed on read, for the same reason as invoices.tax_amount:
-- the stored figure is the one on the page the client received.
ALTER TABLE invoice_lines
  ADD COLUMN tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0
    CHECK (tax_amount >= 0);
