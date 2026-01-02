-- add records.student_id fkey to students.hashed on delete cascade
DELETE FROM records
WHERE student_id NOT IN (SELECT hashed FROM students); -- note: this shouldn't happen in current ver. but just in case

ALTER TABLE records
ADD CONSTRAINT fk_student
FOREIGN KEY (student_id)
REFERENCES students(hashed)
ON DELETE CASCADE;
