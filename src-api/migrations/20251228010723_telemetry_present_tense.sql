-- Add migration script here

ALTER TYPE event_type RENAME TO event_type_old;
CREATE TYPE event_type AS ENUM (
    'admin_login',
    'admin_logout',
    'student_add',
    'student_delete',
    'student_edit',
    'record_add',
    'record_delete',
    'record_edit',
    'student_login',
    'student_logout'
);

ALTER TABLE telemetry
ALTER COLUMN event TYPE event_type USING event::text::event_type;

DROP TYPE event_type_old;
