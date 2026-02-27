-- ============================================================
-- FIND ALL TRIGGERS: List every trigger on delivery_requests
-- ============================================================

-- 1. List ALL triggers on delivery_requests
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as is_enabled,
    CASE t.tgtype::int & 2
        WHEN 2 THEN 'BEFORE'
        ELSE 'AFTER'
    END as timing,
    CASE t.tgtype::int & 4
        WHEN 4 THEN 'INSERT'
        ELSE ''
    END ||
    CASE t.tgtype::int & 8
        WHEN 8 THEN ' UPDATE'
        ELSE ''
    END ||
    CASE t.tgtype::int & 16
        WHEN 16 THEN ' DELETE'
        ELSE ''
    END as events,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'delivery_requests'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 2. Show source code of ALL functions used by these triggers
SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.prosrc LIKE '%NEW.delivery_provider_phone%' THEN '❌ PROBLEM: Sets NEW.delivery_provider_phone'
        WHEN p.prosrc LIKE '%NEW.delivery_provider_name%' THEN '❌ PROBLEM: Sets NEW.delivery_provider_name'
        WHEN p.prosrc LIKE '%delivery_provider_phone%' AND p.prosrc LIKE '%NEW%' THEN '⚠️ WARNING: References delivery_provider_phone with NEW'
        ELSE '✅ OK'
    END as status,
    substring(p.prosrc, 1, 1000) as source_preview
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'delivery_requests'
AND NOT t.tgisinternal
ORDER BY p.proname;

-- 3. Check if there's a view on delivery_requests
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND (view_definition LIKE '%delivery_requests%' OR table_name LIKE '%delivery%');

-- 4. Check for default values or generated columns
SELECT 
    column_name,
    column_default,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'delivery_requests'
AND (column_default IS NOT NULL OR is_generated = 'ALWAYS' OR is_generated = 'STored');

-- 5. Check for check constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.delivery_requests'::regclass
AND contype = 'c';
