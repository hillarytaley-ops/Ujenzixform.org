/**
 * Supplier dashboard: identify Private Builder (private_client) orders that still need supplier attention
 * (aligned with OrderManagement "Not Dispatched" bucket, excluding cancelled).
 */

const NOT_DISPATCHED_STATUSES = new Set([
  'quote_accepted',
  'order_created',
  'awaiting_delivery_request',
  'delivery_requested',
  'awaiting_delivery_provider',
  'delivery_assigned',
  'ready_for_dispatch',
  'in_transit',
  'confirmed',
  'processing',
  'pending',
  'quoted',
  'quote_created',
  'quote_received_by_supplier',
  'quote_responded',
  'quote_revised',
  'quote_viewed_by_builder',
  'quote_rejected',
]);

export function isOrderInNotDispatchedBucket(status: string | undefined | null): boolean {
  const s = String(status || '').toLowerCase();
  if (!s || s === 'cancelled') return false;
  if (s === 'shipped' || s === 'dispatched' || s === 'delivered') return false;
  return NOT_DISPATCHED_STATUSES.has(s);
}

export function countPrivateBuilderOrdersNeedingAttention(
  orders: Array<{ buyer_id?: string | null; status?: string | null }>,
  buyerRoleByUserId: Record<string, string>
): number {
  return orders.filter((o) => {
    const bid = o.buyer_id;
    if (!bid || buyerRoleByUserId[bid] !== 'private_client') return false;
    return isOrderInNotDispatchedBucket(o.status);
  }).length;
}

export async function fetchBuyerRolesMap(
  buyerIds: string[],
  headers: Record<string, string>,
  supabaseUrl: string
): Promise<Record<string, string>> {
  const unique = [...new Set(buyerIds.filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_buyer_roles_for_supplier_orders`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_buyer_ids: unique }),
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const rows: { user_id?: string; role?: string }[] = await res.json();
    const map: Record<string, string> = {};
    for (const r of rows || []) {
      if (!r.user_id || !r.role) continue;
      if (r.role === 'private_client') {
        map[r.user_id] = 'private_client';
        continue;
      }
      if (!map[r.user_id]) map[r.user_id] = r.role;
    }
    return map;
  } catch {
    return {};
  }
}
