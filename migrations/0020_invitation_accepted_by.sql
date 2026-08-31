-- 0020_invitation_accepted_by.sql
-- Record WHICH account accepted an invitation, and backfill member addresses
-- only where that is not a guess.
--
-- Two things went wrong upstream of this file, and they compound.
--
-- 0013 added memberships.email (the address the daily reminder sweep delivers
-- to) and filled it from the invitations table on the day it ran.
-- accept_invitation never wrote it afterwards, so every member who joined
-- after that migration had a NULL address again -- the gap 0013 closed,
-- re-opening once per acceptance. That half is fixed in the code now:
-- accept_invitation records the address the invitation was sent to, which is
-- the address the accepting account has just proved it owns.
--
-- The other half is that a membership records nothing about the invitation it
-- came from, so 0013's backfill joined on the ORGANIZATION alone. With one
-- member and one invitation that is correct. With four seeded members and one
-- accepted invitation it writes one lawyer's address onto all four -- and an
-- address that belongs to somebody else is strictly worse than none, because
-- NULL is reported by the sweep while a wrong address is delivered to.
--
-- So: record the link going forward, and backfill history only where exactly
-- one accepted invitation faces exactly one member with no address. Anything
-- less certain than that is left NULL for the sweep to report, which is the
-- behaviour 0013's own comment describes as the intended one.

ALTER TABLE invitations ADD COLUMN accepted_by TEXT;

UPDATE memberships m
   SET email = sole.email
  FROM (
    SELECT i.organization_id, min(i.email) AS email
      FROM invitations i
     WHERE i.status = 'accepted'
     GROUP BY i.organization_id
    HAVING count(*) = 1
  ) AS sole
 WHERE sole.organization_id = m.organization_id
   AND m.email IS NULL
   AND (
     SELECT count(*) FROM memberships peer
      WHERE peer.organization_id = m.organization_id
        AND peer.email IS NULL
   ) = 1;
