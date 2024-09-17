-- Add migration script here
ALTER TABLE
	records DROP COLUMN duration_minutes;

ALTER TABLE
	records
ADD
	sign_out timestamp;