-- Add migration script here
ALTER TABLE hour_config
ALTER COLUMN goal
TYPE double precision
USING goal::double precision;
