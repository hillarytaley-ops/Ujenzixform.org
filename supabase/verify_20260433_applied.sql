-- ============================================================
-- Verify migrations 20260431–20260433 (provider display RPCs)
-- Run in Supabase SQL Editor on the project your app uses.
-- ============================================================

-- 1) Both display RPCs exist
SELECT
  proname,
  CASE WHEN proname IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'get_delivery_provider_display_for_supplier_orders',
    'get_delivery_provider_display_for_builder_orders'
  )
ORDER BY proname;

-- Expected: 2 rows. If 0 rows, apply supabase/migrations/20260433_provider_display_by_purchase_order_ids.sql
--          Also apply 20260434_provider_display_profiles_fallback.sql for profiles.id / auth fallbacks.

-- 2) Supplier RPC references purchase_orders + delivery_requests + delivery_providers (sanity check)
SELECT
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%purchase_orders%'
     AND pg_get_functiondef(p.oid) LIKE '%delivery_requests%'
     AND pg_get_functiondef(p.oid) LIKE '%delivery_providers%'
    THEN 'OK: get_delivery_provider_display_for_supplier_orders looks like 20260433'
    ELSE 'CHECK: function body unexpected — re-apply 20260433 migration'
  END AS supplier_rpc_check
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_delivery_provider_display_for_supplier_orders';

-- 3) Builder RPC enforces buyer visibility (should mention buyer_id / profiles)
SELECT
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%buyer_id%'
    THEN 'OK: get_delivery_provider_display_for_builder_orders includes buyer check'
    ELSE 'CHECK: re-apply 20260433 migration'
  END AS builder_rpc_check
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_delivery_provider_display_for_builder_orders';

-- 4) Optional: 20260434 adds profiles/auth falloffs (search function body)
SELECT
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%p_prof%'
     AND pg_get_functiondef(p.oid) LIKE '%u_auth%'
    THEN 'OK: display RPCs include 20260434-style profile/auth fallbacks'
    ELSE 'HINT: Apply 20260434_provider_display_profiles_fallback.sql if provider rows still show empty names'
  END AS migration_20260434_hints
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_delivery_provider_display_for_supplier_orders'
LIMIT 1;
