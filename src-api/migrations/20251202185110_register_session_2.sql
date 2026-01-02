-- Add migration script here
ALTER TABLE register_sessions
ADD COLUMN sid_hashed TEXT;
