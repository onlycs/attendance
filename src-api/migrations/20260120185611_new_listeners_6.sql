CREATE OR REPLACE FUNCTION notify_students()
RETURNS TRIGGER AS $$
DECLARE
    payload jsonb := jsonb_build_object('operation', TG_OP);
    col RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        payload := payload || to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        payload := payload || jsonb_build_object('pkey', OLD.id_hashed);
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

        payload := payload || jsonb_build_object('id_hashed', OLD.id_hashed);
    END IF;

    PERFORM pg_notify('replicate:students', payload::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_records()
RETURNS TRIGGER AS $$
DECLARE
    payload jsonb := jsonb_build_object('operation', TG_OP);
    col RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        payload := payload || to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        payload := payload || jsonb_build_object('pkey', OLD.id);
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

        payload := payload || jsonb_build_object('id', OLD.id);
    END IF;

    PERFORM pg_notify('replicate:records', payload::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
