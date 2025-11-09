-- add `hashed` field, type text, to table student_data

ALTER TABLE student_data
ADD COLUMN hashed TEXT NOT NULL DEFAULT '';
