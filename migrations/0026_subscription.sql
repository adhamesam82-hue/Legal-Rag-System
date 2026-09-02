-- 0026_subscription.sql
-- The free trial, and a place to record which paid plan a firm wants (T-041).
--
-- What is decided and what is not, as of 2 September 2026:
--   decided:   the free tier is a TIME-limited trial with every feature, not
--              a feature-limited tier; its length is a deployment setting
--              (LEGALOS_TRIAL_DAYS, default 14) so it can become 7 later with
--              a restart and no migration; a plans page and a payment page
--              exist on the path.
--   NOT decided: the paid plans' names, prices and limits; the payment
--              gateway; whether billing is monthly, yearly or both.
--
-- So this migration holds only what is decided, and says so where it
-- cannot avoid a placeholder:
--
-- plan: the firm's current tier. 'trial' is the only value anything writes
-- today. THE PAID NAMES ARE PROVISIONAL -- basic/pro/enterprise are
-- placeholders so the column has a shape; nothing sets them until a gateway
-- exists, and renaming them is a migration of this CHECK plus orgs.PLANS.
--
-- trial_ends_at: computed at creation as now() + the configured days, by
-- orgs.create_organization (the SQL below cannot read an environment
-- variable). NOT NULL after the backfill: a firm with no trial end is a
-- state the system does not know what to do with. Existing firms are
-- backfilled with the 14-day default from today, not NULL, for the same
-- reason -- and this one-time value is the default, not the env var, which
-- the ticket accepts: existing firms "take now + the duration".
--
-- plan_intent: what the owner picked on /plans BEFORE payment exists. An
-- intent, not a subscription -- it changes nothing about what the firm can
-- do, and it is NULL until an owner picks. The payment ticket, when the
-- gateway is chosen, is what turns an intent into a `plan`.
--
-- Expiry is a SIGNAL here, not a lock. Nothing in this migration or in the
-- API refuses a write after trial_ends_at: locking a firm out of its own
-- cases with no way to pay is real harm, and stays out of scope until the
-- plans and the gateway are decided.

ALTER TABLE organizations ADD COLUMN plan TEXT NOT NULL DEFAULT 'trial'
  CHECK (plan IN ('trial', 'basic', 'pro', 'enterprise'));

ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMPTZ;
UPDATE organizations SET trial_ends_at = now() + interval '14 days'
  WHERE trial_ends_at IS NULL;
ALTER TABLE organizations ALTER COLUMN trial_ends_at SET NOT NULL;

ALTER TABLE organizations ADD COLUMN plan_intent TEXT
  CHECK (plan_intent IS NULL OR plan_intent IN ('basic', 'pro', 'enterprise'));
