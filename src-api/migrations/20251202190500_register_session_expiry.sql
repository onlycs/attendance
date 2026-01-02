-- Add migration script here
ALTER TABLE register_sessions
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
