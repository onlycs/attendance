-- Add migration script here
ALTER TABLE records
ALTER COLUMN sign_in SET NOT NULL;
