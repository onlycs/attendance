-- Add migration script here
ALTER TABLE invites
ADD COLUMN inviter_id TEXT NOT NULL REFERENCES admins(id);
