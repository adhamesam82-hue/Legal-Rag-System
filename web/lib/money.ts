/**
 * Piastre-safe money arithmetic for the invoice line editor (T-033).
 *
 * An invoice is the one document where a rounding difference becomes an
 * argument with a client -- the same reasoning src/legalrag/practice/
 * billing.py states for its own round_money(). This mirrors that policy in
 * the browser: every amount is rounded to the piastre exactly ONCE, at the
 * end of each computed figure, and only turned back into a plain number at
 * the edge, for display.
 *
 * "Once" is not decorative. billing.price_lines() keeps quantity and unit
 * price at full precision and rounds only the product -- it never rounds
 * unit_amount on its own first. Rounding the unit price to piastres BEFORE
 * multiplying by quantity is a second, earlier rounding this module used to
 * make, and it disagrees with the backend on real inputs: 3 x 33.335 is
 * 100.005 (rounds to 100.01, ROUND_HALF_UP), but 33.335 rounded to piastres
 * first is 33.34, and 3 x 33.34 is 100.02 -- a piastre off, on exactly the
 * kind of input the project's own invoice tests exist to catch
 * (tests/test_invoice_line_tax.py::test_each_line_is_rounded_once).
 *
 * `Math.round` after a multiply is not exact in IEEE-754 in general (33.33 *
 * 100 is 3332.9999999999995), but the error is many orders of magnitude
 * below the 0.5 a rounding decision turns on, so it still lands on the
 * correct integer -- this is the standard safe pattern for two-decimal
 * currency in JS PROVIDED every amount is rounded once, at the final
 * figure, never at an intermediate one.
 *
 * This is a *preview* only. The saved figures are whatever POST /invoices
 * echoes back after billing.price_lines/totals_of computed them in Decimal;
 * this module exists so the screen does not show something different while
 * the request is in flight.
 */

/** A decimal string or number to the nearest integer piastre. Invalid input is 0. */
export function toPiastres(value: string | number): number {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Integer piastres back to a plain number, for formatEGP et al. */
export function fromPiastres(piastres: number): number {
  return piastres / 100;
}

export interface DraftLine {
  quantity: string | number;
  unitAmount: string | number;
  /** A percentage (0-100), as the line-editor field reads -- not a fraction. */
  taxRatePercent: string | number;
}

export interface PricedLine {
  /** Rounded once, to the piastre -- quantity x unit price. */
  lineTotal: number;
  /** Rounded once, to the piastre -- lineTotal x rate. */
  taxAmount: number;
}

/** One line's arithmetic, in piastres. Mirrors billing.price_lines(): the
 *  product is rounded once, not the unit price and then the product. */
export function priceLine(line: DraftLine): PricedLine {
  const quantity = typeof line.quantity === "string" ? Number(line.quantity) : line.quantity;
  const unitAmount =
    typeof line.unitAmount === "string" ? Number(line.unitAmount) : line.unitAmount;
  const ratePercent =
    typeof line.taxRatePercent === "string" ? Number(line.taxRatePercent) : line.taxRatePercent;
  const lineTotal =
    Number.isFinite(quantity) && Number.isFinite(unitAmount)
      ? Math.round(quantity * unitAmount * 100)
      : 0;
  const taxAmount = Number.isFinite(ratePercent)
    ? Math.round(lineTotal * (ratePercent / 100))
    : 0;
  return { lineTotal, taxAmount };
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/** Every line's totals, summed. Mirrors billing.totals_of() for the
 *  per-line-tax case, which is the only case the create dialog offers. */
export function totalsOf(lines: DraftLine[]): InvoiceTotals {
  const priced = lines.map(priceLine);
  const subtotal = priced.reduce((sum, p) => sum + p.lineTotal, 0);
  const tax = priced.reduce((sum, p) => sum + p.taxAmount, 0);
  return { subtotal, tax, total: subtotal + tax };
}
