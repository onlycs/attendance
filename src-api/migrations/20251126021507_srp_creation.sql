-- Add migration script here
ALTER TABLE srp_sessions
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
