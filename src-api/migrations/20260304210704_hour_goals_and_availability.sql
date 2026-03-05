CREATE TABLE IF NOT EXISTS hour_config (
    kind hour_type PRIMARY KEY NOT NULL,
    begins date,
    ends date,
    goal integer NOT NULL
);

INSERT INTO hour_config (kind, begins, ends, goal) VALUES
    ('build', NULL, NULL, 80),
    ('learning', '2026-09-01', NULL, 8),
    ('demo', '2026-01-01', '2026-12-31', 4),
    ('offseason', '2026-05-01', '2026-11-01', 0);
