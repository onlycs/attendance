-- Add migration script here
ALTER TABLE otps
ADD COLUMN IF NOT EXISTS hour_type hour_type NOT NULL DEFAULT 'demo';
