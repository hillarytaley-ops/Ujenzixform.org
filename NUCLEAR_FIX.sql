-- ============================================================
-- NUCLEAR FIX: Disable ALL triggers on delivery_requests temporarily
-- This will help us identify if a trigger is causing the issue
-- ============================================================

-- Step 1: Show current triggers
SELECT 
    tgname as trigger_name,
    CASE WHEN tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END as status,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'delivery_requests'::regclass
AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- Step 2: DISABLE ALL triggers on delivery_requests
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'delivery_requests'::regclass
        AND tgname NOT LIKE 'RI_%'
    LOOP
        EXECUTE 'ALTER TABLE delivery_requests DISABLE TRIGGER ' || quote_ident(r.tgname);
        RAISE NOTICE 'Disabled trigger: %', r.tgname;
    END LOOP;
END $$;

-- Step 3: Now try accepting a delivery - if it works, a trigger was the problem
-- If it still fails, the issue is elsewhere (maybe a view or RLS policy)

-- To re-enable triggers later, run:
-- ALTER TABLE delivery_requests ENABLE TRIGGER ALL;
