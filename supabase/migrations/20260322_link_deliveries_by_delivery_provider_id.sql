-- ============================================================
-- Link orders currently tied to auth.uid() to delivery_providers.id
-- so missing In Transit orders appear (RPC/frontend filter by provider_id = delivery_providers.id)
-- Created: March 22, 2026
-- ============================================================

-- RPC: run as driver (or admin) to link their deliveries to delivery_providers.id
CREATE OR REPLACE FUNCTION public.link_my_deliveries_to_provider_id()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
  v_updated_dr INT := 0;
  v_updated_po INT := 0;
BEGIN
  -- 1. Get delivery_providers.id for current user
  SELECT id INTO v_provider_id FROM delivery_providers WHERE user_id = auth.uid() LIMIT 1;

  IF v_provider_id IS NULL THEN
    SELECT dp.id INTO v_provider_id
    FROM delivery_provider_registrations dpr
    JOIN delivery_providers dp ON dp.user_id = dpr.auth_user_id
    WHERE dpr.auth_user_id = auth.uid() AND LOWER(TRIM(COALESCE(dpr.status,''))) = 'approved'
    LIMIT 1;
  END IF;

  IF v_provider_id IS NULL THEN
    SELECT dp.id INTO v_provider_id
    FROM delivery_providers dp
    JOIN auth.users u ON u.id = auth.uid() AND LOWER(TRIM(COALESCE(dp.email,''))) = LOWER(TRIM(COALESCE(u.email,'')))
    LIMIT 1;
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No delivery_providers row found for current user. Register as a delivery provider first.',
      'updated_dr', 0,
      'updated_po', 0
    );
  END IF;

  -- 2. Link delivery_requests that use auth.uid() to delivery_providers.id
  UPDATE delivery_requests
  SET provider_id = v_provider_id, updated_at = NOW()
  WHERE provider_id = auth.uid()
     OR (provider_id IS NULL AND purchase_order_id IN (
       SELECT id FROM purchase_orders WHERE delivery_provider_id = auth.uid()
     ));
  GET DIAGNOSTICS v_updated_dr = ROW_COUNT;

  -- 3. Link purchase_orders that use auth.uid() to delivery_providers.id
  UPDATE purchase_orders
  SET delivery_provider_id = v_provider_id, updated_at = NOW()
  WHERE delivery_provider_id = auth.uid();
  GET DIAGNOSTICS v_updated_po = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Linked %s delivery_requests and %s purchase_orders to delivery_provider.id', v_updated_dr, v_updated_po),
    'provider_id', v_provider_id,
    'updated_dr', v_updated_dr,
    'updated_po', v_updated_po
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_my_deliveries_to_provider_id() TO authenticated;

COMMENT ON FUNCTION public.link_my_deliveries_to_provider_id() IS
  'Sets provider_id/delivery_provider_id to delivery_providers.id for current user so all their orders appear under Scheduled/In Transit (run once per driver if orders were linked by auth.uid()).';
