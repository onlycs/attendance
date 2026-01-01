-- Add migration script here
DROP TRIGGER IF EXISTS on_student_data_update ON students;
DROP FUNCTION IF EXISTS notify_student_data();

DROP TRIGGER IF EXISTS on_record_update ON records;
DROP FUNCTION IF EXISTS notify_record_update();

CREATE FUNCTION notify_students()
RETURNS TRIGGER AS $$
DECLARE
    payload jsonb := json_build_object('operation', TG_OP);
    col RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        payload := payload || to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        payload := payload || json_build_object('pkey', OLD.hashed_id);
    ELSE
        FOR col IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = TG_TABLE_NAME
        LOOP
            IF to_jsonb(OLD)->>col.column_name IS DISTINCT FROM to_jsonb(NEW)->>col.column_name THEN
                payload := payload || jsonb_build_object(col.column_name, to_jsonb(NEW)->col.column_name);
            END IF;
        END LOOP;
    END IF;

    PERFORM pg_notify('replicate:student', payload::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER change_students
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW
EXECUTE FUNCTION notify_students();

CREATE FUNCTION notify_records()
RETURNS TRIGGER AS $$
DECLARE
    payload jsonb := json_build_object('operation', TG_OP);
    col RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        payload := payload || to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        payload := payload || json_build_object('id', OLD.id);
    ELSE
        FOR col IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = TG_TABLE_NAME
        LOOP
            IF to_jsonb(OLD)->>col.column_name IS DISTINCT FROM to_jsonb(NEW)->>col.column_name THEN
                payload := payload || jsonb_build_object(col.column_name, to_jsonb(NEW)->col.column_name);
            END IF;
        END LOOP;
    END IF;

    PERFORM pg_notify('replicate:record', payload::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER change_records
AFTER INSERT OR UPDATE OR DELETE ON records
FOR EACH ROW
EXECUTE FUNCTION notify_records();
