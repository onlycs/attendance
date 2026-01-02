-- Add migration script here
ALTER TABLE invites
RENAME COLUMN student_id TO sid_hashed;
