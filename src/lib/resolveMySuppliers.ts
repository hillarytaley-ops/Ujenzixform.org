import { supabase } from '@/integrations/supabase/client';
import { devWarn } from '@/utils/secureLog';

export type MySupplierRecord = {
  id: string;
  user_id: string | null;
  company_name: string | null;
  email: string | null;
  kra_pin?: string | null;
  legal_business_name?: string | null;
};

/** Server-resolved supplier scope ids (user_id, suppliers.id, profile chain, email-linked). */
export async function fetchSupplierScopeIds(
  client: { rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }> } = supabase
): Promise<string[]> {
  const { data, error } = await client.rpc('get_supplier_scope_ids_for_current_user');
  if (error) {
    devWarn('[resolveMySuppliers] get_supplier_scope_ids_for_current_user:', error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(Boolean).map(String);
}

/** Owned supplier rows via SECURITY DEFINER RPC (no email in URL). */
export async function fetchMySupplierRecords(
  client: { rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }> } = supabase
): Promise<MySupplierRecord[]> {
  const { data, error } = await client.rpc('get_my_supplier_records');
  if (error) {
    devWarn('[resolveMySuppliers] get_my_supplier_records:', error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data as MySupplierRecord[];
}

/** Primary suppliers.id for dashboard UI (first owned record, else first scope id). */
export async function resolvePrimarySupplierRecordId(): Promise<string | null> {
  const records = await fetchMySupplierRecords();
  if (records[0]?.id) return records[0].id;
  const scope = await fetchSupplierScopeIds();
  return scope[0] ?? null;
}

/** Normalize PO supplier_id to suppliers.id (handles legacy user_id / profile id on the row). */
export async function resolveSupplierRowIdForPurchaseOrder(rawSupplierId: string): Promise<string> {
  const id = rawSupplierId?.trim();
  if (!id || id.length !== 36) return rawSupplierId;
  const { data, error } = await supabase
    .from('suppliers')
    .select('id')
    .or(`id.eq.${id},user_id.eq.${id}`)
    .limit(1);
  if (!error && Array.isArray(data) && data[0]?.id) return String(data[0].id);
  return rawSupplierId;
}
