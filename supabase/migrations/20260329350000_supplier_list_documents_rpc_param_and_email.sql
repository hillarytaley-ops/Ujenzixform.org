-- Replace zero-arg RPCs with (p_supplier_id uuid DEFAULT NULL).
-- 1) Client passes dashboard-resolved suppliers.id so rows match dn.supplier_id = 91623c3b-...
-- 2) Ownership: suppliers.user_id = auth.uid() OR suppliers.email matches auth.users.email (email-linked accounts)

DROP FUNCTION IF EXISTS public.list_delivery_notes_for_supplier() CASCADE;
DROP FUNCTION IF EXISTS public.list_delivery_notes_for_supplier(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.list_goods_received_notes_for_supplier() CASCADE;
DROP FUNCTION IF EXISTS public.list_goods_received_notes_for_supplier(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.list_invoices_for_supplier() CASCADE;
DROP FUNCTION IF EXISTS public.list_invoices_for_supplier(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.supplier_row_owned_by_caller(p_supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.suppliers s
    WHERE s.id = p_supplier_id
    AND (
      s.user_id = auth.uid()
      OR (
        s.email IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id = auth.uid()
          AND lower(trim(COALESCE(u.email::text, ''))) = lower(trim(COALESCE(s.email::text, '')))
          AND length(trim(COALESCE(s.email::text, ''))) > 3
        )
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.list_delivery_notes_for_supplier(p_supplier_id uuid DEFAULT NULL)
RETURNS SETOF public.delivery_notes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dn.*
  FROM public.delivery_notes dn
  LEFT JOIN public.purchase_orders po ON po.id = dn.purchase_order_id
  WHERE auth.uid() IS NOT NULL
  AND (
    (
      p_supplier_id IS NOT NULL
      AND public.supplier_row_owned_by_caller(p_supplier_id)
      AND (
        dn.supplier_id = p_supplier_id
        OR (
          po.id IS NOT NULL
          AND po.supplier_id IS NOT NULL
          AND (
            po.supplier_id = p_supplier_id
            OR po.supplier_id = auth.uid()
          )
        )
      )
    )
    OR (
      p_supplier_id IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.suppliers s
          WHERE s.user_id = auth.uid()
          AND (
            (dn.supplier_id IS NOT NULL AND (dn.supplier_id = s.id OR dn.supplier_id = s.user_id))
            OR (
              po.id IS NOT NULL
              AND po.supplier_id IS NOT NULL
              AND (po.supplier_id = s.id OR po.supplier_id = s.user_id)
            )
          )
        )
        OR (dn.supplier_id IS NOT NULL AND dn.supplier_id = auth.uid())
        OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
      )
    )
  )
  ORDER BY dn.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_goods_received_notes_for_supplier(p_supplier_id uuid DEFAULT NULL)
RETURNS SETOF public.goods_received_notes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.*
  FROM public.goods_received_notes g
  LEFT JOIN public.purchase_orders po ON po.id = g.purchase_order_id
  WHERE auth.uid() IS NOT NULL
  AND (
    (
      p_supplier_id IS NOT NULL
      AND public.supplier_row_owned_by_caller(p_supplier_id)
      AND (
        g.supplier_id = p_supplier_id
        OR (
          po.id IS NOT NULL
          AND po.supplier_id IS NOT NULL
          AND (
            po.supplier_id = p_supplier_id
            OR po.supplier_id = auth.uid()
          )
        )
      )
    )
    OR (
      p_supplier_id IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.suppliers s
          WHERE s.user_id = auth.uid()
          AND (
            (g.supplier_id IS NOT NULL AND (g.supplier_id = s.id OR g.supplier_id = s.user_id))
            OR (
              po.id IS NOT NULL
              AND po.supplier_id IS NOT NULL
              AND (po.supplier_id = s.id OR po.supplier_id = s.user_id)
            )
          )
        )
        OR (g.supplier_id IS NOT NULL AND g.supplier_id = auth.uid())
        OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
      )
    )
  )
  ORDER BY g.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_invoices_for_supplier(p_supplier_id uuid DEFAULT NULL)
RETURNS SETOF public.invoices
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.*
  FROM public.invoices i
  LEFT JOIN public.purchase_orders po ON po.id = i.purchase_order_id
  WHERE auth.uid() IS NOT NULL
  AND (
    (
      p_supplier_id IS NOT NULL
      AND public.supplier_row_owned_by_caller(p_supplier_id)
      AND (
        i.supplier_id = p_supplier_id
        OR (
          po.id IS NOT NULL
          AND po.supplier_id IS NOT NULL
          AND (
            po.supplier_id = p_supplier_id
            OR po.supplier_id = auth.uid()
          )
        )
      )
    )
    OR (
      p_supplier_id IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.suppliers s
          WHERE s.user_id = auth.uid()
          AND (
            (i.supplier_id IS NOT NULL AND (i.supplier_id = s.id OR i.supplier_id = s.user_id))
            OR (
              po.id IS NOT NULL
              AND po.supplier_id IS NOT NULL
              AND (po.supplier_id = s.id OR po.supplier_id = s.user_id)
            )
          )
        )
        OR (i.supplier_id IS NOT NULL AND i.supplier_id = auth.uid())
        OR (po.id IS NOT NULL AND po.supplier_id IS NOT NULL AND po.supplier_id = auth.uid())
      )
    )
  )
  ORDER BY i.id DESC;
$$;

REVOKE ALL ON FUNCTION public.supplier_row_owned_by_caller(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.supplier_row_owned_by_caller(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.list_delivery_notes_for_supplier(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_goods_received_notes_for_supplier(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_invoices_for_supplier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_delivery_notes_for_supplier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_goods_received_notes_for_supplier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_invoices_for_supplier(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_delivery_notes_for_supplier(uuid) IS
  'Pass p_supplier_id = suppliers.id from dashboard. Optional DEFAULT NULL keeps legacy behaviour.';
