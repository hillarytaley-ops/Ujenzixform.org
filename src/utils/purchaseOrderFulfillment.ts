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

/** Admin quote flow: builder accepts quote → Paystack → drivers notified (delivery_quote_paid). */
export const ADMIN_QUOTE_DELIVERY_REQUEST_STATUSES = new Set([
  "quoted",
  "quote_accepted",
  "delivery_quote_paid",
]);

export type DeliveryRequestQuoteRow = {
  id: string;
  purchase_order_id?: string;
  status?: string | null;
  estimated_cost?: number | null;
  delivery_quote_paid_at?: string | null;
  delivery_quote_notes?: string | null;
};

export function hasAdminQuotePipelineDeliveryRequestForOrder(
  orderId: string,
  rows: { purchase_order_id?: string; status?: string | null }[]
): boolean {
  return rows.some(
    (d) =>
      d.purchase_order_id === orderId &&
      d.status &&
      ADMIN_QUOTE_DELIVERY_REQUEST_STATUSES.has(String(d.status).toLowerCase())
  );
}

export function findAdminQuoteDeliveryRequestForOrder(
  orderId: string,
  rows: DeliveryRequestQuoteRow[]
): DeliveryRequestQuoteRow | null {
  const match = rows.filter(
    (d) =>
      d.purchase_order_id === orderId &&
      d.status &&
      ADMIN_QUOTE_DELIVERY_REQUEST_STATUSES.has(String(d.status).toLowerCase())
  );
  if (match.length === 0) return null;
  const priority = (s: string) => {
    const x = s.toLowerCase();
    if (x === "quote_accepted") return 3;
    if (x === "quoted") return 2;
    if (x === "delivery_quote_paid") return 1;
    return 0;
  };
  match.sort(
    (a, b) => priority(String(b.status)) - priority(String(a.status))
  );
  return match[0];
}

/** Builder may PATCH drop-off details while the job is not yet in active transit. */
export const BUILDER_EDITABLE_DELIVERY_REQUEST_STATUSES = new Set([
  "pending",
  "requested",
  "quoted",
  "quote_accepted",
  "delivery_quote_paid",
  "assigned",
  "accepted",
  "scheduled",
  "confirmed",
  "active",
]);

export function findEditableDeliveryRequestId(
  orderId: string,
  rows: {
    id: string;
    purchase_order_id?: string;
    status?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  }[]
): string | null {
  const eligible = rows.filter(
    (r) =>
      r.purchase_order_id === orderId &&
      r.status &&
      BUILDER_EDITABLE_DELIVERY_REQUEST_STATUSES.has(String(r.status).toLowerCase())
  );
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    const ta = new Date(a.updated_at || a.created_at || 0).getTime();
    const tb = new Date(b.updated_at || b.created_at || 0).getTime();
    return tb - ta;
  });
  return eligible[0].id;
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
