/**
 * Maps raw purchase_orders.status values to dashboard analytics buckets.
 * Keeps the Pending stat card aligned with the Order Status donut chart.
 */
export type OrderStatusChartBucket =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_CHART_COLORS: Record<OrderStatusChartBucket, string> = {
  pending: '#eab308',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

export function purchaseOrderStatusChartBucket(
  status: string | undefined | null
): OrderStatusChartBucket {
  const s = (status || 'pending').toLowerCase().trim();
  if (['cancelled', 'canceled', 'rejected', 'quote_rejected'].includes(s)) return 'cancelled';
  if (['delivered', 'completed', 'received', 'verified'].includes(s)) return 'delivered';
  if (['shipped', 'dispatched', 'in_transit'].includes(s)) return 'shipped';
  if (
    [
      'confirmed',
      'processing',
      'order_created',
      'awaiting_delivery_request',
      'quote_accepted',
    ].includes(s)
  ) {
    return 'processing';
  }
  return 'pending';
}

export function countOrdersInStatusBucket(
  orders: { status?: string | null }[],
  bucket: OrderStatusChartBucket
): number {
  return orders.filter((o) => purchaseOrderStatusChartBucket(o.status) === bucket).length;
}

/** Rows for Recharts pie; omits zero segments. */
export function buildOrderStatusChartData(orders: { status?: string | null }[]): {
  name: string;
  value: number;
  color: string;
}[] {
  const counts: Record<OrderStatusChartBucket, number> = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const o of orders) {
    counts[purchaseOrderStatusChartBucket(o.status)]++;
  }
  const rows: { name: string; value: number; color: string }[] = [
    { name: 'Pending', value: counts.pending, color: ORDER_STATUS_CHART_COLORS.pending },
    { name: 'Processing', value: counts.processing, color: ORDER_STATUS_CHART_COLORS.processing },
    { name: 'Shipped', value: counts.shipped, color: ORDER_STATUS_CHART_COLORS.shipped },
    { name: 'Delivered', value: counts.delivered, color: ORDER_STATUS_CHART_COLORS.delivered },
    { name: 'Cancelled', value: counts.cancelled, color: ORDER_STATUS_CHART_COLORS.cancelled },
  ];
  return rows.filter((r) => r.value > 0);
}
