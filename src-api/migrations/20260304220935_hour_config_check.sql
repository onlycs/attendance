ALTER TABLE hour_config
ADD CHECK (goal >= 0);
