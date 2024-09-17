-- Add migration script here
CREATE TABLE IF NOT EXISTS token (
	token text PRIMARY KEY NOT NULL,
	created_at timestamp DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS student (
	id int PRIMARY KEY NOT NULL,
	name text NOT NULL
);

CREATE TABLE IF NOT EXISTS record (
	id text PRIMARY KEY NOT NULL,
	student_id int REFERENCES student(id) ON DELETE CASCADE,
	in_progress boolean DEFAULT TRUE NOT NULL,
	sign_in timestamp NOT NULL,
	duration_minutes int NOT NULL
);