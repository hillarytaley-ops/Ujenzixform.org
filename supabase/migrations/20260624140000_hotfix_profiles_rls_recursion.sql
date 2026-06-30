-- Hotfix: profiles_order_partner_read called get_supplier_scope_ids_for_current_user()
-- which reads profiles → infinite recursion → HTTP 500 on profiles, purchase_orders, material_items.

-- =============================================================================
-- 1. RPC helpers: bypass RLS inside SECURITY DEFINER bodies
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_supplier_scope_ids_for_current_user()
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  uid uuid := auth.uid();
  ids uuid[] := ARRAY[]::uuid[];
  prof_id uuid;
  s record;
BEGIN
  IF uid IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  ids := array_append(ids, uid);

  FOR s IN
    SELECT sup.id, sup.user_id
    FROM public.suppliers sup
    WHERE sup.user_id = uid
       OR sup.id = uid
       OR (
         sup.email IS NOT NULL
         AND length(trim(sup.email)) > 3
         AND EXISTS (
           SELECT 1 FROM auth.users u
           WHERE u.id = uid
             AND lower(trim(COALESCE(u.email::text, ''))) = lower(trim(COALESCE(sup.email::text, '')))
         )
       )
  LOOP
    ids := array_append(ids, s.id);
    IF s.user_id IS NOT NULL THEN
      ids := array_append(ids, s.user_id);
    END IF;
  END LOOP;

  SELECT p.id INTO prof_id
  FROM public.profiles p
  WHERE p.user_id = uid
  LIMIT 1;

  IF prof_id IS NOT NULL AND prof_id <> uid THEN
    ids := array_append(ids, prof_id);
    FOR s IN
      SELECT sup.id, sup.user_id
      FROM public.suppliers sup
      WHERE sup.user_id = prof_id
    LOOP
      ids := array_append(ids, s.id);
      IF s.user_id IS NOT NULL THEN
        ids := array_append(ids, s.user_id);
      END IF;
    END LOOP;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x), ARRAY[]::uuid[])
  INTO ids
  FROM unnest(ids) AS x
  WHERE x IS NOT NULL;

  RETURN ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_supplier_records()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  company_name text,
  email text,
  kra_pin text,
  legal_business_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT s.id, s.user_id, s.company_name, s.email, s.kra_pin, s.legal_business_name
  FROM public.suppliers s
  WHERE public.supplier_row_owned_by_caller(s.id);
$$;

-- Order-partner profile visibility (must not query profiles inside a profiles RLS policy)
CREATE OR REPLACE FUNCTION public.profile_visible_via_order_partner(p_profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_profile_user_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE (
          po.buyer_id = p_profile_user_id
          OR po.builder_id = p_profile_user_id
        )
        AND (
          po.supplier_id = auth.uid()
          OR po.supplier_id IN (
            SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.suppliers s
            INNER JOIN auth.users u ON u.id = auth.uid()
            WHERE po.supplier_id = s.id
              AND s.email IS NOT NULL
              AND length(trim(s.email)) > 3
              AND lower(trim(s.email)) = lower(trim(COALESCE(u.email::text, '')))
          )
          OR po.supplier_id IN (
            SELECT s.id
            FROM public.suppliers s
            INNER JOIN public.profiles cp ON cp.user_id = auth.uid()
            WHERE s.user_id = cp.id
          )
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        INNER JOIN public.suppliers s ON s.id = po.supplier_id
        WHERE s.user_id = p_profile_user_id
          AND (
            po.buyer_id = auth.uid()
            OR po.builder_id = auth.uid()
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.profile_visible_via_order_partner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_visible_via_order_partner(uuid) TO authenticated;

-- =============================================================================
-- 2. profiles policies — no nested profiles reads in policy expressions
-- =============================================================================

DROP POLICY IF EXISTS "profiles_order_partner_read" ON public.profiles;

CREATE POLICY "profiles_order_partner_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.profile_visible_via_order_partner(user_id));

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
