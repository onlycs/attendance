-- Add migration script here
ALTER TABLE srp_sessions
RENAME TO login_sessions;

CREATE TABLE register_sessions (
    id TEXT PRIMARY KEY NOT NULL
);
