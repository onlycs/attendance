ALTER TABLE students
RENAME COLUMN hashed to id_hashed;

ALTER TABLE admins
RENAME COLUMN student_id TO sid_hashed;

ALTER TABLE admins
ADD CONSTRAINT fk_student
FOREIGN KEY (sid_hashed)
REFERENCES students(id_hashed);

ALTER TABLE records
RENAME COLUMN student_id TO sid_hashed;

ALTER TABLE records
DROP CONSTRAINT progress_check,
DROP COLUMN in_progress;
