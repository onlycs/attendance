-- Add migration script here
ALTER TABLE otps
DROP COLUMN IF EXISTS expiry;
