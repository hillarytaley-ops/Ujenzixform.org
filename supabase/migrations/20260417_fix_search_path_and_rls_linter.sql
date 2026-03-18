-- ============================================================
-- Fix Supabase database linter warnings
-- 1. Function search_path mutable: set search_path = public on 11 functions
-- 2. RLS policy always true: restrict order_status_history INSERT policy
-- Created: April 17, 2026
-- ============================================================

-- ------------------------------------------------------------
-- 1. Set search_path on functions (security lint 0011)
-- ------------------------------------------------------------
ALTER FUNCTION public.sync_dispatch_to_delivery_request() SET search_path = public;
ALTER FUNCTION public.get_provider_active_deliveries(UUID) SET search_path = public;
ALTER FUNCTION public.sync_delivery_request_order_number() SET search_path = public;
ALTER FUNCTION public.prevent_duplicate_delivery_requests() SET search_path = public;
ALTER FUNCTION public.validate_delivery_request_id() SET search_path = public;
ALTER FUNCTION public.normalize_material_type_for_index(TEXT) SET search_path = public;
ALTER FUNCTION public.check_delivery_request_id_integrity() SET search_path = public;
ALTER FUNCTION public.prevent_delivery_address_overwrite() SET search_path = public;
ALTER FUNCTION public.sync_delivery_address_to_purchase_order() SET search_path = public;
ALTER FUNCTION public.validate_delivery_address_not_null() SET search_path = public;

-- upsert_delivery_request(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, DATE, TEXT, TEXT, TEXT, DECIMAL)
ALTER FUNCTION public.upsert_delivery_request(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, DATE, TEXT, TEXT, TEXT, DECIMAL) SET search_path = public;

-- ------------------------------------------------------------
-- 2. Restrict order_status_history INSERT policy (RLS lint 0024)
-- Allow INSERT only when the order belongs to current user as supplier or buyer
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert status history" ON public.order_status_history;

-- Allow INSERT only when the current user is supplier, buyer, or assigned delivery provider for the order.
-- Triggers and app code run as the user who performed the status change.
CREATE POLICY "System can insert status history"
  ON public.order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = order_status_history.order_id
        AND (
          po.supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
          OR po.buyer_id = auth.uid()
          OR po.delivery_provider_id IN (SELECT id FROM public.delivery_providers WHERE user_id = auth.uid())
        )
    )
  );
