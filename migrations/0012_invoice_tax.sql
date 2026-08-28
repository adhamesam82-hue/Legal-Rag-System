-- 0012_invoice_tax.sql
-- An Egyptian invoice carries tax. This one carried a single amount.
--
-- `invoices.amount` was the whole story, so there was nowhere to record VAT,
-- and the client's tax_id -- stored on the client record since 0006 -- never
-- reached the document that legally has to show it.
--
-- The rate is stored PER INVOICE rather than read from a setting at print
-- time. Rates change; a reissued 2024 invoice must show the rate that applied
-- in 2024, not today's. A setting would silently rewrite history every time
-- the law moved.
--
-- Existing invoices get rate 0 and tax 0, and their `amount` becomes both the
-- subtotal and the total. That is what they always were -- this does not
-- invent tax on bills already sent.
--
-- NOT the e-invoice system (منظومة الفاتورة الإلكترونية). This is the
-- arithmetic and the printed document; submitting to the ETA portal is an
-- integration, and a decision the firm has not made yet.

ALTER TABLE invoices
  ADD COLUMN tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0
    CHECK (tax_rate >= 0 AND tax_rate <= 1);

-- Held rather than computed on read: the stored figure is what was sent to
-- the client, and it must not drift if the rounding rule is ever adjusted.
ALTER TABLE invoices
  ADD COLUMN tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0
    CHECK (tax_amount >= 0);

-- `amount` keeps its meaning -- the sum of the lines, before tax -- and the
-- payable figure gets its own column so no reader has to guess which one a
-- given call site meant.
ALTER TABLE invoices
  ADD COLUMN total_amount NUMERIC(14, 2);

UPDATE invoices SET total_amount = amount WHERE total_amount IS NULL;

ALTER TABLE invoices ALTER COLUMN total_amount SET NOT NULL;
