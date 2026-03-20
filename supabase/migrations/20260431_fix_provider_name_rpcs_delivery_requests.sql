-- ============================================================
-- Fix delivery provider names not showing for newly assigned providers
-- when assignment exists only on delivery_requests (PO.delivery_provider_id NULL).
-- Also ensures COALESCE uses profiles.full_name when provider_name is empty.
-- Apply after 20260418 and 20260421 RPC migrations.
-- DROP first: return type (OUT columns) cannot change with CREATE OR REPLACE alone.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_delivery_provider_names_for_supplier(uuid[]);
DROP FUNCTION IF EXISTS public.get_delivery_provider_names_for_builder(uuid[]);

CREATE FUNCTION public.get_delivery_provider_names_for_supplier(provider_ids UUID[])
RETURNS TABLE(id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    dp.id,
    COALESCE(
      NULLIF(TRIM(dp.provider_name), ''),
      NULLIF(TRIM(p.full_name), ''),
      'Delivery Provider'
    ) AS provider_name,
    COALESCE(NULLIF(TRIM(dp.phone), ''), NULLIF(TRIM(p.phone), '')) AS phone
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  WHERE dp.id = ANY(provider_ids)
    AND (
      EXISTS (
        SELECT 1 FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id AND s.user_id = auth.uid()
        WHERE po.delivery_provider_id = dp.id
      )
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr
        JOIN purchase_orders po ON po.id = dr.purchase_order_id
        JOIN suppliers s ON s.id = po.supplier_id AND s.user_id = auth.uid()
        WHERE dr.provider_id = dp.id
          AND dr.provider_id IS NOT NULL
      )
    );
$$;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_supplier(UUID[]) IS
  'Returns provider_name/phone for IDs assigned on PO or delivery_requests; supplier must own the PO.';

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_names_for_supplier(uuid[]) TO authenticated;

CREATE FUNCTION public.get_delivery_provider_names_for_builder(provider_ids UUID[])
RETURNS TABLE(id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (dp.id)
    dp.id,
    COALESCE(
      NULLIF(TRIM(po.delivery_provider_name), ''),
      NULLIF(TRIM(dp.provider_name), ''),
      NULLIF(TRIM(p.full_name), ''),
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
      po.delivery_provider_id = dp.id
      OR EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.purchase_order_id = po.id
          AND dr.provider_id = dp.id
          AND dr.provider_id IS NOT NULL
      )
    )
  WHERE dp.id = ANY(provider_ids)
  ORDER BY dp.id, po.updated_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_builder(UUID[]) IS
  'Returns provider_name/phone for builder orders; match PO.delivery_provider_id OR delivery_requests.provider_id.';

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_names_for_builder(uuid[]) TO authenticated;
