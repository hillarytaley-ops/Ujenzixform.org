-- ============================================================
-- RPC: Get delivery provider name and phone for builders
-- Returns name/phone only for providers assigned to the current user's orders.
-- SECURITY DEFINER so it can read delivery_providers/profiles despite RLS.
-- Fixes "Provider Assigned (Details Loading...)" on builder dashboard.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_delivery_provider_names_for_builder(provider_ids UUID[])
RETURNS TABLE(id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    dp.id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(dp.provider_name), ''), 'Delivery Provider') AS provider_name,
    COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(dp.phone), '')) AS phone
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  WHERE dp.id = ANY(provider_ids)
    AND EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.buyer_id = auth.uid()
        AND po.delivery_provider_id = dp.id
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_names_for_builder(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_builder(UUID[]) IS
  'Returns provider_name and phone for given provider IDs when caller is the buyer of an order with that provider. Use for builder orders dashboard.';
