-- 0010_egyptian_litigation_shape.sql
-- Four things an Egyptian practice needs that the schema had no room for.
--
-- 1. THE POWER OF ATTORNEY
--
-- A lawyer here does not act without a توكيل. It is filed at the شهر عقاري,
-- it has a number and a date, and its type decides what may be done under it:
-- عام (general), خاص (special, one matter), or توكيل قضايا (litigation).
-- Nothing in the schema recorded one, so the single document that authorises
-- the firm to act at all lived outside the system that runs the firm.
--
-- Hung off the client rather than the matter: one توكيل commonly covers
-- several matters for the same client, and a matter can point at whichever one
-- authorises it.
--
-- 2. THE CASE NUMBER
--
-- An Egyptian case is cited as "رقم 1234 لسنة 2025 مدني كلي" -- a number, a
-- *judicial* year, and the court category. `case_number TEXT` held all three
-- crammed together, which made "show me this year's cases" impossible to ask
-- and per-column filtering impossible to build.
--
-- The judicial year is not the filing date's year: a case filed in December
-- 2024 and registered in the 2025 judicial year carries 2025. So it is stored,
-- not derived. Backfilled from the number where the old text happens to
-- contain a year, and left NULL otherwise for a human to correct -- guessing
-- would produce confident wrong citations, which is the failure this whole
-- product exists to avoid.
--
-- 3. THE DEGREE OF LITIGATION
--
-- ابتدائي / استئناف / نقض. It decides which deadlines apply and which court
-- hears what, and it was absent entirely.
--
-- 4. THE HEARING OUTCOME
--
-- Egyptian hearing outcomes are a known, short list, not free prose:
-- تأجيل (with a reason), حجز للحكم, النطق بالحكم, شطب, ضم. As TEXT it could
-- not be filtered, counted, or used to drive a reminder. The old free text is
-- preserved in outcome_note rather than discarded.

-- --------------------------------------------------------------------------
-- 1. Powers of attorney
-- --------------------------------------------------------------------------

CREATE TABLE powers_of_attorney (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  poa_number       TEXT NOT NULL,
  poa_type         TEXT NOT NULL CHECK (poa_type IN ('general', 'special', 'litigation')),
  issued_on        DATE NOT NULL,
  -- The notary office that authenticated it (مكتب الشهر العقاري).
  notary_office    TEXT NOT NULL DEFAULT '',
  -- Most توكيلات do not expire; the ones that do, do.
  expires_on       DATE,
  -- The scan, once uploaded. ON DELETE SET NULL: losing the image must not
  -- take the record of the authority with it.
  scan_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, poa_number)
);

CREATE INDEX ON powers_of_attorney (organization_id, client_id);
CREATE INDEX ON powers_of_attorney (organization_id, expires_on);

-- Which authority a matter is being run under. Nullable: a matter can be
-- opened before the توكيل is signed, and advisory work may never need one.
-- ON DELETE SET NULL so deleting a superseded توكيل does not delete matters.
ALTER TABLE matters
  ADD COLUMN power_of_attorney_id BIGINT
    REFERENCES powers_of_attorney(id) ON DELETE SET NULL;

CREATE INDEX ON matters (power_of_attorney_id);

-- --------------------------------------------------------------------------
-- 2 & 3. Case number, judicial year, category, degree
-- --------------------------------------------------------------------------

ALTER TABLE cases ADD COLUMN judicial_year INT;
ALTER TABLE cases ADD COLUMN case_category TEXT NOT NULL DEFAULT '';
ALTER TABLE cases
  ADD COLUMN litigation_degree TEXT NOT NULL DEFAULT 'first_instance'
    CHECK (litigation_degree IN ('first_instance', 'appeal', 'cassation'));

-- Pull a four-digit year out of the existing free text where one is there.
-- Anything else stays NULL: a case whose year we cannot read is one a human
-- has to look at, and inventing it would be worse than leaving it blank.
UPDATE cases
   SET judicial_year = CAST(substring(case_number FROM '\d{4}') AS INT)
 WHERE substring(case_number FROM '\d{4}') IS NOT NULL
   AND CAST(substring(case_number FROM '\d{4}') AS INT) BETWEEN 1900 AND 2100;

CREATE INDEX ON cases (organization_id, judicial_year);
CREATE INDEX ON cases (organization_id, litigation_degree);

-- --------------------------------------------------------------------------
-- 4. Hearing outcome
-- --------------------------------------------------------------------------

ALTER TABLE hearings RENAME COLUMN outcome TO outcome_note;

ALTER TABLE hearings ADD COLUMN outcome TEXT
  CHECK (outcome IS NULL OR outcome IN (
    'adjourned',        -- تأجيل
    'reserved',         -- حجز للحكم
    'judgment',         -- النطق بالحكم
    'struck_out',       -- شطب
    'joined',           -- ضم
    'other'
  ));

-- When a hearing is adjourned, the date it was adjourned TO. This is the
-- single most useful fact on the record and there was nowhere to put it.
ALTER TABLE hearings ADD COLUMN next_hearing_date DATE;

-- Classify what is already there. Deliberately conservative: a note that does
-- not clearly say one of these keeps its text and gets no code, because a
-- wrong outcome on a court record is worse than a missing one.
UPDATE hearings SET outcome = 'adjourned'
 WHERE outcome_note LIKE '%تأجيل%' OR outcome_note LIKE '%أجلت%' OR outcome_note LIKE '%اجلت%';
UPDATE hearings SET outcome = 'reserved'
 WHERE outcome IS NULL AND outcome_note LIKE '%حجز%للحكم%';
UPDATE hearings SET outcome = 'judgment'
 WHERE outcome IS NULL AND (outcome_note LIKE '%النطق بالحكم%' OR outcome_note LIKE '%صدر الحكم%');
UPDATE hearings SET outcome = 'struck_out'
 WHERE outcome IS NULL AND outcome_note LIKE '%شطب%';
UPDATE hearings SET outcome = 'joined'
 WHERE outcome IS NULL AND outcome_note LIKE '%ضم%';

CREATE INDEX ON hearings (organization_id, outcome);

-- --------------------------------------------------------------------------
-- 5. Matter types Egypt actually has
-- --------------------------------------------------------------------------
--
-- criminal (جنائي), administrative (إداري/مجلس الدولة), execution (تنفيذ) and
-- arbitration (تحكيم) were missing. contract_review stays for now -- it is a
-- task rather than a type of matter, but removing it would orphan existing
-- rows, and that is a data decision for the firm, not a migration.

ALTER TABLE matters DROP CONSTRAINT IF EXISTS matters_matter_type_check;
ALTER TABLE matters ADD CONSTRAINT matters_matter_type_check
  CHECK (matter_type IN (
    'litigation', 'corporate', 'tax', 'labour', 'family_probate',
    'contract_review', 'criminal', 'administrative', 'execution', 'arbitration'
  ));
