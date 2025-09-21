CREATE OR REPLACE FUNCTION notify_record()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload := json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'row_id', OLD.id
    );
  ELSE
    payload := json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'row_id', NEW.id
    );
  END IF;

  PERFORM pg_notify('table_changes', payload::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_record_update
AFTER INSERT OR UPDATE OR DELETE ON records
FOR EACH ROW
EXECUTE FUNCTION notify_record();
