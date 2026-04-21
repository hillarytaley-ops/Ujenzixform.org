-- Compare-prices modal: buyers must see real supplier names and addresses for UUIDs that already
-- appear in supplier_product_prices. Direct SELECT on public.suppliers is often blocked by RLS
-- for private clients, which produced empty maps and generic "Supplier" labels.

CREATE OR REPLACE FUNCTION public.get_suppliers_for_price_compare(p_supplier_ids uuid[])
RETURNS TABLE (
  id uuid,
  user_id uuid,
  profile_id uuid,
  company_name text,
  rating numeric,
  location text,
  address text,
  profile_location text,
  display_location text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (s.id)
    s.id,
    s.user_id,
    s.profile_id,
    COALESCE(NULLIF(btrim(s.company_name), ''), NULLIF(btrim(p.company_name), '')) AS company_name,
    s.rating,
    s.location,
    s.address,
    p.location AS profile_location,
    COALESCE(
      NULLIF(btrim(s.address), ''),
      NULLIF(btrim(s.location), ''),
      NULLIF(btrim(p.location), '')
    ) AS display_location
  FROM public.suppliers s
  LEFT JOIN public.profiles p
    ON p.id = s.user_id
    OR p.id = s.profile_id
    OR p.user_id = s.user_id
  WHERE p_supplier_ids IS NOT NULL
    AND COALESCE(array_length(p_supplier_ids, 1), 0) > 0
    AND s.id = ANY (p_supplier_ids)
  ORDER BY s.id, p.id NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_suppliers_for_price_compare(uuid[]) IS
  'Returns storefront fields for supplier UUIDs referenced in marketplace price rows; bypasses buyers'' suppliers RLS.';

REVOKE ALL ON FUNCTION public.get_suppliers_for_price_compare(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_suppliers_for_price_compare(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suppliers_for_price_compare(uuid[]) TO anon;
