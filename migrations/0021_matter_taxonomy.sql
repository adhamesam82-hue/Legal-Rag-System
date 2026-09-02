-- 0021_matter_taxonomy.sql
-- One classification for what a firm does and what a matter is.
--
-- matter_type held ten values after 0010, and the list still had no room for
-- most of what an Egyptian practice actually files: civil, commercial, real
-- estate and intellectual property were all missing, while "litigation" stood
-- in for the first two at once -- a procedural posture doing the job of a
-- subject area. And nothing on `organizations` said what the firm practises,
-- so there was no way to offer a firm the matter types it uses or to report
-- matters by specialty.
--
-- The same fourteen values now serve both: a matter has one, a firm has any
-- number. Sharing the list is the point -- a report of "matters by specialty"
-- or a picker filtered to the firm's practice areas needs no mapping table.
--
-- Two old values are renamed, because their new names say what they are:
--   family_probate  -> family_personal_status   (أحوال شخصية, the court's own term)
--   contract_review -> advisory                 (a task, not a type; the type is
--                                                advisory work, which includes it)
--
-- `litigation` is NOT mapped to anything. Every row carrying it was civil,
-- criminal or commercial in the lawyer's head, and this migration cannot know
-- which. Guessing "civil" would put a criminal defence on the wrong reports
-- silently. Dropping to "other" would lose the one thing that is known: that
-- it was litigation. So it becomes `legacy_litigation`, which reads as
-- "تقاضٍ (غير مصنَّف)", is accepted by the CHECK so the rows survive, and is
-- rejected by the API on create so no new row can take it. The firm
-- reclassifies each one when it next opens it.
--
-- specialties is TEXT[] with an array-level CHECK rather than a join table:
-- it is a small closed set edited from one settings screen, never queried
-- by itself. `<@` against the literal list rejects any element outside it,
-- and legacy_litigation is deliberately absent from that list -- a firm does
-- not practise "unclassified".

-- ---------------------------------------------------------------------------
-- 1. Rename the two values whose new names are unambiguous
-- ---------------------------------------------------------------------------

ALTER TABLE matters DROP CONSTRAINT IF EXISTS matters_matter_type_check;

UPDATE matters SET matter_type = 'family_personal_status' WHERE matter_type = 'family_probate';
UPDATE matters SET matter_type = 'advisory'               WHERE matter_type = 'contract_review';
UPDATE matters SET matter_type = 'legacy_litigation'      WHERE matter_type = 'litigation';

-- ---------------------------------------------------------------------------
-- 2. The fourteen, plus the one legacy marker
-- ---------------------------------------------------------------------------

ALTER TABLE matters ADD CONSTRAINT matters_matter_type_check
  CHECK (matter_type IN (
    'civil', 'criminal', 'commercial', 'corporate', 'real_estate',
    'intellectual_property', 'administrative', 'family_personal_status',
    'labour', 'tax', 'arbitration', 'execution', 'advisory', 'other',
    -- Readable, never writable through the API. See the header.
    'legacy_litigation'
  ));

-- ---------------------------------------------------------------------------
-- 3. What the firm practises
-- ---------------------------------------------------------------------------

ALTER TABLE organizations
  ADD COLUMN specialties TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE organizations ADD CONSTRAINT organizations_specialties_check
  CHECK (specialties <@ ARRAY[
    'civil', 'criminal', 'commercial', 'corporate', 'real_estate',
    'intellectual_property', 'administrative', 'family_personal_status',
    'labour', 'tax', 'arbitration', 'execution', 'advisory', 'other'
  ]::text[]);

-- ---------------------------------------------------------------------------
-- 4. Custom-field definitions scoped to a matter type (0007)
-- ---------------------------------------------------------------------------
--
-- Their CHECK still listed the original six -- 0010 widened matters but not
-- this table, so a field scoped to "criminal" has been impossible since. It
-- now follows the same list, and the rows scoped to renamed values follow
-- their matters, or they would apply to nothing.

ALTER TABLE custom_field_definitions
  DROP CONSTRAINT IF EXISTS custom_field_definitions_matter_type_check;

UPDATE custom_field_definitions SET matter_type = 'family_personal_status'
 WHERE matter_type = 'family_probate';
UPDATE custom_field_definitions SET matter_type = 'advisory'
 WHERE matter_type = 'contract_review';
UPDATE custom_field_definitions SET matter_type = 'legacy_litigation'
 WHERE matter_type = 'litigation';

ALTER TABLE custom_field_definitions
  ADD CONSTRAINT custom_field_definitions_matter_type_check
  CHECK (matter_type IS NULL OR matter_type IN (
    'civil', 'criminal', 'commercial', 'corporate', 'real_estate',
    'intellectual_property', 'administrative', 'family_personal_status',
    'labour', 'tax', 'arbitration', 'execution', 'advisory', 'other',
    'legacy_litigation'
  ));
