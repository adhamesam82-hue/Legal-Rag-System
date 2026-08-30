-- 0016_device_tokens.sql
-- Where to push a notification, once there is an app to push to.
--
-- The reminder sweep (0013) already decides WHO to tell and WHEN; it just has
-- one channel, email. This is the second channel's address book, and it exists
-- now rather than with the mobile app because it is the piece the app cannot
-- build for itself: a Flutter client can register a token on sign-in, but only
-- if there is somewhere to register it.
--
-- The token is FCM's, whatever the platform -- one vendor for web push, iOS
-- and Android, which is the roadmap's standing decision and the reason there
-- is one table rather than three.
--
-- A token is NOT a person. One lawyer has a phone, a tablet and a browser, and
-- the same device can later belong to somebody else at the firm, so the unique
-- key is the token and the owner is a column that can change. Re-registering a
-- token that moved hands reassigns it rather than duplicating it, which is
-- what stops a reminder reaching the wrong person's lock screen.

CREATE TABLE device_tokens (
  id              BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- A Clerk user id, matching matter_staff and tasks.assignee.
  subject         TEXT NOT NULL,
  token           TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  -- What the person would see in a "your devices" list. Free text from the
  -- client; never trusted for anything but display.
  device_label    TEXT NOT NULL DEFAULT '',
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Touched on every registration. A token FCM has been rejecting for months
  -- is a dead device, and the sweep prunes on that rather than guessing.
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX ON device_tokens (organization_id, subject);
CREATE INDEX ON device_tokens (last_seen_at);

-- Which channels a person wants. Email defaults on for the reason 0013 gives:
-- a reminder nobody asked for is an annoyance, a missed hearing is not. Push
-- defaults on too, but is inert until a device is registered -- so the default
-- costs nothing and the setting is there when the app arrives.
ALTER TABLE memberships
  ADD COLUMN wants_push BOOLEAN NOT NULL DEFAULT TRUE;
