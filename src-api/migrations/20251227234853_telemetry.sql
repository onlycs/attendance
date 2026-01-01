-- Add migration script here
CREATE TYPE event_type AS ENUM (
    'admin_login',
    'admin_logout',
    'student_added',
    'student_deleted',
    'student_edited',
    'record_added',
    'record_deleted',
    'record_edited',
    'student_login',
    'student_logout'
);

CREATE TABLE telemetry (
    id TEXT PRIMARY KEY NOT NULL,
    event event_type NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
