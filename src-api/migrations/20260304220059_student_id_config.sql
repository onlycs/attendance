-- Add migration script here
CREATE TABLE IF NOT EXISTS student_id_config (
    uniq boolean PRIMARY KEY NOT NULL DEFAULT true CHECK (uniq = true),
    min integer NOT NULL CHECK (min >= 0),
    max integer NOT NULL CHECK (max >= min),
    regex text NOT NULL,
    case_sensitive boolean NOT NULL DEFAULT false
);

INSERT INTO student_id_config (min, max, regex) VALUES
    (5, 5, '^[0-9]{5}$');
