-- ============================================================
-- Verify migration 20260429_provider_see_po_for_receiving_scanner
-- Run this in Supabase SQL Editor to confirm the fix is applied.
-- ============================================================

-- 1. Check that the function exists and includes delivery_providers logic
--    (20260330 version has NO "delivery_providers"; 20260429 has "dp.user_id" and "delivery_providers")
SELECT
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%delivery_providers%'
     AND pg_get_functiondef(p.oid) LIKE '%dp.user_id%'
    THEN 'OK: purchase_order_visible_to_delivery_provider has delivery_providers logic (20260429-style)'
    ELSE 'MISSING: Run migration 20260429_provider_see_po_for_receiving_scanner.sql'
  END AS migration_20260429_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'purchase_order_visible_to_delivery_provider';

-- 2. Optional: list applied migrations (Supabase stores them in schema_migrations)
-- Uncomment if your project uses this table:
-- SELECT version, name FROM supabase_migrations.schema_migrations
-- WHERE name LIKE '%20260429%' OR name LIKE '%provider_see_po%'
-- ORDER BY version DESC;
