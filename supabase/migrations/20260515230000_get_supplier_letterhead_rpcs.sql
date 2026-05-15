-- Supplier invoice / eTIMS UI needs full letterhead (phone, email, address) for the logged-in
-- supplier. Column-level REVOKE on public.suppliers blocks direct SELECT of those fields for
-- authenticated; SECURITY DEFINER RPCs return them only when supplier_row_owned_by_caller.

CREATE OR REPLACE FUNCTION public.get_supplier_letterhead_batch(p_supplier_ids uuid[])
RETURNS TABLE (
  id uuid,
  company_name text,
  contact_person text,
  phone text,
  email text,
  address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.company_name,
    s.contact_person,
    s.phone,
    s.email,
    s.address
  FROM public.suppliers s
  WHERE p_supplier_ids IS NOT NULL
    AND cardinality(p_supplier_ids) > 0
    AND s.id = ANY (p_supplier_ids)
    AND public.supplier_row_owned_by_caller(s.id);
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_letterhead_for_dashboard(p_supplier_id uuid)
RETURNS TABLE (
  id uuid,
  company_name text,
  contact_person text,
  phone text,
  email text,
  address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.company_name, b.contact_person, b.phone, b.email, b.address
  FROM public.get_supplier_letterhead_batch(ARRAY [p_supplier_id]::uuid[]) b;
$$;

REVOKE ALL ON FUNCTION public.get_supplier_letterhead_batch(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_supplier_letterhead_for_dashboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supplier_letterhead_batch(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_letterhead_for_dashboard(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_supplier_letterhead_for_dashboard(uuid) IS
  'Returns supplier letterhead fields for invoice/receipt UI when the caller owns the supplier row (same rules as supplier_row_owned_by_caller).';

COMMENT ON FUNCTION public.get_supplier_letterhead_batch(uuid[]) IS
  'Batch letterhead for owned supplier ids only; used to enrich invoice lists without direct SELECT on revoked columns.';
