-- db-side checking
ALTER TABLE records
ADD CONSTRAINT time_check CHECK (sign_out IS NULL OR sign_in < sign_out),
ADD CONSTRAINT progress_check CHECK (in_progress = (sign_out IS NULL));