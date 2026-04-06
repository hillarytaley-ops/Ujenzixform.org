/**
 * Supplier / dispatch: should this PO be treated as needing a delivery provider
 * (vs pickup or builder still deciding)?
 */
export function purchaseOrderRequiresDeliveryProvider(po: {
  delivery_required?: boolean | null;
  builder_fulfillment_choice?: string | null;
}): boolean {
  const c = String(po.builder_fulfillment_choice || "").toLowerCase();
  if (c === "pickup") return false;
  if (c === "delivery") return true;
  return po.delivery_required === true;
}
