-- Add migration script here
ALTER TABLE student_id_config
DROP COLUMN IF EXISTS max;

ALTER TABLE student_id_config
RENAME COLUMN min TO length;
