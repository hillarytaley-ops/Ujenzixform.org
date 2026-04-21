import type { CartItem } from '@/contexts/CartContext';

/** Real supplier row UUID (not catalog placeholders). */
export function supplierIdValidForCheckout(id?: string): boolean {
  return !!id && id.length === 36 && id !== 'admin-catalog' && id !== 'general';
}

/**
 * Every cart line is locked to one supplier and the buyer explicitly confirmed
 * that supplier (Compare → Select, or switch in single-item compare).
 */
export function cartReadyForDirectCheckout(items: CartItem[]): boolean {
  if (!items.length) return false;
  const ids = items.map((i) => i.supplier_id);
  if (ids.some((id) => !supplierIdValidForCheckout(id))) return false;
  if (new Set(ids).size !== 1) return false;
  return items.every((i) => i.supplier_pick_confirmed === true);
}
