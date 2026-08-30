-- 0014_client_portal_access.sql
-- How a client actually gets in.
--
-- client_portals has recorded permissions since 0007 -- can_view_documents,
-- can_view_bills, can_message -- and nothing ever consumed them, because there
-- was no way for a client to reach the product at all. The firm's half was
-- built; the client's half did not exist.
--
-- NO THIRD IDENTITY PROVIDER
--
-- Clerk signs in firms, Firebase signs in the consumer app. Adding a third for
-- clients would mean a third set of credentials to store, reset, support and
-- breach. A client following one case does not want an account; they want to
-- see their case.
--
-- So: a signed link. A random secret per portal grant, mailed to the contact,
-- carrying exactly the access the firm granted on that one matter and nothing
-- else. Revoking is setting status.
--
-- THE SECRET IS STORED HASHED
--
-- The plaintext is returned once, at the moment it is created, so it can be
-- put in an email. After that only its SHA-256 is on disk, so a dump of this
-- table hands over no live access. Losing the link means the firm re-issues
-- one, which is the same gesture as inviting.
--
-- Expiry is a backstop, not the control. The firm revokes; the clock only
-- catches grants everybody forgot about.

ALTER TABLE client_portals ADD COLUMN access_token_hash TEXT;
ALTER TABLE client_portals ADD COLUMN token_issued_at TIMESTAMPTZ;
ALTER TABLE client_portals ADD COLUMN token_expires_at TIMESTAMPTZ;

-- Lookup is by hash on every client request, so it needs to be quick and it
-- must not permit two grants to share a secret.
CREATE UNIQUE INDEX client_portals_token_idx
  ON client_portals (access_token_hash)
  WHERE access_token_hash IS NOT NULL;

-- --------------------------------------------------------------------------
-- Per-document visibility
-- --------------------------------------------------------------------------
--
-- can_view_documents is all-or-nothing, and no firm wants that: a client
-- should see the filed pleading and not the internal note assessing their
-- chances. So each document carries its own flag and the portal permission
-- gates the whole set above it.
--
-- Default FALSE, deliberately. A document becomes visible because somebody
-- decided it should, never because nobody thought about it -- the opposite
-- default would publish the firm's working papers the day the portal opens.

ALTER TABLE documents
  ADD COLUMN visible_to_client BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX documents_client_visible_idx
  ON documents (matter_id) WHERE visible_to_client;
