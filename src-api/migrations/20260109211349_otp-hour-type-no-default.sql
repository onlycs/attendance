-- Add migration script here
ALTER TABLE otps
ALTER COLUMN hour_type DROP DEFAULT;
