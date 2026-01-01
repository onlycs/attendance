CREATE TABLE admins (
    -- userinfo
    id TEXT PRIMARY KEY NOT NULL,
    student_id TEXT UNIQUE, -- may be null for non-student admins
    username TEXT UNIQUE NOT NULL,

    -- SRP
    salt BYTEA NOT NULL,
    verifier BYTEA NOT NULL,

    -- misc. authentication and security
    psk TEXT NOT NULL -- encrypted with user password
);

CREATE TABLE srp_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    b BYTEA NOT NULL
);

CREATE TABLE permissions (
    user_id TEXT PRIMARY KEY NOT NULL REFERENCES admins(id) ON DELETE CASCADE,

    student_add BOOLEAN NOT NULL DEFAULT FALSE,
    student_view BOOLEAN NOT NULL DEFAULT FALSE,
    student_edit BOOLEAN NOT NULL DEFAULT FALSE,
    student_delete BOOLEAN NOT NULL DEFAULT FALSE,

    admin_invite BOOLEAN NOT NULL DEFAULT FALSE,
    admin_delete BOOLEAN NOT NULL DEFAULT FALSE,

    telemetry_view BOOLEAN NOT NULL DEFAULT FALSE,

    hours_view BOOLEAN NOT NULL DEFAULT FALSE,
    hours_edit BOOLEAN NOT NULL DEFAULT FALSE,

    roster_start BOOLEAN NOT NULL DEFAULT FALSE
);

DROP TABLE cryptstore;
