-- ============================================================
-- RPC: Get delivery provider name and phone for builders
-- Returns name/phone only for providers assigned to the current user's orders.
-- buyer_id can be auth.uid() OR profile.id (both used in app).
-- Prefers name/phone already on PO (from trigger); else delivery_providers/profiles.
-- SECURITY DEFINER so it can read delivery_providers/profiles despite RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_delivery_provider_names_for_builder(provider_ids UUID[])
RETURNS TABLE(id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (v.id)
    v.id,
    COALESCE(NULLIF(TRIM(v.po_name), ''), v.dp_name) AS provider_name,
    COALESCE(NULLIF(TRIM(v.po_phone), ''), v.dp_phone) AS phone
  FROM (
    SELECT
      dp.id,
      po.delivery_provider_name AS po_name,
      po.delivery_provider_phone AS po_phone,
      COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(dp.provider_name), ''), 'Delivery Provider') AS dp_name,
      COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(dp.phone), '')) AS dp_phone
    FROM delivery_providers dp
    LEFT JOIN profiles p ON p.user_id = dp.user_id
    INNER JOIN purchase_orders po ON po.delivery_provider_id = dp.id
      AND (po.buyer_id = auth.uid() OR po.buyer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    WHERE dp.id = ANY(provider_ids)
  ) v
  ORDER BY v.id, (CASE WHEN NULLIF(TRIM(v.po_name), '') IS NOT NULL THEN 0 ELSE 1 END);
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_names_for_builder(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_builder(UUID[]) IS
  'Returns provider_name and phone for given provider IDs when caller is the buyer of an order with that provider. Use for builder orders dashboard.';
