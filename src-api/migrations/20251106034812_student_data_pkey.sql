-- Add migration script here
-- move primary key of student_data from "id" to "hashed"
ALTER TABLE student_data DROP CONSTRAINT student_data_pkey;
ALTER TABLE student_data ADD CONSTRAINT student_data_pkey PRIMARY KEY (hashed);
