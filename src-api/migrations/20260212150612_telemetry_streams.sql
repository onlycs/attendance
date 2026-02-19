-- Add migration script here
CREATE TABLE IF NOT EXISTS telemetry_streams (
    id TEXT PRIMARY KEY NOT NULL,
    filter JSONB NOT NULL,
    updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
