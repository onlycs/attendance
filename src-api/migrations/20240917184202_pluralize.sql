-- Add migration script here
-- rename table
ALTER TABLE
	token RENAME TO tokens;

ALTER TABLE
	student RENAME TO students;

ALTER TABLE
	record RENAME TO records;