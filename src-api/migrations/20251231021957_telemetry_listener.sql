-- Add migration script here
CREATE OR REPLACE FUNCTION notify_telemetry()
RETURNS TRIGGER AS $$
DECLARE
    payload jsonb := json_build_object('operation', TG_OP);
BEGIN
    IF TG_OP = 'INSERT' THEN
        payload := payload || to_jsonb(NEW);
        PERFORM pg_notify('replicate:telemetry', payload::text);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER insert_telemetry
AFTER INSERT ON telemetry
FOR EACH ROW
EXECUTE FUNCTION notify_telemetry();
