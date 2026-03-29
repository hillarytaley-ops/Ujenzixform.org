-- mark_grn_viewed_by_supplier(uuid) relied on grn_visible_to_supplier; email-linked suppliers
-- still fail if that helper is not migrated or auth.users join differs. The dashboard already
-- passes suppliers.id into list_goods_received_notes_for_supplier — use the same ownership +
-- row filter here when p_supplier_id is provided.

DROP FUNCTION IF EXISTS public.mark_grn_viewed_by_supplier(uuid);

CREATE OR REPLACE FUNCTION public.mark_grn_viewed_by_supplier(
  p_grn_id uuid,
  p_supplier_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_supplier_id IS NOT NULL THEN
    IF NOT public.supplier_row_owned_by_caller(p_supplier_id) THEN
      RAISE EXCEPTION 'GRN not found or access denied' USING ERRCODE = '42501';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.goods_received_notes g
      LEFT JOIN public.purchase_orders po ON po.id = g.purchase_order_id
      WHERE g.id = p_grn_id
      AND (
        g.supplier_id = p_supplier_id
        OR (
          po.id IS NOT NULL
          AND po.supplier_id IS NOT NULL
          AND (po.supplier_id = p_supplier_id OR po.supplier_id = auth.uid())
        )
      )
    )
    INTO v_allowed;

    IF NOT COALESCE(v_allowed, false) THEN
      RAISE EXCEPTION 'GRN not found or access denied' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT public.grn_visible_to_supplier(p_grn_id) THEN
      RAISE EXCEPTION 'GRN not found or access denied' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT g.status INTO v_status FROM public.goods_received_notes g WHERE g.id = p_grn_id;

  IF v_status = 'viewed_by_supplier' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  IF v_status IS DISTINCT FROM 'generated' THEN
    RAISE EXCEPTION 'GRN cannot be marked viewed from status %', v_status;
  END IF;

  UPDATE public.goods_received_notes
  SET status = 'viewed_by_supplier', updated_at = NOW()
  WHERE id = p_grn_id;

  RETURN jsonb_build_object('ok', true, 'already', false);
END;
$$;

COMMENT ON FUNCTION public.mark_grn_viewed_by_supplier(uuid, uuid) IS
  'Supplier marks GRN viewed. Pass p_supplier_id = dashboard suppliers.id (email-linked ok via supplier_row_owned_by_caller).';

REVOKE ALL ON FUNCTION public.mark_grn_viewed_by_supplier(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_grn_viewed_by_supplier(uuid, uuid) TO authenticated;
