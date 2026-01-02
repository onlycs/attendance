-- Add migration script here
ALTER TABLE records
ADD COLUMN in_utc TIMESTAMPTZ,
ADD COLUMN out_utc TIMESTAMPTZ;

UPDATE records
SET in_utc = sign_in AT TIME ZONE 'UTC',
    out_utc = sign_out AT TIME ZONE 'UTC';

ALTER TABLE records
DROP COLUMN sign_in,
DROP COLUMN sign_out;

ALTER TABLE records
RENAME COLUMN in_utc TO sign_in;

ALTER TABLE records
RENAME COLUMN out_utc TO sign_out;
