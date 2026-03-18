-- ============================================================
-- Allow suppliers to resolve delivery provider name/phone for their orders
-- RPC returns provider_name and phone for given provider IDs only when
-- the caller is a supplier and each provider is assigned to their PO.
-- Fixes "Loading..." where provider name should appear in order table.
-- Created: April 18, 2026
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_delivery_provider_names_for_supplier(provider_ids UUID[])
RETURNS TABLE(id UUID, provider_name TEXT, phone TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    dp.id,
    COALESCE(NULLIF(TRIM(dp.provider_name), ''), p.full_name, 'Delivery Provider') AS provider_name,
    COALESCE(NULLIF(TRIM(dp.phone), ''), p.phone) AS phone
  FROM delivery_providers dp
  LEFT JOIN profiles p ON p.user_id = dp.user_id
  WHERE dp.id = ANY(provider_ids)
    AND EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id AND s.user_id = auth.uid()
      WHERE po.delivery_provider_id = dp.id
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_provider_names_for_supplier(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_delivery_provider_names_for_supplier(UUID[]) IS
  'Returns provider_name and phone for given provider IDs when caller is a supplier with those providers assigned to their POs. Use for order table display.';
