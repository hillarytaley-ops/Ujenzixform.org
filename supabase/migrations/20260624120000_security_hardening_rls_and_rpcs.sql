-- Security hardening: drop permissive RLS, supplier scope RPC, staff RPC lockdown
-- Addresses: staff email enumeration, supplier email-in-URL lookups, over-broad SELECT policies

-- =============================================================================
-- 1. Supplier scope for current user (replaces client email=eq. REST lookups)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_supplier_scope_ids_for_current_user()
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.get_supplier_scope_ids_for_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supplier_scope_ids_for_current_user() TO authenticated;

COMMENT ON FUNCTION public.get_supplier_scope_ids_for_current_user() IS
  'Returns distinct supplier/auth/profile ids linked to auth.uid() (user_id, email-linked, profile chain).';

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
AS $$
  SELECT s.id, s.user_id, s.company_name, s.email, s.kra_pin, s.legal_business_name
  FROM public.suppliers s
  WHERE public.supplier_row_owned_by_caller(s.id);
$$;

REVOKE ALL ON FUNCTION public.get_my_supplier_records() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_supplier_records() TO authenticated;

COMMENT ON FUNCTION public.get_my_supplier_records() IS
  'Owned supplier rows for dashboard (includes email-linked accounts); no email in client URL.';

-- Authenticated staff role (replaces admin_staff?email=eq. in client)
CREATE OR REPLACE FUNCTION public.get_my_admin_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.role
  FROM public.admin_staff s
  INNER JOIN auth.users u ON u.id = auth.uid()
  WHERE s.email IS NOT NULL
    AND length(trim(s.email)) > 0
    AND lower(trim(s.email)) = lower(trim(COALESCE(u.email::text, '')))
    AND COALESCE(s.status, 'active') = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_admin_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_admin_staff_role() TO authenticated;

COMMENT ON FUNCTION public.get_my_admin_staff_role() IS
  'Returns admin_staff.role for the signed-in user; avoids email-in-URL lookups.';

-- =============================================================================
-- 2. Lock down staff email enumeration RPC (Edge function only for pre-auth)
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.is_admin_staff_portal_email(text) FROM anon, authenticated;

COMMENT ON FUNCTION public.is_admin_staff_portal_email(text) IS
  'Service-role / Edge only. Pre-auth staff gate must use is-admin-staff-portal-email Edge (rate limited).';

-- =============================================================================
-- 3. Drop permissive SELECT policies added by emergency / fix migrations
-- =============================================================================

DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Builder directory / social (non-sensitive fields only — use PROFILE_DIRECTORY_COLUMNS client-side)
DROP POLICY IF EXISTS "profiles_showcase_read" ON public.profiles;
CREATE POLICY "profiles_showcase_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role IN ('professional_builder', 'builder')
  OR user_type IN ('professional_builder', 'builder')
);

DROP POLICY IF EXISTS "suppliers_read" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_policy" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_view_all" ON public.suppliers;

DROP POLICY IF EXISTS "delivery_providers_read" ON public.delivery_providers;
DROP POLICY IF EXISTS "delivery_providers_select_policy" ON public.delivery_providers;

DROP POLICY IF EXISTS "purchase_orders_select_policy" ON public.purchase_orders;

-- Order partners may read limited buyer/supplier profile fields
DROP POLICY IF EXISTS "profiles_order_partner_read" ON public.profiles;
CREATE POLICY "profiles_order_partner_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE (
      po.buyer_id = profiles.user_id
      OR po.builder_id = profiles.user_id
    )
    AND (
      po.supplier_id = auth.uid()
      OR po.supplier_id IN (
        SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid()
      )
      OR po.supplier_id IN (
        SELECT unnest(public.get_supplier_scope_ids_for_current_user())
      )
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    INNER JOIN public.suppliers s ON s.id = po.supplier_id
    WHERE s.user_id = profiles.user_id
      AND (
        po.buyer_id = auth.uid()
        OR po.builder_id = auth.uid()
      )
  )
);

-- Marketplace: verified suppliers visible; sensitive columns revoked below
DROP POLICY IF EXISTS "suppliers_marketplace_read" ON public.suppliers;
CREATE POLICY "suppliers_marketplace_read"
ON public.suppliers
FOR SELECT
TO authenticated
USING (COALESCE(is_verified, false) = true);

-- Revoke harvesting-prone supplier contact / tax columns from direct REST
REVOKE SELECT (email, phone, address, contact_person, kra_pin, legal_business_name)
ON public.suppliers
FROM anon, authenticated;
