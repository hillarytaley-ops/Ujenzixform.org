-- ============================================================
-- Builder project cards: correct PO counts / materials spend
-- 1) Trigger counted only confirmed+ — pending quotes stayed at 0.
-- 2) RPC aggregates per project_id for the signed-in builder (bypasses PO RLS gaps).
-- ============================================================

-- Broaden materials aggregation: any non-cancelled / non-rejected / non-draft PO counts.
CREATE OR REPLACE FUNCTION public.update_project_spending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_materials_total NUMERIC(15, 2);
    v_delivery_total NUMERIC(15, 2);
    v_order_count INTEGER;
BEGIN
    IF NEW.project_id IS NOT NULL THEN
        SELECT COALESCE(SUM(total_amount), 0), COUNT(*)::int
        INTO v_materials_total, v_order_count
        FROM purchase_orders
        WHERE project_id = NEW.project_id
          AND lower(trim(coalesce(status, ''))) NOT IN ('cancelled', 'rejected', 'draft');

        SELECT COALESCE(SUM(COALESCE(estimated_cost, 0)), 0)
        INTO v_delivery_total
        FROM delivery_requests
        WHERE project_id = NEW.project_id
          AND status IN ('accepted', 'in_transit', 'delivered', 'completed');

        UPDATE builder_projects
        SET
            materials_spent = v_materials_total,
            delivery_spent = v_delivery_total,
            spent = v_materials_total + v_delivery_total + COALESCE(monitoring_spent, 0),
            total_orders = v_order_count,
            updated_at = NOW()
        WHERE id = NEW.project_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Per-project PO stats for dashboard cards (only caller's projects + their buyer POs).
CREATE OR REPLACE FUNCTION public.builder_project_purchase_stats()
RETURNS TABLE (
    project_id uuid,
    order_count bigint,
    order_value_sum numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        po.project_id,
        COUNT(*)::bigint AS order_count,
        COALESCE(SUM(po.total_amount), 0)::numeric AS order_value_sum
    FROM public.purchase_orders po
    WHERE po.project_id IS NOT NULL
      AND lower(trim(coalesce(po.status, ''))) NOT IN ('cancelled', 'rejected', 'draft')
      AND (
          po.buyer_id = (SELECT auth.uid())
          OR po.buyer_id IN (
              SELECT pr.id FROM public.profiles pr WHERE pr.user_id = (SELECT auth.uid())
          )
      )
    GROUP BY po.project_id
    HAVING EXISTS (
        SELECT 1
        FROM public.builder_projects bp
        WHERE bp.id = po.project_id
          AND bp.builder_id = (SELECT auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.builder_project_purchase_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.builder_project_purchase_stats() TO authenticated;

COMMENT ON FUNCTION public.builder_project_purchase_stats() IS
  'Order count and sum(total_amount) per project_id for the current builder; excludes cancelled/rejected/draft.';

-- Backfill from purchase_orders (fixes stale totals after trigger logic change).
UPDATE public.builder_projects bp
SET
    materials_spent = COALESCE(agg.sum_amt, 0),
    total_orders = COALESCE(agg.cnt, 0)::integer,
    spent = COALESCE(agg.sum_amt, 0) + COALESCE(bp.delivery_spent, 0) + COALESCE(bp.monitoring_spent, 0),
    updated_at = NOW()
FROM (
    SELECT
        project_id,
        SUM(total_amount) AS sum_amt,
        COUNT(*)::bigint AS cnt
    FROM public.purchase_orders
    WHERE project_id IS NOT NULL
      AND lower(trim(coalesce(status, ''))) NOT IN ('cancelled', 'rejected', 'draft')
    GROUP BY project_id
) agg
WHERE bp.id = agg.project_id;

UPDATE public.builder_projects bp
SET
    materials_spent = 0,
    total_orders = 0,
    spent = COALESCE(bp.delivery_spent, 0) + COALESCE(bp.monitoring_spent, 0),
    updated_at = NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.project_id = bp.id
      AND lower(trim(coalesce(po.status, ''))) NOT IN ('cancelled', 'rejected', 'draft')
);
