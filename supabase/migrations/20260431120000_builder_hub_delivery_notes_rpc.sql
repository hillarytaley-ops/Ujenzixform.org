-- Builder inbox: open delivery_notes rows without PostgREST evaluating heavy per-row RLS
-- on large tables (avoids HTTP 500 / statement timeout on delivery_notes list + hub prefetch).

CREATE OR REPLACE FUNCTION public.builder_hub_delivery_notes(p_limit integer DEFAULT 250)
RETURNS SETOF public.delivery_notes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dn.*
  FROM public.delivery_notes dn
  WHERE dn.status IN (
    'pending_signature',
    'signed',
    'forwarded_to_supplier',
    'inspection_pending'
  )
  AND (
    dn.builder_id = (SELECT auth.uid())
    OR dn.builder_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id = dn.purchase_order_id
        AND (
          po.buyer_id = (SELECT auth.uid())
          OR po.buyer_id IN (SELECT p2.id FROM public.profiles p2 WHERE p2.user_id = (SELECT auth.uid()))
        )
    )
  )
  ORDER BY dn.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 250), 1), 500);
$$;

COMMENT ON FUNCTION public.builder_hub_delivery_notes(integer) IS
  'Returns open delivery_notes for the current user (auth uid or profiles.id buyer/builder). SECURITY DEFINER to avoid RLS planner timeouts on large delivery_notes.';

REVOKE ALL ON FUNCTION public.builder_hub_delivery_notes(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.builder_hub_delivery_notes(integer) TO authenticated;
