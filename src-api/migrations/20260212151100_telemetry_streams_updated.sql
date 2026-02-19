-- Add migration script here
ALTER TABLE telemetry_streams
RENAME COLUMN updated TO updated_at;
