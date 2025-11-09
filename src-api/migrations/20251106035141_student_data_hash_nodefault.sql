-- Add migration script here
-- remove default for hashed on student_data
ALTER TABLE student_data ALTER COLUMN hashed DROP DEFAULT;
