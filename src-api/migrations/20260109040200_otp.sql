-- Add migration script here
CREATE TABLE IF NOT EXISTS otps (
    admin_id TEXT PRIMARY KEY NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    secret BYTEA NOT NULL,
    expiry TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);
