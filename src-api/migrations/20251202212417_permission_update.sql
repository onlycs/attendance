-- Add migration script here
ALTER TABLE permissions
RENAME COLUMN roster_start TO roster;

ALTER TABLE permissions
RENAME COLUMN telemetry_view TO telemetry;
