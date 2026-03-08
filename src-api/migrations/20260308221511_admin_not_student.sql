-- Add migration script here
ALTER TABLE admins
DROP COLUMN IF EXISTS sid_hashed;

ALTER TABLE invites
DROP COLUMN IF EXISTS sid_hashed;

ALTER TABLE register_sessions
DROP COLUMN IF EXISTS sid_hashed;
