-- ============================================================
-- RE-ENABLE TRIGGERS: Re-enable triggers after testing
-- ============================================================

-- Re-enable ALL triggers on delivery_requests
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'public.delivery_requests'::regclass
        AND NOT tgisinternal
    LOOP
        EXECUTE format('ALTER TABLE public.delivery_requests ENABLE TRIGGER %I', r.tgname);
        RAISE NOTICE 'Enabled trigger: %', r.tgname;
    END LOOP;
END $$;
