-- 0013_reminders.sql
-- So the system stops holding a hearing date without telling anyone.
--
-- Missing a sitting is a professional failure, and until now the product
-- stored the date and said nothing. A diary that does not remind is worse than
-- a paper one, because the lawyer believes it is watching.
--
-- ONE TABLE, AND IT IS ABOUT NOT SENDING TWICE
--
-- The sweep runs daily and is not transactional with the send: a crash between
-- "email accepted by Resend" and "row written" must not re-send tomorrow, and
-- a rerun after a fixed bug must not spam a firm with yesterday's reminders.
-- So a row is written per (recipient, thing, offset) and the unique index --
-- not application logic -- is what makes the sweep idempotent. Run it five
-- times in a morning and each person gets each reminder once.
--
-- `offset_days` is part of the key on purpose: three-days-before and
-- morning-of are different reminders about the same hearing, and collapsing
-- them would silently drop the second one.
--
-- No per-user preferences table yet. Everyone on a matter gets the standard
-- offsets, which is the right default for a first firm and one column away
-- from being configurable once one asks.

CREATE TABLE notification_sends (
  id              BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Who it went to. A Clerk user id, matching matter_staff and tasks.assignee.
  recipient       TEXT NOT NULL,
  -- What it was about: 'hearing' | 'deadline' | 'task'.
  subject_kind    TEXT NOT NULL CHECK (subject_kind IN ('hearing', 'deadline', 'task')),
  subject_id      BIGINT NOT NULL,
  -- How many days ahead this particular reminder was for. 0 is the morning of.
  offset_days     INT NOT NULL,
  -- The date being reminded ABOUT, not the date sent. A hearing that gets
  -- adjourned to a new date is a new reminder, not a duplicate of the old one.
  subject_date    DATE NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'email',
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipient, subject_kind, subject_id, offset_days, subject_date)
);

CREATE INDEX ON notification_sends (organization_id, sent_at);

-- Where to send. Clerk holds the email but the sweep runs without a Clerk
-- session and one API call per recipient per night is both slow and a
-- dependency on Clerk being up to send a court reminder.
--
-- Nullable: a membership created by accepting an invitation has the address
-- already, and this is backfilled from invitations where one exists. Anyone
-- without it is reported by the sweep rather than skipped silently -- a lawyer
-- who never gets reminders must not be invisible.
ALTER TABLE memberships ADD COLUMN email TEXT;

UPDATE memberships m
   SET email = i.email
  FROM invitations i
 WHERE i.organization_id = m.organization_id
   AND i.status = 'accepted'
   AND m.email IS NULL;

-- Opt out per person. Defaults to on: a reminder nobody asked for is a minor
-- annoyance, a missed hearing is not.
ALTER TABLE memberships
  ADD COLUMN wants_reminders BOOLEAN NOT NULL DEFAULT TRUE;
