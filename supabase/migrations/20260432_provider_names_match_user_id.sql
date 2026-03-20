-- ============================================================
-- Provider display names: match delivery_providers by id OR user_id
-- purchase_orders.delivery_provider_id and delivery_requests.provider_id
-- may store auth.users id (user_id) OR delivery_providers.id (see RLS migrations).
-- Previous RPC only used dp.id = ANY(provider_ids), so lookups returned zero rows.
-- Adds user_id to RPC output so clients can key names both ways.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_delivery_provider_names_for_supplier(provider_ids UUID[])
RETURNS TABLE(id UUID, user_id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    dp.id,
    dp.user_id,
    COALESCE(
      NULLIF(TRIM(dp.provider_name), ''),
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(split_part(NULLIF(TRIM(p.email), ''), '@', 1), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(NULLIF(TRIM(dp.phone), ''), NULLIF(TRIM(p.phone), '')) AS phone
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  WHERE (dp.id = ANY(provider_ids) OR dp.user_id = ANY(provider_ids))
    AND (
      EXISTS (
        SELECT 1 FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id AND s.user_id = auth.uid()
        WHERE po.delivery_provider_id = dp.id OR po.delivery_provider_id = dp.user_id
      )
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr
        JOIN purchase_orders po ON po.id = dr.purchase_order_id
        JOIN suppliers s ON s.id = po.supplier_id AND s.user_id = auth.uid()
        WHERE dr.provider_id IS NOT NULL
          AND (dr.provider_id = dp.id OR dr.provider_id = dp.user_id)
      )
    );
$$;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_supplier(UUID[]) IS
  'Names/phones for supplier POs; provider_ids may be delivery_providers.id or auth user_id.';

CREATE OR REPLACE FUNCTION public.get_delivery_provider_names_for_builder(provider_ids UUID[])
RETURNS TABLE(id UUID, user_id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (dp.id)
    dp.id,
    dp.user_id,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_name), ''),
      NULLIF(TRIM(dp.provider_name), ''),
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(split_part(NULLIF(TRIM(p.email), ''), '@', 1), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_phone), ''),
      NULLIF(TRIM(dp.phone), ''),
      NULLIF(TRIM(p.phone), '')
    ) AS phone
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  INNER JOIN purchase_orders po ON
    (po.buyer_id = auth.uid() OR po.buyer_id IN (SELECT pr.id FROM profiles pr WHERE pr.user_id = auth.uid()))
    AND (
      po.delivery_provider_id = dp.id OR po.delivery_provider_id = dp.user_id
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.purchase_order_id = po.id
          AND dr.provider_id IS NOT NULL
          AND (dr.provider_id = dp.id OR dr.provider_id = dp.user_id)
      )
    )
  WHERE (dp.id = ANY(provider_ids) OR dp.user_id = ANY(provider_ids))
  ORDER BY dp.id, po.updated_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_builder(UUID[]) IS
  'Names/phones for builder orders; provider_ids may be dp.id or auth user_id.';
