-- Do not attach builder/admin delivery quote fields to provider notification payloads.

CREATE OR REPLACE FUNCTION public.notify_delivery_providers_quote_paid(p_delivery_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dr public.delivery_requests%ROWTYPE;
  v_po text;
  v_pos int := 0;
  v_notified int := 0;
  r record;
  v_title text := '🚚 New Delivery Request Available!';
  v_msg text;
  v_data jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_delivery_request_id::text));

  SELECT * INTO dr FROM public.delivery_requests WHERE id = p_delivery_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'delivery_request_not_found');
  END IF;

  IF dr.status IS DISTINCT FROM 'delivery_quote_paid' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_status', 'status', dr.status);
  END IF;

  IF dr.delivery_quote_providers_alerted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'notified', 0);
  END IF;

  SELECT po.po_number INTO v_po
  FROM public.purchase_orders po
  WHERE po.id = dr.purchase_order_id
  LIMIT 1;

  v_msg := format(
    'New delivery: %s → %s. Material: %s. Date: %s.',
    coalesce(nullif(trim(dr.pickup_address), ''), 'Pickup TBD'),
    coalesce(nullif(trim(dr.delivery_address), ''), 'Delivery TBD'),
    coalesce(nullif(trim(dr.material_type), ''), 'Construction materials'),
    coalesce(nullif(trim(dr.pickup_date::text), ''), 'TBD')
  );

  -- Omit estimated_cost / budget_range: those are builder–admin quote details, not for drivers.
  v_data := jsonb_build_object(
    'request_id', dr.id::text,
    'pickup_address', dr.pickup_address,
    'delivery_address', dr.delivery_address,
    'pickup_date', dr.pickup_date::text,
    'material_type', dr.material_type,
    'quantity', dr.quantity,
    'weight_kg', dr.weight_kg,
    'pickup_latitude', dr.pickup_latitude,
    'pickup_longitude', dr.pickup_longitude,
    'delivery_latitude', dr.delivery_latitude,
    'delivery_longitude', dr.delivery_longitude
  );
  IF dr.purchase_order_id IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('purchase_order_id', dr.purchase_order_id::text);
  END IF;
  IF v_po IS NOT NULL AND length(trim(v_po)) > 0 THEN
    v_data := v_data || jsonb_build_object('po_number', v_po);
  END IF;

  FOR r IN
    SELECT id, user_id
    FROM public.delivery_providers
    WHERE is_active = true
      AND user_id IS NOT NULL
  LOOP
    v_pos := v_pos + 1;
    PERFORM public.create_notification(
      r.user_id,
      'delivery_request',
      v_title,
      v_msg,
      v_data,
      '/delivery-dashboard?request=' || dr.id::text,
      'Open',
      'high',
      NULL
    );

    INSERT INTO public.delivery_provider_queue (
      provider_id,
      request_id,
      queue_position,
      status,
      contacted_at,
      timeout_at
    )
    SELECT
      r.id,
      dr.id,
      v_pos,
      'notified',
      now(),
      now() + interval '30 minutes'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.delivery_provider_queue q
      WHERE q.provider_id = r.id
        AND q.request_id = dr.id
    );

    v_notified := v_notified + 1;
  END LOOP;

  UPDATE public.delivery_requests
  SET
    delivery_quote_providers_alerted_at = now(),
    updated_at = now()
  WHERE id = p_delivery_request_id;

  RETURN jsonb_build_object('ok', true, 'skipped', false, 'notified', v_notified);
END;
$$;

COMMENT ON FUNCTION public.notify_delivery_providers_quote_paid(uuid) IS
  'Sends in-app delivery_request notifications + queue rows to all active drivers after quote payment; omits builder quote amounts from notification data.';
