-- ============================================================
-- Request Builder to Add Delivery Address (when driver clicks "Check Address")
-- Created: March 16, 2026
-- When a delivery provider clicks "Check Address" on a request with missing address,
-- this notifies the builder to add the address in their Professional Builder Dashboard.
-- ============================================================

-- RPC: Notify the builder that a delivery provider is waiting for the delivery address.
-- The builder should add it in Professional Builder Dashboard → Deliveries tab.
CREATE OR REPLACE FUNCTION public.request_builder_to_add_delivery_address(p_delivery_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_builder_id UUID;
  v_builder_user_id UUID;  -- auth.users.id so notification is visible to builder
  v_po_number TEXT;
  v_notification_id UUID;
  v_dr_status TEXT;
BEGIN
  -- Get builder and order info from delivery_request
  SELECT dr.builder_id, dr.status, po.po_number
  INTO v_builder_id, v_dr_status, v_po_number
  FROM delivery_requests dr
  LEFT JOIN purchase_orders po ON po.id = dr.purchase_order_id
  WHERE dr.id = p_delivery_request_id
  LIMIT 1;

  IF v_builder_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'delivery_request_not_found_or_no_builder');
  END IF;

  -- Resolve builder_id to auth user_id (notifications.user_id = auth.users.id). builder_id may be profiles.id.
  SELECT user_id INTO v_builder_user_id FROM profiles WHERE id = v_builder_id LIMIT 1;
  IF v_builder_user_id IS NULL THEN
    v_builder_user_id := v_builder_id;
  END IF;

  -- Create notification for builder (they add address in Professional Builder Dashboard → Deliveries)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    v_notification_id := public.create_notification(
      v_builder_user_id,
      'reminder',
      'Delivery address needed',
      COALESCE(
        'A delivery provider is waiting for the delivery address for order ' || v_po_number || '. Please add it in your Professional Builder Dashboard under the Deliveries tab.',
        'A delivery provider is waiting for the delivery address. Please add it in your Professional Builder Dashboard under the Deliveries tab.'
      ),
      jsonb_build_object('delivery_request_id', p_delivery_request_id, 'po_number', v_po_number),
      '/professional-builder-dashboard?tab=deliveries',
      'Open Deliveries',
      'high',
      NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'builder_id', v_builder_id,
    'notification_id', v_notification_id,
    'message', 'Builder has been asked to add the address in their dashboard.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.request_builder_to_add_delivery_address(UUID) IS
  'When a delivery provider clicks Check Address for a request with missing address, notifies the builder to add it in Professional Builder Dashboard → Deliveries.';

GRANT EXECUTE ON FUNCTION public.request_builder_to_add_delivery_address(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_builder_to_add_delivery_address(UUID) TO anon;
