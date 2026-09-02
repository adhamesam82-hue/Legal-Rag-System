-- 0023_document_tags.sql
-- Tags a firm owns, and a document type that is a classification.
--
-- documents.doc_type was free text with a default of '' (0006), and what the
-- upload route actually wrote into it was the file extension -- "PDF",
-- "DOCX", "FILE" -- because nothing else was available at upload time. That
-- is the file's format, which content_type already records; it says nothing
-- about whether the file is a brief, a judgment or a power of attorney, which
-- is what a lawyer filters by. Two firms typing مذكرة and مذكره by hand would
-- never have met on a filter either.
--
-- doc_type becomes a closed list of what a document IS. Every value that is
-- not on the list -- which today is every value -- becomes 'other', and the
-- original is kept in doc_type_legacy so nothing a firm typed is lost. The
-- migration cannot guess that "PDF" was a judgment; the firm reclassifies
-- from the screen, where doc_type_legacy is there to remind it what the file
-- was.
--
-- Tags are the firm's own vocabulary. A closed list of tags would be the
-- same mistake the type list is now fixing in reverse: a tag is exactly the
-- thing a firm should be able to invent. They are rows the firm creates,
-- renames and deletes; the eight seeded on firm creation are suggestions the
-- code never re-plants, so a firm that deletes them all is not in an invalid
-- state.
--
-- color is a token name from the design system's Badge palette, not a hex
-- value: the screen renders the token and the token adapts to dark mode, a
-- stored hex would not.

-- ---------------------------------------------------------------------------
-- 1. Document type: a classification, with the old value kept
-- ---------------------------------------------------------------------------

ALTER TABLE documents ADD COLUMN doc_type_legacy TEXT NOT NULL DEFAULT '';

UPDATE documents
   SET doc_type_legacy = doc_type,
       doc_type = 'other'
 WHERE doc_type NOT IN (
   'brief', 'judgment', 'contract', 'poa', 'evidence', 'police_report',
   'identity', 'receipt', 'correspondence', 'form', 'other'
 );

ALTER TABLE documents ALTER COLUMN doc_type SET DEFAULT 'other';

ALTER TABLE documents ADD CONSTRAINT documents_doc_type_check
  CHECK (doc_type IN (
    'brief', 'judgment', 'contract', 'poa', 'evidence', 'police_report',
    'identity', 'receipt', 'correspondence', 'form', 'other'
  ));

CREATE INDEX ON documents (organization_id, doc_type);

-- ---------------------------------------------------------------------------
-- 2. Tags
-- ---------------------------------------------------------------------------

CREATE TABLE document_tags (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL CHECK (btrim(name) <> ''),
  color            TEXT NOT NULL DEFAULT 'blue' CHECK (color IN (
                     'blue', 'cyan', 'green', 'orange', 'pink', 'purple',
                     'red', 'teal', 'yellow'
                   )),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One name per firm. Case-sensitive on purpose: Arabic has no case, and
  -- for Latin names a firm that wants "Urgent" and "URGENT" as one tag can
  -- rename one of them.
  UNIQUE (organization_id, name)
);

CREATE TABLE document_tag_links (
  document_id  BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id       BIGINT NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

-- Filtering by tag walks tag -> documents; the primary key already serves
-- document -> tags.
CREATE INDEX ON document_tag_links (tag_id);

-- The eight suggestions, for every firm that exists today. New firms get
-- them from create_organization. Names are the Arabic the screen shows; a
-- firm renames them like any other tag.
INSERT INTO document_tags (organization_id, name, color)
SELECT o.id, s.name, s.color
  FROM organizations o
 CROSS JOIN (VALUES
   ('عاجل',         'red'),
   ('للمراجعة',     'orange'),
   ('تمت المراجعة', 'green'),
   ('أولوية عالية', 'pink'),
   ('أصل',          'blue'),
   ('صورة',         'cyan'),
   ('جلسة قادمة',   'purple'),
   ('حكم نهائي',    'teal')
 ) AS s(name, color)
 ON CONFLICT (organization_id, name) DO NOTHING;
