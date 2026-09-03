-- 0028_case_filed_date_optional.sql
-- Allow case records to be created before a formal filing date is known (T-044).
--
-- The dispute and its facts begin when the client walks in, weeks before the
-- lawsuit is filed in court. Cases need to exist so the lawyer can record
-- facts, narrative and legal basis from day one, without being blocked on
-- having a filing date or case number.

ALTER TABLE cases ALTER COLUMN filed_date DROP NOT NULL;
