-- ============================================================
-- DISABLE ALL TRIGGERS: Temporarily disable all triggers on delivery_requests
-- This will help us identify which trigger is causing the error
-- ============================================================

-- Disable ALL triggers on delivery_requests
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
        EXECUTE format('ALTER TABLE public.delivery_requests DISABLE TRIGGER %I', r.tgname);
        RAISE NOTICE 'Disabled trigger: %', r.tgname;
    END LOOP;
END $$;

-- List all disabled triggers
SELECT 
    t.tgname as trigger_name,
    CASE t.tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        WHEN 'R' THEN 'REPLICA'
        WHEN 'A' THEN 'ALWAYS'
    END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'delivery_requests'
AND NOT t.tgisinternal;

-- NOW TRY ACCEPTING A DELIVERY - if it works, we know it's a trigger issue
-- If it still fails, the problem is elsewhere (view, constraint, etc.)
