-- Add migration script here
ALTER TABLE register_sessions
ADD COLUMN inviter_id TEXT REFERENCES admins(id); -- maybe null b/c of onboard
