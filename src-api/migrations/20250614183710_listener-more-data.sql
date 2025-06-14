CREATE OR REPLACE FUNCTION notify_record()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload := json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'id', OLD.id,
      'student_id', OLD.student_id,
      'sign_in', OLD.sign_in,
      'sign_out', OLD.sign_out,
      'kind', OLD.hour_type
    );
  ELSE
    payload := json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'id', NEW.id,
      'student_id', NEW.student_id,
      'sign_in', NEW.sign_in,
      'sign_out', NEW.sign_out,
      'kind', NEW.hour_type
    );
  END IF;

  PERFORM pg_notify('table_changes', payload::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
