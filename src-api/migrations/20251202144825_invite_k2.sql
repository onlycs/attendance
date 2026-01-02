-- Add migration script here
ALTER TABLE invites
ADD COLUMN k2 TEXT NOT NULL;

ALTER TABLE admins
RENAME COLUMN psk TO k1e;
