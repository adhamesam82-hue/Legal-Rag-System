-- 0017_notification_channel.sql
-- Make a reminder's "already sent" record per CHANNEL.
--
-- 0013 created notification_sends with a `channel` column defaulting to
-- 'email', but left it out of the UNIQUE key:
--
--   UNIQUE (recipient, subject_kind, subject_id, offset_days, subject_date)
--
-- With one channel that was exactly right. With two it is a silent bug: the
-- morning email for tomorrow's hearing writes the row, and the push for the
-- same hearing then collides with it and is recorded as a duplicate. The
-- lawyer gets the mail and never gets the notification, and nothing anywhere
-- reports a failure -- the sweep believes it delivered both.
--
-- The column was there from the start and was always meant to be part of the
-- key; adding push is what turned the omission into a defect.
--
-- Backfill is a no-op: every existing row already reads 'email' by default,
-- so widening the key cannot collide with history.

ALTER TABLE notification_sends
  DROP CONSTRAINT notification_sends_recipient_subject_kind_subject_id_offset_key;

-- Channel last: the leading columns are still a usable prefix for the lookup
-- the sweep does most, which asks "was this reminder sent on this channel".
ALTER TABLE notification_sends
  ADD CONSTRAINT notification_sends_recipient_subject_offset_channel_key
  UNIQUE (recipient, subject_kind, subject_id, offset_days, subject_date, channel);

-- Named values rather than free text. A typo'd channel would not collide with
-- the correctly-spelled row, so every sweep would re-send on it forever.
ALTER TABLE notification_sends
  ADD CONSTRAINT notification_sends_channel_check
  CHECK (channel IN ('email', 'push'));
