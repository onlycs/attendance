-- Add migration script here
ALTER TABLE register_sessions
    ADD COLUMN expiry TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
    DROP COLUMN IF EXISTS created_at;
