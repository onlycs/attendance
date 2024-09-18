-- Add migration script here
-- set table record field student_id not null
ALTER TABLE
	records
ALTER COLUMN
	student_id
SET
	NOT NULL;