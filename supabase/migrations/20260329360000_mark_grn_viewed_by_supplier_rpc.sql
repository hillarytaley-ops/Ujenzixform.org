-- Suppliers "Mark viewed" on GRN: direct UPDATE often fails under RLS while SELECT uses
-- security-definer helpers (grn_visible_to_supplier). This RPC performs the status transition
-- after the same visibility check, so invoice auto-create trigger still fires.

CREATE OR REPLACE FUNCTION public.mark_grn_viewed_by_supplier(p_grn_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.grn_visible_to_supplier(p_grn_id) THEN
    RAISE EXCEPTION 'GRN not found or access denied' USING ERRCODE = '42501';
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

COMMENT ON FUNCTION public.mark_grn_viewed_by_supplier(uuid) IS
  'Supplier marks a GRN as viewed (generated → viewed_by_supplier); uses grn_visible_to_supplier for auth.';

REVOKE ALL ON FUNCTION public.mark_grn_viewed_by_supplier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_grn_viewed_by_supplier(uuid) TO authenticated;
