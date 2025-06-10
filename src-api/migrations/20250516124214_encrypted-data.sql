-- Add migration script here
CREATE TABLE cryptstore (
	id boolean PRIMARY KEY NOT NULL DEFAULT true CHECK (id),
	csv text NOT NULL
);