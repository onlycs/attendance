-- Add migration script here
-- rename student_id to id in student_data table

ALTER TABLE student_data RENAME COLUMN student_id TO id;
