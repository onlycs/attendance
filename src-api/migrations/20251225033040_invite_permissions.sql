-- Add migration script here
ALTER TABLE invites
ADD COLUMN permissions JSONB NOT NULL;

ALTER TABLE register_sessions
ADD COLUMN permissions JSONB NOT NULL;
