-- Add migration script here
ALTER TABLE permissions
ADD COLUMN admin_view BOOLEAN NOT NULL DEFAULT FALSE;
