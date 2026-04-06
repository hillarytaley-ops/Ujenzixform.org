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

/** Align with PrivateClientDashboard / provider dashboards */
export const ACTIVE_DELIVERY_REQUEST_STATUSES = new Set([
  "pending",
  "assigned",
  "requested",
  "accepted",
  "in_transit",
  "picked_up",
  "out_for_delivery",
  "scheduled",
]);

export function hasActiveDeliveryRequestForOrder(
  orderId: string,
  rows: { purchase_order_id?: string; status?: string | null }[]
): boolean {
  return rows.some(
    (d) =>
      d.purchase_order_id === orderId &&
      d.status &&
      ACTIVE_DELIVERY_REQUEST_STATUSES.has(String(d.status).toLowerCase())
  );
}

/** Resolve choice when column missing on older rows */
export function builderFulfillmentOrderChoice(po: {
  builder_fulfillment_choice?: string | null;
  delivery_required?: boolean | null;
}): "pending" | "delivery" | "pickup" {
  const c = String(po.builder_fulfillment_choice || "").toLowerCase();
  if (c === "pickup" || c === "delivery" || c === "pending") return c;
  if (po.delivery_required === true) return "delivery";
  return "pending";
}
