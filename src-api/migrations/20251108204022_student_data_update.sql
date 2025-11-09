-- Add migration script here
CREATE OR REPLACE FUNCTION notify_student_data()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        payload := json_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'id', OLD.id,
            'hashed', OLD.hashed,
            'first', OLD.first,
            'last', OLD.last
        );
    ELSE
        payload := json_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'id', NEW.id,
            'hashed', NEW.hashed,
            'first', NEW.first,
            'last', NEW.last
        );
    END IF;

    PERFORM pg_notify('student_data_update', payload::text);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_student_data_update
AFTER INSERT OR UPDATE OR DELETE ON student_data
FOR EACH ROW
EXECUTE FUNCTION notify_student_data();
