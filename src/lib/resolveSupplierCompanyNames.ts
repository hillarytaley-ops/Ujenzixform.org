import { supabase } from '@/integrations/supabase/client';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * materials.supplier_id is often auth uid; suppliers rows match via user_id and/or id.
 * Uses SECURITY DEFINER RPC — direct SELECT on public.suppliers returns 401 for anon/buyers.
 */
export async function resolveSupplierCompanyNames(
  rows: { supplier_id?: string | null }[]
): Promise<Map<string, string>> {
  const keys = [
    ...new Set(rows.map((r) => r.supplier_id).filter((id): id is string => Boolean(id))),
  ];
  const byKey = new Map<string, string>();
  if (keys.length === 0) return byKey;

  const uuidKeys = keys.filter((k) => UUID_RE.test(k));
  if (uuidKeys.length === 0) return byKey;

  try {
    const { data, error } = await supabase.rpc('get_suppliers_for_price_compare', {
      p_supplier_ids: uuidKeys,
    });
    if (error) {
      console.warn('resolveSupplierCompanyNames RPC failed:', error.message);
      return byKey;
    }
    for (const s of data ?? []) {
      const name = s.company_name?.trim();
      if (!name) continue;
      if (s.id) byKey.set(s.id, name);
      if (s.user_id) byKey.set(s.user_id, name);
    }
  } catch (e) {
    console.warn('resolveSupplierCompanyNames failed', e);
  }

  return byKey;
}
